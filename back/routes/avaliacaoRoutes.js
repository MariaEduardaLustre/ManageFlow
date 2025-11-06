const express = require('express');
const router = express.Router();
const db = require('../database/connection'); // mysql2/promise
const qr = require('qr-image');

const FRONTEND_URL = process.env.PUBLIC_FRONT_BASE_URL || 'http://localhost:3000';

// ✅ usa util que gera URL pública ou assinada
const { makeImageAccessUrl } = require('../utils/image');

/** Token de avaliação: AV-<ID_EMPRESA>-TOKEN */
function makeAvaliacaoToken(idEmpresa) {
  return `AV-${idEmpresa}-TOKEN`;
}
function parseEmpresaIdFromAvaliacaoToken(token) {
  if (!token || typeof token !== 'string') return null;
  const m = token.match(/^AV-(\d+)-TOKEN$/i);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) ? id : null;
}

function isValidDateISO(d) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

// --------- INFO EMPRESA PELO TOKEN (público) -----------
// Agora devolve LOGO_URL / img_perfil como URL FINAL (presigned se bucket privado)
router.get('/info-empresa/:token', async (req, res) => {
  try {
    const idEmpresa = parseEmpresaIdFromAvaliacaoToken(req.params.token);
    if (!idEmpresa) return res.status(400).json({ error: 'TOKEN_INVALIDO' });

    const [[empresa]] = await db.query(
      `SELECT ID_EMPRESA, NOME_EMPRESA, LOGO FROM empresa WHERE ID_EMPRESA = ? LIMIT 1`,
      [idEmpresa]
    );
    if (!empresa) return res.status(404).json({ error: 'EMPRESA_NAO_ENCONTRADA' });

    // 🔐 gera URL (presigned se S3_URL_MODE != 'public')
    const logoUrl = await makeImageAccessUrl(empresa.LOGO);

    return res.json({
      idEmpresa: empresa.ID_EMPRESA,
      nomeEmpresa: empresa.NOME_EMPRESA,
      logo: empresa.LOGO,       // chave/valor cru salvo no banco
      logo_url: logoUrl,        // ✅ URL final para <img>

      // compat
      ID_EMPRESA: empresa.ID_EMPRESA,
      NOME_EMPRESA: empresa.NOME_EMPRESA,
      LOGO: empresa.LOGO,
      LOGO_URL: logoUrl,

      // compat com telas que esperam estes nomes
      img_perfil: logoUrl,
      img_perfil_url: logoUrl,
    });
  } catch (err) {
    return res.status(500).json({ error: 'ERRO_INTERNO', detail: err.message });
  }
});

/**
 * GET /api/avaliacoes/info-cliente
 * Query: token=AV-<id>-TOKEN&dtMovto=YYYY-MM-DD&idFila=...&idCliente=...
 */
router.get('/info-cliente', async (req, res) => {
  try {
    const { token, dtMovto, idFila, idCliente } = req.query || {};
    const idEmpresa = parseEmpresaIdFromAvaliacaoToken(token);
    if (!idEmpresa) return res.status(400).json({ error: 'TOKEN_INVALIDO' });

    const idFilaNum = Number(idFila);
    const idClienteNum = Number(idCliente);
    if (!isValidDateISO(dtMovto) || !Number.isFinite(idFilaNum) || !Number.isFinite(idClienteNum)) {
      return res.status(400).json({ error: 'PARAMS_INVALIDOS', detail: 'Informe dtMovto=YYYY-MM-DD, idFila e idCliente numéricos.' });
    }

    const [rows] = await db.query(
      `
      SELECT
        ID_EMPRESA, DT_MOVTO, ID_FILA, ID_CLIENTE,
        COALESCE(NOME_CLIENTE, NOME, CLIENTE_NOME, 'Cliente') AS NOME_EXIBICAO
      FROM clientesfila
      WHERE ID_EMPRESA = ?
        AND DT_MOVTO   = ?
        AND ID_FILA    = ?
        AND ID_CLIENTE = ?
      LIMIT 1
      `,
      [idEmpresa, dtMovto, idFilaNum, idClienteNum]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'CLIENTE_NAO_ENCONTRADO_NO_DIA' });
    }

    return res.json({
      clienteNome: rows[0].NOME_EXIBICAO || 'Cliente',
      idCliente: rows[0].ID_CLIENTE,
      idFila: rows[0].ID_FILA,
      dtMovto: rows[0].DT_MOVTO
    });
  } catch (err) {
    console.error('[GET /avaliacoes/info-cliente] erro:', { message: err.message, sqlMessage: err.sqlMessage, sql: err.sql });
    return res.status(500).json({ error: 'ERRO_INTERNO', detail: err.sqlMessage || err.message });
  }
});

