// back/src/routes/empresaRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const {
  sendNotification,
  scheduleTimeoutForAbsence,
  sendInitialNotification
} = require('../services/notificationService');

// ✅ igual ao Perfil de Usuário: centraliza a normalização da URL
const { makePublicImageUrl } = require('../utils/image');

// Usamos `io = null` para tornar o `io` opcional e evitar erros se não for passado.
module.exports = (io = null) => {

  // ... (a rota /criar-empresa e outras rotas GET não precisam de alteração)
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
    const idUsuarioCriador = req.body.idUsuario;

    if (!idUsuarioCriador) {
      return res.status(400).json({ error: 'idUsuario é obrigatório.' });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [empresaResult] = await connection.query(
        `INSERT INTO empresa (NOME_EMPRESA, CNPJ, EMAIL, DDI, DDD, TELEFONE, ENDERECO, NUMERO, LOGO)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [nomeEmpresa, cnpj, email, ddi, ddd, telefone, endereco, numero, logo]
      );
      const idEmpresa = empresaResult.insertId;

      await connection.query(
        `INSERT IGNORE INTO perfil (NOME_PERFIL, ID_EMPRESA, NIVEL) VALUES
           ('Administrador', ?, 1),
           ('Editor',        ?, 2),
           ('Leitor',        ?, 3)`,
        [idEmpresa, idEmpresa, idEmpresa]
      );

      const [[perfilAdmin]] = await connection.query(
        `SELECT ID_PERFIL FROM perfil WHERE ID_EMPRESA = ? AND NIVEL = 1 LIMIT 1`,
        [idEmpresa]
      );
      if (!perfilAdmin) throw new Error('Perfil Administrador não encontrado após criar empresa.');

      await connection.query(
        `INSERT IGNORE INTO permissoes (ID_EMPRESA, ID_PERFIL, ID_USUARIO) VALUES (?,?,?)`,
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

  router.get('/empresas-do-usuario/:idUsuario', async (req, res) => {
    const { idUsuario } = req.params;
    try {
      const [results] = await db.query(
        `SELECT e.ID_EMPRESA, e.NOME_EMPRESA, p.NOME_PERFIL, p.NIVEL
         FROM permissoes pe
         JOIN empresa e ON e.ID_EMPRESA = pe.ID_EMPRESA
         JOIN perfil p ON p.ID_PERFIL = pe.ID_PERFIL
         WHERE pe.ID_USUARIO = ?
         ORDER BY e.NOME_EMPRESA ASC, p.Nivel ASC`,
        [idUsuario]
      );
      return res.json(results);
    } catch (err) {
      console.error('Erro ao buscar empresas do usuário:', err);
      return res.status(500).json({ error: 'Erro interno ao buscar empresas.' });
    }
  });

  // =========================
  // ✅ ROTA AJUSTADA (igual PerfilUsuario: retorna URL absoluta)
  // =========================
  router.get('/detalhes/:idEmpresa', async (req, res) => {
    const { idEmpresa } = req.params;
    try {
      const [rows] = await db.query(
        `SELECT ID_EMPRESA, NOME_EMPRESA, CNPJ, EMAIL, DDI, DDD, TELEFONE, ENDERECO, NUMERO, LOGO
         FROM empresa WHERE ID_EMPRESA = ? LIMIT 1`,
        [idEmpresa]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Empresa não encontrada.' });
      }

      const e = rows[0];
      // Gera URL pública (S3/CloudFront ou fallback local), igual ao PerfilUsuario
      const publicUrl = makePublicImageUrl(e.LOGO || '');

      // Mantém os campos originais + adiciona campos usados no front (como no PerfilUsuario)
      return res.json({
        ...e,
        // novos/compatíveis com PerfilUsuario
        img_perfil: publicUrl,
        img_perfil_url: publicUrl,
        // compat extra que o EditarEmpresa já tenta:
        LOGO_URL: publicUrl
      });
    } catch (err) {
      console.error('Erro ao buscar detalhes da empresa:', err);
      return res.status(500).json({ error: 'Erro interno ao buscar detalhes da empresa.' });
    }
  });

  // =======================================================================
  // == ROTA CORRIGIDA (update mantém como estava; o front manda uppercase)
  // =======================================================================
router.put('/detalhes/:idEmpresa', async (req, res) => {
  const { idEmpresa } = req.params;

  // O front manda maiúsculas; mantenho compat
  const {
    NOME_EMPRESA,
    CNPJ,
    EMAIL,
    DDI,
    DDD,
    TELEFONE,
    ENDERECO,
    NUMERO,
    LOGO, // pode vir undefined / '' quando o usuário não mexeu na imagem
  } = req.body || {};

  if (!NOME_EMPRESA || !CNPJ) {
    return res.status(400).json({ error: 'Nome da Empresa e CNPJ são obrigatórios.' });
  }

  try {
    // Monta SET dinamicamente, pulando LOGO quando vier vazio/undefined
    const sets = [];
    const params = [];

    const push = (col, val) => { sets.push(`${col} = ?`); params.push(val); };

    push('NOME_EMPRESA', NOME_EMPRESA);
    push('CNPJ', CNPJ);
    push('EMAIL', EMAIL ?? null);
    push('DDI', DDI ?? null);
    push('DDD', DDD ?? null);
    push('TELEFONE', TELEFONE ?? null);
    push('ENDERECO', ENDERECO ?? null);
    push('NUMERO', NUMERO ?? null);

    // Só atualiza LOGO se vier com um valor não vazio
    const hasLogo =
      typeof LOGO !== 'undefined' &&
      LOGO !== null &&
      String(LOGO).trim() !== '';

    if (hasLogo) {
      push('LOGO', String(LOGO).trim());
    }

    // Nada a atualizar? (improvável porque NOME/CNPJ vêm) — protege mesmo assim
    if (sets.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    }

    const sql = `
      UPDATE empresa
         SET ${sets.join(', ')}
       WHERE ID_EMPRESA = ?`;
    params.push(idEmpresa);

    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada para atualização.' });
    }

    return res.json({ message: 'Dados da empresa atualizados com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar detalhes da empresa:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar os dados da empresa.' });
  }
});

  // ... (Restante do arquivo, sem alterações) ...
  router.get('/perfis/:idEmpresa', async (req, res) => {
    const { idEmpresa } = req.params;
    try {
      const [perfis] = await db.query(
        `SELECT ID_PERFIL, NOME_PERFIL, NIVEL FROM perfil WHERE ID_EMPRESA = ? ORDER BY NIVEL`,
        [idEmpresa]
      );
      return res.json(perfis);
    } catch (err) {
      console.error('Erro ao buscar perfis da empresa:', err);
      return res.status(500).json({ error: 'Erro interno ao buscar perfis.' });
    }
  });

  router.get('/filas/:idEmpresa', async (req, res) => {
    const { idEmpresa } = req.params;
    try {
      const [filas] = await db.query(
        `SELECT
           f.ID_FILA, f.ID_EMPRESA, f.DT_MOVTO, f.DT_INI, f.DT_FIM, f.DT_INATIV, f.BLOCK, f.SITUACAO,
           cf.NOME_FILA, cf.TOKEN_FILA, cf.MENSAGEM, cf.TEMP_TOL, cf.QDTE_MIN, cf.QTDE_MAX
         FROM Fila f
         JOIN ConfiguracaoFila cf ON f.ID_CONF_FILA = cf.ID_CONF_FILA AND f.ID_EMPRESA = cf.ID_EMPRESA
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
      const dtMovtoFormatted = dtMovto.includes('T') ? dtMovto.split('T')[0] : dtMovto;
      const [clientes] = await db.query(
        `SELECT
           ID_EMPRESA, DT_MOVTO, ID_FILA, ID_CLIENTE, CPFCNPJ, RG, NOME, DT_NASC, EMAIL,
           NR_QTDPES, DDDCEL, NR_CEL, MEIO_NOTIFICACAO, CAMPOS, DT_ENTRA, DT_CHAMA, DT_LIMAPRE, DT_APRE, DT_SAIDA, SITUACAO
         FROM clientesfila
         WHERE ID_EMPRESA = ? AND DATE(DT_MOVTO) = ? AND ID_FILA = ?
         ORDER BY DT_ENTRA ASC`,
        [idEmpresa, dtMovtoFormatted, idFila]
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
    const dtMovtoFormatted = dtMovto.split('T')[0];

    if (typeof novaSituacao === 'undefined' || novaSituacao === null) {
      return res.status(400).json({ error: 'Nova situação não fornecida.' });
    }

    const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    let updateField = '';
    let params;

    switch (Number(novaSituacao)) {
      case 1: updateField = ', DT_APRE = ?'; break;
      case 2: updateField = ', DT_SAIDA = ?'; break;
    }

    try {
      let query = `
        UPDATE clientesfila
        SET SITUACAO = ? ${updateField}
        WHERE ID_EMPRESA = ? AND DATE(DT_MOVTO) = ? AND ID_FILA = ? AND ID_CLIENTE = ?`;

      if (updateField) {
        params = [novaSituacao, currentTimestamp, idEmpresa, dtMovtoFormatted, idFila, idCliente];
      } else {
        params = [novaSituacao, idEmpresa, dtMovtoFormatted, idFila, idCliente];
      }

      const [result] = await db.query(query, params);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Cliente da fila não encontrado ou dados já atualizados.' });
      }

      if (io) {
        io.emit('cliente_atualizado', { idEmpresa, idFila, idCliente, novaSituacao });
      }

      return res.json({ message: 'Situação do cliente atualizada com sucesso!' });
    } catch (err) {
      console.error('Erro ao atualizar situação do cliente:', err);
      return res.status(500).json({ error: 'Erro interno ao atualizar situação.' });
    }
  });

  router.post('/fila/:idEmpresa/:dtMovto/:idFila/cliente/:idCliente/enviar-notificacao', async (req, res) => {
    const { idEmpresa, dtMovto, idFila, idCliente } = req.params;
    const dtMovtoFormatted = dtMovto.includes('T') ? dtMovto.split('T')[0] : dtMovto;
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [[filaConfig]] = await connection.query(
        `SELECT cf.TEMP_TOL
         FROM fila f
         JOIN configuracaofila cf ON f.ID_CONF_FILA = cf.ID_CONF_FILA AND f.ID_EMPRESA = cf.ID_EMPRESA
         WHERE f.ID_EMPRESA = ? AND f.ID_FILA = ? AND DATE(f.DT_MOVTO) = ?
         LIMIT 1`,
        [idEmpresa, idFila, dtMovtoFormatted]
      );

      if (!filaConfig) {
        console.warn(`Aviso: Configuração de fila não encontrada para a fila ${idFila}. Usando tempo de tolerância padrão.`);
      }

      const [[cliente]] = await connection.query(
        `SELECT NOME, EMAIL, DDDCEL, NR_CEL, MEIO_NOTIFICACAO FROM clientesfila
         WHERE ID_EMPRESA = ? AND DATE(DT_MOVTO) = ? AND ID_FILA = ? AND ID_CLIENTE = ?`,
        [idEmpresa, dtMovtoFormatted, idFila, idCliente]
      );

      if (!cliente) {
        await connection.rollback();
        return res.status(404).json({ error: 'Cliente não encontrado para notificação.' });
      }

      const [result] = await connection.query(
        `UPDATE clientesfila SET DT_NOTIFICACAO = NOW(), SITUACAO = 3
         WHERE ID_EMPRESA = ? AND DATE(DT_MOVTO) = ? AND ID_FILA = ? AND ID_CLIENTE = ?`,
        [idEmpresa, dtMovtoFormatted, idFila, idCliente]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Falha ao atualizar o status do cliente.' });
      }

      await connection.commit();

      try {
        await sendNotification(cliente);
      } catch (notificationError) {
        console.warn('AVISO: A notificação para o cliente falhou, mas o status foi atualizado.', notificationError);
      }

      const tempoToleranciaMinutos = (filaConfig && filaConfig.TEMP_TOL) ? filaConfig.TEMP_TOL : 15;
      const timeoutEmMs = tempoToleranciaMinutos * 60 * 1000;

      scheduleTimeoutForAbsence(idEmpresa, dtMovto, idFila, idCliente, timeoutEmMs, io);

      if (io) {
        io.emit('cliente_atualizado', { idEmpresa, idFila, idCliente, novaSituacao: 3 });
      }

      return res.status(200).json({
        message: `Notificação enviada! Tolerância de ${tempoToleranciaMinutos} minutos aplicada.`
      });

    } catch (error) {
      await connection.rollback();
      console.error('Erro no processo de enviar notificação:', error);
      return res.status(500).json({ error: 'Erro interno ao processar a notificação.' });
    } finally {
      connection.release();
    }
  });

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

        const [[maxIdResult]] = await connection.query('SELECT MAX(ID_CLIENTE) as maxId FROM clientesfila');
        const idCliente = (maxIdResult.maxId || 0) + 1;

        const [jaNaFila] = await connection.query(
            'SELECT 1 FROM clientesfila WHERE ID_EMPRESA = ? AND DATE(DT_MOVTO) = ? AND ID_FILA = ? AND CPFCNPJ = ?',
            [idEmpresa, dtMovto.split('T')[0], idFila, CPFCNPJ]
        );

        if (jaNaFila.length > 0) {
            await connection.rollback();
            return res.status(409).json({ error: 'Este cliente já se encontra na fila hoje.' });
        }

        await connection.query(
            `INSERT INTO clientesfila (ID_EMPRESA, DT_MOVTO, ID_FILA, ID_CLIENTE, CPFCNPJ, RG, NOME, DT_NASC, EMAIL, NR_QTDPES, DDDCEL, NR_CEL, DT_ENTRA, SITUACAO, MEIO_NOTIFICACAO)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0, ?)`,
            [idEmpresa, dtMovto, idFila, idCliente, CPFCNPJ, RG, NOME, DT_NASC, EMAIL || null, NR_QTDPES || 1, DDDCEL, NR_CEL, MEIO_NOTIFICACAO]
        );

        const [[{ posicaoAtual }]] = await connection.query(
            `SELECT COUNT(*) AS posicaoAtual FROM clientesfila
             WHERE ID_EMPRESA = ? AND DATE(DT_MOVTO) = ? AND ID_FILA = ? AND (SITUACAO = 0 OR SITUACAO = 3)`,
            [idEmpresa, dtMovto.split('T')[0], idFila]
        );

        await connection.commit();

        const clienteCompleto = { ...req.body, ID_CLIENTE: idCliente, ID_EMPRESA: idEmpresa, ID_FILA: idFila, DT_MOVTO: dtMovto };
        if (clienteCompleto.MEIO_NOTIFICACAO) {
            await sendInitialNotification(clienteCompleto, posicaoAtual);
        }

        if (io) {
          io.emit('cliente_atualizado', { idEmpresa, idFila, idCliente, novaSituacao: 0 });
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

  router.get('/horarios-de-pico/:idEmpresa/:idFila', async (req, res) => {
    const { idEmpresa, idFila } = req.params;
    try {
        const [picos] = await db.query(
            `SELECT HOUR(DT_ENTRA) AS hora, COUNT(ID_CLIENTE) AS total_clientes FROM clientesfila
             WHERE ID_EMPRESA = ? AND ID_FILA = ? AND SITUACAO <> 2
             GROUP BY hora ORDER BY total_clientes DESC`,
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

  router.get('/tempo-espera/:idEmpresa/:idFila', async (req, res) => {
    const { idEmpresa, idFila } = req.params;
    try {
        const [tempos] = await db.query(
            `SELECT HOUR(DT_ENTRA) AS hora, AVG(TIMESTAMPDIFF(MINUTE, DT_ENTRA, DT_APRE)) AS media_espera_minutos
             FROM clientesfila
             WHERE ID_EMPRESA = ? AND ID_FILA = ? AND DT_ENTRA IS NOT NULL AND DT_APRE IS NOT NULL AND SITUACAO = 1
             GROUP BY hora ORDER BY hora`,
            [idEmpresa, idFila]
        );
        if (tempos.length === 0) {
            return res.status(404).json({ message: 'Nenhum dado de tempo de espera encontrado.' });
        }
        res.json(tempos);
    } catch (err) {
        console.error('Erro ao buscar tempo médio de espera:', err);
        res.status(500).json({ error: 'Erro interno ao buscar tempo médio de espera.' });
    }
  });

  return router;
};
