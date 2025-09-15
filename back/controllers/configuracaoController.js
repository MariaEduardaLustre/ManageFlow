// controllers/configuracaoController.js
const db = require('../database/connection'); // mysql2 (promise ou callback)
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { getPublicFrontBaseUrl } = require('../utils/url');
const fs = require('fs');
const path = require('path');

/* ========================= Helpers ========================= */
function parseDateYyyyMmDdToInt(v) {
  if (v === undefined || v === null || v === '') return null;
  let s = String(v).trim();
  if (!s) return null;
  s = s.replace(/-/g, '');
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}
function boolToTinyint(v) { return v ? 1 : 0; }
function toIntOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
function normalizeUrl(input) {
  if (!input) return '';
  if (typeof input === 'string') return input.trim();
  if (typeof input === 'object' && typeof input.url === 'string') return input.url.trim();
  return '';
}
function parseJsonUrl(raw) {
  // Coluna JSON que pode estar em string JSON ou em legado como URL crua
  if (raw == null || raw === '') return { url: '' };
  if (typeof raw === 'object' && raw.url) return { url: String(raw.url) };
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const url = obj && obj.url ? String(obj.url) : '';
    return { url };
  } catch {
    return { url: normalizeUrl(raw) };
  }
}

// Base pública para montar URLs absolutas nas respostas
function getApiBase(req) {
  return (process.env.PUBLIC_API_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

// Converte caminho relativo -> absoluto; e corrige host "localhost" se vier absoluto antigo
function toPublicUrl(url, req) {
  if (!url) return '';
  const base = getApiBase(req);
  if (url.startsWith('/')) return `${base}${url}`;
  try {
    const u = new URL(url);
    const baseUrl = new URL(base);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      u.protocol = baseUrl.protocol;
      u.host = baseUrl.host;
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

// Exec SQL compatível com execute/query
async function execDb(sql, params = []) {
  if (typeof db.execute === 'function') {
    return db.execute(sql, params); // [rowsOrResult, fields]
  }
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve([result, null]);
    });
  });
}

/* ============ Upload helper (dataURL -> arquivo -> caminho relativo) ============ */
async function ensureImageUrl(value, req, subdir) {
  // aceita: string (http/dataURL) ou { url: '...' }
  const raw = typeof value === 'string' ? value : (value?.url || '');
  if (!raw) return { url: '' };

  // Já é caminho relativo aceito
  if (raw.startsWith('/uploads/')) return { url: raw };

  // Já é http(s): se for do mesmo host do back, converte para relativo; senão mantém absoluto (ex.: CDN)
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      const base = new URL(getApiBase(req));
      if (u.host === base.host) {
        return { url: u.pathname + (u.search || '') };
      }
      return { url: raw };
    } catch { return { url: raw }; }
  }

  // Data URL base64?
  const m = raw.match(/^data:[^;]+;base64,(.+)$/i);
  if (!m) return { url: '' };
  const b64 = m[1].replace(/\s/g, ''); // remove quebras/espacos, se houver
  // tenta inferir extensão (fallback png)
  const extMatch = raw.match(/^data:([^/]+)\/([^;]+);base64,/i);
  const ext = (extMatch?.[2] || 'png').toLowerCase();

  const dir = path.join(__dirname, '..', 'uploads', subdir);
  await fs.promises.mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const filePath = path.join(dir, filename);
  await fs.promises.writeFile(filePath, Buffer.from(b64, 'base64'));

  // Salva RELATIVO no banco
  return { url: `/uploads/${subdir}/${filename}` };
}

/* ============================================================
 *  Cadastrar configuração
 * ============================================================ */