// --------- SALVAR AVALIAÇÃO (público) -----------
router.post('/', async (req, res) => {
  try {
    const { token, nota, comentario, clienteNome } = req.body || {};
    const idEmpresa = parseEmpresaIdFromAvaliacaoToken(token);
    if (!idEmpresa) return res.status(400).json({ error: 'TOKEN_INVALIDO' });

    const n = Number(nota);
    if (!Number.isFinite(n) || n < 1 || n > 5) {
      return res.status(400).json({ error: 'NOTA_INVALIDA', detail: 'nota deve ser 1..5' });
    }

    const [[existe]] = await db.query(`SELECT 1 FROM empresa WHERE ID_EMPRESA = ? LIMIT 1`, [idEmpresa]);
    if (!existe) return res.status(404).json({ error: 'EMPRESA_NAO_ENCONTRADA' });

    const nomeFinal = (clienteNome && String(clienteNome).trim()) ? String(clienteNome).trim() : 'Cliente';

    await db.query(
      `INSERT INTO avaliacoes (ID_EMPRESA, DT_MOVTO, NOTA, COMENTARIO, CLIENTE_NOME)
       VALUES (?, CURDATE(), ?, ?, ?)`,
      [idEmpresa, n, comentario ? String(comentario).trim() : null, nomeFinal]
    );

    return res.status(201).json({ message: 'Avaliação registrada com sucesso!' });
  } catch (err) {
    console.error('[POST /avaliacoes] erro:', { message: err.message, sqlMessage: err.sqlMessage, sql: err.sql });
    return res.status(500).json({ error: 'NAO_FOI_POSSIVEL_SALVAR', detail: err.sqlMessage || err.message });
  }
});

// --------- GERAR LINK DE AVALIAÇÃO -----------
router.get('/avaliacao-link/:idEmpresa', async (req, res) => {
  try {
    const idEmpresa = Number(req.params.idEmpresa);
    if (!Number.isFinite(idEmpresa) || idEmpresa <= 0) {
      return res.status(400).json({ error: 'ID_EMPRESA_INVALIDO' });
    }

    const [[existe]] = await db.query(`SELECT 1 FROM empresa WHERE ID_EMPRESA = ? LIMIT 1`, [idEmpresa]);
    if (!existe) return res.status(404).json({ error: 'EMPRESA_NAO_ENCONTRADA' });

    const token = makeAvaliacaoToken(idEmpresa);
    const url = `${FRONTEND_URL}/avaliar/${token}`;
    return res.json({ url, token });
  } catch (err) {
    return res.status(500).json({ error: 'ERRO_INTERNO', detail: err.message });
  }
});

// --------- QR CODE DO LINK DE AVALIAÇÃO -----------
router.get('/qr/avaliacao/:token', (req, res) => {
  try {
    const { token } = req.params;
    const id = parseEmpresaIdFromAvaliacaoToken(token);
    if (!id) return res.status(400).send('Token inválido');

    const link = `${FRONTEND_URL}/avaliar/${token}`;
    const png = qr.image(link, { type: 'png', margin: 2, size: 8 });
    res.setHeader('Content-Type', 'image/png');
    png.pipe(res);
  } catch (err) {
    return res.status(500).send('Erro ao gerar QR Code');
  }
});

