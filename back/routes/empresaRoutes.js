// routes/empresaRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../database/connection');

/**
 * POST /empresas/criar-empresa
 * Cria empresa, perfis padrão (ADM, STAF, ANALYST, CUSTOMER) e
 * vincula o criador como Administrador (NIVEL=1).
 */
router.post('/criar-empresa', async (req, res) => {
  console.log('Dados recebidos:', req.body);

  const {
    nomeEmpresa,
    cnpj,
    email,
    ddi,
    ddd,
    telefone,
    endereco,
    numero,
    logo,
    idUsuario: idUsuarioCriador, // vem do body; se tiver JWT, pegue do token
  } = req.body;

  const connection = await db.getConnection(); // conexão dedicada para a transação
  try {
    await connection.beginTransaction();

    // 1) Cria a empresa
    const [empresaResult] = await connection.query(
      `INSERT INTO empresa
        (NOME_EMPRESA, CNPJ, EMAIL, DDI, DDD, TELEFONE, ENDERECO, NUMERO, LOGO)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [nomeEmpresa, cnpj, email, ddi, ddd, telefone, endereco, numero, logo]
    );
    const idEmpresa = empresaResult.insertId;

    // 2) Cria os 4 perfis padrão (idempotente)
    await connection.query(
      `INSERT IGNORE INTO perfil (NOME_PERFIL, ID_EMPRESA, NIVEL)
       VALUES
         ('Administrador', ?, 1),
         ('Staff',         ?, 2),
         ('Analista',      ?, 3),
         ('Cliente',       ?, 4)`,
      [idEmpresa, idEmpresa, idEmpresa, idEmpresa]
    );

    // 3) Busca o perfil ADM (NIVEL = 1) recém-criado
    const [[perfilAdmin]] = await connection.query(
      `SELECT ID_PERFIL
         FROM perfil
        WHERE ID_EMPRESA = ? AND NIVEL = 1
        LIMIT 1`,
      [idEmpresa]
    );

    if (!perfilAdmin) {
      throw new Error('Perfil Administrador não encontrado após criar empresa.');
    }

    // 4) Vincula o criador como Administrador (idempotente)
    await connection.query(
      `INSERT IGNORE INTO permissoes (ID_EMPRESA, ID_PERFIL, ID_USUARIO)
       VALUES (?,?,?)`,
      [idEmpresa, perfilAdmin.ID_PERFIL, idUsuarioCriador]
    );

    // 5) Commit
    await connection.commit();
    return res.json({ message: 'Empresa criada com sucesso!', idEmpresa });
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao criar empresa:', error);
    return res.status(500).json({ error: 'Erro ao criar empresa' });
  } finally {
    connection.release();
  }
});

/**
 * GET /empresas-do-usuario/:idUsuario
 * Lista empresas às quais o usuário tem acesso, garantindo que o perfil é da MESMA empresa.
 */
router.get('/empresas-do-usuario/:idUsuario', async (req, res) => {
  const { idUsuario } = req.params;

  try {
    const [results] = await db.query(
      `SELECT
         e.ID_EMPRESA,
         e.NOME_EMPRESA,
         p.NOME_PERFIL,
         p.NIVEL
       FROM permissoes pe
       JOIN empresa e
         ON e.ID_EMPRESA = pe.ID_EMPRESA
       JOIN perfil p
         ON p.ID_PERFIL  = pe.ID_PERFIL
        AND p.ID_EMPRESA = pe.ID_EMPRESA  -- garante a mesma empresa
      WHERE pe.ID_USUARIO = ?
      ORDER BY e.NOME_EMPRESA ASC, p.NIVEL ASC`,
      [idUsuario]
    );

    return res.json(results);
  } catch (err) {
    console.error('Erro ao buscar empresas do usuário:', err);
    return res.status(500).json({ error: 'Erro interno ao buscar empresas.' });
  }
});

/**
 * GET /detalhes/:idEmpresa
 * Retorna dados da empresa
 */
router.get('/detalhes/:idEmpresa', async (req, res) => {
  const { idEmpresa } = req.params;

  try {
    const [empresa] = await db.query(
      `SELECT
         ID_EMPRESA, NOME_EMPRESA, CNPJ, EMAIL, DDI, DDD, TELEFONE,
         ENDERECO, NUMERO, LOGO
       FROM empresa
      WHERE ID_EMPRESA = ?`,
      [idEmpresa]
    );

    if (empresa.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada.' });
    }

    return res.json(empresa[0]);
  } catch (err) {
    console.error('Erro ao buscar detalhes da empresa:', err);
    return res.status(500).json({ error: 'Erro interno ao buscar detalhes da empresa.' });
  }
});

/**
 * GET /perfis/:idEmpresa
 * Lista perfis de uma empresa
 */
router.get('/perfis/:idEmpresa', async (req, res) => {
  const { idEmpresa } = req.params;
  try {
    const [perfis] = await db.query(
      `SELECT ID_PERFIL, NOME_PERFIL, NIVEL
         FROM perfil
        WHERE ID_EMPRESA = ?
     ORDER BY NIVEL`,
      [idEmpresa]
    );
    return res.json(perfis);
  } catch (err) {
    console.error('Erro ao buscar perfis da empresa:', err);
    return res.status(500).json({ error: 'Erro interno ao buscar perfis.' });
  }
});

/**
 * As rotas de filas/cliente abaixo são as que você já tinha;
 * mantive apenas os ajustes de formatação.
 */

router.get('/filas/:idEmpresa', async (req, res) => {
  const { idEmpresa } = req.params;

  try {
    const [filas] = await db.query(
      `SELECT
         f.ID_FILA,
         f.ID_EMPRESA,
         f.DT_MOVTO,
         f.DT_INI,
         f.DT_FIM,
         f.DT_INATIV,
         f.BLOCK,
         f.SITUACAO,
         cf.NOME_FILA,
         cf.TOKEN_FILA,
         cf.MENSAGEM,
         cf.TEMP_TOL,
         cf.QDTE_MIN,
         cf.QTDE_MAX
       FROM Fila f
       JOIN ConfiguracaoFila cf
         ON f.ID_CONF_FILA = cf.ID_CONF_FILA
        AND f.ID_EMPRESA   = cf.ID_EMPRESA
      WHERE f.ID_EMPRESA = ?
      ORDER BY f.DT_INI DESC, cf.NOME_FILA ASC`,
      [idEmpresa]
    );

    if (filas.length === 0) {
      return res.status(404).json({ message: 'Nenhuma fila encontrada para esta empresa.' });
    }

    return res.json(filas);
  } catch (err) {
    console.error('Erro ao buscar filas da empresa:', err);
    return res.status(500).json({ error: 'Erro interno ao buscar filas da empresa.' });
  }
});

router.get('/fila/:idEmpresa/:dtMovto/:idFila/clientes', async (req, res) => {
  const { idEmpresa, dtMovto, idFila } = req.params;

  try {
    const [clientes] = await db.query(
      `SELECT
         ID_EMPRESA, DT_MOVTO, ID_FILA, ID_CLIENTE, CPFCNPJ, RG, NOME,
         DT_NASC, EMAIL, NR_QTDPES, DDDCEL, NR_CEL, CAMPOS,
         DT_ENTRA, DT_CHAMA, DT_LIMAPRE, DT_APRE, DT_SAIDA,
         DV133_NR_USRDEL, SITUACAO
       FROM clientesfila
      WHERE ID_EMPRESA = ? AND DT_MOVTO = ? AND ID_FILA = ?
      ORDER BY DT_ENTRA ASC`,
      [idEmpresa, dtMovto, idFila]
    );

    if (clientes.length === 0) {
      return res.status(404).json({ message: 'Nenhum cliente encontrado para esta fila.' });
    }

    return res.json(clientes);
  } catch (err) {
    console.error('Erro ao buscar clientes da fila:', err);
    return res.status(500).json({ error: 'Erro interno ao buscar clientes da fila.' });
  }
});

router.put('/fila/:idEmpresa/:dtMovto/:idFila/cliente/:idCliente/atualizar-situacao', async (req, res) => {
  const { idEmpresa, dtMovto, idFila, idCliente } = req.params;
  const { novaSituacao } = req.body;

  if (typeof novaSituacao === 'undefined' || novaSituacao === null) {
    return res.status(400).json({ error: 'Nova situação não fornecida.' });
  }

  const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

  let updateField = '';
  switch (novaSituacao) {
    case 1: updateField = 'DT_APRE = ?'; break;   // Confirmado Presença
    case 2: updateField = 'DT_SAIDA = ?'; break;  // Não Compareceu
    default:
      return res.status(400).json({ error: 'Situação inválida fornecida.' });
  }

  try {
    const [result] = await db.query(
      `UPDATE clientesfila
          SET SITUACAO = ?, ${updateField}
        WHERE ID_EMPRESA = ? AND DT_MOVTO = ? AND ID_FILA = ? AND ID_CLIENTE = ?`,
      [novaSituacao, currentTimestamp, idEmpresa, dtMovto, idFila, idCliente]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Cliente da fila não encontrado ou dados já atualizados.' });
    }

    return res.json({ message: 'Situação do cliente atualizada com sucesso!' });
  } catch (err) {
    console.error('Erro ao atualizar situação do cliente na fila:', err);
    return res.status(500).json({ error: 'Erro interno ao atualizar situação do cliente na fila.' });
  }
});

router.post('/fila/:idEmpresa/:dtMovto/:idFila/adicionar-cliente', async (req, res) => {
  const { idEmpresa, dtMovto, idFila } = req.params;
  const { NOME, CPFCNPJ, DT_NASC, DDDCEL, NR_CEL, EMAIL, RG, NR_QTDPES } = req.body;

  if (!NOME || !CPFCNPJ) {
    return res.status(400).json({ error: 'Nome e CPF/CNPJ são obrigatórios.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [clienteExistente] = await connection.query(
      'SELECT ID_CLIENTE FROM clientesfila WHERE CPFCNPJ = ? ORDER BY DT_ENTRA DESC LIMIT 1',
      [CPFCNPJ]
    );

    let idCliente;
    if (clienteExistente.length > 0) {
      idCliente = clienteExistente[0].ID_CLIENTE;
    } else {
      const [[maxIdResult]] = await connection.query(
        'SELECT MAX(ID_CLIENTE) as maxId FROM clientesfila'
      );
      idCliente = (maxIdResult.maxId || 0) + 1;
    }

    const [jaNaFila] = await connection.query(
      'SELECT 1 FROM clientesfila WHERE ID_EMPRESA = ? AND DT_MOVTO = ? AND ID_FILA = ? AND ID_CLIENTE = ?',
      [idEmpresa, dtMovto, idFila, idCliente]
    );

    if (jaNaFila.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'Este cliente já se encontra na fila.' });
    }

    await connection.query(
      `INSERT INTO clientesfila
        (ID_EMPRESA, DT_MOVTO, ID_FILA, ID_CLIENTE,
         CPFCNPJ, RG, NOME, DT_NASC, EMAIL, NR_QTDPES, DDDCEL, NR_CEL,
         DT_ENTRA, SITUACAO)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?, NOW(), 0)`,
      [idEmpresa, dtMovto, idFila, idCliente,
       CPFCNPJ, RG, NOME, DT_NASC, EMAIL, NR_QTDPES || 0, DDDCEL, NR_CEL]
    );

    await connection.commit();
    return res.status(201).json({ message: 'Cliente adicionado à fila com sucesso!' });
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao adicionar cliente na fila:', error);
    return res.status(500).json({ error: 'Erro interno ao adicionar cliente.' });
  } finally {
    connection.release();
  }
});

module.exports = router;
