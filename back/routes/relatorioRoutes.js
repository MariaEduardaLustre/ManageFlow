const express = require('express');
const router = express.Router();
const relatorioController = require('../controllers/relatorioController');

router.get('/filas', relatorioController.listarFilasPorEmpresa);
router.get('/tempo-espera/:id_fila', relatorioController.tempoEsperaPorFila);
router.get('/desistencias/:id_fila', relatorioController.desistenciasPorFila);
router.get('/avaliacoes/:id_fila', relatorioController.avaliacoesPorFila);

module.exports = router; // <<< importante
