// controllers/usuarioController.js
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
 * LOGIN
 * ============================================================ */
exports.loginUsuario = async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).send('Preencha todos os campos!');
  }

  try {
    // Padronizado para a mesma tabela 'usuario'
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
      img_perfil: makePublicImageUrl(usuario.img_perfil || null) // pode ser null na primeira vez
    });
  } catch (err) {
    console.error('[ERRO] loginUsuario:', err);
    return res.status(500).send('Erro interno no servidor.');
  }
};

/* ============================================================
 * CADASTRO
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
 * ESQUECI SENHA
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
    
    // ================== MELHORIA AQUI ==================
    // Envia resposta JSON também para esta rota (boa prática)
    res.status(200).json({ message: 'Um link para redefinição de senha foi enviado para o seu e-mail.' });
    // ===================================================

  } catch (err) {
    console.error('[FORGOT] 500 error:', err);
    // ================== MELHORIA AQUI ==================
    res.status(500).json({ error: 'Erro interno ao processar solicitação de senha.' });
    // ===================================================
  }
};

/* ============================================================
 * REDEFINIR SENHA
 * ============================================================ */
exports.redefinirSenha = async (req, res) => {
  const { token, novaSenha } = req.body;
  if (!token || !novaSenha) {
    // ================== MELHORIA AQUI ==================
    return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
    // ===================================================
  }

  try {
    const [results] = await db.query(
      'SELECT ID FROM usuario WHERE resetPasswordToken = ? AND resetPasswordExpires > ? LIMIT 1',
      [token, new Date()]
    );
    if (results.length === 0) {
      // ================== MELHORIA AQUI ==================
      return res.status(400).json({ error: 'Token inválido ou expirado.' });
      // ===================================================
    }

    const usuario = results[0];
    const senhaCriptografada = await bcrypt.hash(novaSenha, 10);

    await db.query(
      `UPDATE usuario
         SET SENHA = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL
       WHERE ID = ?`,
      [senhaCriptografada, usuario.ID]
    );

    // ================== CORREÇÃO PRINCIPAL ==================
    // Alterado de res.send() para res.json()
    res.status(200).json({ message: 'Senha redefinida com sucesso!' });
    // ========================================================

  } catch (error) {
    console.error('[RESET] 500 error:', error);
    // ================== CORREÇÃO PRINCIPAL ==================
    // Alterado de res.send() para res.json()
    res.status(500).json({ error: 'Erro interno ao redefinir a senha.' });
    // ========================================================
  }
};

/* ============================================================
 * FOTO DE PERFIL (S3)
 * ============================================================ */
exports.uploadFotoPerfil = async (req, res) => {
  // ... (código inalterado)
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
      img_perfil: makePublicImageUrl(savedKey), // URL pública
      key: savedKey                              // key relativa salva no banco
    });
  } catch (err) {
    console.error('[uploadFotoPerfil] Erro:', err);
    return res.status(500).json({ error: 'Falha ao subir foto de perfil.' });
  }
};

/* ============================================================
 * GET USUÁRIO POR ID (retorna URL pública da foto)
 * ============================================================ */
exports.getUsuarioPorId = async (req, res) => {
  // ... (código inalterado)
  const idUsuario = parseInt(req.params.id, 10);
  if (!Number.isFinite(idUsuario)) {
    return res.status(400).json({ error: 'ID de usuário inválido.' });
  }
  try {
    const [rows] = await db.query(
      `SELECT ID, NOME, EMAIL, CPFCNPJ, img_perfil FROM usuario WHERE ID = ? LIMIT 1`,
      [idUsuario]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const u = rows[0];
    return res.json({
      id: u.ID,
      nome: u.NOME,
      email: u.EMAIL,
      cpfCnpj: u.CPFCNPJ,
      img_perfil: makePublicImageUrl(u.img_perfil || null),
      _key: u.img_perfil || null
    });
  } catch (err) {
    console.error('[getUsuarioPorId] Erro:', err);
    return res.status(500).json({ error: 'Erro interno ao buscar usuário.' });
  }
};