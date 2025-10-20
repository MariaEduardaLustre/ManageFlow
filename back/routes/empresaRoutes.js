const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const {
  sendNotification,
  scheduleTimeoutForAbsence,
  sendInitialNotification
} = require('../services/notificationService');

// >>>>>>>>>>> NOVO: deps para upload
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// helper para URL pública (não salvar localhost no banco)
function makePublicBase(req) {
  return (process.env.PUBLIC_API_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
}
function makePublicImageUrl(rel, req) {
  if (!rel) return null;
  if (/^https?:\/\//i.test(rel)) return rel;
  const base = makePublicBase(req);
  return `${base}${rel.startsWith('/') ? '' : '/'}${rel}`;
}

// garantir pasta de upload
const logosDir = path.join(__dirname, '..', 'uploads', 'logos');
try { fs.mkdirSync(logosDir, { recursive: true }); } catch {}

// storage do multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logosDir),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    const name = `logo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`;
    cb(null, name);
  }
});
const fileFilter = (_req, file, cb) => {
  const ok = /image\/(png|jpeg|jpg|webp|gif)/i.test(file.mimetype);
  if (!ok) return cb(new Error('TIPO_DE_IMAGEM_INVALIDO'));
  cb(null, true);
};
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
});

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

  router.get('/detalhes/:idEmpresa', async (req, res) => {
    const { idEmpresa } = req.params;
    try {
      const [empresa] = await db.query(
        `SELECT ID_EMPRESA, NOME_EMPRESA, CNPJ, EMAIL, DDI, DDD, TELEFONE, ENDERECO, NUMERO, LOGO
         FROM empresa WHERE ID_EMPRESA = ?`,
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

  // =======================================================================
  // == NOVO: Upload da LOGO da empresa (multipart)
  //    POST /api/empresas/:idEmpresa/logo   (campo: 'logo')
  // =======================================================================
  router.post('/:idEmpresa/logo', upload.single('logo'), async (req, res) => {
    try {
      const idEmpresa = Number(req.params.idEmpresa);
      if (!Number.isFinite(idEmpresa) || idEmpresa <= 0) {
        // se subiu arquivo, remove para não ficar lixo
        if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(400).json({ error: 'ID_EMPRESA_INVALIDO' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'ARQUIVO_OBRIGATORIO' });
      }

      // caminho relativo que vai pro banco
      const relPath = `/uploads/logos/${req.file.filename}`;

      // busca logo atual pra tentar limpar arquivo antigo
      const [[row]] = await db.query(
        `SELECT LOGO FROM empresa WHERE ID_EMPRESA = ? LIMIT 1`,
        [idEmpresa]
      );
      if (!row) {
        // empresa não existe -> remove arquivo recém salvo e erra
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(404).json({ error: 'EMPRESA_NAO_ENCONTRADA' });
      }

      // atualiza no banco (sempre caminho relativo)
      await db.query(
        `UPDATE empresa SET LOGO = ? WHERE ID_EMPRESA = ?`,
        [relPath, idEmpresa]
      );

      // remove logo antiga se for um caminho dentro de /uploads/logos/
      const old = row.LOGO;
      if (old && typeof old === 'string' && old.startsWith('/uploads/logos/')) {
        const oldAbs = path.join(__dirname, '..', old);
        if (fs.existsSync(oldAbs)) {
          try { fs.unlinkSync(oldAbs); } catch {}
        }
      }

      // responde com relativo + URL pública
      const logoUrl = makePublicImageUrl(relPath, req);
      return res.json({ logo: relPath, logoUrl });
    } catch (err) {
      console.error('[POST /empresas/:id/logo] erro:', err);
      return res.status(500).json({ error: 'ERRO_INTERNO', detail: err.message });
    }
  });

  // =======================================================================
  // == ROTA CORRIGIDA
  // =======================================================================
  router.put('/detalhes/:idEmpresa', async (req, res) => {
    const { idEmpresa } = req.params;
    
    // ALTERADO: Nomes das variáveis agora correspondem ao que o frontend envia (maiúsculas)
    const {
      NOME_EMPRESA,
      CNPJ,
      EMAIL,
      DDI,
      DDD,
      TELEFONE,
      ENDERECO,
      NUMERO,
      LOGO
    } = req.body;

    if (!NOME_EMPRESA || !CNPJ) {
      return res.status(400).json({ error: 'Nome da Empresa e CNPJ são obrigatórios.' });
    }

    try {
      const [result] = await db.query(
        `UPDATE empresa
         SET NOME_EMPRESA = ?, CNPJ = ?, EMAIL = ?, DDI = ?, DDD = ?, TELEFONE = ?, ENDERECO = ?, NUMERO = ?, LOGO = ?
         WHERE ID_EMPRESA = ?`,
        [NOME_EMPRESA, CNPJ, EMAIL, DDI, DDD, TELEFONE, ENDERECO, NUMERO, LOGO, idEmpresa]
      );

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
      
      if(io) {
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
             WHERE ID_EMPRESA = ? AND ID_FILA = ? AND DT_ENTRA IS NOT NULL E
               ND DT_APRE IS NOT NULL AND SITUACAO = 1
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
