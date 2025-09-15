// controllers/usuarioController.js
const db = require('../database/connection');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

exports.loginUsuario = async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).send('Preencha todos os campos!');
  }

  try {
    const [results] = await db.query('SELECT * FROM Usuario WHERE EMAIL = ?', [email]);
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
      nome: usuario.NOME
    });
  } catch (err) {
    console.error('[ERRO] loginUsuario:', err);
    return res.status(500).send('Erro interno no servidor.');
  }
};


// ====== CADASTRO ======
exports.cadastrarUsuario = async (req, res) => {
  const {
    nome, email, cpfCnpj, senha,
    cep, endereco, numero, complemento,
    ddi, ddd, telefone
  } = req.body;

  console.log('[CADASTRO] body=', req.body);

  if (!nome || !email || !cpfCnpj || !senha || !cep || !endereco || !numero || !ddi || !ddd || !telefone) {
    return res.status(400).send('Preencha todos os campos obrigatórios.');
  }

  try {
    // Padronize para a mesma tabela 'usuario'
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
        (NOME, EMAIL, CPFCNPJ, SENHA, CEP, ENDERECO, NUMERO, COMPLEMENTO, DDI, DDD, TELEFONE)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nome, email, cpfCnpj, senhaCriptografada, cep, endereco, numero, complemento, ddi, ddd, telefone]
    );

    return res.status(201).send('Usuário cadastrado com sucesso!');
  } catch (error) {
    console.error('[CADASTRO] 500 error:', error);
    return res.status(500).send(error.sqlMessage || 'Erro interno ao cadastrar usuário.');
  }
};

// ====== ESQUECI SENHA ======
exports.solicitarRedefinicaoSenha = async (req, res) => {
  console.log('[FORGOT] body=', req.body);
  const { email } = req.body;
  if (!email) return res.status(400).send('Por favor, informe seu e-mail.');

  try {
    const [results] = await db.query('SELECT ID, EMAIL FROM usuario WHERE EMAIL = ?', [email]);
    if (results.length === 0) {
      console.warn('[FORGOT] email not found');
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

// ====== REDEFINIR SENHA ======
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
