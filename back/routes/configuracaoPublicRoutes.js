// routes/configuracaoPublic.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/configuracaoController');

// ⚠️ IMPORTANTES: caminhos RELATIVOS ao prefixo '/api/configuracao'
router.get('/public/info/:token', ctrl.getPublicInfoByToken);
router.post('/public/join/:token', ctrl.publicJoinByToken);

module.exports = router;
