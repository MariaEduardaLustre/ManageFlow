// controllers/configuracaoController.js
const db = require('../database/connection'); // conexão mysql2 (promise ou callback)
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { getPublicFrontBaseUrl } = require('../utils/url');

/** =========================
 *  Helpers de compatibilidade
 *  ========================= */
function parseDateYyyyMmDdToInt(v) {
  // aceita: 20250101 (number/string), "2025-01-01" (string), ""/null -> null
  if (v === undefined || v === null || v === '') return null;
  let s = String(v).trim();
  if (!s) return null;
  s = s.replace(/-/g, ''); // tira hífens se vier "YYYY-MM-DD"
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function boolToTinyint(v) {
  return v ? 1 : 0;
}

function toIntOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

// Execução de SQL compatível: usa execute se existir; senão, query callback embrulhado em Promise
async function execDb(sql, params = []) {
  if (typeof db.execute === 'function') {
    return db.execute(sql, params); // retorna [rowsOrResult, fields]
  }
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve([result, null]);
    });
  });
}

/** ==============================================
 *  Cadastro de configuração (mantém SEU comportamento)
 *  - Gera token_fila, monta join_url com IP/porta do front e devolve qr_data_url (base64)
 *  ============================================== */
exports.cadastrarConfiguracaoFila = async (req, res) => {
  const {
    id_empresa,
    nome_fila,
    ini_vig,
    fim_vig,
    campos,
    mensagem,
    img_banner,
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

  // Conversões (tolerantes) para não quebrar o que já funciona no front
  const iniVigInt = parseDateYyyyMmDdToInt(ini_vig);
  const fimVigInt = parseDateYyyyMmDdToInt(fim_vig);
  const perSairTiny = boolToTinyint(per_sair);
  const perLocTiny  = boolToTinyint(per_loc);
  const situacaoInt = toIntOrNull(situacao) ?? 1;

  const parsedTempTol = toIntOrNull(temp_tol);
  const parsedQtdeMin = toIntOrNull(qtde_min);
  const parsedQtdeMax = toIntOrNull(qtde_max);

  const token_fila = uuidv4();

  const sql = `
    INSERT INTO ConfiguracaoFila (
      ID_EMPRESA, NOME_FILA, TOKEN_FILA, INI_VIG, FIM_VIG,
      CAMPOS, MENSAGEM, IMG_BANNER, TEMP_TOL, QDTE_MIN, QTDE_MAX,
      PER_SAIR, PER_LOC, SITUACAO
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      JSON.stringify(img_banner || { url: '' }),
      parsedTempTol,
      parsedQtdeMin,
      parsedQtdeMax,
      perSairTiny,
      perLocTiny,
      situacaoInt
    ]);

    // Monta URL do front + rota de entrada
    const baseUrl = getPublicFrontBaseUrl(req);
    const joinPath = `/entrar-fila/${token_fila}`;
    const join_url = `${baseUrl}${joinPath}`;

    // Gera QR base64 (data URL)
    let qr_data_url = null;
    try {
      qr_data_url = await QRCode.toDataURL(join_url, { margin: 1, width: 256 });
    } catch (e) {
      console.error('Erro ao gerar QR:', e);
    }

    // Mantém resposta original + (opcional) id_conf_fila se disponível
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

/** ===================================================
 *  Buscar configuração por ID (preservado do outro branch)
 *  =================================================== */
exports.buscarConfiguracaoFilaPorId = async (req, res) => {
  const { id } = req.params; // ID_CONF_FILA

  const sql = `SELECT * FROM ConfiguracaoFila WHERE ID_CONF_FILA = ?`;

  try {
    const [rows] = await execDb(sql, [id]);
    const results = Array.isArray(rows) ? rows : []; // execute retorna array; query pode retornar OkPacket para insert/update

    if (!results.length) {
      return res.status(404).json({ mensagem: 'Configuração de fila não encontrada.' });
    }

    const configFila = { ...results[0] };

    // Parse de JSON
    try {
      configFila.CAMPOS = configFila.CAMPOS ? JSON.parse(configFila.CAMPOS) : {};
    } catch {
      configFila.CAMPOS = {};
    }
    try {
      configFila.IMG_BANNER = configFila.IMG_BANNER ? JSON.parse(configFila.IMG_BANNER) : { url: '' };
    } catch {
      configFila.IMG_BANNER = { url: '' };
    }

    // Converte datas INT -> 'YYYY-MM-DD'
    const toDateStr = (n) => {
      if (!n) return '';
      const s = String(n).padStart(8, '0');
      return `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}`;
    };

    const formattedConfig = {
      id_conf_fila: configFila.ID_CONF_FILA,
      id_empresa:   configFila.ID_EMPRESA,
      nome_fila:    configFila.NOME_FILA,
      token_fila:   configFila.TOKEN_FILA,
      ini_vig:      toDateStr(configFila.INI_VIG),
      fim_vig:      toDateStr(configFila.FIM_VIG),
      campos:       configFila.CAMPOS,
      mensagem:     configFila.MENSAGEM,
      img_banner:   configFila.IMG_BANNER,
      temp_tol:     configFila.TEMP_TOL,
      qtde_min:     configFila.QDTE_MIN, // coluna é QDTE_MIN
      qtde_max:     configFila.QTDE_MAX, // coluna é QTDE_MAX
      per_sair:     configFila.PER_SAIR === 1,
      per_loc:      configFila.PER_LOC === 1,
      situacao:     configFila.SITUACAO
    };

    res.status(200).json(formattedConfig);
  } catch (err) {
    console.error('Erro ao buscar configuração de fila por ID:', err);
    return res.status(500).json({ erro: 'Erro interno ao buscar configuração de fila.', detalhes: err.message });
  }
};

/** ===================================================
 *  Atualizar configuração (preservado do outro branch)
 *  =================================================== */
exports.atualizarConfiguracaoFila = async (req, res) => {
  const { id } = req.params; // ID_CONF_FILA
  const {
    id_empresa,
    nome_fila,
    ini_vig,
    fim_vig,
    campos,
    mensagem,
    img_banner,
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

  const sql = `
    UPDATE ConfiguracaoFila SET
      ID_EMPRESA = ?, NOME_FILA = ?, INI_VIG = ?, FIM_VIG = ?,
      CAMPOS = ?, MENSAGEM = ?, IMG_BANNER = ?, TEMP_TOL = ?, QDTE_MIN = ?, QTDE_MAX = ?,
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
      JSON.stringify(img_banner || { url: '' }),
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

// LISTAR configurações por empresa
exports.listarConfiguracoesDaEmpresa = async (req, res) => {
  const idEmpresa = Number(req.query.idEmpresa || req.headers['x-empresa-id']);
  if (!idEmpresa) return res.status(400).json({ erro: 'idEmpresa é obrigatório.' });

  const sql = `
    SELECT
      ID_CONF_FILA, ID_EMPRESA, NOME_FILA, TOKEN_FILA,
      INI_VIG, FIM_VIG, CAMPOS, MENSAGEM, IMG_BANNER,
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
      let img_banner = { url: '' };
      try { campos = r.CAMPOS ? JSON.parse(r.CAMPOS) : {}; } catch {}
      try { img_banner = r.IMG_BANNER ? JSON.parse(r.IMG_BANNER) : { url: '' }; } catch {}

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

// ======================
// INFO PÚBLICA POR TOKEN
// GET /api/configuracao/public/info/:token
// ======================
exports.getPublicInfoByToken = async (req, res) => {
  const { token } = req.params;
  console.log('[getPublicInfoByToken] INICIO | token =', token);

  const sql = `
    SELECT
      cf.ID_CONF_FILA, cf.ID_EMPRESA, cf.NOME_FILA, cf.TOKEN_FILA,
      cf.INI_VIG, cf.FIM_VIG, cf.CAMPOS, cf.MENSAGEM, cf.IMG_BANNER,
      cf.TEMP_TOL, cf.QDTE_MIN, cf.QTDE_MAX, cf.PER_SAIR, cf.PER_LOC, cf.SITUACAO,
      e.NOME_EMPRESA, e.LOGO
    FROM ConfiguracaoFila cf
    JOIN empresa e ON e.ID_EMPRESA = cf.ID_EMPRESA
    WHERE cf.TOKEN_FILA = ?
    LIMIT 1
  `;

  try {
    const [rows] = await db.execute(sql, [token]);
    console.log('[getPublicInfoByToken] rows.length =', rows.length);

    if (!rows.length) {
      console.log('[getPublicInfoByToken] NENHUMA configuração encontrada para token:', token);
      return res.status(404).json({ erro: 'config_not_found' });
    }

    const r = rows[0];
    console.log('[getPublicInfoByToken] SITUACAO =', r.SITUACAO, 'INI_VIG =', r.INI_VIG, 'FIM_VIG =', r.FIM_VIG);

    // parse JSON
    let campos;
    try { campos = r.CAMPOS ? JSON.parse(r.CAMPOS) : []; } catch { campos = []; }
    let img_banner;
    try { img_banner = r.IMG_BANNER ? JSON.parse(r.IMG_BANNER) : null; } catch { img_banner = null; }

    // helper: compara vigência
    const toInt = (v) => (v == null ? null : parseInt(String(v), 10));
    const todayInt = parseInt(
      new Date().toISOString().slice(0,10).replace(/-/g,''), 10
    );
    const ini = toInt(r.INI_VIG);
    const fim = toInt(r.FIM_VIG);
    const withinRange =
      (ini == null || todayInt >= ini) && (fim == null || todayInt <= fim);

    const baseUrl = getPublicFrontBaseUrl(req);
    const join_url = `${baseUrl}/entrar-fila/${r.TOKEN_FILA}`;

    const payload = {
      id_conf_fila: r.ID_CONF_FILA,
      id_empresa: r.ID_EMPRESA,
      nome_fila: r.NOME_FILA,
      token_fila: r.TOKEN_FILA,
      situacao: r.SITUACAO,       // 1 = ativa
      ini_vig: r.INI_VIG || null,
      fim_vig: r.FIM_VIG || null,
      campos,                      // geralmente array [{campo, tipo}]
      mensagem: r.MENSAGEM || '',
      img_banner,                  // {url} ou null
      temp_tol: r.TEMP_TOL,
      qtde_min: r.QDTE_MIN,
      qtde_max: r.QTDE_MAX,
      per_sair: !!r.PER_SAIR,
      per_loc: !!r.PER_LOC,
      join_url,
      empresa: {
        id: r.ID_EMPRESA,
        nome: r.NOME_EMPRESA,
        logo_url: r.LOGO || ''
      },
      is_active: r.SITUACAO === 1,
      within_range: withinRange
    };

    console.log('[getPublicInfoByToken] is_active=', payload.is_active, 'within_range=', payload.within_range);
    return res.json(payload);

  } catch (e) {
    console.error('[getPublicInfoByToken] ERRO:', e);
    return res.status(500).json({ erro: 'internal_error' });
  }
};


// ======================
// ENTRAR NA FILA (PÚBLICO) POR TOKEN
// POST /api/configuracao/public/join/:token
// body: { nome, cpf, rg?, dddcel?, nr_cel?, email?, dt_nasc?, nr_qtdpes? }
// ======================
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

    // 1) Configuração
    const [cfgRows] = await conn.execute(
      `SELECT ID_CONF_FILA, ID_EMPRESA, NOME_FILA, SITUACAO, INI_VIG, FIM_VIG
         FROM ConfiguracaoFila
        WHERE TOKEN_FILA = ?
        LIMIT 1`,
      [token]
    );
    console.log('[publicJoinByToken] cfgRows.length =', cfgRows.length);

    if (!cfgRows.length) {
      await conn.rollback();
      console.log('[publicJoinByToken] Configuração não encontrada para token:', token);
      return res.status(404).json({ erro: 'config_not_found' });
    }
    const cfg = cfgRows[0];
    console.log('[publicJoinByToken] cfg.SITUACAO =', cfg.SITUACAO, 'INI_VIG =', cfg.INI_VIG, 'FIM_VIG =', cfg.FIM_VIG);

    if (cfg.SITUACAO !== 1) {
      await conn.rollback();
      console.log('[publicJoinByToken] Configuração INATIVA');
      return res.status(409).json({ erro: 'config_inactive' });
    }

    // 1.1) Checa vigência (se desejar bloquear fora do período)
    const toInt = (v) => (v == null ? null : parseInt(String(v), 10));
    const todayInt = parseInt(new Date().toISOString().slice(0,10).replace(/-/g,''), 10);
    const ini = toInt(cfg.INI_VIG);
    const fim = toInt(cfg.FIM_VIG);
    const withinRange =
      (ini == null || todayInt >= ini) && (fim == null || todayInt <= fim);

    if (!withinRange) {
      await conn.rollback();
      console.log('[publicJoinByToken] FORA DE VIGÊNCIA | today=', todayInt, 'ini=', ini, 'fim=', fim);
      return res.status(409).json({ erro: 'config_out_of_range' });
    }

    const idEmpresa = cfg.ID_EMPRESA;
    const idConfFila = cfg.ID_CONF_FILA;

    // 2) Fila do dia (usa funções SQL para datas)
    const [filaRows] = await conn.execute(
      `SELECT ID_FILA, DT_MOVTO, BLOCK, SITUACAO
         FROM fila
        WHERE ID_EMPRESA = ? AND ID_CONF_FILA = ? AND DATE(DT_MOVTO) = CURDATE()
        ORDER BY ID_FILA DESC
        LIMIT 1`,
      [idEmpresa, idConfFila]
    );
    console.log('[publicJoinByToken] filaRows.length =', filaRows.length);

    let idFila;
    if (filaRows.length) {
      const f = filaRows[0];
      if (f.BLOCK) {
        await conn.rollback();
        console.log('[publicJoinByToken] FILA BLOQUEADA');
        return res.status(409).json({ erro: 'fila_blocked' });
      }
      if (f.SITUACAO !== 1) {
        await conn.rollback();
        console.log('[publicJoinByToken] FILA INATIVA');
        return res.status(409).json({ erro: 'fila_inactive' });
      }
      idFila = f.ID_FILA;
    } else {
      const [insFila] = await conn.execute(
        `INSERT INTO fila (ID_EMPRESA, ID_CONF_FILA, DT_MOVTO, DT_INI, BLOCK, SITUACAO)
         VALUES (?, ?, CURDATE(), NOW(), 0, 1)`,
        [idEmpresa, idConfFila]
      );
      idFila = insFila.insertId;
      console.log('[publicJoinByToken] Fila criada | ID_FILA =', idFila);
    }

    // 3) Evita duplicidade por CPF na MESMA fila no DIA
    const [dup] = await conn.execute(
      `SELECT 1
         FROM clientesfila
        WHERE ID_EMPRESA = ? AND ID_FILA = ?
          AND DATE(DT_MOVTO) = CURDATE()
          AND CPFCNPJ = ?
        LIMIT 1`,
      [idEmpresa, idFila, cpf]
    );
    console.log('[publicJoinByToken] já na fila hoje? len =', dup.length);
    if (dup.length) {
      await conn.rollback();
      console.log('[publicJoinByToken] DUPLICIDADE CPF na mesma fila hoje');
      return res.status(409).json({ erro: 'duplicate_today' });
    }

    // 4) ID_CLIENTE (reaproveita último ou gera próximo)
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
      console.log('[publicJoinByToken] Reutilizando ID_CLIENTE =', idCliente);
    } else {
      const [[mx]] = await conn.query(`SELECT COALESCE(MAX(ID_CLIENTE),0)+1 AS nextId FROM clientesfila`);
      idCliente = mx.nextId;
      console.log('[publicJoinByToken] Gerando novo ID_CLIENTE =', idCliente);
    }

    // 5) Inserir cliente
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
    console.log('[publicJoinByToken] Cliente inserido com sucesso');

    // 6) Posição (quantos aguardando antes de mim)
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
    console.log('[publicJoinByToken] posicao =', posicao);

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
