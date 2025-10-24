// back/src/controllers/empresaController.js
const db = require('../database/connection'); // mysql2/promise
let { makePublicImageUrl } = (() => {
  try {
    return require('../utils/image');
  } catch {
    return { makePublicImageUrl: undefined };
  }
})();

const { putToS3, keyEmpresaPerfil } = require('../middlewares/s3Upload');

/** Constrói URL pública a partir de caminho relativo; tolera util (path[, req]) e URLs absolutas */
function toPublicUrl(path, req) {
  if (!path) return null;
  const p = String(path);

  if (/^https?:\/\//i.test(p) || /^data:image\//i.test(p)) return p;

  if (typeof makePublicImageUrl === 'function') {
    try {
      const built = makePublicImageUrl.length >= 2 ? makePublicImageUrl(p, req) : makePublicImageUrl(p);
      if (built) return built;
    } catch { /* ignore e cai no fallback */ }
  }

  const base =
    process.env.PUBLIC_API_BASE_URL ||
    (req ? `${req.protocol}://${req.get('host')}` : '');
  const rel = p.startsWith('/') ? p : `/${p}`;
  return base ? `${base}${rel}` : rel;
}

/** Lê as colunas existentes da tabela empresa */
async function getEmpresaColumns() {
  const [cols] = await db.query(`SHOW COLUMNS FROM empresa`);
  const set = new Set(cols.map(c => c.Field));
  return set;
}

/** Decide os nomes das colunas levando em conta variações de schema */
function resolveEmpresaFieldNames(colset) {
  const idCol      = colset.has('ID_EMPRESA')   ? 'ID_EMPRESA'   : (colset.has('ID') ? 'ID' : null);
  const nomeCol    = colset.has('NOME_EMPRESA') ? 'NOME_EMPRESA' : (colset.has('NOME') ? 'NOME' : null);
  const logoCol    = colset.has('IMG_LOGO')     ? 'IMG_LOGO'     : (colset.has('LOGO') ? 'LOGO' : null);
  const bannerCol  = colset.has('IMG_BANNER')   ? 'IMG_BANNER'   : (colset.has('BANNER') ? 'BANNER' : null);
  const situacaoCol= colset.has('SITUACAO')     ? 'SITUACAO'     : null;

  // opcionais de endereço (só usa se existir)
  const enderecoCol= colset.has('ENDERECO') ? 'ENDERECO' : null;
  const cidadeCol  = colset.has('CIDADE')   ? 'CIDADE'   : null;
  const ufCol      = colset.has('UF')       ? 'UF'       : null;
  const cepCol     = colset.has('CEP')      ? 'CEP'      : null;

  return { idCol, nomeCol, logoCol, bannerCol, situacaoCol, enderecoCol, cidadeCol, ufCol, cepCol };
}

/** Monta SELECT apenas com colunas que existem, sempre com aliases padronizados */
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

  // garantias mínimas: se id/nome/IMG_LOGO faltarem, crie null aliases para não quebrar payload
  if (!fields.idCol)      parts.push(`NULL AS ID_EMPRESA`);
  if (!fields.nomeCol)    parts.push(`NULL AS NOME_EMPRESA`);
  if (!fields.logoCol)    parts.push(`NULL AS IMG_LOGO`);
  if (!fields.bannerCol)  parts.push(`NULL AS IMG_BANNER`);
  if (!fields.situacaoCol)parts.push(`1 AS SITUACAO`);

  const selectList = parts.join(',\n        ');
  return `
      SELECT
        ${selectList}
      FROM empresa e
      WHERE ${fields.idCol || 'ID_EMPRESA'} = ?
      LIMIT 1
    `;
}

