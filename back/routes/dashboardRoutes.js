// routes/dashboard.js
import express from 'express';
const db = require('../database/connection');

const router = express.Router();

router.get('/:empresaId/:filaId?/:data?', async (req, res) => {
  const { empresaId, filaId, data } = req.params;

  try {
    // 1️⃣ Filas da empresa
    const [filas] = await db.execute(
      `SELECT f.ID_FILA, f.NOME_FILA, COUNT(c.ID_CLIENTE) AS total_clientes
       FROM filas f
       LEFT JOIN clientesfila c ON f.ID_FILA = c.ID_FILA
       WHERE f.ID_EMPRESA = ?
       GROUP BY f.ID_FILA, f.NOME_FILA`,
      [empresaId]
    );

    // 2️⃣ Clientes de fila e data, se fornecidos
    let clientes = [];
    if (filaId && data) {
      const [result] = await db.execute(
        `SELECT ID_CLIENTE, NOME_CLIENTE, STATUS
         FROM clientesfila
         WHERE ID_FILA = ? AND DT_MOVTO = ?`,
        [filaId, data]
      );
      clientes = result;
    }

    // 3️⃣ Tempo médio de espera por fila
    const [espera] = await db.execute(
      `SELECT f.NOME_FILA, AVG(TIMESTAMPDIFF(MINUTE, c.HORA_CHEGADA, c.HORA_ATENDIMENTO)) as tempo_medio
       FROM filas f
       JOIN clientesfila c ON f.ID_FILA = c.ID_FILA
       WHERE f.ID_EMPRESA = ?
       GROUP BY f.NOME_FILA`,
      [empresaId]
    );

    // Retornar tudo em um único JSON
    res.json({
      filas,
      clientes,
      espera
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar dashboard' });
  }
});

export default router;
