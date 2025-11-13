const express = require('express');
const router = express.Router();

const {
  empresaPerfilSingle,
  empresaLogoSingle,     // se você também usar em outro lugar
  configuracaoFields,
  usuarioPerfilSingle
} = require('../middlewares/s3Upload');

const empresaController = require('../controllers/empresaController');
const configuracaoFilaController = require('../controllers/configuracaoController');
const usuarioController = require('../controllers/usuarioController');

// PERFIL da EMPRESA (foto de perfil exibida no perfil público)
// campo: img_perfil
router.post(
  '/empresas/:id/perfil',
  // auth? (adicione seu middleware de autenticação aqui se necessário)
  empresaPerfilSingle,
  empresaController.uploadPerfilEmpresa
);

// (opcional) obter empresa normalizada (útil p/ debug)
router.get('/empresas/:id', empresaController.getEmpresa);

// LOGO/BANNER da CONFIGURAÇÃO DE FILA
router.post(
  '/configuracoes/:id/imagens',
  configuracaoFields,
  configuracaoFilaController.uploadImagensConfiguracao
);
router.get(
  '/configuracoes/:id',
  configuracaoFilaController.getConfiguracao
);

// FOTO de PERFIL do USUÁRIO
router.post(
  '/usuarios/:id/foto',
  usuarioPerfilSingle,
  usuarioController.uploadFotoPerfil
);
router.get('/usuarios/:id', usuarioController.getUsuarioPorId);

module.exports = router;