/** Atualiza a logo usando a coluna correta (IMG_LOGO se existir; senão LOGO) */
async function updateEmpresaLogoGeneric(idEmpresa, savedKey) {
  const colset = await getEmpresaColumns();

  if (colset.has('IMG_LOGO')) {
    const [r] = await db.query(`UPDATE empresa SET IMG_LOGO = ? WHERE ID_EMPRESA = ?`, [savedKey, idEmpresa]);
    if (r.affectedRows > 0) return;
  }
  if (colset.has('LOGO')) {
    const [r] = await db.query(`UPDATE empresa SET LOGO = ? WHERE ID_EMPRESA = ?`, [savedKey, idEmpresa]);
    if (r.affectedRows > 0) return;
  }

  // fallback duro: tenta por ID (casos muito legados)
  if (colset.has('LOGO') && !colset.has('ID_EMPRESA')) {
    await db.query(`UPDATE empresa SET LOGO = ? WHERE ID = ?`, [savedKey, idEmpresa]);
  } else if (colset.has('IMG_LOGO') && !colset.has('ID_EMPRESA')) {
    await db.query(`UPDATE empresa SET IMG_LOGO = ? WHERE ID = ?`, [savedKey, idEmpresa]);
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
    const savedKey = await putToS3(f.buffer, key, f.mimetype);

    await updateEmpresaLogoGeneric(idEmpresa, savedKey);

    return res.json({
      message: 'Perfil da empresa atualizado.',
      empresaId: idEmpresa,
      img_perfil: toPublicUrl(savedKey, req), // URL pública
      key: savedKey                           // caminho/obj key salvo no banco
    });
  } catch (err) {
    console.error('[uploadPerfilEmpresa] Erro:', err);
    return res.status(500).json({ error: 'Falha ao subir perfil da empresa.' });
  }
}

/** GET /empresas/:id — robusto a diferenças de schema */
async function getEmpresa(req, res) {
  const idEmpresa = parseInt(req.params.id, 10);
  if (!Number.isFinite(idEmpresa) || idEmpresa <= 0) {
    return res.status(400).json({ error: 'ID da empresa inválido.' });
  }
  try {
    const colset = await getEmpresaColumns();
    const fields = resolveEmpresaFieldNames(colset);

    // garante que temos uma coluna para filtrar (ID_EMPRESA ou ID)
    if (!fields.idCol) {
      return res.status(500).json({ error: 'Schema inesperado: tabela empresa sem ID_EMPRESA/ID.' });
    }

    const sql = buildEmpresaSelectSQL(fields);
    const [rows] = await db.query(sql, [idEmpresa]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada.' });
    }

    const e = rows[0];

    const payload = {
      ID_EMPRESA: e.ID_EMPRESA ?? idEmpresa,
      NOME_EMPRESA: e.NOME_EMPRESA ?? null,
      ENDERECO: e.ENDERECO ?? null,
      CIDADE: e.CIDADE ?? null,
      UF: e.UF ?? null,
      CEP: e.CEP ?? null,
      IMG_LOGO: e.IMG_LOGO ?? null,             // caminho relativo, se existir
      IMG_BANNER: e.IMG_BANNER ?? null,         // caminho relativo, se existir
      IMG_LOGO_URL: toPublicUrl(e.IMG_LOGO, req),
      IMG_BANNER_URL: toPublicUrl(e.IMG_BANNER, req),
      SITUACAO: Number(e.SITUACAO ?? 1),

      // aliases amigáveis ao front atual:
      id: e.ID_EMPRESA ?? idEmpresa,
      nome: e.NOME_EMPRESA ?? null,
      img_perfil: toPublicUrl(e.IMG_LOGO, req), // mesma imagem da logo
      logoUrl: toPublicUrl(e.IMG_LOGO, req),
      _key: e.IMG_LOGO ?? null
    };

    return res.json(payload);
  } catch (err) {
    console.error('[getEmpresa] Erro:', err);
    return res.status(500).json({ error: 'Erro ao buscar empresa.' });
  }
}

module.exports = {
  uploadPerfilEmpresa,
  getEmpresa
};
