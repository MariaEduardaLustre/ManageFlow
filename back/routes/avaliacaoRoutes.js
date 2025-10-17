// routes/avaliacaoRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const qr = require('qr-image');

// Lê a URL base do frontend a partir do arquivo .env.
// Se a variável não existir, ele usa 'http://localhost:3000' como padrão.
const FRONTEND_URL = process.env.PUBLIC_FRONT_BASE_URL || 'http://localhost:3000';

// Rota PÚBLICA para buscar informações da empresa pelo token de avaliação
router.get('/info-empresa/:token', async (req, res) => {
    const { token } = req.params;
    try {
        const idEmpresa = token.split('-')[1];
        if (!idEmpresa) {
            return res.status(400).json({ error: 'Token inválido.' });
        }
        const [[empresa]] = await db.query(
            'SELECT NOME_EMPRESA, LOGO FROM empresa WHERE ID_EMPRESA = ?',
            [idEmpresa]
        );
        if (!empresa) {
            return res.status(404).json({ error: 'Empresa não encontrada.' });
        }
        res.json(empresa);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// Rota PÚBLICA para SALVAR uma nova avaliação
router.post('/', async (req, res) => {
    const { token, nota, comentario } = req.body;
    if (!token || !nota || nota < 1 || nota > 5) {
        return res.status(400).json({ error: 'Dados inválidos.' });
    }
    try {
        const idEmpresa = token.split('-')[1];
        if (!idEmpresa) {
            return res.status(400).json({ error: 'Token inválido.' });
        }
        await db.query(
            'INSERT INTO avaliacoes (ID_EMPRESA, NOTA, COMENTARIO) VALUES (?, ?, ?)',
            [idEmpresa, nota, comentario || null]
        );
        res.status(201).json({ message: 'Avaliação registrada com sucesso!' });
    } catch (error) {
        res.status(500).json({ error: 'Não foi possível salvar sua avaliação.' });
    }
});

// Rota para obter (ou criar) o link de avaliação de uma empresa
router.get('/avaliacao-link/:idEmpresa', async (req, res) => {
    const { idEmpresa } = req.params;
    const avaliacaoToken = `AV-${idEmpresa}-TOKEN`;
    const fullUrl = `${FRONTEND_URL}/avaliar/${avaliacaoToken}`;
    res.json({ url: fullUrl, token: avaliacaoToken });
});

// Rota para gerar a imagem do QR Code a partir de um token
router.get('/qr/avaliacao/:token', async (req, res) => {
    const { token } = req.params;
    try {
        const urlParaQr = `${FRONTEND_URL}/avaliar/${token}`;
        const qr_png = qr.image(urlParaQr, { type: 'png', margin: 2, size: 8 });
        res.setHeader('Content-type', 'image/png');
        qr_png.pipe(res);
    } catch (e) {
        res.status(500).send('Erro ao gerar QR Code');
    }
});

module.exports = router;