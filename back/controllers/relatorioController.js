// controllers/relatorioController.js
const db = require('../database/connection'); // mysql2/promise

// Helper: filtro por nome (cf.NOME_FILA) ou por ID_FILA (numérico)
function buildFilaFilter(fila, where, params) {
  if (!fila) return { where, params };
  const isNumericId = /^\d+$/.test(String(fila).trim());
  if (isNumericId) {
    where += ' AND c.ID_FILA = ?';
    params.push(Number(fila));
  } else {
    where += ' AND cf.NOME_FILA = ?';
    params.push(fila);
  }
  return { where, params };
}

//-------------------------------------------------------------
// 1) Tempo médio de espera (DT_ENTRA -> DT_CHAMA)
//   - média só para CHAMADOS (status=1)
//   - contadores enxergam todos os status (0/1/2)
//-------------------------------------------------------------
exports.tempoEsperaTodasFilas = async (req, res) => {
  try {
    const { id_empresa } = req.user;
    const { inicio, fim, fila } = req.query;

    let params = [id_empresa];
    let where = `
      WHERE c.ID_EMPRESA = ?
      AND c.DT_ENTRA IS NOT NULL
    `;
    if (inicio && fim) {
      where += ' AND DATE(c.DT_ENTRA) BETWEEN ? AND ?';
      params.push(inicio, fim);
    }
    ({ where, params } = buildFilaFilter(fila, where, params));

    const sql = `
      SELECT
        COALESCE(cf.NOME_FILA, CONCAT('Fila ', c.ID_FILA)) AS nome_fila,
        DATE(c.DT_ENTRA) AS data,
        CAST(AVG(
          CASE
            WHEN c.SITUACAO = 1 AND c.DT_CHAMA IS NOT NULL
            THEN TIMESTAMPDIFF(MINUTE, c.DT_ENTRA, c.DT_CHAMA)
            ELSE NULL
          END
        ) AS DECIMAL(10,2)) AS media,
        SUM(CASE WHEN c.SITUACAO = 1 THEN 1 ELSE 0 END) AS totalAtendidos,   -- chamados (1)
        SUM(CASE WHEN c.SITUACAO = 2 THEN 1 ELSE 0 END) AS desistencias,      -- desistência (2)
        SUM(CASE WHEN c.SITUACAO = 0 THEN 1 ELSE 0 END) AS aguardando         -- aguardando (0)
      FROM clientesfila c
      LEFT JOIN fila f
        ON f.ID_EMPRESA = c.ID_EMPRESA
       AND f.DT_MOVTO   = c.DT_MOVTO
       AND f.ID_FILA    = c.ID_FILA
      LEFT JOIN configuracaofila cf
        ON cf.ID_EMPRESA   = f.ID_EMPRESA
       AND cf.ID_CONF_FILA = f.ID_CONF_FILA
      ${where}
      GROUP BY COALESCE(cf.NOME_FILA, CONCAT('Fila ', c.ID_FILA)), DATE(c.DT_ENTRA)
      ORDER BY data ASC
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Erro tempoEsperaTodasFilas:', err);
    res.status(500).json({ erro: 'Erro ao buscar tempo de espera.' });
  }
};

//-------------------------------------------------------------
// 2) Tempo médio de atendimento (DT_CHAMA -> DT_SAIDA)
//   - considera somente CHAMADOS (status=1) com DT_CHAMA e DT_SAIDA
//-------------------------------------------------------------
exports.tempoAtendimentoTodasFilas = async (req, res) => {
  try {
    const { id_empresa } = req.user;
    const { inicio, fim, fila } = req.query;

    let params = [id_empresa];
    let where = `
      WHERE c.ID_EMPRESA = ?
      AND c.SITUACAO = 1
      AND c.DT_CHAMA IS NOT NULL
      AND c.DT_SAIDA IS NOT NULL
    `;
    if (inicio && fim) {
      where += ' AND DATE(c.DT_ENTRA) BETWEEN ? AND ?';
      params.push(inicio, fim);
    }
    ({ where, params } = buildFilaFilter(fila, where, params));

    const sql = `
      SELECT
        COALESCE(cf.NOME_FILA, CONCAT('Fila ', c.ID_FILA)) AS nome_fila,
        DATE(c.DT_ENTRA) AS data,
        CAST(AVG(TIMESTAMPDIFF(MINUTE, c.DT_CHAMA, c.DT_SAIDA)) AS DECIMAL(10,2)) AS media,
        COUNT(*) AS totalAtendidos  -- aqui já são só status=1 com CHAMA/SAIDA
      FROM clientesfila c
      LEFT JOIN fila f
        ON f.ID_EMPRESA = c.ID_EMPRESA
       AND f.DT_MOVTO   = c.DT_MOVTO
       AND f.ID_FILA    = c.ID_FILA
      LEFT JOIN configuracaofila cf
        ON cf.ID_EMPRESA   = f.ID_EMPRESA
       AND cf.ID_CONF_FILA = f.ID_CONF_FILA
      ${where}
      GROUP BY COALESCE(cf.NOME_FILA, CONCAT('Fila ', c.ID_FILA)), DATE(c.DT_ENTRA)
      ORDER BY data ASC
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Erro tempoAtendimentoTodasFilas:', err);
    res.status(500).json({ erro: 'Erro ao buscar tempo de atendimento.' });
  }
};

