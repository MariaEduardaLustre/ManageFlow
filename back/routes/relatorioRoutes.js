const express = require('express');
const router = express.Router();
const relatorioController = require('../controllers/relatorioController');

router.get('/tempo-espera', relatorioController.tempoEsperaTodasFilas);
router.get('/tempo-atendimento', relatorioController.tempoAtendimentoTodasFilas);
router.get('/desistencias', relatorioController.desistenciasTodasFilas);
router.get('/avaliacoes', relatorioController.avaliacoesTodasFilas);
router.get('/desempenho-fila', relatorioController.desempenhoPorFila);
router.get('/distribuicao-notas', relatorioController.distribuicaoNotas);
router.get('/filas', relatorioController.listarFilas);

// ✨ ADICIONE ESTA LINHA FALTANTE:
router.get('/avaliacoes-detalhadas', relatorioController.listarAvaliacoesDetalhadas);

module.exports = router;