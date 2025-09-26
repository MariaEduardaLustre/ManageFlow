const db = require('../database/connection');

// Descobrir a empresa do usuário logado
async function getEmpresaByUser(userId) {
  const [rows] = await db.query(
    `SELECT ID_EMPRESA 
       FROM permissoes 
      WHERE ID_USUARIO = ? 
      LIMIT 1`,
    [userId]
  );
  return rows.length ? rows[0].ID_EMPRESA : null;
}

// Listar filas
exports.listarFilasPorEmpresa = async (req, res) => {
  try {
    const id_empresa = await getEmpresaByUser(req.user.id);
    if (!id_empresa) {
      return res.status(403).json({ erro: 'Usuário não vinculado a nenhuma empresa' });
    }

    const [rows] = await db.query(
      `SELECT ID_CONF_FILA AS value, NOME_FILA AS label
         FROM configuracaofila
        WHERE ID_EMPRESA = ? AND SITUACAO = 1`,
      [id_empresa]
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar filas:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
};

// Relatório de tempo médio de espera
exports.tempoEsperaPorFila = async (req, res) => {
  try {
    const { id_fila } = req.params;

    const [rows] = await db.query(
      `SELECT DATE(f.DT_MOVTO) AS data,
              CAST(AVG(TIMESTAMPDIFF(MINUTE, c.DT_ENTRA, c.DT_CHAMA)) AS DECIMAL(10,2)) AS media
       FROM clientesfila c
       JOIN fila f ON f.ID_FILA = c.ID_FILA
       WHERE f.ID_CONF_FILA = ?
         AND c.DT_ENTRA IS NOT NULL
         AND c.DT_CHAMA IS NOT NULL
       GROUP BY DATE(f.DT_MOVTO)
       ORDER BY data ASC`,
      [id_fila]
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar tempo de espera:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
};

// Relatório de desistências
exports.desistenciasPorFila = async (req, res) => {
  try {
    const { id_fila } = req.params;

    const [rows] = await db.query(
      `SELECT DATE(f.DT_MOVTO) AS data,
              COUNT(*) AS desistencias
       FROM clientesfila c
       JOIN fila f ON f.ID_FILA = c.ID_FILA
       WHERE f.ID_CONF_FILA = ?
         AND c.DT_ENTRA IS NOT NULL
         AND (c.DT_CHAMA IS NULL OR c.SITUACAO = 2)
       GROUP BY DATE(f.DT_MOVTO)
       ORDER BY data ASC`,
      [id_fila]
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar desistências:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
};

// Relatório de avaliações
exports.avaliacoesPorFila = async (req, res) => {
  try {
    const { id_fila } = req.params;

    const [rows] = await db.query(
      `SELECT DATE(a.DATA) AS data,
              CAST(AVG(a.NOTA) AS DECIMAL(3,1)) AS media
       FROM avaliacoesfila a
       JOIN fila f ON f.ID_FILA = a.ID_FILA
       WHERE f.ID_CONF_FILA = ?
       GROUP BY DATE(a.DATA)
       ORDER BY data ASC`,
      [id_fila]
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar avaliações:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
};
