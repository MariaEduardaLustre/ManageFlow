// back/routes/filaRoutes.js
const express = require('express');
const router = express.Router();
const filaController = require('../controllers/filaController');

// ==============================
// Rotas específicas (fixas)
// ==============================
// Observação: a ordem importa! Coloque rotas fixas antes das rotas com parâmetros,
// para evitar colisões do tipo "/status" ser interpretado como "/:id_fila/status".

// STATUS por ID_CONF_FILA (regra consolidada de vigência e situação):
// GET /api/filas/status?idConfFila=123
router.get('/status', filaController.statusByConf);

// TOGGLE por ID_CONF_FILA (garante/atualiza a fila do dia coerentemente):
// POST /api/filas/toggle-block  { idConfFila, blocked: boolean }
router.post('/toggle-block', filaController.toggleBlockByConf);

// ✅ NOVA rota: aplica estado da configuração na fila do dia
router.post('/apply-config', filaController.applyConfigToToday);
// ==============================
// Rotas com parâmetro :id_fila
// ==============================

// TOGGLE por ID_FILA (atua direto na tabela `fila` de hoje)
// - /api/filas/:id_fila/block   { block: boolean }   -> altera BLOCK
// - /api/filas/:id_fila/status  { situacao: boolean }-> altera SITUACAO e DT_INATIV
router.put('/:id_fila/block', filaController.toggleFilaBlock);
router.put('/:id_fila/status', filaController.toggleFilaSituacao);

// ==============================
// LISTAR FILAS (com configuração)
// GET /api/filas?idEmpresa=123
// ==============================
router.get('/', filaController.listarFilasComConfiguracao);

module.exports = router;
