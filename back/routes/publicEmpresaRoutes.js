// back/src/routes/publicEmpresaRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const qr = require('qr-image');
const ctrl = require('../controllers/publicEmpresaController');

// FRONT sem / no fim
const FRONTEND_URL = (process.env.PUBLIC_FRONT_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

// --------------------
// Helpers de token (PERFIL)
// Token do perfil: PV-<ID_EMPRESA>-TOKEN
// --------------------
function makePerfilToken(idEmpresa) {
  return `PV-${idEmpresa}-TOKEN`;
}
function parseEmpresaIdFromPerfilToken(token) {
  if (!token || typeof token !== 'string') return null;
  const m = token.match(/^PV-(\d+)-TOKEN$/i);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) ? id : null;
}

// --------------------
// Dados do perfil (por id e por token)
// --------------------
router.get('/empresa/:id', ctrl.getPerfilEmpresaById);
router.get('/empresa/by-token/:token', ctrl.getPerfilEmpresaByToken);

// --------------------
// Geração de link e QR do perfil
// GET /api/public/perfil-link/:idEmpresa
// --------------------
router.get('/perfil-link/:idEmpresa', async (req, res) => {
  try {
    const idEmpresa = Number(req.params.idEmpresa);
    if (!Number.isFinite(idEmpresa) || idEmpresa <= 0) {
      return res.status(400).json({ error: 'ID_EMPRESA_INVALIDO' });
    }

    const [[existe]] = await db.query(
      `SELECT 1 FROM empresa WHERE ID_EMPRESA = ? LIMIT 1`,
      [idEmpresa]
    );
    if (!existe) {
      return res.status(404).json({ error: 'EMPRESA_NAO_ENCONTRADA' });
    }

    const token = makePerfilToken(idEmpresa);

    // url por id (se você tiver essa página) e url por token (página pública)
    const url = `${FRONTEND_URL}/empresa/${idEmpresa}/perfil`; // opcional / por ID
    const urlByToken = `${FRONTEND_URL}/perfil/${token}`;      // principal / por token

    return res.json({ url, urlByToken, token });
  } catch (error) {
    console.error('[GET /public/perfil-link/:idEmpresa] erro:', { message: error.message });
    return res.status(500).json({ error: 'ERRO_INTERNO', detail: error.message });
  }
});

// --------------------
// GET /api/public/qr/perfil/:token
// Retorna a imagem PNG do QR que aponta para a rota pública do perfil
// --------------------
router.get('/qr/perfil/:token', (req, res) => {
  try {
    const { token } = req.params;
    const id = parseEmpresaIdFromPerfilToken(token);
    if (!id) return res.status(400).send('Token inválido');

    const link = `${FRONTEND_URL}/perfil/${token}`;
    const png = qr.image(link, { type: 'png', margin: 2, size: 8 });
    res.setHeader('Content-Type', 'image/png');
    png.pipe(res);
  } catch (err) {
    console.error('[GET /public/qr/perfil/:token] erro:', err);
    return res.status(500).send('Erro ao gerar QR Code');
  }
});

module.exports = router;