//-------------------------------------------------------------
// 3) Desistências por fila/data (apenas status=2)
//-------------------------------------------------------------
exports.desistenciasTodasFilas = async (req, res) => {
  try {
    const { id_empresa } = req.user;
    const { inicio, fim, fila } = req.query;

    let params = [id_empresa];
    let where = `WHERE c.ID_EMPRESA = ?`;
    if (inicio && fim) {
      where += ' AND DATE(c.DT_ENTRA) BETWEEN ? AND ?';
      params.push(inicio, fim);
    }
    ({ where, params } = buildFilaFilter(fila, where, params));

    const sql = `
      SELECT
        COALESCE(cf.NOME_FILA, CONCAT('Fila ', c.ID_FILA)) AS fila,
        DATE(c.DT_ENTRA) AS data,
        SUM(CASE WHEN c.SITUACAO = 2 THEN 1 ELSE 0 END) AS desistencias,     -- só status=2
        COUNT(*) AS totalClientes,
        ROUND(SUM(CASE WHEN c.SITUACAO = 2 THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) AS percentualDesistencia
      FROM clientesfila c
      LEFT JOIN fila f
        ON f.ID_EMPRESA = c.ID_EMPRESA
       AND f.DT_MOVTO   = c.DT_MOVTO
       AND f.ID_FILA    = c.ID_FILA
      LEFT JOIN configuracaofila cf
        ON cf.ID_EMPRESA   = f.ID_EMPRESA
       AND cf.ID_CONF_FILA = f.ID_CONF_FILA
      ${where}
      GROUP BY COALESCE(cf.NOME_FILA, CONCAT('Fila ', c.ID_FILA)), DATE(c.DT_ENTRA)
      ORDER BY data ASC
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Erro desistenciasTodasFilas:', err);
    res.status(500).json({ erro: 'Erro ao buscar desistências.' });
  }
};

//-------------------------------------------------------------
// 4) Avaliações (média + total) — sem impacto de status
//-------------------------------------------------------------
exports.avaliacoesTodasFilas = async (req, res) => {
  try {
    const { id_empresa } = req.user;
    const { inicio, fim, fila } = req.query;

    let params = [id_empresa];
    let where = 'WHERE a.ID_EMPRESA = ?';
    if (inicio && fim) {
      where += ' AND DATE(a.DATA) BETWEEN ? AND ?';
      params.push(inicio, fim);
    }

    if (fila) {
      const isNumericId = /^\d+$/.test(String(fila).trim());
      if (isNumericId) {
        where += ' AND a.ID_FILA = ?';
        params.push(Number(fila));
      } else {
        const sql = `
          SELECT DATE(a.DATA) AS data,
                 CAST(AVG(a.NOTA) AS DECIMAL(3,1)) AS media,
                 COUNT(*) AS totalFeedbacks
          FROM avaliacoes a
          LEFT JOIN fila f
            ON f.ID_EMPRESA = a.ID_EMPRESA
           AND f.DT_MOVTO   = a.DT_MOVTO
           AND f.ID_FILA    = a.ID_FILA
          LEFT JOIN configuracaofila cf
            ON cf.ID_EMPRESA   = f.ID_EMPRESA
           AND cf.ID_CONF_FILA = f.ID_CONF_FILA
          ${where} AND cf.NOME_FILA = ?
          GROUP BY DATE(a.DATA)
          ORDER BY data ASC
        `;
        const [rows] = await db.query(sql, [...params, fila]);
        return res.json(rows);
      }
    }

    const sql = `
      SELECT DATE(a.DATA) AS data,
             CAST(AVG(a.NOTA) AS DECIMAL(3,1)) AS media,
             COUNT(*) AS totalFeedbacks
      FROM avaliacoes a
      ${where}
      GROUP BY DATE(a.DATA)
      ORDER BY data ASC
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Erro avaliacoesTodasFilas:', err);
    res.status(500).json({ erro: 'Erro ao buscar avaliações.' });
  }
};

