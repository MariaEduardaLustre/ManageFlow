const db = require('../database/connection'); // mysql2/promise
const { makePublicImageUrl } = require('../utils/image');
const { putToS3, keyEmpresaPerfil } = require('../middlewares/s3Upload');

async function updateEmpresaLogoGeneric(idEmpresa, savedKey) {
  let [result] = await db.query(
    `UPDATE empresa SET LOGO = ? WHERE ID_EMPRESA = ?`,
    [savedKey, idEmpresa]
  );
  if (result.affectedRows && result.affectedRows > 0) return;

  [result] = await db.query(
    `UPDATE empresa SET LOGO = ? WHERE ID = ?`,
    [savedKey, idEmpresa]
  );
}

async function uploadPerfilEmpresa(req, res) {
  const idEmpresa = parseInt(req.params.id, 10);
  if (!Number.isFinite(idEmpresa)) {
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
      img_perfil: makePublicImageUrl(savedKey), // URL pública para exibir
      key: savedKey                              // caminho relativo salvo no banco
    });
  } catch (err) {
    console.error('[uploadPerfilEmpresa] Erro:', err);
    return res.status(500).json({ error: 'Falha ao subir perfil da empresa.' });
  }
}

async function getEmpresa(req, res) {
  const idEmpresa = parseInt(req.params.id, 10);
  if (!Number.isFinite(idEmpresa)) {
    return res.status(400).json({ error: 'ID da empresa inválido.' });
  }
  try {
    let [rows] = await db.query(
      `SELECT ID as ID_EMPRESA, NOME as NOME_EMPRESA, LOGO FROM empresa WHERE ID = ?`,
      [idEmpresa]
    );
    if (!rows.length) {
      [rows] = await db.query(
        `SELECT ID_EMPRESA, NOME_EMPRESA, LOGO FROM empresa WHERE ID_EMPRESA = ?`,
        [idEmpresa]
      );
    }
    if (!rows.length) return res.status(404).json({ error: 'Empresa não encontrada.' });

    const e = rows[0];
    return res.json({
      id: e.ID_EMPRESA,
      nome: e.NOME_EMPRESA,
      img_perfil: makePublicImageUrl(e.LOGO),
      logoUrl: makePublicImageUrl(e.LOGO),
      _key: e.LOGO || null
    });
  } catch (err) {
    console.error('[getEmpresa] Erro:', err);
    return res.status(500).json({ error: 'Erro ao buscar empresa.' });
  }
}

module.exports = {
  uploadPerfilEmpresa,
  getEmpresa
};