exports.cadastrarConfiguracaoFila = async (req, res) => {
  const {
    id_empresa,
    nome_fila,
    ini_vig,
    fim_vig,
    campos,
    mensagem,
    img_banner,
    img_logo,   // <- agora aceitamos também
    temp_tol,
    qtde_min,
    qtde_max,
    per_sair,
    per_loc,
    situacao
  } = req.body;

  if (!id_empresa || !nome_fila) {
    return res.status(400).json({ erro: 'Campos obrigatórios ausentes.' });
  }

  const iniVigInt     = parseDateYyyyMmDdToInt(ini_vig);
  const fimVigInt     = parseDateYyyyMmDdToInt(fim_vig);
  const perSairTiny   = boolToTinyint(per_sair);
  const perLocTiny    = boolToTinyint(per_loc);
  const situacaoInt   = toIntOrNull(situacao) ?? 1;
  const parsedTempTol = toIntOrNull(temp_tol);
  const parsedQtdeMin = toIntOrNull(qtde_min);
  const parsedQtdeMax = toIntOrNull(qtde_max);

  const token_fila = uuidv4();

  // Salva arquivos (se vier dataURL) e devolve caminho relativo
  const bannerObj = await ensureImageUrl(img_banner, req, 'banners');
  const logoObj   = await ensureImageUrl(img_logo,   req, 'logos');

  const sql = `
    INSERT INTO ConfiguracaoFila (
      ID_EMPRESA, NOME_FILA, TOKEN_FILA, INI_VIG, FIM_VIG,
      CAMPOS, MENSAGEM, IMG_BANNER, IMG_LOGO, TEMP_TOL, QDTE_MIN, QTDE_MAX,
      PER_SAIR, PER_LOC, SITUACAO
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    const [result] = await execDb(sql, [
      id_empresa,
      nome_fila,
      token_fila,
      iniVigInt,
      fimVigInt,
      JSON.stringify(campos || {}),
      mensagem || '',
      JSON.stringify(bannerObj),
      JSON.stringify(logoObj),
      parsedTempTol,
      parsedQtdeMin,
      parsedQtdeMax,
      perSairTiny,
      perLocTiny,
      situacaoInt
    ]);

    const baseUrl = getPublicFrontBaseUrl(req);
    const join_url = `${baseUrl}/entrar-fila/${token_fila}`;

    let qr_data_url = null;
    try {
      qr_data_url = await QRCode.toDataURL(join_url, { margin: 1, width: 256 });
    } catch (e) {
      console.error('Erro ao gerar QR:', e);
    }

    const id_conf_fila = result && (result.insertId ?? null);

    return res.status(201).json({
      mensagem: 'Fila configurada com sucesso!',
      token_fila,
      join_url,
      qr_data_url,
      id_conf_fila
    });
  } catch (err) {
    console.error('Erro ao inserir ConfiguracaoFila:', err);
    return res.status(500).json({ erro: 'Erro interno ao salvar configuração.' });
  }
};

/* ============================================================
 *  Buscar por ID
 * ============================================================ */
exports.buscarConfiguracaoFilaPorId = async (req, res) => {
  const { id } = req.params; // ID_CONF_FILA
  const sql = `SELECT * FROM ConfiguracaoFila WHERE ID_CONF_FILA = ?`;

  try {
    const [rows] = await execDb(sql, [id]);
    const results = Array.isArray(rows) ? rows : [];
    if (!results.length) {
      return res.status(404).json({ mensagem: 'Configuração de fila não encontrada.' });
    }

    const r = { ...results[0] };

    let campos = {};
    try { campos = r.CAMPOS ? JSON.parse(r.CAMPOS) : {}; } catch {}
    const img_banner = parseJsonUrl(r.IMG_BANNER);
    const img_logo   = parseJsonUrl(r.IMG_LOGO);

    // Devolve URLs públicas (corrige localhost e converte relativo)
    img_banner.url = toPublicUrl(img_banner.url, req);
    img_logo.url   = toPublicUrl(img_logo.url, req);

    const toDateStr = (n) => {
      if (!n) return '';
      const s = String(n).padStart(8, '0');
      return `${s.substring(0,4)}-${s.substring(4,6)}-${s.substring(6,8)}`;
    };

    return res.status(200).json({
      id_conf_fila: r.ID_CONF_FILA,
      id_empresa:   r.ID_EMPRESA,
      nome_fila:    r.NOME_FILA,
      token_fila:   r.TOKEN_FILA,
      ini_vig:      toDateStr(r.INI_VIG),
      fim_vig:      toDateStr(r.FIM_VIG),
      campos,
      mensagem:     r.MENSAGEM,
      img_banner,
      img_logo,
      temp_tol:     r.TEMP_TOL,
      qtde_min:     r.QDTE_MIN,
      qtde_max:     r.QTDE_MAX,
      per_sair:     r.PER_SAIR === 1,
      per_loc:      r.PER_LOC === 1,
      situacao:     r.SITUACAO
    });
  } catch (err) {
    console.error('Erro ao buscar configuração de fila por ID:', err);
    return res.status(500).json({ erro: 'Erro interno ao buscar configuração de fila.', detalhes: err.message });
  }
};

/* ============================================================
 *  Atualizar configuração
 * ============================================================ */
exports.atualizarConfiguracaoFila = async (req, res) => {
  const { id } = req.params;
  const {
    id_empresa,
    nome_fila,
    ini_vig,
    fim_vig,
    campos,
    mensagem,
    img_banner,
    img_logo,
    temp_tol,
    qtde_min,
    qtde_max,
    per_sair,
    per_loc,
    situacao
  } = req.body;

  if (!id_empresa || !nome_fila) {
    return res.status(400).json({ erro: 'Campos obrigatórios ausentes: ID da Empresa e Nome da Fila.' });
  }

  const iniVigInt     = parseDateYyyyMmDdToInt(ini_vig);
  const fimVigInt     = parseDateYyyyMmDdToInt(fim_vig);
  const perSairTiny   = boolToTinyint(per_sair);
  const perLocTiny    = boolToTinyint(per_loc);
  const situacaoInt   = toIntOrNull(situacao);
  const parsedTempTol = toIntOrNull(temp_tol);
  const parsedQtdeMin = toIntOrNull(qtde_min);
  const parsedQtdeMax = toIntOrNull(qtde_max);

  if (situacaoInt !== 0 && situacaoInt !== 1) {
    return res.status(400).json({ erro: 'Formato inválido para SITUACAO. Esperado 0 ou 1.' });
  }

  // Transforma imagem em caminho relativo (mantém externa se URL externa)
  const bannerObj = await ensureImageUrl(img_banner, req, 'banners');
  const logoObj   = await ensureImageUrl(img_logo,   req, 'logos');

  const sql = `
    UPDATE ConfiguracaoFila SET
      ID_EMPRESA = ?, NOME_FILA = ?, INI_VIG = ?, FIM_VIG = ?,
      CAMPOS = ?, MENSAGEM = ?, IMG_BANNER = ?, IMG_LOGO = ?, TEMP_TOL = ?, QDTE_MIN = ?, QTDE_MAX = ?,
      PER_SAIR = ?, PER_LOC = ?, SITUACAO = ?
    WHERE ID_CONF_FILA = ?
  `;

  try {
    const [result] = await execDb(sql, [
      id_empresa,
      nome_fila,
      iniVigInt,
      fimVigInt,
      JSON.stringify(campos || {}),
      mensagem || '',
      JSON.stringify(bannerObj),
      JSON.stringify(logoObj),
      parsedTempTol,
      parsedQtdeMin,
      parsedQtdeMax,
      perSairTiny,
      perLocTiny,
      situacaoInt,
      id
    ]);

    const affected = typeof result?.affectedRows === 'number'
      ? result.affectedRows
      : (Array.isArray(result) ? result.length : 0);

    if (!affected) {
      return res.status(404).json({ mensagem: 'Configuração de fila não encontrada para atualização.' });
    }
    res.status(200).json({ mensagem: 'Configuração de fila atualizada com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar ConfiguracaoFila:', err);
    return res.status(500).json({ erro: 'Erro interno ao atualizar configuração.', detalhes: err.message });
  }
};

/* ============================================================
 *  QR PNG
 * ============================================================ */
exports.qrPngByToken = async (req, res) => {
  const { token } = req.params;
  const baseUrl = getPublicFrontBaseUrl(req);
  const join_url = `${baseUrl}/entrar-fila/${token}`;

  try {
    const buffer = await QRCode.toBuffer(join_url, { margin: 1, width: 512, type: 'png' });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="qr-${token}.png"`);
    return res.send(buffer);
  } catch (e) {
    console.error('Erro ao gerar QR PNG:', e);
    return res.status(500).send('Falha ao gerar QR');
  }
};

