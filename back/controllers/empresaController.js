// /back/src/controllers/empresaController.js
const db = require('../database/connection'); // mysql2/promise
const { makeImageAccessUrl, normalizeKey } = require('../utils/image');
const { putToS3, keyEmpresaPerfil } = require('../middlewares/s3Upload');

/** === helpers de schema dinâmico === */
async function getEmpresaColumns() {
  const [cols] = await db.query(`SHOW COLUMNS FROM empresa`);
  return new Set(cols.map(c => c.Field));
}
function resolveEmpresaFieldNames(colset) {
  const idCol      = colset.has('ID_EMPRESA')   ? 'ID_EMPRESA'   : (colset.has('ID') ? 'ID' : null);
  const nomeCol    = colset.has('NOME_EMPRESA') ? 'NOME_EMPRESA' : (colset.has('NOME') ? 'NOME' : null);
  const logoCol    = colset.has('IMG_LOGO')     ? 'IMG_LOGO'     : (colset.has('LOGO') ? 'LOGO' : null);
  const bannerCol  = colset.has('IMG_BANNER')   ? 'IMG_BANNER'   : (colset.has('BANNER') ? 'BANNER' : null);
  const situacaoCol= colset.has('SITUACAO')     ? 'SITUACAO'     : null;
  const enderecoCol= colset.has('ENDERECO') ? 'ENDERECO' : null;
  const cidadeCol  = colset.has('CIDADE')   ? 'CIDADE'   : null;
  const ufCol      = colset.has('UF')       ? 'UF'       : null;
  const cepCol     = colset.has('CEP')      ? 'CEP'      : null;
  return { idCol, nomeCol, logoCol, bannerCol, situacaoCol, enderecoCol, cidadeCol, ufCol, cepCol };
}
function buildEmpresaSelectSQL(fields) {
  const parts = [];
  if (fields.idCol)      parts.push(`e.${fields.idCol} AS ID_EMPRESA`);
  if (fields.nomeCol)    parts.push(`e.${fields.nomeCol} AS NOME_EMPRESA`);
  if (fields.enderecoCol)parts.push(`e.${fields.enderecoCol} AS ENDERECO`);
  if (fields.cidadeCol)  parts.push(`e.${fields.cidadeCol} AS CIDADE`);
  if (fields.ufCol)      parts.push(`e.${fields.ufCol} AS UF`);
  if (fields.cepCol)     parts.push(`e.${fields.cepCol} AS CEP`);
  if (fields.logoCol)    parts.push(`e.${fields.logoCol} AS IMG_LOGO`);
  if (fields.bannerCol)  parts.push(`e.${fields.bannerCol} AS IMG_BANNER`);
  if (fields.situacaoCol)parts.push(`e.${fields.situacaoCol} AS SITUACAO`);
  if (!fields.idCol)       parts.push(`NULL AS ID_EMPRESA`);
  if (!fields.nomeCol)     parts.push(`NULL AS NOME_EMPRESA`);
  if (!fields.logoCol)     parts.push(`NULL AS IMG_LOGO`);
  if (!fields.bannerCol)   parts.push(`NULL AS IMG_BANNER`);
  if (!fields.situacaoCol) parts.push(`1 AS SITUACAO`);

  return `
    SELECT
      ${parts.join(',\n      ')}
    FROM empresa e
    WHERE ${fields.idCol || 'ID_EMPRESA'} = ?
    LIMIT 1
  `;
}

/** Atualiza a coluna correta da logo/perfil */
async function updateEmpresaLogoGeneric(idEmpresa, savedKey) {
  const colset = await getEmpresaColumns();
  const key = normalizeKey(savedKey);

  if (colset.has('IMG_LOGO')) {
    const [r] = await db.query(`UPDATE empresa SET IMG_LOGO = ? WHERE ID_EMPRESA = ?`, [key, idEmpresa]);
    if (r.affectedRows > 0) return;
  }
  if (colset.has('LOGO')) {
    const [r] = await db.query(`UPDATE empresa SET LOGO = ? WHERE ID_EMPRESA = ?`, [key, idEmpresa]);
    if (r.affectedRows > 0) return;
  }
  // fallback se ID_EMPRESA for "ID"
  if (!colset.has('ID_EMPRESA')) {
    if (colset.has('IMG_LOGO')) await db.query(`UPDATE empresa SET IMG_LOGO = ? WHERE ID = ?`, [key, idEmpresa]);
    if (colset.has('LOGO'))     await db.query(`UPDATE empresa SET LOGO = ? WHERE ID = ?`,     [key, idEmpresa]);
  }
}

