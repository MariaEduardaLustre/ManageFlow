// back/src/controllers/usuarioController.js
const db = require('../database/connection');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// S3 helpers
const { makePublicImageUrl } = require('../utils/image');
const { putToS3, keyUsuarioPerfil } = require('../middlewares/s3Upload');

require('dotenv').config();

/* ============================================================
 *  HELPERS — PERFIL / ROLE
 * ============================================================ */

/**
 * Retorna se um perfil é de ADMIN.
 * Considera NIVEL=3 OU NOME_PERFIL='Admin' (case-insensitive) para robustez.
 */
function isAdminRow(perfilRow) {
  const nivel = Number(perfilRow.NIVEL ?? 0);
  const nome = (perfilRow.NOME_PERFIL || '').trim().toLowerCase();
  return nivel === 3 || nome === 'admin';
}

/**
 * Lista empresas nas quais um usuário é o ÚNICO admin.
 * Retorna [{ ID_EMPRESA, NOME_EMPRESA }]
 */
async function empresasOndeUsuarioEhUnicoAdmin(idUsuario) {
  // SELECTs compatíveis com ONLY_FULL_GROUP_BY
  const [rows] = await db.query(
    `
    SELECT pe.ID_EMPRESA, e.NOME AS NOME_EMPRESA
      FROM permissoes pe
      JOIN perfil p   ON p.ID_PERFIL = pe.ID_PERFIL
      JOIN empresa e  ON e.ID_EMPRESA = pe.ID_EMPRESA
     WHERE pe.ID_USUARIO = ?
       AND (p.NIVEL = 3 OR LOWER(p.NOME_PERFIL) = 'admin')
       AND (
            SELECT COUNT(*)
              FROM permissoes pe2
              JOIN perfil p2 ON p2.ID_PERFIL = pe2.ID_PERFIL
             WHERE pe2.ID_EMPRESA = pe.ID_EMPRESA
               AND (p2.NIVEL = 3 OR LOWER(p2.NOME_PERFIL) = 'admin')
           ) = 1
    `,
    [idUsuario]
  );
  return rows;
}

/**
 * Conta quantos admins existem em uma empresa.
 */
async function contarAdminsDaEmpresa(idEmpresa) {
  const [rows] = await db.query(
    `
    SELECT COUNT(*) AS QTDE
      FROM permissoes pe
      JOIN perfil p ON p.ID_PERFIL = pe.ID_PERFIL
     WHERE pe.ID_EMPRESA = ?
       AND (p.NIVEL = 3 OR LOWER(p.NOME_PERFIL) = 'admin')
    `,
    [idEmpresa]
  );
  return Number(rows[0]?.QTDE || 0);
}

/* ============================================================
 *  LOGIN
 * ============================================================ */
exports.loginUsuario = async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).send('Preencha todos os campos!');
  }

  try {
    const [results] = await db.query('SELECT * FROM usuario WHERE EMAIL = ?', [email]);
    if (results.length === 0) {
      return res.status(401).send('Usuário ou senha inválidos.');
    }

    const usuario = results[0];
    const senhaValida = await bcrypt.compare(senha, usuario.SENHA);
    if (!senhaValida) {
      return res.status(401).send('Usuário ou senha inválidos.');
    }

    const token = jwt.sign(
      { id: usuario.ID, email: usuario.EMAIL, nome: usuario.NOME },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      idUsuario: usuario.ID,
      nome: usuario.NOME,
      img_perfil: makePublicImageUrl(usuario.img_perfil || null)
    });
  } catch (err) {
    console.error('[ERRO] loginUsuario:', err);
    return res.status(500).send('Erro interno no servidor.');
  }
};

/* ============================================================
 *  CADASTRO
 * ============================================================ */