/* ============================================================
 *  Listar por empresa
 * ============================================================ */
exports.listarConfiguracoesDaEmpresa = async (req, res) => {
  const idEmpresa = Number(req.query.idEmpresa || req.headers['x-empresa-id']);
  if (!idEmpresa) return res.status(400).json({ erro: 'idEmpresa é obrigatório.' });

  const sql = `
    SELECT
      ID_CONF_FILA, ID_EMPRESA, NOME_FILA, TOKEN_FILA,
      INI_VIG, FIM_VIG, CAMPOS, MENSAGEM, IMG_BANNER, IMG_LOGO,
      TEMP_TOL, QDTE_MIN, QTDE_MAX, PER_SAIR, PER_LOC, SITUACAO
    FROM ConfiguracaoFila
    WHERE ID_EMPRESA = ?
    ORDER BY NOME_FILA ASC
  `;

  const toDateStr = (n) => {
    if (!n) return '';
    const s = String(n).padStart(8, '0');
    return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  };

  try {
    const [rows] = await execDb(sql, [idEmpresa]);
    const baseUrl = getPublicFrontBaseUrl(req);

    const list = rows.map((r) => {
      let campos = {};
      try { campos = r.CAMPOS ? JSON.parse(r.CAMPOS) : {}; } catch {}

      const img_banner = parseJsonUrl(r.IMG_BANNER);
      const img_logo   = parseJsonUrl(r.IMG_LOGO);

      // URLs públicas
      img_banner.url = toPublicUrl(img_banner.url, req);
      img_logo.url   = toPublicUrl(img_logo.url, req);

      return {
        id_conf_fila: r.ID_CONF_FILA,
        id_empresa: r.ID_EMPRESA,
        nome_fila: r.NOME_FILA,
        token_fila: r.TOKEN_FILA,
        ini_vig: toDateStr(r.INI_VIG),
        fim_vig: toDateStr(r.FIM_VIG),
        campos,
        mensagem: r.MENSAGEM,
        img_banner,
        img_logo,
        temp_tol: r.TEMP_TOL,
        qtde_min: r.QDTE_MIN,
        qtde_max: r.QTDE_MAX,
        per_sair: r.PER_SAIR === 1,
        per_loc: r.PER_LOC === 1,
        situacao: r.SITUACAO,
        join_url: `${baseUrl}/entrar-fila/${r.TOKEN_FILA}`,
      };
    });

    return res.json(list);
  } catch (err) {
    console.error('Erro ao listar configurações de fila:', err);
    return res.status(500).json({ erro: 'Erro ao listar configurações.' });
  }
};

