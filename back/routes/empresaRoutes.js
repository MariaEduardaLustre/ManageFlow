// routes/empresaRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const {
  sendNotification,
  scheduleTimeoutForAbsence,
  sendInitialNotification
} = require('../services/notificationService');

/**
 * Exporta uma fábrica opcional (io). Se seu server.js chamar sem io, funciona igual.
 *
 * Ex. no server.js:
 *   const empresaRoutesModule = require('./routes/empresaRoutes');
 *   const empresaRoutesResolved =
 *     typeof empresaRoutesModule === 'function'
 *       ? empresaRoutesModule(io)
 *       : empresaRoutesModule;
 *   app.use('/api/empresas', authMiddleware, empresaRoutesResolved);
 */
module.exports = (io = null) => {
  /**
   * POST /criar-empresa
   * - Cria empresa
   * - Cria perfis padrão (Administrador, Staff, Analista, Cliente) (idempotente)
   * - Vincula o criador como Administrador (NIVEL=1) (idempotente)
   */
  router.post('/criar-empresa', async (req, res) => {
    const {
      nomeEmpresa,
      cnpj,
      email,
      ddi,
      ddd,
      telefone,
      endereco,
      numero,
      logo
    } = req.body;

    // Aceita tanto idUsuario quanto idUsuarioCriador (compat)
    const idUsuarioCriador = req.body.idUsuario ?? req.body.idUsuarioCriador;
    if (!idUsuarioCriador) {
      return res.status(400).json({ error: 'idUsuario (ou idUsuarioCriador) é obrigatório.' });
    }

    const connection = await db.getConnection();
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

      // 2) Cria perfis padrão
      await connection.query(
        `INSERT IGNORE INTO perfil (NOME_PERFIL, ID_EMPRESA, NIVEL)
         VALUES
           ('Administrador', ?, 1),
           ('Staff',         ?, 2),
           ('Analista',      ?, 3),
           ('Cliente',       ?, 4)`,
        [idEmpresa, idEmpresa, idEmpresa, idEmpresa]
      );

      // 3) Busca o perfil ADM (NIVEL = 1)
      const [[perfilAdmin]] = await connection.query(
        `SELECT ID_PERFIL
           FROM perfil
          WHERE ID_EMPRESA = ? AND NIVEL = 1
          LIMIT 1`,
        [idEmpresa]
      );
      if (!perfilAdmin) throw new Error('Perfil Administrador não encontrado após criar empresa.');

      // 4) Vincula o criador como Administrador
      await connection.query(
        `INSERT IGNORE INTO permissoes (ID_EMPRESA, ID_PERFIL, ID_USUARIO)
         VALUES (?,?,?)`,
        [idEmpresa, perfilAdmin.ID_PERFIL, idUsuarioCriador]
      );

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
          AND p.ID_EMPRESA = pe.ID_EMPRESA
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
   * GET /filas/:idEmpresa
   * Mantém SELECT completo
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

  /**
   * GET /fila/:idEmpresa/:dtMovto/:idFila/clientes
   * - Match exato por DT_MOVTO
   * - Fallback por DATE(DT_MOVTO) quando vier ISO
   * - Inclui MEIO_NOTIFICACAO para a UI
   */
  router.get('/fila/:idEmpresa/:dtMovto/:idFila/clientes', async (req, res) => {
    const { idEmpresa, dtMovto, idFila } = req.params;

    try {
      // 1) tenta match exato
      let [clientes] = await db.query(
        `SELECT
           ID_EMPRESA, DT_MOVTO, ID_FILA, ID_CLIENTE, CPFCNPJ, RG, NOME,
           DT_NASC, EMAIL, NR_QTDPES, DDDCEL, NR_CEL, MEIO_NOTIFICACAO, CAMPOS,
           DT_ENTRA, DT_CHAMA, DT_LIMAPRE, DT_APRE, DT_SAIDA,
           DV133_NR_USRDEL, SITUACAO
         FROM clientesfila
        WHERE ID_EMPRESA = ? AND DT_MOVTO = ? AND ID_FILA = ?
        ORDER BY DT_ENTRA ASC`,
        [idEmpresa, dtMovto, idFila]
      );

      // 2) fallback por DATE(DT_MOVTO), se veio ISO e não achou nada
      if (clientes.length === 0 && dtMovto.includes('T')) {
        const dtMovtoFormatted = dtMovto.split('T')[0];
        [clientes] = await db.query(
          `SELECT
             ID_EMPRESA, DT_MOVTO, ID_FILA, ID_CLIENTE, CPFCNPJ, RG, NOME,
             DT_NASC, EMAIL, NR_QTDPES, DDDCEL, NR_CEL, MEIO_NOTIFICACAO, CAMPOS,
             DT_ENTRA, DT_CHAMA, DT_LIMAPRE, DT_APRE, DT_SAIDA,
             DV133_NR_USRDEL, SITUACAO
           FROM clientesfila
          WHERE ID_EMPRESA = ? AND DATE(DT_MOVTO) = ? AND ID_FILA = ?
          ORDER BY DT_ENTRA ASC`,
          [idEmpresa, dtMovtoFormatted, idFila]
        );
      }

      if (clientes.length === 0) {
        return res.status(404).json({ message: 'Nenhum cliente encontrado para esta fila.' });
      }

      return res.json(clientes);
    } catch (err) {
      console.error('Erro ao buscar clientes da fila:', err);
      return res.status(500).json({ error: 'Erro interno ao buscar clientes da fila.' });
    }
  });

  /**
   * GET /fila/:idEmpresa/:dtMovto/:idFila/clientes-nao-compareceu
   */
  router.get('/fila/:idEmpresa/:dtMovto/:idFila/clientes-nao-compareceu', async (req, res) => {
    const { idEmpresa, dtMovto, idFila } = req.params;
    const dtMovtoFormatted = dtMovto.includes('T') ? dtMovto.split('T')[0] : dtMovto;

    try {
      const [clientes] = await db.query(
        `SELECT ID_CLIENTE, SITUACAO
           FROM clientesfila
          WHERE ID_EMPRESA = ? AND DATE(DT_MOVTO) = ? AND ID_FILA = ? AND SITUACAO = 2`,
        [idEmpresa, dtMovtoFormatted, idFila]
      );

      res.json(clientes);
    } catch (err) {
      console.error('Erro ao buscar clientes "Não Compareceu":', err);
      res.status(500).json({ error: 'Erro interno ao buscar clientes atualizados.' });
    }
  });

  /**
   * PUT /fila/:idEmpresa/:dtMovto/:idFila/cliente/:idCliente/atualizar-situacao
   * Aceita 0,1,2,3,4. Atualiza carimbos quando aplicável e emite via io.
   */
  router.put('/fila/:idEmpresa/:dtMovto/:idFila/cliente/:idCliente/atualizar-situacao', async (req, res) => {
    const { idEmpresa, dtMovto, idFila, idCliente } = req.params;
    const { novaSituacao } = req.body;

    if (typeof novaSituacao === 'undefined' || novaSituacao === null) {
      return res.status(400).json({ error: 'Nova situação não fornecida.' });
    }

    const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

    let updateField = '';
    switch (Number(novaSituacao)) {
      case 0: updateField = ''; break;              // Aguardando
      case 1: updateField = 'DT_APRE = ?'; break;   // Presença Confirmada
      case 2: updateField = 'DT_SAIDA = ?'; break;  // Não Compareceu
      case 3: // Chamado
      case 4: // Atendido
        updateField = '';                           // sem carimbo adicional
        break;
      default:
        return res.status(400).json({ error: 'Situação inválida fornecida.' });
    }

    try {
      let query, params;

      if (updateField === '') {
        query = `
          UPDATE clientesfila
             SET SITUACAO = ?
           WHERE ID_EMPRESA = ? AND DT_MOVTO = ? AND ID_FILA = ? AND ID_CLIENTE = ?
        `;
        params = [novaSituacao, idEmpresa, dtMovto, idFila, idCliente];
      } else {
        query = `
          UPDATE clientesfila
             SET SITUACAO = ?, ${updateField}
           WHERE ID_EMPRESA = ? AND DT_MOVTO = ? AND ID_FILA = ? AND ID_CLIENTE = ?
        `;
        params = [novaSituacao, currentTimestamp, idEmpresa, dtMovto, idFila, idCliente];
      }

      let [result] = await db.query(query, params);

      if (result.affectedRows === 0 && dtMovto.includes('T')) {
        const dtMovtoFormatted = dtMovto.split('T')[0];
        if (updateField === '') {
          query = `
            UPDATE clientesfila
               SET SITUACAO = ?
             WHERE ID_EMPRESA = ? AND DATE(DT_MOVTO) = ? AND ID_FILA = ? AND ID_CLIENTE = ?
          `;
          params = [novaSituacao, idEmpresa, dtMovtoFormatted, idFila, idCliente];
        } else {
          query = `
            UPDATE clientesfila
               SET SITUACAO = ?, ${updateField}
             WHERE ID_EMPRESA = ? AND DATE(DT_MOVTO) = ? AND ID_FILA = ? AND ID_CLIENTE = ?
          `;
          params = [novaSituacao, currentTimestamp, idEmpresa, dtMovtoFormatted, idFila, idCliente];
        }
        [result] = await db.query(query, params);
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Cliente da fila não encontrado ou dados já atualizados.' });
      }

      // Emite notificação via WebSocket (se io foi passado)
      if (io) {
        io.emit('cliente_atualizado', {
          idEmpresa,
          idFila,
          idCliente,
          novaSituacao: Number(novaSituacao)
        });
      }

      return res.json({ message: 'Situação do cliente atualizada com sucesso!' });
    } catch (err) {
      console.error('Erro ao atualizar situação do cliente na fila:', err);
      return res.status(500).json({ error: 'Erro interno ao atualizar situação do cliente na fila.' });
    }
  });

  /**
   * POST /fila/:idEmpresa/:dtMovto/:idFila/cliente/:idCliente/enviar-notificacao
   * - Atualiza SITUACAO=3 e DT_NOTIFICACAO
   * - Agenda timeout (15min) para ausência
   * - Emite via io
   */
  router.post('/fila/:idEmpresa/:dtMovto/:idFila/cliente/:idCliente/enviar-notificacao', async (req, res) => {
    const { idEmpresa, dtMovto, idFila, idCliente } = req.params;
    const dtMovtoFormatted = dtMovto.includes('T') ? dtMovto.split('T')[0] : dtMovto;

    try {
      const [result] = await db.query(
        `UPDATE clientesfila
            SET DT_NOTIFICACAO = NOW(), SITUACAO = 3
          WHERE ID_EMPRESA = ? AND ID_FILA = ? AND ID_CLIENTE = ? AND DATE(DT_MOVTO) = ?`,
        [idEmpresa, idFila, idCliente, dtMovtoFormatted]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado para o agendamento.' });
      }

      // Agenda ausência em 15 minutos
      const timeout = 15 * 60 * 1000;
      try {
        scheduleTimeoutForAbsence(idEmpresa, dtMovto, idFila, idCliente, timeout, io);
      } catch (e) {
        // não falha a requisição por conta do agendamento
        console.warn('Falha ao agendar timeout de ausência:', e?.message || e);
      }

      if (io) {
        io.emit('cliente_atualizado', {
          idEmpresa,
          idFila,
          idCliente,
          novaSituacao: 3
        });
      }

      res.status(200).json({ message: 'Notificação enviada e timeout agendado com sucesso!' });
    } catch (error) {
      console.error('Erro ao agendar o timeout no MySQL:', error);
      res.status(500).json({ error: 'Erro interno do servidor ao agendar o timeout.' });
    }
  });

  /**
   * POST /fila/:idEmpresa/:dtMovto/:idFila/adicionar-cliente
   * - Garante unicidade no dia/fila
   * - Suporta MEIO_NOTIFICACAO (whatsapp|sms|email); se email for escolhido, exige EMAIL
   * - Emite via io
   * - Envia notificação inicial (opcional) com posição na fila
   */
  router.post('/fila/:idEmpresa/:dtMovto/:idFila/adicionar-cliente', async (req, res) => {
    const { idEmpresa, dtMovto, idFila } = req.params;
    const { NOME, CPFCNPJ, DT_NASC, DDDCEL, NR_CEL, EMAIL, RG, NR_QTDPES, MEIO_NOTIFICACAO } = req.body;

    if (!NOME || !CPFCNPJ) {
      return res.status(400).json({ error: 'Nome e CPF/CNPJ são obrigatórios.' });
    }
    if (MEIO_NOTIFICACAO === 'email' && !EMAIL) {
      return res.status(400).json({ error: 'O campo E-mail é obrigatório para esta forma de notificação.' });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Verifica se já há ID_CLIENTE (reutiliza) ou cria próximo
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

      // Evita duplicidade no mesmo dia/fila
      const [jaNaFila] = await connection.query(
        'SELECT 1 FROM clientesfila WHERE ID_EMPRESA = ? AND DT_MOVTO = ? AND ID_FILA = ? AND ID_CLIENTE = ?',
        [idEmpresa, dtMovto, idFila, idCliente]
      );

      if (jaNaFila.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'Este cliente já se encontra na fila.' });
      }

      // Insere
      await connection.query(
        `INSERT INTO clientesfila
          (ID_EMPRESA, DT_MOVTO, ID_FILA, ID_CLIENTE,
           CPFCNPJ, RG, NOME, DT_NASC, EMAIL, NR_QTDPES, DDDCEL, NR_CEL,
           DT_ENTRA, SITUACAO, MEIO_NOTIFICACAO)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?, NOW(), 0, ?)`,
        [
          idEmpresa, dtMovto, idFila, idCliente,
          CPFCNPJ, RG, NOME, DT_NASC, EMAIL || null, NR_QTDPES || 0, DDDCEL, NR_CEL,
          MEIO_NOTIFICACAO || null
        ]
      );

      // Posição atual na fila (aguardando/chamado)
      const [[{ posicaoAtual }]] = await connection.query(
        `SELECT COUNT(*) AS posicaoAtual
           FROM clientesfila
          WHERE ID_EMPRESA = ?
            AND DATE(DT_MOVTO) = ?
            AND ID_FILA = ?
            AND (SITUACAO = 0 OR SITUACAO = 3)`,
        [idEmpresa, (dtMovto.includes('T') ? dtMovto.split('T')[0] : dtMovto), idFila]
      );

      await connection.commit();

      // Envia notificação inicial se configurado
      try {
        const clienteCompleto = {
          ...req.body,
          ID_CLIENTE: idCliente,
          ID_EMPRESA: idEmpresa,
          ID_FILA: idFila,
          DT_MOVTO: dtMovto
        };
        if (clienteCompleto.MEIO_NOTIFICACAO) {
          await sendInitialNotification(clienteCompleto, posicaoAtual);
        }
      } catch (e) {
        // Apenas loga; não falha o fluxo principal
        console.warn('Falha ao enviar notificação inicial:', e?.message || e);
      }

      if (io) {
        io.emit('cliente_atualizado', {
          idEmpresa,
          idFila,
          idCliente,
          novaSituacao: 0
        });
      }

      return res.status(201).json({ message: 'Cliente adicionado à fila com sucesso!' });
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao adicionar cliente na fila:', error);
      return res.status(500).json({ error: 'Erro interno ao adicionar cliente.' });
    } finally {
      connection.release();
    }
  });

  /* ===================== ROTAS ANALÍTICAS (dashboard detalhado) ===================== */

  // Horários de pico por fila (sem clientes com SITUACAO=2 "Não compareceu")
  router.get('/horarios-de-pico/:idEmpresa/:idFila', async (req, res) => {
    const { idEmpresa, idFila } = req.params;

    try {
      const [picos] = await db.query(
        `
        SELECT
          HOUR(DT_ENTRA) AS hora,
          COUNT(ID_CLIENTE) AS total_clientes
        FROM clientesfila
        WHERE ID_EMPRESA = ? AND ID_FILA = ? AND SITUACAO <> 2
        GROUP BY hora
        ORDER BY total_clientes DESC
        `,
        [idEmpresa, idFila]
      );

      if (picos.length === 0) {
        return res.status(404).json({ message: 'Nenhum dado encontrado para identificar horários de pico.' });
      }

      const horarioDePico = picos[0];

      res.json({
        horarioDePico: `O horário de pico é às ${horarioDePico.hora}h, com ${horarioDePico.total_clientes} clientes.`,
        dadosPorHora: picos
      });
    } catch (err) {
      console.error('Erro ao buscar horários de pico:', err);
      res.status(500).json({ error: 'Erro interno ao buscar horários de pico.' });
    }
  });

  // Tempo médio de espera por hora (clientes com presença confirmada)
  router.get('/tempo-espera/:idEmpresa/:idFila', async (req, res) => {
    const { idEmpresa, idFila } = req.params;

    try {
      const [tempos] = await db.query(
        `
        SELECT
          HOUR(DT_ENTRA) AS hora,
          AVG(TIMESTAMPDIFF(MINUTE, DT_ENTRA, DT_APRE)) AS media_espera_minutos
        FROM clientesfila
        WHERE
          ID_EMPRESA = ?
          AND ID_FILA = ?
          AND DT_ENTRA IS NOT NULL
          AND DT_APRE IS NOT NULL
          AND SITUACAO = 1
        GROUP BY hora
        ORDER BY hora
        `,
        [idEmpresa, idFila]
      );

      if (tempos.length === 0) {
        return res.status(404).json({ message: 'Nenhum dado de tempo de espera encontrado para esta empresa.' });
      }

      res.json(tempos);
    } catch (err) {
      console.error('Erro ao buscar tempo médio de espera:', err);
      res.status(500).json({ error: 'Erro interno ao buscar tempo médio de espera.' });
    }
  });

  return router;
};