// ================== DASHBOARD ==================
router.get('/stats/:idEmpresa', async (req, res) => {
  const { idEmpresa } = req.params;
  const { nota } = req.query;

  try {
    const [[statsGeral]] = await db.query(
      `SELECT AVG(NOTA) AS mediaGeral, COUNT(*) AS totalAvaliacoes
       FROM avaliacoes WHERE ID_EMPRESA = ?;`,
      [idEmpresa]
    );

    const [[distribuicao]] = await db.query(
      `SELECT
         SUM(CASE WHEN NOTA = 5 THEN 1 ELSE 0 END) AS estrelas5,
         SUM(CASE WHEN NOTA = 4 THEN 1 ELSE 0 END) AS estrelas4,
         SUM(CASE WHEN NOTA = 3 THEN 1 ELSE 0 END) AS estrelas3,
         SUM(CASE WHEN NOTA = 2 THEN 1 ELSE 0 END) AS estrelas2,
         SUM(CASE WHEN NOTA = 1 THEN 1 ELSE 0 END) AS estrelas1
       FROM avaliacoes WHERE ID_EMPRESA = ?;`,
      [idEmpresa]
    );

    let notaFilterQuery = '';
    const params = [idEmpresa];
    if (nota && Number(nota) > 0) {
      notaFilterQuery = 'AND NOTA = ?';
      params.push(Number(nota));
    }
    const [[{ totalFiltrado }]] = await db.query(
      `SELECT COUNT(*) as totalFiltrado FROM avaliacoes WHERE ID_EMPRESA = ? ${notaFilterQuery}`,
      params
    );

    res.json({
      mediaGeral: Number(statsGeral.mediaGeral || 0),
      totalAvaliacoes: Number(statsGeral.totalAvaliacoes || 0),
      totalFiltrado: Number(totalFiltrado || 0),
      distribuicao: [
        { nota: 5, contagem: Number(distribuicao.estrelas5 || 0) },
        { nota: 4, contagem: Number(distribuicao.estrelas4 || 0) },
        { nota: 3, contagem: Number(distribuicao.estrelas3 || 0) },
        { nota: 2, contagem: Number(distribuicao.estrelas2 || 0) },
        { nota: 1, contagem: Number(distribuicao.estrelas1 || 0) }
      ]
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de avaliação:', error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

router.get('/comentarios/:idEmpresa', async (req, res) => {
  const { idEmpresa } = req.params;
  const { nota, page = 1, limit = 5 } = req.query;

  const nLimit = parseInt(limit, 10);
  const nOffset = (parseInt(page, 10) - 1) * nLimit;

  try {
    let notaFilterQuery = '';
    const params = [idEmpresa];
    if (nota && Number(nota) > 0) {
      notaFilterQuery = 'AND NOTA = ?';
      params.push(Number(nota));
    }

    const sql = `
      SELECT NOTA, COMENTARIO, DT_CRIACAO
      FROM avaliacoes
      WHERE ID_EMPRESA = ?
        AND COMENTARIO IS NOT NULL
        AND TRIM(COMENTARIO) <> ''
        ${notaFilterQuery}
      ORDER BY DT_CRIACAO DESC
      LIMIT ? OFFSET ?;`;
    const [comentarios] = await db.query(sql, [...params, nLimit, nOffset]);

    const sqlTotal = `
      SELECT COUNT(*) AS total
      FROM avaliacoes
      WHERE ID_EMPRESA = ?
        AND COMENTARIO IS NOT NULL
        AND TRIM(COMENTARIO) <> ''
        ${notaFilterQuery};`;
    const [[{ total }]] = await db.query(sqlTotal, params);

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

router.get('/tendencia/:idEmpresa', async (req, res) => {
  const { idEmpresa } = req.params;

  try {
    const [tendencia] = await db.query(
      `SELECT DATE(DT_CRIACAO) AS data, COUNT(*) AS contagem, AVG(NOTA) AS mediaNota
       FROM avaliacoes
       WHERE ID_EMPRESA = ?
         AND DT_CRIACAO >= CURDATE() - INTERVAL 30 DAY
       GROUP BY DATE(DT_CRIACAO)
       ORDER BY data ASC;`,
      [idEmpresa]
    );

    const dadosFormatados = tendencia.map(item => ({
      data: item.data,
      contagem: Number(item.contagem),
      mediaNota: Number(Number(item.mediaNota).toFixed(1))
    }));

    res.json(dadosFormatados);
  } catch (error) {
    console.error('Erro ao buscar tendência de avaliações:', error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

module.exports = router;
