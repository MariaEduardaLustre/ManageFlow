// routes/configuracaoRoutes.js
const express = require('express');
const router = express.Router();
const configuracaoController = require('../controllers/configuracaoController');

router.post('/', configuracaoController.cadastrarConfiguracaoFila);
router.get('/:id', configuracaoController.buscarConfiguracaoFilaPorId);
router.put('/:id', configuracaoController.atualizarConfiguracaoFila);

module.exports = router;