exports.cadastrarUsuario = async (req, res) => {
  const {
    nome, email, cpfCnpj, senha,
    cep, endereco, numero, complemento,
    ddi, ddd, telefone
  } = req.body;

  if (!nome || !email || !cpfCnpj || !senha || !cep || !endereco || !numero || !ddi || !ddd || !telefone) {
    return res.status(400).send('Preencha todos os campos obrigatórios.');
  }

  try {
    const [usuariosExistentes] = await db.query(
      'SELECT ID, EMAIL, CPFCNPJ FROM usuario WHERE EMAIL = ? OR CPFCNPJ = ? LIMIT 1',
      [email, cpfCnpj]
    );

    if (usuariosExistentes.length > 0) {
      const existente = usuariosExistentes[0];
      if (existente.EMAIL === email) return res.status(409).send('E-mail já cadastrado.');
      if (existente.CPFCNPJ === cpfCnpj) return res.status(409).send('CPF/CNPJ já cadastrado.');
    }

    const senhaCriptografada = await bcrypt.hash(senha, 10);

    await db.query(
      `INSERT INTO usuario
        (NOME, EMAIL, CPFCNPJ, SENHA, CEP, ENDERECO, NUMERO, COMPLEMENTO, DDI, DDD, TELEFONE, img_perfil)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [nome, email, cpfCnpj, senhaCriptografada, cep, endereco, numero, complemento, ddi, ddd, telefone]
    );

    return res.status(201).send('Usuário cadastrado com sucesso!');
  } catch (error) {
    console.error('[CADASTRO] 500 error:', error);
    return res.status(500).send(error.sqlMessage || 'Erro interno ao cadastrar usuário.');
  }
};

/* ============================================================
 *  ESQUECI SENHA
 * ============================================================ */
exports.solicitarRedefinicaoSenha = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send('Por favor, informe seu e-mail.');

  try {
    const [results] = await db.query('SELECT ID, EMAIL FROM usuario WHERE EMAIL = ?', [email]);
    if (results.length === 0) {
      return res.status(404).send('E-mail não encontrado.');
    }

    const usuario = results[0];
    const token = crypto.randomBytes(20).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1h

    await db.query(
      'UPDATE usuario SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE ID = ?',
      [token, expires, usuario.ID]
    );

    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
    });

    const frontBase =
      req.headers.origin ||
      process.env.PUBLIC_FRONT_BASE_URL ||
      'http://localhost:3000';

    const mailOptions = {
      to: usuario.EMAIL,
      subject: 'Link para redefinição de senha',
      html: `
        <p>Você solicitou a redefinição da sua senha.</p>
        <p>Clique no link abaixo para criar uma nova senha:</p>
        <a href="${frontBase}/redefinir-senha/${token}">Redefinir senha</a>
        <p>Este link é válido por 1 hora.</p>
        <p>Se você não solicitou esta redefinição, ignore este e-mail.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.send('Um link para redefinição de senha foi enviado para o seu e-mail.');
  } catch (err) {
    console.error('[FORGOT] 500 error:', err);
    res.status(500).send('Erro interno ao processar solicitação de senha.');
  }
};

/* ============================================================
 *  REDEFINIR SENHA
 * ============================================================ */
exports.redefinirSenha = async (req, res) => {
  const { token, novaSenha } = req.body;
  if (!token || !novaSenha) {
    return res.status(400).send('Token e nova senha são obrigatórios.');
  }

  try {
    const [results] = await db.query(
      'SELECT ID FROM usuario WHERE resetPasswordToken = ? AND resetPasswordExpires > ? LIMIT 1',
      [token, new Date()]
    );
    if (results.length === 0) {
      return res.status(400).send('Token inválido ou expirado.');
    }

    const usuario = results[0];
    const senhaCriptografada = await bcrypt.hash(novaSenha, 10);

    await db.query(
      `UPDATE usuario
         SET SENHA = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL
       WHERE ID = ?`,
      [senhaCriptografada, usuario.ID]
    );

    res.send('Senha redefinida com sucesso!');
  } catch (error) {
    console.error('[RESET] 500 error:', error);
    res.status(500).send('Erro interno ao redefinir a senha.');
  }
};

/* ============================================================
 *  FOTO DE PERFIL (S3) — multipart/form-data (campo: img_perfil)
 * ============================================================ */
exports.uploadFotoPerfil = async (req, res) => {
  const idUsuario = parseInt(req.params.id, 10);
  if (!Number.isFinite(idUsuario)) {
    return res.status(400).json({ error: 'ID de usuário inválido.' });
  }
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Envie o arquivo em "img_perfil".' });
    }

    const f = req.file;
    const key = keyUsuarioPerfil(idUsuario, f.mimetype); // /uploads/usuarios/:id/perfil/...
    const savedKey = await putToS3(f.buffer, key, f.mimetype);

    await db.query(
      `UPDATE usuario SET img_perfil = ? WHERE ID = ?`,
      [savedKey, idUsuario]
    );

    return res.json({
      message: 'Foto de perfil atualizada com sucesso.',
      usuarioId: idUsuario,
      img_perfil: makePublicImageUrl(savedKey),
      key: savedKey
    });
  } catch (err) {
    console.error('[uploadFotoPerfil] Erro:', err);
    return res.status(500).json({ error: 'Falha ao subir foto de perfil.' });
  }
};

