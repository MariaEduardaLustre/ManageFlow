// /back/src/routes/empresaPerfilRoutes.js
const express = require('express');
const router = express.Router();

const { empresaPerfilSingle } = require('../middlewares/s3Upload');
const { uploadPerfilEmpresa } = require('../controllers/empresaController');

// POST /api/empresas/:id/perfil
// campo multipart: img_perfil
router.post('/:id/perfil', empresaPerfilSingle, uploadPerfilEmpresa);

module.exports = router;
