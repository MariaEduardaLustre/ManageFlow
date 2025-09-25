// /back/src/controllers/empresaController.js
const db = require('../database/connection'); // mysql2/promise
const { makePublicImageUrl } = require('../utils/image');
const { putToS3, keyEmpresaPerfil } = require('../middlewares/s3Upload');

/**
 * POST /empresas/:id/perfil
 * Body: multipart/form-data com campo "img_perfil"
 * Grava em empresa.LOGO a key relativa no S3
 */
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

    await db.query(`UPDATE empresa SET LOGO = ? WHERE ID = ?`, [savedKey, idEmpresa]);

    return res.json({
      message: 'Perfil da empresa atualizado.',
      empresaId: idEmpresa,
      img_perfil: makePublicImageUrl(savedKey),
      key: savedKey
    });
  } catch (err) {
    console.error('[uploadPerfilEmpresa] Erro:', err);
    return res.status(500).json({ error: 'Falha ao subir perfil da empresa.' });
  }
}

/** GET /empresas/:id  (normaliza LOGO) */
async function getEmpresa(req, res) {
  const idEmpresa = parseInt(req.params.id, 10);
  if (!Number.isFinite(idEmpresa)) {
    return res.status(400).json({ error: 'ID da empresa inválido.' });
  }
  try {
    const [rows] = await db.query(
      `SELECT ID, NOME, LOGO FROM empresa WHERE ID = ?`,
      [idEmpresa]
    );
    if (!rows.length) return res.status(404).json({ error: 'Empresa não encontrada.' });

    const e = rows[0];
    return res.json({
      id: e.ID,
      nome: e.NOME,
      img_perfil: makePublicImageUrl(e.LOGO),
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