/* ============================================================
 *  Público: info por token
 * ============================================================ */
exports.getPublicInfoByToken = async (req, res) => {
  const { token } = req.params;
  console.log('[getPublicInfoByToken] INICIO | token =', token);

  const sql = `
    SELECT
      cf.ID_CONF_FILA, cf.ID_EMPRESA, cf.NOME_FILA, cf.TOKEN_FILA,
      cf.INI_VIG, cf.FIM_VIG, cf.CAMPOS, cf.MENSAGEM, cf.IMG_BANNER, cf.IMG_LOGO,
      cf.TEMP_TOL, cf.QDTE_MIN, cf.QTDE_MAX, cf.PER_SAIR, cf.PER_LOC, cf.SITUACAO,
      e.NOME_EMPRESA
    FROM ConfiguracaoFila cf
    JOIN empresa e ON e.ID_EMPRESA = cf.ID_EMPRESA
    WHERE cf.TOKEN_FILA = ?
    LIMIT 1
  `;

  try {
    const [rows] = await db.execute(sql, [token]);
    if (!rows.length) return res.status(404).json({ erro: 'config_not_found' });

    const r = rows[0];

    let campos = [];
    try { campos = r.CAMPOS ? JSON.parse(r.CAMPOS) : []; } catch {}

    const img_banner = parseJsonUrl(r.IMG_BANNER);
    const img_logo   = parseJsonUrl(r.IMG_LOGO);

    // URLs públicas (corrige localhost e converte relativo)
    img_banner.url = toPublicUrl(img_banner.url, req);
    img_logo.url   = toPublicUrl(img_logo.url, req);

    const toInt = (v) => (v == null ? null : parseInt(String(v), 10));
    const todayInt = parseInt(new Date().toISOString().slice(0,10).replace(/-/g,''), 10);
    const withinRange =
      (toInt(r.INI_VIG) == null || todayInt >= toInt(r.INI_VIG)) &&
      (toInt(r.FIM_VIG) == null || todayInt <= toInt(r.FIM_VIG));

    return res.json({
      id_conf_fila: r.ID_CONF_FILA,
      id_empresa:   r.ID_EMPRESA,
      nome_fila:    r.NOME_FILA,
      token_fila:   r.TOKEN_FILA,
      situacao:     r.SITUACAO,
      ini_vig:      r.INI_VIG || null,
      fim_vig:      r.FIM_VIG || null,
      campos,
      mensagem:     r.MENSAGEM || '',
      img_banner,                          // { url: '...' }
      img_logo,                            // { url: '...' }
      temp_tol:     r.TEMP_TOL,
      qtde_min:     r.QDTE_MIN,
      qtde_max:     r.QTDE_MAX,
      per_sair:     !!r.PER_SAIR,
      per_loc:      !!r.PER_LOC,
      join_url:     `${getPublicFrontBaseUrl(req)}/entrar-fila/${r.TOKEN_FILA}`,
      empresa: {
        id:       r.ID_EMPRESA,
        nome:     r.NOME_EMPRESA,
        logo_url: img_logo.url || ''       // compat com seu front atual
      },
      is_active:    r.SITUACAO === 1,
      within_range: withinRange
    });
  } catch (e) {
    console.error('[getPublicInfoByToken] ERRO:', e);
    return res.status(500).json({ erro: 'internal_error' });
  }
};

