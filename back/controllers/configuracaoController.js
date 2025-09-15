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