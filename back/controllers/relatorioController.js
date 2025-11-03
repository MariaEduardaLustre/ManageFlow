// controllers/relatorioController.js
const db = require('../database/connection'); // mysql2/promise

// 1) Tempo médio de espera por fila/data
exports.tempoEsperaTodasFilas = async (req, res) => {
  try {
    // Aceita ?inicio=YYYY-MM-DD&fim=YYYY-MM-DD&fila=NomeDaFila (opcionais)
    const { inicio, fim, fila } = req.query;
    const params = [];
    let where = 'WHERE c.DT_ENTRA IS NOT NULL AND c.DT_CHAMA IS NOT NULL';

    if (inicio && fim) {
      where += ' AND DATE(c.DT_ENTRA) BETWEEN ? AND ?';
      params.push(inicio, fim);
    }
    if (fila) {
      where += ' AND cf.NOME_FILA = ?';
      params.push(fila);
    }

    const sql = `
      SELECT
        cf.NOME_FILA AS nome_fila,
        DATE(c.DT_ENTRA) AS data,
        CAST(AVG(TIMESTAMPDIFF(MINUTE, c.DT_ENTRA, c.DT_CHAMA)) AS DECIMAL(10,2)) AS media,
        COUNT(*) AS totalAtendidos,
        SUM(CASE WHEN c.SITUACAO = 2 OR c.DT_CHAMA IS NULL THEN 1 ELSE 0 END) AS desistencias
      FROM clientesfila c
      JOIN configuracaofila cf ON cf.ID_FILA = c.ID_FILA
      ${where}
      GROUP BY cf.NOME_FILA, DATE(c.DT_ENTRA)
      ORDER BY data ASC
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Erro tempoEsperaTodasFilas:', err);
    res.status(500).json({ erro: 'Erro ao buscar tempo de espera.' });
  }
};

// 2) Tempo médio de atendimento (DT_CHAMA -> DT_SAIDA)
exports.tempoAtendimentoTodasFilas = async (req, res) => {
  try {
    const { inicio, fim, fila } = req.query;
    const params = [];
    let where = 'WHERE c.DT_CHAMA IS NOT NULL AND c.DT_SAIDA IS NOT NULL AND c.SITUACAO = 1';

    if (inicio && fim) {
      where += ' AND DATE(c.DT_ENTRA) BETWEEN ? AND ?';
      params.push(inicio, fim);
    }
    if (fila) {
      where += ' AND cf.NOME_FILA = ?';
      params.push(fila);
    }

    const sql = `
      SELECT
        cf.NOME_FILA AS nome_fila,
        DATE(c.DT_ENTRA) AS data,
        CAST(AVG(TIMESTAMPDIFF(MINUTE, c.DT_CHAMA, c.DT_SAIDA)) AS DECIMAL(10,2)) AS media,
        COUNT(*) AS totalAtendidos
      FROM clientesfila c
      JOIN configuracaofila cf ON cf.ID_FILA = c.ID_FILA
      ${where}
      GROUP BY cf.NOME_FILA, DATE(c.DT_ENTRA)
      ORDER BY data ASC
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Erro tempoAtendimentoTodasFilas:', err);
    res.status(500).json({ erro: 'Erro ao buscar tempo de atendimento.' });
  }
};

// 3) Desistências por fila/data (taxa e totais)
exports.desistenciasTodasFilas = async (req, res) => {
  try {
    const { inicio, fim, fila } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    if (inicio && fim) {
      where += ' AND DATE(c.DT_ENTRA) BETWEEN ? AND ?';
      params.push(inicio, fim);
    }
    if (fila) {
      where += ' AND cf.NOME_FILA = ?';
      params.push(fila);
    }

    const sql = `
      SELECT
        cf.NOME_FILA AS fila,
        DATE(c.DT_ENTRA) AS data,
        SUM(CASE WHEN c.SITUACAO = 2 OR c.DT_CHAMA IS NULL THEN 1 ELSE 0 END) AS desistencias,
        COUNT(*) AS totalClientes,
        ROUND((SUM(CASE WHEN c.SITUACAO = 2 OR c.DT_CHAMA IS NULL THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) AS percentualDesistencia
      FROM clientesfila c
      JOIN configuracaofila cf ON cf.ID_FILA = c.ID_FILA
      ${where}
      GROUP BY cf.NOME_FILA, DATE(c.DT_ENTRA)
      ORDER BY data ASC
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Erro desistenciasTodasFilas:', err);
    res.status(500).json({ erro: 'Erro ao buscar desistências.' });
  }
};

// 4) Avaliações (média por dia e total feedbacks)
exports.avaliacoesTodasFilas = async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    const params = [];
    let where = 'WHERE a.DATA_AVALIACAO IS NOT NULL';

    if (inicio && fim) {
      where += ' AND DATE(a.DATA_AVALIACAO) BETWEEN ? AND ?';
      params.push(inicio, fim);
    }

    const sql = `
      SELECT
        DATE(a.DATA_AVALIACAO) AS data,
        CAST(AVG(a.NOTA) AS DECIMAL(3,1)) AS media,
        COUNT(*) AS totalFeedbacks
      FROM avaliacoes a
      ${where}
      GROUP BY DATE(a.DATA_AVALIACAO)
      ORDER BY data ASC
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Erro avaliacoesTodasFilas:', err);
    res.status(500).json({ erro: 'Erro ao buscar avaliações.' });
  }
};

// 5) Desempenho por fila (atendidos / desistentes / em espera)
exports.desempenhoPorFila = async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    const params = [];
    let where = '';
    if (inicio && fim) {
      where = 'WHERE DATE(c.DT_ENTRA) BETWEEN ? AND ?';
      params.push(inicio, fim);
    }

    const sql = `
      SELECT
        cf.NOME_FILA AS fila,
        SUM(CASE WHEN c.SITUACAO = 1 THEN 1 ELSE 0 END) AS atendidos,
        SUM(CASE WHEN c.SITUACAO = 2 THEN 1 ELSE 0 END) AS desistentes,
        SUM(CASE WHEN (c.SITUACAO <> 1 AND c.DT_SAIDA IS NULL) THEN 1 ELSE 0 END) AS em_espera
      FROM clientesfila c
      JOIN configuracaofila cf ON cf.ID_FILA = c.ID_FILA
      ${where}
      GROUP BY cf.NOME_FILA
      ORDER BY atendidos DESC
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Erro desempenhoPorFila:', err);
    res.status(500).json({ erro: 'Erro ao buscar desempenho por fila.' });
  }
};

// 6) Distribuição de notas (agrupada por NOTA)
exports.distribuicaoNotas = async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    const params = [];
    let where = '';
    if (inicio && fim) {
      where = 'WHERE DATE(DATA_AVALIACAO) BETWEEN ? AND ?';
      params.push(inicio, fim);
    }

    const sql = `
      SELECT NOTA AS nota, COUNT(*) AS quantidade
      FROM avaliacoes
      ${where}
      GROUP BY NOTA
      ORDER BY NOTA ASC
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Erro distribuicaoNotas:', err);
    res.status(500).json({ erro: 'Erro ao buscar distribuição de notas.' });
  }
};

// 7) Listar filas (para select)
exports.listarFilas = async (req, res) => {
  try {
    const sql = `SELECT DISTINCT NOME_FILA AS nome_fila FROM configuracaofila ORDER BY NOME_FILA`;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Erro listarFilas:', err);
    res.status(500).json({ erro: 'Erro ao buscar filas.' });
  }
};
