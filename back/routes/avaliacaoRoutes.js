// back/src/routes/avaliacaoRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../database/connection'); // mysql2/promise
const qr = require('qr-image');

// FRONT sem barra final
const FRONTEND_URL = (process.env.PUBLIC_FRONT_BASE_URL || 'http://localhost:3000').replace(/\/+$/,'');

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
router.get('/info-empresa/:token', async (req, res) => {
  try {
    const idEmpresa = parseEmpresaIdFromAvaliacaoToken(req.params.token);
    if (!idEmpresa) return res.status(400).json({ error: 'TOKEN_INVALIDO' });

    const [[empresa]] = await db.query(
      `SELECT ID_EMPRESA, NOME_EMPRESA, LOGO FROM empresa WHERE ID_EMPRESA = ? LIMIT 1`,
      [idEmpresa]
    );
    if (!empresa) return res.status(404).json({ error: 'EMPRESA_NAO_ENCONTRADA' });

    // Retorna no formato "novo" e também o "legado" para compatibilidade
    return res.json({
      idEmpresa: empresa.ID_EMPRESA,
      nomeEmpresa: empresa.NOME_EMPRESA,
      logo: empresa.LOGO,
      // compat:
      ID_EMPRESA: empresa.ID_EMPRESA,
      NOME_EMPRESA: empresa.NOME_EMPRESA,
      LOGO: empresa.LOGO
    });
  } catch (err) {
    return res.status(500).json({ error: 'ERRO_INTERNO', detail: err.message });
  }
});

/**
 * NOVO: GET /api/avaliacoes/info-cliente
 * Query: token=AV-<id>-TOKEN&dtMovto=YYYY-MM-DD&idFila=...&idCliente=...
 * Retorna { clienteNome, idCliente, idFila, dtMovto }
 * -> Usa tabela clientes_fila (ajuste o nome se for diferente no seu schema)
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

    // Ajuste o nome/colunas se sua tabela for diferente
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

    // garante empresa existente (evita FK)
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

module.exports = router;
