const db = require('../database/connection');

// Listar filas da empresa logada
exports.listarFilasPorEmpresa = async (req, res) => {
  try {
    const empresaHeader = req.headers['empresa-selecionada'];
    if (!empresaHeader) {
      return res.status(400).json({ erro: 'Empresa não informada no header' });
    }

    let empresaObj;
    try {
      empresaObj = JSON.parse(empresaHeader);
    } catch {
      return res.status(400).json({ erro: 'Header empresa-selecionada inválido' });
    }

    const id_empresa = empresaObj.ID_EMPRESA;
    if (!id_empresa) {
      return res.status(400).json({ erro: 'ID da empresa não informado' });
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
