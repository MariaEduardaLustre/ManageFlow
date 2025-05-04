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
      console.log('[ERRO] Usuário não encontrado');
      return res.status(401).send('Usuário não encontrado.');
    }

    const usuario = results[0];

    console.log('Senha digitada:', senha);
    console.log('Hash no banco:', usuario.SENHA);

    const senhaValida = await bcrypt.compare(senha, usuario.SENHA);
    console.log('Senha válida?', senhaValida);

    if (!senhaValida) {
      console.log('[ERRO] Senha incorreta');
      return res.status(401).send('Senha incorreta.');
    }

    const token = jwt.sign(
      { id: usuario.ID, email: usuario.EMAIL },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.json({
      token,
      idUsuario: usuario.ID,
      nome: usuario.NOME
    });

  } catch (err) {
    console.error('[ERRO] Erro interno no login:', err);
    return res.status(500).send('Erro interno no servidor.');
  }
};

exports.cadastrarUsuario = async (req, res) => {
  const { nome, email, cpfCnpj, senha, numero, endereco } = req.body;

  console.log('[CADASTRO] Dados recebidos:', req.body);

  if (!nome || !email || !cpfCnpj || !senha) {
    return res.status(400).send('Preencha todos os campos obrigatórios.');
  }

  try {
    // Verifica se já existe usuário com esse e-mail ou CPF
    const [usuariosExistentes] = await db.query(
      'SELECT * FROM Usuario WHERE EMAIL = ? OR CPF = ?',
      [email, cpfCnpj]
    );

    if (usuariosExistentes.length > 0) {
      const existente = usuariosExistentes[0];
      if (existente.EMAIL === email) {
        return res.status(409).send('E-mail já cadastrado.');
      }
      if (existente.CPF === cpfCnpj) {
        return res.status(409).send('CPF já cadastrado.');
      }
    }

    // Criptografa a senha
    const senhaCriptografada = await bcrypt.hash(senha, 10);

    // Insere o novo usuário
    await db.query(
      `INSERT INTO Usuario (NOME, EMAIL, CPF, SENHA, ENDERECO, NUMERO)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nome, email, cpfCnpj, senhaCriptografada, endereco, numero]
    );

    return res.status(201).send('Usuário cadastrado com sucesso!');
  } catch (error) {
    console.error('[ERRO] Erro ao cadastrar usuário:', error);
    return res.status(500).send('Erro interno ao cadastrar usuário.');
  }
};


exports.solicitarRedefinicaoSenha = (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send('Por favor, informe seu e-mail.');
  }

  const sql = `SELECT * FROM Usuario WHERE EMAIL = ?`;
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error('Erro ao buscar usuário:', err);
      return res.status(500).send('Erro no servidor.');
    }

    if (results.length === 0) {
      return res.status(404).send('E-mail não encontrado.');
    }

    const usuario = results[0];

    const token = crypto.randomBytes(20).toString('hex');
    const expires = Date.now() + 3600000;

    const updateQuery = `
      UPDATE Usuario
      SET resetPasswordToken = ?, resetPasswordExpires = ?
      WHERE ID = ?
    `;

    db.query(updateQuery, [token, new Date(expires), usuario.ID], (updateErr) => {
      if (updateErr) {
        console.error('Erro ao salvar token de redefinição:', updateErr);
        return res.status(500).send('Erro ao gerar token de redefinição.');
      }

      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      const mailOptions = {
        to: usuario.EMAIL,
        subject: 'Link para redefinição de senha',
        html: `
          <p>Você solicitou a redefinição da sua senha.</p>
          <p>Clique no link abaixo para criar uma nova senha:</p>
          <a href="${req.headers.origin}/redefinir-senha/${token}">Redefinir senha</a>
          <p>Este link é válido por 1 hora.</p>
          <p>Se você não solicitou esta redefinição, ignore este e-mail.</p>
        `,
      };

      transporter.sendMail(mailOptions, (mailErr) => {
        if (mailErr) {
          console.error('Erro ao enviar e-mail de redefinição:', mailErr);
          return res.status(500).send('Erro ao enviar e-mail de redefinição.');
        }

        res.send('Um link para redefinição de senha foi enviado para o seu e-mail.');
      });
    });
  });
};

exports.redefinirSenha = async (req, res) => {
  const { token, novaSenha } = req.body;

  if (!token || !novaSenha) {
    return res.status(400).send('Token e nova senha são obrigatórios.');
  }

  const sql = `SELECT * FROM Usuario WHERE resetPasswordToken = ? AND resetPasswordExpires > ?`;
  db.query(sql, [token, new Date()], async (err, results) => {
    if (err) {
      console.error('Erro ao verificar token:', err);
      return res.status(500).send('Erro no servidor.');
    }

    if (results.length === 0) {
      return res.status(400).send('Token inválido ou expirado.');
    }

    const usuario = results[0];

    try {
      const senhaCriptografada = await bcrypt.hash(novaSenha, 10);
      const updateQuery = `
        UPDATE Usuario
        SET SENHA = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL
        WHERE ID = ?
      `;

      db.query(updateQuery, [senhaCriptografada, usuario.ID], (updateErr) => {
        if (updateErr) {
          console.error('Erro ao atualizar senha:', updateErr);
          return res.status(500).send('Erro ao redefinir a senha.');
        }

        res.send('Senha redefinida com sucesso!');
      });
    } catch (error) {
      console.error('Erro ao criptografar nova senha:', error);
      return res.status(500).send('Erro interno ao redefinir a senha.');
    }
  });
};
