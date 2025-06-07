// routes/filaRoutes.js
const express = require('express');
const router = express.Router();
const filaController = require('../controllers/filaController');

router.get('/', filaController.listarFilasComConfiguracao); // Este é o endpoint que FilasCadastradas chama
router.put('/:id_fila/block', filaController.toggleFilaBlock);
router.put('/:id_fila/status', filaController.toggleFilaSituacao);

module.exports = router;