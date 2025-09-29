// controllers/configuracaoController.js
const db = require('../database/connection');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { getPublicFrontBaseUrl } = require('../utils/url');
const { makePublicImageUrl } = require('../utils/image');
const { putToS3, keyEmpresaLogoConfig, keyEmpresaBannerConfig } = require('../middlewares/s3Upload');

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
function getApiBase(req) {
  return (process.env.PUBLIC_API_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}
function isWithinRange(ini_vig, fim_vig) {
  const today = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''), 10);
  const toInt = (v) => (v == null ? null : parseInt(String(v), 10));
  const ini = toInt(ini_vig);
  const fim = toInt(fim_vig);
  return (ini == null || today >= ini) && (fim == null || today <= fim);
}
async function execDb(sql, params = []) {
  if (typeof db.execute === 'function') { return db.execute(sql, params); }
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve([result, null]);
    });
  });
}
function parseJsonKeyOrUrl(raw) {
    if (raw == null || raw === '') return { url: '', key: '' };
    try {
        const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const url = obj?.url ? String(obj.url) : '';
        const key = obj?.key ? String(obj.key) : '';
        return { url, key };
    } catch {
        const s = String(raw);
        if (s.startsWith('/uploads/')) return { key: s, url: '' };
        if (/^https?:\/\//i.test(s)) return { url: s, key: '' };
        return { url: s, key: '' };
    }
}
async function ensureImgJsonForConfig(input, { idEmpresa, tipo }) {
    if (!input) return { key: '' };
    const val = typeof input === 'object' ? input : { url: String(input) };
    const str = (val.key || val.url || '').trim();
    if (!str) return { key: '' };
    if (str.startsWith('/uploads/')) { return { key: str }; }
    if (/^https?:\/\//i.test(str)) {
        try {
            const u = new URL(str);
            const cdn = (process.env.S3_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
            if (cdn) {
                const cdnUrl = new URL(cdn);
                if (u.host === cdnUrl.host) return { key: u.pathname };
            }
            const bucket = process.env.S3_BUCKET;
            const region = process.env.AWS_REGION;
            const s3Host = `${bucket}.s3.${region}.amazonaws.com`;
            if (u.host === s3Host) return { key: u.pathname };
            const apiBase = getApiBase({ protocol: u.protocol.replace(':',''), get: () => u.host });
            const apiUrl = new URL(apiBase);
            if (u.host === apiUrl.host && u.pathname.startsWith('/uploads/')) { return { key: u.pathname };}
            return { url: str, key: '' };
        } catch { return { key: '' };}
    }
    const m = str.match(/^data:([^/]+)\/([^;]+);base64,(.+)$/i);
    if (m && m[3]) {
        const mimetype = `${m[1]}/${m[2]}`.toLowerCase();
        const buffer = Buffer.from(m[3].replace(/\s/g, ''), 'base64');
        const key = tipo === 'logo' ? keyEmpresaLogoConfig(idEmpresa, mimetype) : keyEmpresaBannerConfig(idEmpresa, mimetype);
        const savedKey = await putToS3(buffer, key, mimetype);
        return { key: savedKey };
    }
    return { key: '' };
}
async function reflectConfigIntoTodayQueue(conn, idConfFila) {
    const [[cfg]] = await conn.query(`SELECT ID_EMPRESA, INI_VIG, FIM_VIG, SITUACAO FROM ConfiguracaoFila WHERE ID_CONF_FILA = ? LIMIT 1`,[idConfFila]);
    if (!cfg) throw new Error('config_not_found');
    const within_range = isWithinRange(cfg.INI_VIG, cfg.FIM_VIG);
    const effective_active = (cfg.SITUACAO === 1) && within_range;
    const [rowsFila] = await conn.execute(`SELECT ID_FILA, BLOCK, SITUACAO FROM fila WHERE ID_EMPRESA = ? AND ID_CONF_FILA = ? AND DATE(DT_MOVTO) = CURDATE() ORDER BY ID_FILA DESC LIMIT 1`,[cfg.ID_EMPRESA, idConfFila]);
    if (!effective_active) {
        if (rowsFila.length) {
            await conn.execute(`UPDATE fila SET BLOCK = 1, SITUACAO = 0 WHERE ID_FILA = ?`, [rowsFila[0].ID_FILA]);
        } else {
            await conn.execute(`INSERT INTO fila (ID_EMPRESA, ID_CONF_FILA, DT_MOVTO, DT_INI, BLOCK, SITUACAO) VALUES (?, ?, CURDATE(), NOW(), 1, 0)`,[cfg.ID_EMPRESA, idConfFila]);
        }
    } else {
        if (rowsFila.length) {
            const currentBlock = rowsFila[0].BLOCK ? 1 : 0;
            await conn.execute(`UPDATE fila SET BLOCK = ?, SITUACAO = 1 WHERE ID_FILA = ?`, [currentBlock, rowsFila[0].ID_FILA]);
        } else {
            await conn.execute(`INSERT INTO fila (ID_EMPRESA, ID_CONF_FILA, DT_MOVTO, DT_INI, BLOCK, SITUACAO) VALUES (?, ?, CURDATE(), NOW(), 0, 1)`,[cfg.ID_EMPRESA, idConfFila]);
        }
    }
    return { effective_active, within_range };
}

exports.uploadImagensConfiguracao = async(req, res) => {
  const idConfig = parseInt(req.params.id, 10);
  if (!Number.isFinite(idConfig)) { return res.status(400).json({ error: 'ID da configuração inválido.' }); }
  try {
    const [cfgRows] = await db.query('SELECT ID_EMPRESA, IMG_LOGO, IMG_BANNER FROM configuracaofila WHERE ID_CONF_FILA = ? LIMIT 1',[idConfig]);
    if (!cfgRows.length) return res.status(404).json({ error: 'Configuração não encontrada.' });
    const idEmpresa = cfgRows[0].ID_EMPRESA;
    const files = req.files || {};
    const updates = {};
    const retorno = {};
    if (files.img_logo?.[0]) {
      const f = files.img_logo[0];
      const key = keyEmpresaLogoConfig(idEmpresa, f.mimetype);
      const savedKey = await putToS3(f.buffer, key, f.mimetype);
      updates.IMG_LOGO = JSON.stringify({ key: savedKey });
      retorno.img_logo = { key: savedKey, url: makePublicImageUrl(savedKey) };
    }
    if (files.img_banner?.[0]) {
      const f = files.img_banner[0];
      const key = keyEmpresaBannerConfig(idEmpresa, f.mimetype);
      const savedKey = await putToS3(f.buffer, key, f.mimetype);
      updates.IMG_BANNER = JSON.stringify({ key: savedKey });
      retorno.img_banner = { key: savedKey, url: makePublicImageUrl(savedKey) };
    }
    if (Object.keys(updates).length === 0) { return res.status(400).json({ error: 'Nenhuma imagem enviada.' }); }
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    await db.query(`UPDATE configuracaofila SET ${fields} WHERE ID_CONF_FILA = ?`,[...values, idConfig]);
    return res.json({ message: 'Imagens da configuração atualizadas com sucesso.', configuracaoId: idConfig, imagens: retorno });
  } catch (err) {
    console.error('[uploadImagensConfiguracao] Erro:', err);
    return res.status(500).json({ error: 'Falha ao subir imagens da configuração.' });
  }
}

exports.getConfiguracao = async(req, res) => {
  const idConfig = parseInt(req.params.id, 10);
  if (!Number.isFinite(idConfig)) { return res.status(400).json({ error: 'ID da configuração inválido.' }); }
  try {
    const [rows] = await db.query(`SELECT ID_CONF_FILA, ID_EMPRESA, NOME_FILA, IMG_LOGO, IMG_BANNER FROM configuracaofila WHERE ID_CONF_FILA = ?`,[idConfig]);
    if (!rows.length) return res.status(404).json({ error: 'Configuração não encontrada.' });
    const c = rows[0];
    const parseJson = (v) => { try { return v ? JSON.parse(v) : null; } catch { return null; } };
    const logoJson = parseJson(c.IMG_LOGO);
    const bannerJson = parseJson(c.IMG_BANNER);
    return res.json({
      id: c.ID_CONF_FILA,
      id_empresa: c.ID_EMPRESA,
      nome: c.NOME_FILA,
      img_logo:   logoJson   ? { key: logoJson.key,   url: makePublicImageUrl(logoJson.key) }   : null,
      img_banner: bannerJson ? { key: bannerJson.key, url: makePublicImageUrl(bannerJson.key) } : null
    });
  } catch (err) {
    console.error('[getConfiguracao] Erro:', err);
    return res.status(500).json({ error: 'Erro ao buscar configuração.' });
  }
}

exports.cadastrarConfiguracaoFila = async (req, res) => {
  const { id_empresa, nome_fila, ini_vig, fim_vig, campos, mensagem, img_banner, img_logo, temp_tol, qtde_min, qtde_max, per_sair, per_loc, situacao } = req.body;
  if (!id_empresa || !nome_fila) { return res.status(400).json({ erro: 'Campos obrigatórios ausentes.' });}
  const iniVigInt     = parseDateYyyyMmDdToInt(ini_vig);
  const fimVigInt     = parseDateYyyyMmDdToInt(fim_vig);
  const perSairTiny   = boolToTinyint(per_sair);
  const perLocTiny    = boolToTinyint(per_loc);
  const situacaoInt   = toIntOrNull(situacao) ?? 1;
  const parsedTempTol = toIntOrNull(temp_tol);
  const parsedQtdeMin = toIntOrNull(qtde_min);
  const parsedQtdeMax = toIntOrNull(qtde_max);
  const token_fila = uuidv4();
  const bannerJson = await ensureImgJsonForConfig(img_banner, { idEmpresa: id_empresa, tipo: 'banner' });
  const logoJson   = await ensureImgJsonForConfig(img_logo,   { idEmpresa: id_empresa, tipo: 'logo' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.execute(`INSERT INTO ConfiguracaoFila (ID_EMPRESA, NOME_FILA, TOKEN_FILA, INI_VIG, FIM_VIG, CAMPOS, MENSAGEM, IMG_BANNER, IMG_LOGO, TEMP_TOL, QDTE_MIN, QTDE_MAX, PER_SAIR, PER_LOC, SITUACAO) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,[id_empresa, nome_fila, token_fila, iniVigInt, fimVigInt, JSON.stringify(campos || {}), mensagem || '', JSON.stringify(bannerJson), JSON.stringify(logoJson), parsedTempTol, parsedQtdeMin, parsedQtdeMax, perSairTiny, perLocTiny, situacaoInt]);
    const id_conf_fila = result && (result.insertId ?? null);
    const { effective_active, within_range } = await reflectConfigIntoTodayQueue(conn, id_conf_fila);
    await conn.commit();
    const baseUrl = getPublicFrontBaseUrl(req);
    const join_url = `${baseUrl}/entrar-fila/${token_fila}`;
    let qr_data_url = null;
    try { qr_data_url = await QRCode.toDataURL(join_url, { margin: 1, width: 256 }); } catch (e) { console.error('Erro ao gerar QR:', e); }
    return res.status(201).json({ mensagem: 'Fila configurada com sucesso!', token_fila, join_url, qr_data_url, id_conf_fila, effective_active, within_range });
  } catch (err) {
    await conn.rollback();
    console.error('Erro ao inserir ConfiguracaoFila:', err);
    return res.status(500).json({ erro: 'Erro interno ao salvar configuração.' });
  } finally {
    conn.release();
  }
};

exports.buscarConfiguracaoFilaPorId = async (req, res) => {
  const { id } = req.params;
  const sql = `SELECT * FROM ConfiguracaoFila WHERE ID_CONF_FILA = ?`;
  try {
    const [rows] = await execDb(sql, [id]);
    const results = Array.isArray(rows) ? rows : [];
    if (!results.length) { return res.status(404).json({ mensagem: 'Configuração de fila não encontrada.' }); }
    const r = { ...results[0] };
    let campos = {};
    try { campos = r.CAMPOS ? JSON.parse(r.CAMPOS) : {}; } catch {}
    const banner = parseJsonKeyOrUrl(r.IMG_BANNER);
    const logo   = parseJsonKeyOrUrl(r.IMG_LOGO);
    const bannerUrl = banner.key ? makePublicImageUrl(banner.key) : (banner.url || '');
    const logoUrl   = logo.key   ? makePublicImageUrl(logo.key)   : (logo.url || '');
    const toDateStr = (n) => {
      if (!n) return '';
      const s = String(n).padStart(8, '0');
      return `${s.substring(0,4)}-${s.substring(4,6)}-${s.substring(6,8)}`;
    };
    const within_range = isWithinRange(r.INI_VIG, r.FIM_VIG);
    const effective_active = (r.SITUACAO === 1) && within_range;
    const situacao_exibicao = effective_active ? 1 : 0;
    return res.status(200).json({ id_conf_fila: r.ID_CONF_FILA, id_empresa: r.ID_EMPRESA, nome_fila: r.NOME_FILA, token_fila: r.TOKEN_FILA, ini_vig: toDateStr(r.INI_VIG), fim_vig: toDateStr(r.FIM_VIG), campos, mensagem: r.MENSAGEM, img_banner: banner.key ? { key: banner.key, url: bannerUrl } : (banner.url ? { url: bannerUrl } : null), img_logo: logo.key ? { key: logo.key, url: logoUrl } : (logo.url ? { url: logoUrl } : null), temp_tol: r.TEMP_TOL, qtde_min: r.QDTE_MIN, qtde_max: r.QTDE_MAX, per_sair: r.PER_SAIR === 1, per_loc: r.PER_LOC === 1, situacao: r.SITUACAO, within_range, effective_active, situacao_exibicao });
  } catch (err) {
    console.error('Erro ao buscar configuração de fila por ID:', err);
    return res.status(500).json({ erro: 'Erro interno ao buscar configuração de fila.', detalhes: err.message });
  }
};

exports.atualizarConfiguracaoFila = async (req, res) => {
  const { id } = req.params;
  const { id_empresa, nome_fila, ini_vig, fim_vig, campos, mensagem, img_banner, img_logo, temp_tol, qtde_min, qtde_max, per_sair, per_loc, situacao } = req.body;
  if (!id_empresa || !nome_fila) { return res.status(400).json({ erro: 'Campos obrigatórios ausentes: ID da Empresa e Nome da Fila.' });}
  const iniVigInt = parseDateYyyyMmDdToInt(ini_vig);
  const fimVigInt = parseDateYyyyMmDdToInt(fim_vig);
  const perSairTiny = boolToTinyint(per_sair);
  const perLocTiny = boolToTinyint(per_loc);
  const situacaoInt = toIntOrNull(situacao);
  const parsedTempTol = toIntOrNull(temp_tol);
  const parsedQtdeMin = toIntOrNull(qtde_min);
  const parsedQtdeMax = toIntOrNull(qtde_max);
  if (situacaoInt !== 0 && situacaoInt !== 1) { return res.status(400).json({ erro: 'Formato inválido para SITUACAO. Esperado 0 ou 1.' });}
  const bannerJson = await ensureImgJsonForConfig(img_banner, { idEmpresa: id_empresa, tipo: 'banner' });
  const logoJson   = await ensureImgJsonForConfig(img_logo,   { idEmpresa: id_empresa, tipo: 'logo' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [updResult] = await conn.execute(`UPDATE ConfiguracaoFila SET ID_EMPRESA = ?, NOME_FILA = ?, INI_VIG = ?, FIM_VIG = ?, CAMPOS = ?, MENSAGEM = ?, IMG_BANNER = ?, IMG_LOGO = ?, TEMP_TOL = ?, QDTE_MIN = ?, QTDE_MAX = ?, PER_SAIR = ?, PER_LOC = ?, SITUACAO = ? WHERE ID_CONF_FILA = ?`,[id_empresa, nome_fila, iniVigInt, fimVigInt, JSON.stringify(campos || {}), mensagem || '', JSON.stringify(bannerJson), JSON.stringify(logoJson), parsedTempTol, parsedQtdeMin, parsedQtdeMax, perSairTiny, perLocTiny, situacaoInt, id]);
    const affected = typeof updResult?.affectedRows === 'number' ? updResult.affectedRows : (Array.isArray(updResult) ? updResult.length : 0);
    if (!affected) { await conn.rollback(); return res.status(404).json({ mensagem: 'Configuração de fila não encontrada para atualização.' }); }
    const { effective_active, within_range } = await reflectConfigIntoTodayQueue(conn, id);
    await conn.commit();
    return res.status(200).json({ mensagem: 'Configuração de fila atualizada com sucesso.', effective_active, within_range });
  } catch (err) {
    await conn.rollback();
    console.error('Erro ao atualizar ConfiguracaoFila (com refletir fila):', err);
    return res.status(500).json({ erro: 'Erro interno ao atualizar configuração.', detalhes: err.message });
  } finally {
    conn.release();
  }
};

exports.excluirConfiguracaoFila = async (req, res) => {
  const idConf = parseInt(req.params.id, 10);
  const idEmpresa = Number(req.query.idEmpresa || req.headers['x-empresa-id'] || req.body?.id_empresa);
  if (!Number.isFinite(idConf)) { return res.status(400).json({ erro: 'ID da configuração inválido.' }); }
  if (!idEmpresa) { return res.status(400).json({ erro: 'idEmpresa é obrigatório.' }); }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [cfgRows] = await conn.execute(`SELECT ID_CONF_FILA, ID_EMPRESA, IMG_LOGO, IMG_BANNER FROM ConfiguracaoFila WHERE ID_CONF_FILA = ? LIMIT 1`,[idConf]);
    if (!cfgRows.length) { await conn.rollback(); return res.status(404).json({ erro: 'config_not_found' }); }
    if (cfgRows[0].ID_EMPRESA !== idEmpresa) { await conn.rollback(); return res.status(403).json({ erro: 'forbidden' }); }
    const [rowsFilas] = await conn.execute(`SELECT ID_FILA FROM fila WHERE ID_EMPRESA = ? AND ID_CONF_FILA = ?`,[idEmpresa, idConf]);
    const filaIds = rowsFilas.map(r => r.ID_FILA);
    let delClientes = 0;
    let delFilas = 0;
    let delCfg = 0;
    if (filaIds.length > 0) {
      const placeholders = filaIds.map(() => '?').join(',');
      const params = [idEmpresa, ...filaIds];
      const [resDelCli] = await conn.execute(`DELETE FROM clientesfila WHERE ID_EMPRESA = ? AND ID_FILA IN (${placeholders})`,params);
      delClientes = resDelCli?.affectedRows ?? 0;
      const [resDelFila] = await conn.execute(`DELETE FROM fila WHERE ID_EMPRESA = ? AND ID_FILA IN (${placeholders})`,params);
      delFilas = resDelFila?.affectedRows ?? 0;
    }
    const [resDelCfg] = await conn.execute(`DELETE FROM ConfiguracaoFila WHERE ID_CONF_FILA = ? AND ID_EMPRESA = ?`,[idConf, idEmpresa]);
    delCfg = resDelCfg?.affectedRows ?? 0;
    if (!delCfg) { await conn.rollback(); return res.status(404).json({ erro: 'config_not_found' }); }
    await conn.commit();
    return res.status(200).json({ mensagem: 'Configuração excluída com sucesso.', removidos: { clientes: delClientes, filas: delFilas, configuracao: delCfg } });
  } catch (err) {
    await conn.rollback();
    if (err && (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451)) { return res.status(409).json({ erro: 'constraint_violation', detalhe: 'Configuração referenciada por outros registros.' }); }
    console.error('[excluirConfiguracaoFila] Erro:', err);
    return res.status(500).json({ erro: 'Erro interno ao excluir configuração.', detalhes: err.message });
  } finally {
    conn.release();
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

exports.listarConfiguracoesDaEmpresa = async (req, res) => {
  const idEmpresa = Number(req.query.idEmpresa || req.headers['x-empresa-id']);
  if (!idEmpresa) return res.status(400).json({ erro: 'idEmpresa é obrigatório.' });
  const sql = `SELECT ID_CONF_FILA, ID_EMPRESA, NOME_FILA, TOKEN_FILA, INI_VIG, FIM_VIG, CAMPOS, MENSAGEM, IMG_BANNER, IMG_LOGO, TEMP_TOL, QDTE_MIN, QTDE_MAX, PER_SAIR, PER_LOC, SITUACAO FROM ConfiguracaoFila WHERE ID_EMPRESA = ? ORDER BY NOME_FILA ASC`;
  const toDateStr = (n) => {
    if (!n) return '';
    const s = String(n).padStart(8, '0');
    return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  };
  try {
    const [rows] = await execDb(sql, [idEmpresa]);
    const list = rows.map((r) => {
      let campos = {};
      try { campos = r.CAMPOS ? JSON.parse(r.CAMPOS) : {}; } catch {}
      const banner = parseJsonKeyOrUrl(r.IMG_BANNER);
      const logo   = parseJsonKeyOrUrl(r.IMG_LOGO);
      const bannerUrl = banner.key ? makePublicImageUrl(banner.key) : (banner.url || '');
      const logoUrl   = logo.key   ? makePublicImageUrl(logo.key)   : (logo.url || '');
      const within_range = isWithinRange(r.INI_VIG, r.FIM_VIG);
      const effective_active = (r.SITUACAO === 1) && within_range;
      const situacao_exibicao = effective_active ? 1 : 0;
      return { id_conf_fila: r.ID_CONF_FILA, id_empresa: r.ID_EMPRESA, nome_fila: r.NOME_FILA, token_fila: r.TOKEN_FILA, ini_vig: toDateStr(r.INI_VIG), fim_vig: toDateStr(r.FIM_VIG), campos, mensagem: r.MENSAGEM, img_banner: banner.key ? { key: banner.key, url: bannerUrl } : (banner.url ? { url: bannerUrl } : null), img_logo: logo.key ? { key: logo.key, url: logoUrl } : (logo.url ? { url: logoUrl } : null), temp_tol: r.TEMP_TOL, qtde_min: r.QDTE_MIN, qtde_max: r.QTDE_MAX, per_sair: r.PER_SAIR === 1, per_loc: r.PER_LOC === 1, situacao: r.SITUACAO, within_range, effective_active, situacao_exibicao, join_url: `${getPublicFrontBaseUrl(req)}/entrar-fila/${r.TOKEN_FILA}`, };
    });
    return res.json(list);
  } catch (err) {
    console.error('Erro ao listar configurações de fila:', err);
    return res.status(500).json({ erro: 'Erro ao listar configurações.' });
  }
};

exports.getPublicInfoByToken = async (req, res) => {
  const { token } = req.params;
  const sql = `SELECT cf.ID_CONF_FILA, cf.ID_EMPRESA, cf.NOME_FILA, cf.TOKEN_FILA, cf.INI_VIG, cf.FIM_VIG, cf.CAMPOS, cf.MENSAGEM, cf.IMG_BANNER, cf.IMG_LOGO, cf.TEMP_TOL, cf.QDTE_MIN, cf.QTDE_MAX, cf.PER_SAIR, cf.PER_LOC, cf.SITUACAO, e.NOME_EMPRESA FROM ConfiguracaoFila cf JOIN empresa e ON e.ID_EMPRESA = cf.ID_EMPRESA WHERE cf.TOKEN_FILA = ? LIMIT 1`;
  try {
    const [rows] = await db.execute(sql, [token]);
    if (!rows.length) return res.status(404).json({ erro: 'config_not_found' });
    const r = rows[0];
    let campos = [];
    try { campos = r.CAMPOS ? JSON.parse(r.CAMPOS) : []; } catch {}
    const banner = parseJsonKeyOrUrl(r.IMG_BANNER);
    const logo   = parseJsonKeyOrUrl(r.IMG_LOGO);
    const bannerUrl = banner.key ? makePublicImageUrl(banner.key) : (banner.url || '');
    const logoUrl   = logo.key   ? makePublicImageUrl(logo.key)   : (logo.url || '');
    const within_range = isWithinRange(r.INI_VIG, r.FIM_VIG);
    const effective_active = (r.SITUACAO === 1) && within_range;
    return res.json({ id_conf_fila: r.ID_CONF_FILA, id_empresa: r.ID_EMPRESA, nome_fila: r.NOME_FILA, token_fila: r.TOKEN_FILA, situacao: r.SITUACAO, ini_vig: r.INI_VIG || null, fim_vig: r.FIM_VIG || null, campos, mensagem: r.MENSAGEM || '', img_banner: banner.key ? { key: banner.key, url: bannerUrl } : (banner.url ? { url: bannerUrl } : null), img_logo: logo.key ? { key: logo.key, url: logoUrl } : (logo.url ? { url: logoUrl } : null), temp_tol: r.TEMP_TOL, qtde_min: r.QDTE_MIN, qtde_max: r.QTDE_MAX, per_sair: !!r.PER_SAIR, per_loc: !!r.PER_LOC, join_url: `${getPublicFrontBaseUrl(req)}/entrar-fila/${r.TOKEN_FILA}`, empresa: { id: r.ID_EMPRESA, nome: r.NOME_EMPRESA, logo_url: logoUrl || '' }, within_range, effective_active, situacao_exibicao: effective_active ? 1 : 0 });
  } catch (e) {
    console.error('[getPublicInfoByToken] ERRO:', e);
    return res.status(500).json({ erro: 'internal_error' });
  }
};

exports.publicJoinByToken = async (req, res, io) => {
    const { token } = req.params;
    const { nome, cpf, rg = null, dddcel = null, nr_cel = null, email = null, dt_nasc = null, nr_qtdpes = 1 } = req.body;
    if (!nome || !cpf) { return res.status(400).json({ erro: 'Nome e CPF são obrigatórios.' }); }
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [cfgRows] = await conn.execute(`SELECT ID_CONF_FILA, ID_EMPRESA, NOME_FILA, SITUACAO, INI_VIG, FIM_VIG FROM ConfiguracaoFila WHERE TOKEN_FILA = ? LIMIT 1`,[token]);
        if (!cfgRows.length) { await conn.rollback(); return res.status(404).json({ erro: 'config_not_found' }); }
        const cfg = cfgRows[0];
        const within_range = isWithinRange(cfg.INI_VIG, cfg.FIM_VIG);
        if (!(cfg.SITUACAO === 1 && within_range)) { await conn.rollback(); return res.status(409).json({ erro: within_range ? 'config_inactive' : 'config_out_of_range' });}
        const idEmpresa = cfg.ID_EMPRESA;
        const idConfFila = cfg.ID_CONF_FILA;
        const [filaRows] = await conn.execute(`SELECT ID_FILA, DT_MOVTO, BLOCK, SITUACAO FROM fila WHERE ID_EMPRESA = ? AND ID_CONF_FILA = ? AND DATE(DT_MOVTO) = CURDATE() ORDER BY ID_FILA DESC LIMIT 1`,[idEmpresa, idConfFila]);
        let idFila;
        if (filaRows.length) {
            const f = filaRows[0];
            if (f.BLOCK) { await conn.rollback(); return res.status(409).json({ erro: 'fila_blocked' });}
            if (f.SITUACAO !== 1) { await conn.rollback(); return res.status(409).json({ erro: 'fila_inactive' });}
            idFila = f.ID_FILA;
        } else {
            const [insFila] = await conn.execute(`INSERT INTO fila (ID_EMPRESA, ID_CONF_FILA, DT_MOVTO, DT_INI, BLOCK, SITUACAO) VALUES (?, ?, CURDATE(), NOW(), 0, 1)`,[idEmpresa, idConfFila]);
            idFila = insFila.insertId;
        }
        const [dup] = await conn.execute(`SELECT ID_CLIENTE, DT_ENTRA FROM clientesfila WHERE ID_EMPRESA = ? AND ID_FILA = ? AND DATE(DT_MOVTO) = CURDATE() AND CPFCNPJ = ? ORDER BY DT_ENTRA DESC LIMIT 1`,[idEmpresa, idFila, cpf]);
        if (dup.length) {
            const mine = dup[0];
            const [[ahead]] = await conn.query(`SELECT COUNT(*) AS ahead FROM clientesfila WHERE ID_EMPRESA = ? AND ID_FILA = ? AND DATE(DT_MOVTO) = CURDATE() AND SITUACAO IN (0,3) AND DT_ENTRA < ?`,[idEmpresa, idFila, mine.DT_ENTRA]);
            const posicao = (ahead?.ahead ?? 0) + 1;
            await conn.commit();
            return res.status(200).json({ mensagem: 'Você já está na fila hoje.', duplicated: true, id_empresa: idEmpresa, id_fila: idFila, id_cliente: mine.ID_CLIENTE, dt_movto: new Date().toISOString().slice(0, 10), posicao });
        }
        const [clienteExist] = await conn.execute(`SELECT ID_CLIENTE FROM clientesfila WHERE CPFCNPJ = ? ORDER BY DT_ENTRA DESC LIMIT 1`,[cpf]);
        let idCliente;
        if (clienteExist.length) {
            idCliente = clienteExist[0].ID_CLIENTE;
        } else {
            const [[mx]] = await conn.query(`SELECT COALESCE(MAX(ID_CLIENTE),0)+1 AS nextId FROM clientesfila`);
            idCliente = mx.nextId;
        }
        const qtd = Number.isFinite(Number(nr_qtdpes)) ? Number(nr_qtdpes) : 1;
        await conn.execute(`INSERT INTO clientesfila (ID_EMPRESA, DT_MOVTO, ID_FILA, ID_CLIENTE, CPFCNPJ, RG, NOME, DT_NASC, EMAIL, NR_QTDPES, DDDCEL, NR_CEL, DT_ENTRA, SITUACAO) VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,[idEmpresa, idFila, idCliente, cpf, rg, nome, dt_nasc || null, email, qtd, dddcel, nr_cel]);
        const [[posRow]] = await conn.query(`SELECT COUNT(*) AS ahead FROM clientesfila WHERE ID_EMPRESA = ? AND ID_FILA = ? AND DATE(DT_MOVTO) = CURDATE() AND SITUACAO IN (0,3) AND DT_ENTRA < (SELECT DT_ENTRA FROM clientesfila WHERE ID_EMPRESA=? AND ID_FILA=? AND ID_CLIENTE=? AND DATE(DT_MOVTO)=CURDATE() LIMIT 1)`,[idEmpresa, idFila, idEmpresa, idFila, idCliente]);
        const posicao = (posRow?.ahead ?? 0) + 1;
        await conn.commit();
        if (io) {
            io.emit('cliente_atualizado', {
                idEmpresa: idEmpresa, idFila: idFila, idCliente: idCliente, novaSituacao: 0
            });
        }
        return res.status(201).json({ mensagem: 'Cliente inserido na fila com sucesso.', id_empresa: idEmpresa, id_fila: idFila, id_cliente: idCliente, dt_movto: new Date().toISOString().slice(0, 10), posicao });
    } catch (e) {
        await conn.rollback();
        console.error('[publicJoinByToken] ERRO:', e);
        return res.status(500).json({ erro: 'internal_error' });
    } finally {
        conn.release();
    }
};

exports.contarFilasPorEmpresa = async (req, res) => {
  const { id_empresa } = req.params;
  if (!id_empresa) { return res.status(400).json({ erro: 'ID da empresa é obrigatório.' }); }
  const sql = `SELECT COUNT(*) AS totalFilas FROM ConfiguracaoFila WHERE ID_EMPRESA = ?`;
  try {
    const [results] = await db.execute(sql, [id_empresa]);
    const totalFilas = results[0].totalFilas || 0;
    res.status(200).json({ id_empresa, totalFilas });
  } catch (err) {
    console.error('Erro ao contar filas por empresa:', err);
    res.status(500).json({ erro: 'Erro interno ao contar filas.', detalhes: err.message });
  }
};

exports.listarFilasPorEmpresa = async (req, res) => {
  const { id_empresa } = req.params;
  if (!id_empresa) { return res.status(400).json({ erro: 'ID da empresa é obrigatório.' }); }
  const sql = `
  SELECT cf.ID_CONF_FILA, cf.NOME_FILA, COALESCE(COUNT(clf.ID_CLIENTE), 0) AS contagem, cf.DT_CRIACAO AS data_configuracao, cf.DT_ALTERACAO AS data_atualizacao
  FROM configuracaofila cf
  LEFT JOIN fila f ON f.ID_CONF_FILA = cf.ID_CONF_FILA
  LEFT JOIN clientesfila clf ON clf.ID_FILA = f.ID_FILA AND clf.ID_EMPRESA = ?
  WHERE cf.ID_EMPRESA = ?
  GROUP BY cf.ID_CONF_FILA, cf.NOME_FILA, cf.DT_CRIACAO, cf.DT_ALTERACAO
  ORDER BY data_configuracao DESC;`;
  try {
    const [results] = await db.execute(sql, [id_empresa, id_empresa]);
    res.status(200).json(results);
  } catch (err) {
    console.error('Erro ao listar filas por empresa:', err);
    res.status(500).json({ erro: 'Erro interno ao listar filas.', detalhes: err.message });
  }
};

exports.getPublicStatusByToken = async (req, res) => {
  const { token } = req.params;
  const idCliente = Number(req.query.idCliente || req.query.clienteFilaId || 0) || null;
  try {
    const [[cfg]] = await db.query(`SELECT cf.ID_CONF_FILA, cf.ID_EMPRESA, cf.NOME_FILA, cf.SITUACAO, cf.PER_SAIR, cf.INI_VIG, cf.FIM_VIG, f.ID_FILA, f.SITUACAO AS SITUACAO_DIA, f.BLOCK FROM ConfiguracaoFila cf LEFT JOIN fila f ON f.ID_EMPRESA = cf.ID_EMPRESA AND f.ID_CONF_FILA = cf.ID_CONF_FILA AND DATE(f.DT_MOVTO) = CURDATE() WHERE cf.TOKEN_FILA = ? LIMIT 1`,[token]);
    if (!cfg) return res.status(404).json({ message: 'Configuração não encontrada.' });
    const vigente = isWithinRange(cfg.INI_VIG, cfg.FIM_VIG);
    const cfgAtiva = (cfg.SITUACAO === 1) && vigente;
    const filaHojeAtiva = !!cfg.ID_FILA && cfg.SITUACAO_DIA === 1 && cfg.BLOCK !== 1;
    let posicaoCliente = null;
    let isChamado = false;
    let dtChama = null;
    if (idCliente && cfg.ID_FILA) {
      const [[mine]] = await db.query(`SELECT DT_ENTRA, SITUACAO, DT_CHAMA FROM clientesfila WHERE ID_EMPRESA = ? AND ID_FILA = ? AND DATE(DT_MOVTO) = CURDATE() AND ID_CLIENTE = ? ORDER BY DT_ENTRA DESC LIMIT 1`,[cfg.ID_EMPRESA, cfg.ID_FILA, idCliente]);
      if (mine?.DT_ENTRA) {
        const [[ahead]] = await db.query(`SELECT COUNT(*) AS AHEAD FROM clientesfila WHERE ID_EMPRESA = ? AND ID_FILA = ? AND DATE(DT_MOVTO) = CURDATE() AND SITUACAO IN (0,3) AND DT_ENTRA < ?`,[cfg.ID_EMPRESA, cfg.ID_FILA, mine.DT_ENTRA]);
        posicaoCliente = Number(ahead?.AHEAD || 0) + 1;
      }
      if (mine) {
        isChamado = (mine.SITUACAO === 3) || !!mine.DT_CHAMA;
        dtChama = mine.DT_CHAMA || null;
      }
    }
    const [[avg]] = await db.query(`SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, fc.DT_ENTRA, COALESCE(fc.DT_APRE, fc.DT_SAIDA, NOW())))) AS MEDIA_MIN FROM clientesfila fc WHERE fc.ID_EMPRESA = ? AND fc.ID_FILA = ? AND DATE(fc.DT_MOVTO) = CURDATE() AND fc.SITUACAO NOT IN (0,3)`,[cfg.ID_EMPRESA, cfg.ID_FILA || 0]);
    return res.json({ empresa: { ID_EMPRESA: cfg.ID_EMPRESA, NOME: cfg.NOME_FILA }, fila: { ID_FILA: cfg.ID_FILA || null, ativaHoje: filaHojeAtiva, bloqueadaHoje: cfg.BLOCK === 1 }, idEmpresa: cfg.ID_EMPRESA, idFila: cfg.ID_FILA || null, dtMovto: new Date().toISOString().slice(0, 10), posicaoCliente, mediaEsperaMin: avg?.MEDIA_MIN ?? null, podeSair: !!cfg.PER_SAIR, cfgAtiva, clienteFilaId: idCliente || null, isChamado, dtChama });
  } catch (e) {
    console.error('[getPublicStatusByToken] ERRO:', e);
    return res.status(500).json({ message: 'Erro ao consultar status.' });
  }
};

exports.publicLeaveByToken = async (req, res, io) => {
  const { token } = req.params;
  const idCliente = Number(req.body.idCliente || req.body.clienteFilaId || 0) || null;
  if (!idCliente) { return res.status(400).json({ message: 'idCliente (ou clienteFilaId) é obrigatório.' }); }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[cfg]] = await conn.query(`SELECT cf.ID_EMPRESA, cf.ID_CONF_FILA, cf.PER_SAIR, f.ID_FILA FROM ConfiguracaoFila cf LEFT JOIN fila f ON f.ID_EMPRESA = cf.ID_EMPRESA AND f.ID_CONF_FILA = cf.ID_CONF_FILA AND DATE(f.DT_MOVTO) = CURDATE() WHERE cf.TOKEN_FILA = ? LIMIT 1`,[token]);
    if (!cfg) { await conn.rollback(); return res.status(404).json({ message: 'Configuração não encontrada.' }); }
    if (cfg.PER_SAIR !== 1) { await conn.rollback(); return res.status(403).json({ message: 'Esta fila não permite sair pelo público.' });}
    if (!cfg.ID_FILA) { await conn.rollback(); return res.status(409).json({ message: 'Fila do dia indisponível.' });}
    const [upd] = await conn.query(`UPDATE clientesfila SET SITUACAO = 4, DT_SAIDA = NOW() WHERE ID_EMPRESA = ? AND ID_FILA = ? AND DATE(DT_MOVTO) = CURDATE() AND ID_CLIENTE = ? AND SITUACAO IN (0,3)`,[cfg.ID_EMPRESA, cfg.ID_FILA, idCliente]);
    await conn.commit();
    try {
      if (io) {
        io.to(`empresa:${cfg.ID_EMPRESA}`).emit('cliente_atualizado', { idEmpresa: cfg.ID_EMPRESA, idFila: cfg.ID_FILA, clienteFilaId: idCliente, acao: 'desistiu' });
        io.to(`empresa:${cfg.ID_EMPRESA}`).emit('dashboard:tick', { now: Date.now() });
      }
    } catch {}
    return res.json({ ok: true, affected: upd?.affectedRows || 0 });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    console.error('[publicLeaveByToken] ERRO:', e);
    return res.status(500).json({ message: 'Erro ao sair da fila.' });
  } finally {
    conn.release();
  }
};

exports.publicConfirmByToken = async (req, res, io) => {
  const { token } = req.params;
  const idCliente = Number(req.body.idCliente || req.body.clienteFilaId || 0) || null;
  if (!idCliente) { return res.status(400).json({ message: 'idCliente (ou clienteFilaId) é obrigatório.' }); }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[cfg]] = await conn.query(`SELECT cf.ID_EMPRESA, cf.ID_CONF_FILA, f.ID_FILA FROM ConfiguracaoFila cf LEFT JOIN fila f ON f.ID_EMPRESA = cf.ID_EMPRESA AND f.ID_CONF_FILA = cf.ID_CONF_FILA AND DATE(f.DT_MOVTO) = CURDATE() WHERE cf.TOKEN_FILA = ? LIMIT 1`,[token]);
    if (!cfg || !cfg.ID_FILA) { await conn.rollback(); return res.status(404).json({ message: 'Fila do dia indisponível.' }); }
    const [upd] = await conn.query(`UPDATE clientesfila SET DT_APRE = NOW() WHERE ID_EMPRESA = ? AND ID_FILA = ? AND DATE(DT_MOVTO) = CURDATE() AND ID_CLIENTE = ? AND SITUACAO IN (0,3)`,[cfg.ID_EMPRESA, cfg.ID_FILA, idCliente]);
    await conn.commit();
    try {
      if (io) {
        io.to(`empresa:${cfg.ID_EMPRESA}`).emit('cliente_atualizado', { idEmpresa: cfg.ID_EMPRESA, idFila: cfg.ID_FILA, clienteFilaId: idCliente, acao: 'confirmou' });
        io.to(`empresa:${cfg.ID_EMPRESA}`).emit('dashboard:tick', { now: Date.now() });
      }
    } catch {}
    return res.json({ ok: true, affected: upd?.affectedRows || 0 });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    console.error('[publicConfirmByToken] ERRO:', e);
    return res.status(500).json({ message: 'Erro ao confirmar presença.' });
  } finally {
    conn.release();
  }
};