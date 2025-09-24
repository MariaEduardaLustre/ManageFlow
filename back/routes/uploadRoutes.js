// /back/src/routes/uploadRoutes.js
const express = require('express');
const router = express.Router();

const {
  empresaPerfilSingle,
  configuracaoFields,
  usuarioPerfilSingle
} = require('../middlewares/s3Upload');

const empresaController = require('../controllers/empresaController');
const configuracaoFilaController = require('../controllers/configuracaoController');
const usuarioController = require('../controllers/usuarioController');

// PERFIL da EMPRESA (empresa.LOGO)
router.post(
  '/empresas/:id/perfil',
  // auth?,
  empresaPerfilSingle,
  empresaController.uploadPerfilEmpresa
);
router.get(
  '/empresas/:id',
  // auth?,
  empresaController.getEmpresa
);

// LOGO/BANNER da CONFIGURAÇÃO DE FILA (configuracaofila.IMG_LOGO / IMG_BANNER em JSON)
router.post(
  '/configuracoes/:id/imagens',
  // auth?,
  configuracaoFields,
  configuracaoFilaController.uploadImagensConfiguracao
);
router.get(
  '/configuracoes/:id',
  // auth?,
  configuracaoFilaController.getConfiguracao
);

// FOTO de PERFIL do USUÁRIO (usuario.img_perfil)
router.post(
  '/usuarios/:id/foto',
  // auth?,
  usuarioPerfilSingle,
  usuarioController.uploadFotoPerfil
);
router.get('/usuarios/:id', usuarioController.getUsuarioPorId);
module.exports = router;
