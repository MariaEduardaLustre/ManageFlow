// routes/configuracaoRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/configuracaoController');

// Rotas privadas (exigem JWT via server.js)
router.post('/configuracao-fila', ctrl.cadastrarConfiguracaoFila);
router.get('/configuracao-fila/:id', ctrl.buscarConfiguracaoFilaPorId);
router.put('/configuracao-fila/:id', ctrl.atualizarConfiguracaoFila);
router.get('/filas', ctrl.listarConfiguracoesDaEmpresa);
router.get('/qr/:token', ctrl.qrPngByToken);
router.get('/filas/contar/:id_empresa', ctrl.contarFilasPorEmpresa);
router.get('/filas/:id_empresa', ctrl.listarFilasPorEmpresa);
router.delete('/:id', ctrl.excluirConfiguracaoFila);

module.exports = router;
