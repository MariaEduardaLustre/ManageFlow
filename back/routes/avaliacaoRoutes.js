// routes/avaliacaoRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const qr = require('qr-image');

const FRONTEND_URL = process.env.PUBLIC_FRONT_BASE_URL || 'http://localhost:3000';

// Rota PÚBLICA para buscar informações da empresa pelo token de avaliação
router.get('/info-empresa/:token', async (req, res) => {
    // ... (código original inalterado)
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
    // ... (código original inalterado)
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
    // ... (código original inalterado)
    const { idEmpresa } = req.params;
    const avaliacaoToken = `AV-${idEmpresa}-TOKEN`;
    const fullUrl = `${FRONTEND_URL}/avaliar/${avaliacaoToken}`;
    res.json({ url: fullUrl, token: avaliacaoToken });
});

// Rota para gerar a imagem do QR Code a partir de um token
router.get('/qr/avaliacao/:token', async (req, res) => {
    // ... (código original inalterado)
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

// =======================================================
// === ROTAS ATUALIZADAS PARA O DASHBOARD ===
// =======================================================

// Rota para obter estatísticas (AGORA COM FILTRO DE NOTA)
router.get('/stats/:idEmpresa', async (req, res) => {
    const { idEmpresa } = req.params;
    const { nota } = req.query; // Novo: captura o filtro de nota

    try {
        // SQL dinâmico para adicionar o filtro de nota, se existir
        let notaFilterQuery = '';
        const queryParams = [idEmpresa];

        if (nota && Number(nota) > 0) {
            notaFilterQuery = 'AND NOTA = ?';
            queryParams.push(Number(nota));
        }

        // A query de estatísticas gerais (média, total) NÃO deve ser filtrada
        // Apenas a distribuição de contagem deve ser
        const [[statsGeral]] = await db.query(
             `SELECT
                AVG(NOTA) AS mediaGeral,
                COUNT(*) AS totalAvaliacoes
            FROM avaliacoes
            WHERE ID_EMPRESA = ?;`,
            [idEmpresa]
        );
        
        // Esta query AGORA SÓ BUSCA a distribuição.
        // Ela NÃO será afetada pelo filtro de nota, pois queremos mostrar sempre a distribuição total.
        const [[distribuicao]] = await db.query(
            `SELECT
                SUM(CASE WHEN NOTA = 5 THEN 1 ELSE 0 END) AS estrelas5,
                SUM(CASE WHEN NOTA = 4 THEN 1 ELSE 0 END) AS estrelas4,
                SUM(CASE WHEN NOTA = 3 THEN 1 ELSE 0 END) AS estrelas3,
                SUM(CASE WHEN NOTA = 2 THEN 1 ELSE 0 END) AS estrelas2,
                SUM(CASE WHEN NOTA = 1 THEN 1 ELSE 0 END) AS estrelas1
            FROM avaliacoes
            WHERE ID_EMPRESA = ?;`,
            [idEmpresa]
        );
        
        // Apenas o total de avaliações (para o StatCard) será atualizado pelo filtro
        // (Re-usando a queryParams do filtro)
         const [[{ totalFiltrado }]] = await db.query(
            `SELECT COUNT(*) as totalFiltrado
             FROM avaliacoes
             WHERE ID_EMPRESA = ? ${notaFilterQuery}`,
            queryParams
        );

        res.json({
            mediaGeral: Number(statsGeral.mediaGeral || 0),
            totalAvaliacoes: Number(statsGeral.totalAvaliacoes || 0), // Total real
            totalFiltrado: Number(totalFiltrado || 0), // Total para o filtro atual
            distribuicao: [
                { nota: 5, contagem: Number(distribuicao.estrelas5 || 0) },
                { nota: 4, contagem: Number(distribuicao.estrelas4 || 0) },
                { nota: 3, contagem: Number(distribuicao.estrelas3 || 0) },
                { nota: 2, contagem: Number(distribuicao.estrelas2 || 0) },
                { nota: 1, contagem: Number(distribuicao.estrelas1 || 0) },
            ]
        });

    } catch (error) {
        console.error('Erro ao buscar estatísticas de avaliação:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// Rota para obter comentários (AGORA COM FILTRO DE NOTA)
router.get('/comentarios/:idEmpresa', async (req, res) => {
    const { idEmpresa } = req.params;
    const { nota, page = 1, limit = 5 } = req.query; // Captura nota, page e limit
    
    const nLimit = parseInt(limit, 10);
    const nOffset = (parseInt(page, 10) - 1) * nLimit;

    try {
        let notaFilterQuery = '';
        const queryParams = [idEmpresa];
        
        if (nota && Number(nota) > 0) {
            notaFilterQuery = 'AND NOTA = ?';
            queryParams.push(Number(nota));
        }

        // Query para buscar comentários paginados E filtrados
        const queryComentarios = `
            SELECT NOTA, COMENTARIO, DT_CRIACAO
             FROM avaliacoes
             WHERE ID_EMPRESA = ? 
               AND COMENTARIO IS NOT NULL 
               AND TRIM(COMENTARIO) <> ''
               ${notaFilterQuery}
             ORDER BY DT_CRIACAO DESC
             LIMIT ?
             OFFSET ?;`;
             
        queryParams.push(nLimit, nOffset);
        const [comentarios] = await db.query(queryComentarios, queryParams);

        // Query para contar o total de comentários filtrados (para paginação)
        const queryTotal = `
            SELECT COUNT(*) AS total
             FROM avaliacoes
             WHERE ID_EMPRESA = ? 
               AND COMENTARIO IS NOT NULL 
               AND TRIM(COMENTARIO) <> ''
               ${notaFilterQuery};`;
        
        // Remove 'limit' e 'offset' dos params para a query de contagem
        const totalParams = queryParams.slice(0, queryParams.length - 2); 
        const [[{ total }]] = await db.query(queryTotal, totalParams);

        res.json({
            comentarios,
            totalComentarios: total,
            pagina: parseInt(page, 10),
            totalPaginas: Math.ceil(total / nLimit)
        });

    } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});


module.exports = router;