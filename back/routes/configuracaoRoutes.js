// routes/configuracaoRoutes.js
const express = require('express');
const router = express.Router();
const configuracaoController = require('../controllers/configuracaoController');


router.get('/filas/contar/:id_empresa', configuracaoController.contarFilasPorEmpresa);

router.post('/', configuracaoController.cadastrarConfiguracaoFila);
router.get('/:id', configuracaoController.buscarConfiguracaoFilaPorId);
router.put('/:id', configuracaoController.atualizarConfiguracaoFila);
router.get('/filas/:id_empresa', configuracaoController.listarFilasPorEmpresa);

module.exports = router;