/** POST /empresas/:id/perfil (field: img_perfil) */
async function uploadPerfilEmpresa(req, res) {
  const idEmpresa = parseInt(req.params.id, 10);
  if (!Number.isFinite(idEmpresa) || idEmpresa <= 0) {
    return res.status(400).json({ error: 'ID da empresa inválido.' });
  }
  try {
    if (!req.file) return res.status(400).json({ error: 'Envie o arquivo em "img_perfil".' });

    const f = req.file;
    const key = keyEmpresaPerfil(idEmpresa, f.mimetype);
    const savedKey = normalizeKey(await putToS3(f.buffer, key, f.mimetype));

    await updateEmpresaLogoGeneric(idEmpresa, savedKey);

    const url = await makeImageAccessUrl(savedKey);
    return res.json({
      message: 'Perfil da empresa atualizado.',
      empresaId: idEmpresa,
      img_perfil: url,     // URL de acesso (pré-assinada, se privado)
      key: savedKey        // caminho relativo salvo no banco
    });
  } catch (err) {
    console.error('[uploadPerfilEmpresa] Erro:', err);
    return res.status(500).json({ error: 'Falha ao subir perfil da empresa.' });
  }
}

/** GET /empresas/:id — gera URLs de acesso (signed/public) */
async function getEmpresa(req, res) {
  const idEmpresa = parseInt(req.params.id, 10);
  if (!Number.isFinite(idEmpresa) || idEmpresa <= 0) {
    return res.status(400).json({ error: 'ID da empresa inválido.' });
  }
  try {
    const colset = await getEmpresaColumns();
    const fields = resolveEmpresaFieldNames(colset);
    if (!fields.idCol) {
      return res.status(500).json({ error: 'Schema inesperado: tabela empresa sem ID_EMPRESA/ID.' });
    }
    const [rows] = await db.query(buildEmpresaSelectSQL(fields), [idEmpresa]);
    if (!rows.length) return res.status(404).json({ error: 'Empresa não encontrada.' });

    const e = rows[0];
    const logoUrl   = e.IMG_LOGO   ? await makeImageAccessUrl(e.IMG_LOGO)   : null;
    const bannerUrl = e.IMG_BANNER ? await makeImageAccessUrl(e.IMG_BANNER) : null;

    return res.json({
      ID_EMPRESA: e.ID_EMPRESA ?? idEmpresa,
      NOME_EMPRESA: e.NOME_EMPRESA ?? null,
      ENDERECO: e.ENDERECO ?? null,
      CIDADE: e.CIDADE ?? null,
      UF: e.UF ?? null,
      CEP: e.CEP ?? null,
      IMG_LOGO: e.IMG_LOGO ?? null,           // caminho relativo
      IMG_BANNER: e.IMG_BANNER ?? null,       // caminho relativo
      IMG_LOGO_URL: logoUrl,
      IMG_BANNER_URL: bannerUrl,
      SITUACAO: Number(e.SITUACAO ?? 1),

      // aliases usados no front:
      id: e.ID_EMPRESA ?? idEmpresa,
      nome: e.NOME_EMPRESA ?? null,
      img_perfil: logoUrl,
      logoUrl,
      _key: e.IMG_LOGO ?? null
    });
  } catch (err) {
    console.error('[getEmpresa] Erro:', err);
    return res.status(500).json({ error: 'Erro ao buscar empresa.' });
  }
}

module.exports = { uploadPerfilEmpresa, getEmpresa };
