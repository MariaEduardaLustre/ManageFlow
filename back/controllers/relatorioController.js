const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// --- Relatório: Tempo de Espera ---
router.get('/tempo-espera/:idEmpresa/:idFila', async (req, res) => {
  const { idEmpresa, idFila } = req.params;
  const { dataInicio, dataFim } = req.query;

  try {
    const [dados] = await db.query(`
      SELECT 
        ID_CLIENTE, 
        NOME,
        TIMESTAMPDIFF(MINUTE, DT_ENTRA, DT_CHAMA) AS tempo_espera_min
      FROM clientesfila
      WHERE ID_EMPRESA = ? 
        AND ID_FILA = ? 
        AND DT_ENTRA IS NOT NULL
        AND DT_CHAMA IS NOT NULL
        AND DT_ENTRA BETWEEN ? AND ?;
    `, [idEmpresa, idFila, dataInicio, dataFim]);

    if (dados.length === 0) {
      return res.status(404).json({ message: 'Nenhum dado de tempo de espera encontrado.' });
    }

    const media = dados.reduce((acc, cur) => acc + cur.tempo_espera_min, 0) / dados.length;

    res.json({
      fila: idFila,
      media_tempo_espera: media.toFixed(2),
      clientes: dados
    });
  } catch (err) {
    console.error('Erro no relatório tempo-espera:', err);
    res.status(500).json({ error: 'Erro interno ao buscar tempo de espera.' });
  }
});

// --- Relatório: Desistência ---
router.get('/desistencia/:idEmpresa/:idFila', async (req, res) => {
  const { idEmpresa, idFila } = req.params;
  const { dataInicio, dataFim } = req.query;

  try {
    const [[dados]] = await db.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN SITUACAO = 2 THEN 1 ELSE 0 END) AS desistencias
      FROM clientesfila
      WHERE ID_EMPRESA = ? 
        AND ID_FILA = ?
        AND DT_ENTRA BETWEEN ? AND ?;
    `, [idEmpresa, idFila, dataInicio, dataFim]);

    res.json({
      fila: idFila,
      total: dados.total,
      desistencias: dados.desistencias,
      percentual: dados.total > 0 ? ((dados.desistencias / dados.total) * 100).toFixed(2) : 0
    });
  } catch (err) {
    console.error('Erro no relatório desistência:', err);
    res.status(500).json({ error: 'Erro interno ao buscar desistência.' });
  }
});

// --- Relatório: Avaliações (futuro) ---
router.get('/avaliacoes/:idEmpresa/:idFila', async (req, res) => {
  const { idEmpresa, idFila } = req.params;
  const { dataInicio, dataFim } = req.query;

  try {
    // quando criar a tabela de avaliações, substituir por SELECT real
    res.json({
      fila: idFila,
      total_feedbacks: 0,
      media: null,
      comentarios: []
    });
  } catch (err) {
    console.error('Erro no relatório avaliações:', err);
    res.status(500).json({ error: 'Erro interno ao buscar avaliações.' });
  }
});
// --- Relatório: Desistência ---
router.get('/desistencia/:idEmpresa/:idFila', async (req, res) => {
    const { idEmpresa, idFila } = req.params;
    const { dataInicio, dataFim } = req.query;

    try {
        const [[dados]] = await db.query(`
            SELECT 
                COUNT(*) AS total_clientes,
                SUM(CASE WHEN SITUACAO = 2 THEN 1 ELSE 0 END) AS total_desistencias
            FROM clientesfila
            WHERE ID_EMPRESA = ? 
              AND ID_FILA = ?
              AND DT_ENTRA BETWEEN ? AND ?;
        `, [idEmpresa, idFila, dataInicio, dataFim]);

        if (!dados || dados.total_clientes === 0) {
            return res.status(404).json({ message: 'Nenhum dado encontrado para a fila neste período.' });
        }

        res.json({
            fila: idFila,
            total_clientes: dados.total_clientes,
            total_desistencias: dados.total_desistencias,
            percentual_desistencia: ((dados.total_desistencias / dados.total_clientes) * 100).toFixed(2)
        });
    } catch (err) {
        console.error('Erro no relatório de desistência:', err);
        res.status(500).json({ error: 'Erro interno ao buscar relatório de desistência.' });
    }
});

router.get('/avaliacoes/:idEmpresa/:idFila', async (req, res) => {
    const { idEmpresa, idFila } = req.params;
    const { dataInicio, dataFim } = req.query;

    let where = 'WHERE ID_EMPRESA = ? AND ID_FILA = ?';
    const params = [idEmpresa, idFila];

    if (dataInicio) {
        where += ' AND DATE(DATA) >= ?';
        params.push(dataInicio);
    }
    if (dataFim) {
        where += ' AND DATE(DATA) <= ?';
        params.push(dataFim);
    }

    try {
        const [avaliacoes] = await db.query(`
            SELECT CLIENTE_NOME, NOTA, COMENTARIO
            FROM avaliacoesfila
            ${where}
            ORDER BY DATA DESC
        `, params);

        const total_feedbacks = avaliacoes.length;
        const media = total_feedbacks > 0 
            ? (avaliacoes.reduce((acc, a) => acc + parseFloat(a.NOTA), 0) / total_feedbacks).toFixed(2) 
            : null;

        res.json({
            fila: idFila,
            total_feedbacks,
            media,
            comentarios: avaliacoes
        });

    } catch (err) {
        console.error('Erro ao buscar avaliações:', err);
        res.status(500).json({ error: 'Erro interno ao buscar avaliações.' });
    }
});


module.exports = router;