/* ============================================================
 *  Público: entrar na fila (sem mudanças de imagem)
 * ============================================================ */
exports.publicJoinByToken = async (req, res) => {
  const { token } = req.params;
  const {
    nome,
    cpf,
    rg = null,
    dddcel = null,
    nr_cel = null,
    email = null,
    dt_nasc = null,
    nr_qtdpes = 1
  } = req.body;

  console.log('[publicJoinByToken] INICIO | token =', token, 'body =', req.body);

  if (!nome || !cpf) {
    console.log('[publicJoinByToken] FALTANDO nome ou cpf');
    return res.status(400).json({ erro: 'Nome e CPF são obrigatórios.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [cfgRows] = await conn.execute(
      `SELECT ID_CONF_FILA, ID_EMPRESA, NOME_FILA, SITUACAO, INI_VIG, FIM_VIG
         FROM ConfiguracaoFila
        WHERE TOKEN_FILA = ?
        LIMIT 1`,
      [token]
    );
    if (!cfgRows.length) {
      await conn.rollback();
      return res.status(404).json({ erro: 'config_not_found' });
    }
    const cfg = cfgRows[0];
    if (cfg.SITUACAO !== 1) {
      await conn.rollback();
      return res.status(409).json({ erro: 'config_inactive' });
    }

    const toInt = (v) => (v == null ? null : parseInt(String(v), 10));
    const todayInt = parseInt(new Date().toISOString().slice(0,10).replace(/-/g,''), 10);
    const ini = toInt(cfg.INI_VIG);
    const fim = toInt(cfg.FIM_VIG);
    const withinRange = (ini == null || todayInt >= ini) && (fim == null || todayInt <= fim);
    if (!withinRange) {
      await conn.rollback();
      return res.status(409).json({ erro: 'config_out_of_range' });
    }

    const idEmpresa = cfg.ID_EMPRESA;
    const idConfFila = cfg.ID_CONF_FILA;

    const [filaRows] = await conn.execute(
      `SELECT ID_FILA, DT_MOVTO, BLOCK, SITUACAO
         FROM fila
        WHERE ID_EMPRESA = ? AND ID_CONF_FILA = ? AND DATE(DT_MOVTO) = CURDATE()
        ORDER BY ID_FILA DESC
        LIMIT 1`,
      [idEmpresa, idConfFila]
    );

    let idFila;
    if (filaRows.length) {
      const f = filaRows[0];
      if (f.BLOCK)   { await conn.rollback(); return res.status(409).json({ erro: 'fila_blocked'  }); }
      if (f.SITUACAO !== 1) { await conn.rollback(); return res.status(409).json({ erro: 'fila_inactive' }); }
      idFila = f.ID_FILA;
    } else {
      const [insFila] = await conn.execute(
        `INSERT INTO fila (ID_EMPRESA, ID_CONF_FILA, DT_MOVTO, DT_INI, BLOCK, SITUACAO)
         VALUES (?, ?, CURDATE(), NOW(), 0, 1)`,
        [idEmpresa, idConfFila]
      );
      idFila = insFila.insertId;
    }

    const [dup] = await conn.execute(
      `SELECT 1
         FROM clientesfila
        WHERE ID_EMPRESA = ? AND ID_FILA = ?
          AND DATE(DT_MOVTO) = CURDATE()
          AND CPFCNPJ = ?
        LIMIT 1`,
      [idEmpresa, idFila, cpf]
    );
    if (dup.length) {
      await conn.rollback();
      return res.status(409).json({ erro: 'duplicate_today' });
    }

    const [clienteExist] = await conn.execute(
      `SELECT ID_CLIENTE
         FROM clientesfila
        WHERE CPFCNPJ = ?
        ORDER BY DT_ENTRA DESC
        LIMIT 1`,
      [cpf]
    );

    let idCliente;
    if (clienteExist.length) {
      idCliente = clienteExist[0].ID_CLIENTE;
    } else {
      const [[mx]] = await conn.query(`SELECT COALESCE(MAX(ID_CLIENTE),0)+1 AS nextId FROM clientesfila`);
      idCliente = mx.nextId;
    }

    const qtd = Number.isFinite(Number(nr_qtdpes)) ? Number(nr_qtdpes) : 1;
    await conn.execute(
      `INSERT INTO clientesfila
        (ID_EMPRESA, DT_MOVTO, ID_FILA, ID_CLIENTE,
         CPFCNPJ, RG, NOME, DT_NASC, EMAIL, NR_QTDPES, DDDCEL, NR_CEL,
         DT_ENTRA, SITUACAO)
       VALUES
        (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
      [idEmpresa, idFila, idCliente, cpf, rg, nome, dt_nasc || null, email, qtd, dddcel, nr_cel]
    );

    const [[posRow]] = await conn.query(
      `SELECT COUNT(*) AS ahead
         FROM clientesfila
        WHERE ID_EMPRESA = ? AND ID_FILA = ?
          AND DATE(DT_MOVTO) = CURDATE()
          AND SITUACAO IN (0,3)
          AND DT_ENTRA <
              (SELECT DT_ENTRA FROM clientesfila
                WHERE ID_EMPRESA=? AND ID_FILA=? AND ID_CLIENTE=? AND DATE(DT_MOVTO)=CURDATE()
                LIMIT 1)`,
      [idEmpresa, idFila, idEmpresa, idFila, idCliente]
    );
    const posicao = (posRow?.ahead ?? 0) + 1;

    await conn.commit();
    return res.status(201).json({
      mensagem: 'Cliente inserido na fila com sucesso.',
      id_empresa: idEmpresa,
      id_fila: idFila,
      id_cliente: idCliente,
      dt_movto: new Date().toISOString().slice(0,10),
      posicao
    });
  } catch (e) {
    await conn.rollback();
    console.error('[publicJoinByToken] ERRO:', e);
    return res.status(500).json({ erro: 'internal_error' });
  } finally {
    conn.release();
  }
};
