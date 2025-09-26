// back/routes/relatorioRoutes.js
const express = require('express');
const router = express.Router();
const relatorioController = require('../controllers/relatorioController');

// Listar filas da empresa logada (do token JWT)
router.get('/filas', relatorioController.listarFilasPorEmpresa);

// Relatórios por fila
router.get('/tempo-espera/:id_fila', relatorioController.tempoEsperaPorFila);
router.get('/desistencias/:id_fila', relatorioController.desistenciasPorFila);
router.get('/avaliacoes/:id_fila', relatorioController.avaliacoesPorFila);

module.exports = router;