//-------------------------------------------------------------
// 5) Desempenho por fila (status mapping 0/1/2)
//-------------------------------------------------------------
exports.desempenhoPorFila = async (req, res) => {
  try {
    const { id_empresa } = req.user;
    const { inicio, fim, fila } = req.query;

    let params = [id_empresa];
    let where = 'WHERE c.ID_EMPRESA = ?';
    if (inicio && fim) {
      where += ' AND DATE(c.DT_ENTRA) BETWEEN ? AND ?';
      params.push(inicio, fim);
    }
    ({ where, params } = buildFilaFilter(fila, where, params));

    const sql = `
      SELECT
        COALESCE(cf.NOME_FILA, CONCAT('Fila ', c.ID_FILA)) AS fila,
        SUM(CASE WHEN c.SITUACAO = 1 THEN 1 ELSE 0 END) AS atendidos,   -- chamados (1)
        SUM(CASE WHEN c.SITUACAO = 2 THEN 1 ELSE 0 END) AS desistentes, -- desistência (2)
        SUM(CASE WHEN c.SITUACAO = 0 THEN 1 ELSE 0 END) AS em_espera,   -- aguardando (0)
        CAST(AVG(
          CASE WHEN c.SITUACAO = 1 AND c.DT_CHAMA IS NOT NULL
               THEN TIMESTAMPDIFF(MINUTE, c.DT_ENTRA, c.DT_CHAMA)
               ELSE NULL END
        ) AS DECIMAL(10,1)) AS media_espera_atendidos,
        CAST(AVG(
          CASE WHEN c.SITUACAO = 2 AND c.DT_SAIDA IS NOT NULL
               THEN TIMESTAMPDIFF(MINUTE, c.DT_ENTRA, c.DT_SAIDA)
               ELSE NULL END
        ) AS DECIMAL(10,1)) AS media_espera_desistentes
      FROM clientesfila c
      LEFT JOIN fila f
        ON f.ID_EMPRESA = c.ID_EMPRESA
       AND f.DT_MOVTO   = c.DT_MOVTO
       AND f.ID_FILA    = c.ID_FILA
      LEFT JOIN configuracaofila cf
        ON cf.ID_EMPRESA   = f.ID_EMPRESA
       AND cf.ID_CONF_FILA = f.ID_CONF_FILA
      ${where}
      GROUP BY COALESCE(cf.NOME_FILA, CONCAT('Fila ', c.ID_FILA))
      ORDER BY atendidos DESC
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Erro desempenhoPorFila:', err);
    res.status(500).json({ erro: 'Erro ao buscar desempenho por fila.' });
  }
};

//-------------------------------------------------------------
// 6) Distribuição de notas (1-5)
//-------------------------------------------------------------
exports.distribuicaoNotas = async (req, res) => {
  try {
    const { id_empresa } = req.user;
    const { inicio, fim, fila } = req.query;

    let params = [id_empresa];
    let where = 'WHERE a.ID_EMPRESA = ?';
    if (inicio && fim) {
      where += ' AND DATE(a.DATA) BETWEEN ? AND ?';
      params.push(inicio, fim);
    }

    if (fila) {
      const isNumericId = /^\d+$/.test(String(fila).trim());
      if (isNumericId) {
        where += ' AND a.ID_FILA = ?';
        params.push(Number(fila));
      } else {
        const sql = `
          SELECT a.NOTA AS nota, COUNT(*) AS quantidade
          FROM avaliacoes a
          LEFT JOIN fila f
            ON f.ID_EMPRESA = a.ID_EMPRESA
           AND f.DT_MOVTO   = a.DT_MOVTO
           AND f.ID_FILA    = a.ID_FILA
          LEFT JOIN configuracaofila cf
            ON cf.ID_EMPRESA   = f.ID_EMPRESA
           AND cf.ID_CONF_FILA = f.ID_CONF_FILA
          ${where} AND cf.NOME_FILA = ?
          GROUP BY a.NOTA
          ORDER BY a.NOTA ASC
        `;
        const [rows] = await db.query(sql, [...params, fila]);
        return res.json(rows);
      }
    }

    const sql = `
      SELECT a.NOTA AS nota, COUNT(*) AS quantidade
      FROM avaliacoes a
      ${where}
      GROUP BY a.NOTA
      ORDER BY a.NOTA ASC
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Erro distribuicaoNotas:', err);
    res.status(500).json({ erro: 'Erro ao buscar distribuição de notas.' });
  }
};

