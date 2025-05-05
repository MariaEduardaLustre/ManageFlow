const express = require('express');
const router = express.Router();
const configuracaoController = require('../controllers/configuracaoController');

// A rota deve ser POST, como você configurou
router.post('/configuracao-fila', configuracaoController.cadastrarConfiguracaoFila);

module.exports = router;
