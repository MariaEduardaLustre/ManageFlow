// back/routes/filaRoutes.js
const express = require('express');
const router = express.Router();
const filaController = require('../controllers/filaController');
const locationController = require('../controllers/locationController');

/**
 * IMPORTANTE SOBRE A ORDEM:
 * - Rotas fixas primeiro (/status, /toggle-block, /apply-config)
 * - Depois rotas com paths específicos antes das genéricas com parâmetros
 * - Somente no final a rota raiz GET '/' (lista com query)
 */

// ==============================
// Rotas específicas (fixas)
// ==============================

// STATUS por ID_CONF_FILA (regra consolidada de vigência e situação):
// GET /api/filas/status?idConfFila=123
router.get('/status', filaController.statusByConf);

// TOGGLE por ID_CONF_FILA (garante/atualiza a fila do dia coerentemente):
// POST /api/filas/toggle-block  { idConfFila, blocked: boolean }
router.post('/toggle-block', filaController.toggleBlockByConf);

// Aplica o estado da configuração na fila do dia:
// POST /api/filas/apply-config  { idConfFila, bloquearHoje?: boolean }
router.post('/apply-config', filaController.applyConfigToToday);

// ==============================
// Rotas utilitárias antes das genéricas
// ==============================

// Validação de distância por TOKEN_FILA (público):
// GET /api/filas/:token_fila/validate-location?...coords...
router.get('/:token_fila/validate-location', locationController.validateClientDistance);

// Endpoint de contagem por fila (para "aguardando"):
// GET /api/filas/:idFila/count?status=aguardando&data=YYYYMMDD
router.get('/:idFila/count', filaController.countByFila);

// ==============================
// Toggles por ID_FILA (atua direto na fila do dia)
// ==============================

// - /api/filas/:id_fila/block   { block: boolean }   -> altera BLOCK
// - /api/filas/:id_fila/status  { situacao: boolean }-> altera SITUACAO e DT_INATIV
router.put('/:id_fila/block', filaController.toggleFilaBlock);
router.put('/:id_fila/status', filaController.toggleFilaSituacao);

// ==============================
// Listagem de filas (com configuração)
// ==============================

// Alias compatível com teu front atual:
// GET /api/filas/empresas/:idEmpresa
// Suporta query params: ?hoje=1&apenasAtivas=1&all=0 (padrão: hoje=1, apenasAtivas=1)
router.get('/empresas/:idEmpresa', filaController.listarFilasComConfiguracao);

// Rota genérica via query param (ex.: GET /api/filas?idEmpresa=123)
// Mesmos filtros: ?hoje=1&apenasAtivas=1&all=0
router.get('/', filaController.listarFilasComConfiguracao);

module.exports = router;