//-------------------------------------------------------------
// 7) Listar filas (NOME_FILA de configuracaofila)
//-------------------------------------------------------------
exports.listarFilas = async (req, res) => {
  try {
    const { id_empresa } = req.user;

    const sql = `
      SELECT DISTINCT NOME_FILA AS nome_fila
      FROM configuracaofila
      WHERE ID_EMPRESA = ?
      ORDER BY NOME_FILA
    `;
    const [rows] = await db.query(sql, [id_empresa]);
    res.json(rows);
  } catch (err) {
    console.error('Erro listarFilas:', err);
    res.status(500).json({ erro: 'Erro ao buscar filas.' });
  }
};

//-------------------------------------------------------------
// 8) Avaliações detalhadas
//-------------------------------------------------------------
exports.listarAvaliacoesDetalhadas = async (req, res) => {
  try {
    const { id_empresa } = req.user;
    const { inicio, fim, fila } = req.query;

    let params = [id_empresa];
    let where = 'WHERE a.ID_EMPRESA = ?';
    if (inicio && fim) {
      where += ' AND DATE(a.DATA) BETWEEN ? AND ?';
      params.push(inicio, fim);
    }

    let join = '';
    if (fila) {
      const isNumericId = /^\d+$/.test(String(fila).trim());
      if (isNumericId) {
        where += ' AND a.ID_FILA = ?';
        params.push(Number(fila));
      } else {
        join = `
          LEFT JOIN fila f
            ON f.ID_EMPRESA = a.ID_EMPRESA
           AND f.DT_MOVTO   = a.DT_MOVTO
           AND f.ID_FILA    = a.ID_FILA
          LEFT JOIN configuracaofila cf
            ON cf.ID_EMPRESA   = f.ID_EMPRESA
           AND cf.ID_CONF_FILA = f.ID_CONF_FILA
        `;
        where += ' AND cf.NOME_FILA = ?';
        params.push(fila);
      }
    }

    const sql = `
      SELECT a.DATA AS data, a.NOTA AS nota, a.COMENTARIO AS comentario
      FROM avaliacoes a
      ${join}
      ${where}
      ORDER BY a.DATA DESC
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar avaliações detalhadas:', err);
    res.status(500).json({ erro: 'Erro ao buscar avaliações detalhadas.' });
  }
};
