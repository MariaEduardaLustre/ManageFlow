// routes/configuracaoRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/configuracaoController');

// healthcheck simples
router.get('/__health', (req, res) => res.json({ ok: true }));

// criar configuração (POST)
router.post('/configuracao-fila', ctrl.cadastrarConfiguracaoFila);

// buscar por ID_CONF_FILA (GET)
router.get('/configuracao-fila/:id', ctrl.buscarConfiguracaoFilaPorId);

// atualizar por ID_CONF_FILA (PUT)
router.put('/configuracao-fila/:id', ctrl.atualizarConfiguracaoFila);

// 🔹 LISTAR configurações por empresa (NOVA ROTA)
// aceita ?idEmpresa=... ou cabeçalho x-empresa-id
router.get('/filas', ctrl.listarConfiguracoesDaEmpresa);

// QR em PNG (opcional)
router.get('/qr/:token', ctrl.qrPngByToken);

module.exports = router;