/* ============================================================
 *  GET USUÁRIO POR ID (retorna URL pública da foto)
 * ============================================================ */
exports.getUsuarioPorId = async (req, res) => {
  const idUsuario = parseInt(req.params.id, 10);
  if (!Number.isFinite(idUsuario)) {
    return res.status(400).json({ error: 'ID de usuário inválido.' });
  }
  try {
    const [rows] = await db.query(
      `SELECT ID, NOME, EMAIL, CPFCNPJ, CEP, ENDERECO, NUMERO, COMPLEMENTO, DDI, DDD, TELEFONE, img_perfil
         FROM usuario WHERE ID = ? LIMIT 1`,
      [idUsuario]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const u = rows[0];
    return res.json({
      id: u.ID,
      nome: u.NOME,
      email: u.EMAIL,
      cpfCnpj: u.CPFCNPJ,
      cep: u.CEP,
      endereco: u.ENDERECO,
      numero: u.NUMERO,
      complemento: u.COMPLEMENTO,
      ddi: u.DDI,
      ddd: u.DDD,
      telefone: u.TELEFONE,
      img_perfil: makePublicImageUrl(u.img_perfil || null),
      _key: u.img_perfil || null
    });
  } catch (err) {
    console.error('[getUsuarioPorId] Erro:', err);
    return res.status(500).json({ error: 'Erro interno ao buscar usuário.' });
  }
};

/* ============================================================
 *  ATUALIZAR DADOS DO USUÁRIO
 * ============================================================ */
exports.atualizarUsuario = async (req, res) => {
  const idUsuario = parseInt(req.params.id, 10);
  if (!Number.isFinite(idUsuario)) {
    return res.status(400).json({ error: 'ID de usuário inválido.' });
  }

  const {
    nome, email, cpfCnpj,
    cep, endereco, numero, complemento,
    ddi, ddd, telefone
  } = req.body;

  if (!nome || !email || !cpfCnpj) {
    return res.status(400).json({ error: 'Nome, e-mail e CPF/CNPJ são obrigatórios.' });
  }

  try {
    // Checar duplicidade de e-mail/CPF para OUTRO usuário
    const [dup] = await db.query(
      `SELECT ID, EMAIL, CPFCNPJ
         FROM usuario
        WHERE (EMAIL = ? OR CPFCNPJ = ?)
          AND ID <> ?
        LIMIT 1`,
      [email, cpfCnpj, idUsuario]
    );
    if (dup.length) {
      if (dup[0].EMAIL === email) return res.status(409).json({ error: 'E-mail já cadastrado.' });
      if (dup[0].CPFCNPJ === cpfCnpj) return res.status(409).json({ error: 'CPF/CNPJ já cadastrado.' });
    }

    await db.query(
      `UPDATE usuario
          SET NOME = ?, EMAIL = ?, CPFCNPJ = ?, CEP = ?, ENDERECO = ?, NUMERO = ?, COMPLEMENTO = ?,
              DDI = ?, DDD = ?, TELEFONE = ?
        WHERE ID = ?`,
      [nome, email, cpfCnpj, cep || null, endereco || null, numero || null, complemento || null,
        ddi || null, ddd || null, telefone || null, idUsuario]
    );

    // Retorna o registro atualizado
    const [rows] = await db.query(
      `SELECT ID, NOME, EMAIL, CPFCNPJ, CEP, ENDERECO, NUMERO, COMPLEMENTO, DDI, DDD, TELEFONE, img_perfil
         FROM usuario WHERE ID = ? LIMIT 1`,
      [idUsuario]
    );
    const u = rows[0];
    return res.json({
      id: u.ID,
      nome: u.NOME,
      email: u.EMAIL,
      cpfCnpj: u.CPFCNPJ,
      cep: u.CEP,
      endereco: u.ENDERECO,
      numero: u.NUMERO,
      complemento: u.COMPLEMENTO,
      ddi: u.DDI,
      ddd: u.DDD,
      telefone: u.TELEFONE,
      img_perfil: makePublicImageUrl(u.img_perfil || null)
    });
  } catch (err) {
    console.error('[atualizarUsuario] Erro:', err);
    return res.status(500).json({ error: 'Erro interno ao atualizar usuário.' });
  }
};

/* ============================================================
 *  ALTERAR SENHA (autenticado)
 * ============================================================ */
exports.alterarSenhaAutenticado = async (req, res) => {
  const idUsuario = parseInt(req.params.id, 10);
  const { senhaAtual, novaSenha } = req.body;

  if (!Number.isFinite(idUsuario)) return res.status(400).json({ error: 'ID inválido.' });
  if (!senhaAtual || !novaSenha) return res.status(400).json({ error: 'Informe senhaAtual e novaSenha.' });

  try {
    const [rows] = await db.query(`SELECT SENHA FROM usuario WHERE ID = ? LIMIT 1`, [idUsuario]);
    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const ok = await bcrypt.compare(senhaAtual, rows[0].SENHA);
    if (!ok) return res.status(401).json({ error: 'Senha atual incorreta.' });

    const hash = await bcrypt.hash(novaSenha, 10);
    await db.query(`UPDATE usuario SET SENHA = ? WHERE ID = ?`, [hash, idUsuario]);

    res.json({ message: 'Senha alterada com sucesso.' });
  } catch (err) {
    console.error('[alterarSenhaAutenticado] Erro:', err);
    res.status(500).json({ error: 'Erro interno ao alterar senha.' });
  }
};

/* ============================================================
 *  LISTAR EMPRESAS ONDE É ÚNICO ADMIN (para o fluxo de exclusão)
 * ============================================================ */
exports.getEmpresasOndeUnicoAdmin = async (req, res) => {
  const idUsuario = parseInt(req.params.id, 10);
  if (!Number.isFinite(idUsuario)) {
    return res.status(400).json({ error: 'ID inválido.' });
  }
  try {
    const lista = await empresasOndeUsuarioEhUnicoAdmin(idUsuario);
    res.json(lista);
  } catch (err) {
    console.error('[getEmpresasOndeUnicoAdmin] Erro:', err);
    res.status(500).json({ error: 'Erro ao listar empresas.' });
  }
};

/* ============================================================
 *  EXCLUIR USUÁRIO — Respeitando a regra de Único Admin
 *  Body esperado:
 *  {
 *    "transfer": [ { "idEmpresa": 1, "novoAdminUserId": 99 }, ... ],
 *    "deleteCompanies": [2, 3]
 *  }
 *  Para cada empresa onde o usuário é ÚNICO admin, você deve:
 *   - transferir para novoAdminUserId, OU
 *   - colocar o idEmpresa em deleteCompanies.
 * ============================================================ */
exports.excluirUsuario = async (req, res) => {
  const idUsuario = parseInt(req.params.id, 10);
  if (!Number.isFinite(idUsuario)) {
    return res.status(400).json({ error: 'ID de usuário inválido.' });
  }

  const conn = await db.getConnection();
  try {
    const transfer = Array.isArray(req.body.transfer) ? req.body.transfer : [];
    const deleteCompanies = Array.isArray(req.body.deleteCompanies) ? req.body.deleteCompanies : [];

    // Empresas onde este usuário é o ÚNICO Admin
    const empresasUnicoAdmin = await empresasOndeUsuarioEhUnicoAdmin(idUsuario);

    // Validar que todas as empresas único-admin tenham uma ação (transferir ou deletar)
    for (const emp of empresasUnicoAdmin) {
      const temTransfer = transfer.some(t => Number(t.idEmpresa) === Number(emp.ID_EMPRESA));
      const seraExcluida = deleteCompanies.some(eid => Number(eid) === Number(emp.ID_EMPRESA));
      if (!temTransfer && !seraExcluida) {
        return res.status(400).json({
          error: `Usuário é o único Admin da empresa ${emp.NOME_EMPRESA} (#${emp.ID_EMPRESA}). Informe transfer ou deleteCompanies.`
        });
      }
    }

    await conn.beginTransaction();

    // Executa exclusões de empresas solicitadas
    for (const idEmpresa of deleteCompanies) {
      // aqui você pode ter ON DELETE CASCADE. Se não tiver, faça a limpeza necessária.
      // Exemplo mínimo:
      await conn.query(`DELETE FROM permissoes WHERE ID_EMPRESA = ?`, [idEmpresa]);
      await conn.query(`DELETE FROM fila WHERE ID_EMPRESA = ?`, [idEmpresa]); // se existir essa FK
      await conn.query(`DELETE FROM configuracao_fila WHERE ID_EMPRESA = ?`, [idEmpresa]); // se existir
      await conn.query(`DELETE FROM empresa WHERE ID_EMPRESA = ?`, [idEmpresa]);
    }

    // Executa transferências de Admin
    for (const t of transfer) {
      const idEmpresa = Number(t.idEmpresa);
      const novoAdminUserId = Number(t.novoAdminUserId);

      if (!Number.isFinite(idEmpresa) || !Number.isFinite(novoAdminUserId)) {
        await conn.rollback();
        return res.status(400).json({ error: 'Campos de transferência inválidos.' });
      }

      // Verifica se o novo usuário tem alguma permissão na empresa; se não, cria como Admin
      const [jaTemPerm] = await conn.query(
        `SELECT ID_USUARIO FROM permissoes WHERE ID_EMPRESA = ? AND ID_USUARIO = ? LIMIT 1`,
        [idEmpresa, novoAdminUserId]
      );

      // Descobrir ID_PERFIL de Admin
      const [perfilAdminRows] = await conn.query(
        `SELECT ID_PERFIL FROM perfil WHERE (NIVEL = 3 OR LOWER(NOME_PERFIL) = 'admin') LIMIT 1`
      );
      if (!perfilAdminRows.length) {
        await conn.rollback();
        return res.status(500).json({ error: 'Perfil Admin não configurado.' });
      }
      const idPerfilAdmin = Number(perfilAdminRows[0].ID_PERFIL);

      if (!jaTemPerm.length) {
        await conn.query(
          `INSERT INTO permissoes (ID_USUARIO, ID_EMPRESA, ID_PERFIL) VALUES (?, ?, ?)`,
          [novoAdminUserId, idEmpresa, idPerfilAdmin]
        );
      } else {
        // Atualiza papel para Admin (garante que será Admin)
        await conn.query(
          `UPDATE permissoes SET ID_PERFIL = ? WHERE ID_EMPRESA = ? AND ID_USUARIO = ?`,
          [idPerfilAdmin, idEmpresa, novoAdminUserId]
        );
      }

      // Se ainda assim houver só 1 admin (o usuário que vamos apagar), garante que agora existam pelo menos 2, ou que o novo esteja configurado
      const qtdeAdmins = await contarAdminsDaEmpresa(idEmpresa);
      if (qtdeAdmins < 1) {
        await conn.rollback();
        return res.status(500).json({ error: `Falha na transferência de Admin na empresa #${idEmpresa}.` });
      }
    }

    // Remover permissões do usuário em todas as empresas
    await conn.query(`DELETE FROM permissoes WHERE ID_USUARIO = ?`, [idUsuario]);

    // Finalmente, remover o usuário
    await conn.query(`DELETE FROM usuario WHERE ID = ?`, [idUsuario]);

    await conn.commit();
    res.json({ message: 'Usuário excluído com sucesso.' });
  } catch (err) {
    try { await db.releaseConnection && db.releaseConnection(); } catch (_) {}
    try { await err?.rollback && err.rollback(); } catch (_) {}

    console.error('[excluirUsuario] Erro:', err);
    res.status(500).json({ error: 'Erro ao excluir usuário.' });
  } finally {
    try { conn.release(); } catch (_) {}
  }
};
