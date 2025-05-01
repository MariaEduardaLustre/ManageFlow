const db = require('../database/connection');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

// LOGIN DO USUÁRIO
exports.loginUsuario = (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).send('Preencha todos os campos!');
  }

  const sql = `SELECT * FROM Usuario WHERE EMAIL = ?`;

  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error('Erro ao buscar usuário:', err);
      return res.status(500).send('Erro no servidor.');
    }

    if (results.length === 0) {
      return res.status(401).send('Usuário não encontrado.');
    }

    const usuario = results[0];

    const senhaValida = await bcrypt.compare(senha, usuario.SENHA);
    if (!senhaValida) {
      return res.status(401).send('Senha incorreta.');
    }

    const token = jwt.sign(
      { id: usuario.ID, email: usuario.EMAIL },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.ID,
        nome: usuario.NOME,
        complemento: usuario.COMPLEMENTO // Adicionado aqui
      }
    });
  });
};

// CADASTRO DO USUÁRIO
exports.cadastrarUsuario = async (req, res) => {
  const { nome, email, cpfCnpj, senha, numero, endereco, complemento } = req.body;

  if (!nome || !email || !cpfCnpj || !senha) {
    return res.status(400).send('Preencha todos os campos obrigatórios.');
  }

  try {
    const checkQuery = `SELECT * FROM Usuario WHERE EMAIL = ? OR CPF = ?`;
    db.query(checkQuery, [email, cpfCnpj], async (err, results) => {
      if (err) {
        console.error('Erro ao verificar e-mail/CPF:', err);
        return res.status(500).send('Erro interno ao verificar dados.');
      }

      if (results.length > 0) {
        const jaExiste = results[0];
        if (jaExiste.EMAIL === email) {
          return res.status(409).send('E-mail já cadastrado.');
        }
        if (jaExiste.CPF === cpfCnpj) {
          return res.status(409).send('CPF já cadastrado.');
        }
      }

      const senhaCriptografada = await bcrypt.hash(senha, 10);

      const insertQuery = `
        INSERT INTO Usuario (ID, NOME, EMAIL, CPF, SENHA, ENDERECO, NUMERO, COMPLEMENTO)
        VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertQuery,
        [nome, email, cpfCnpj, senhaCriptografada, endereco, numero, complemento],
        (insertErr) => {
          if (insertErr) {
            console.error('Erro ao inserir usuário:', insertErr);
            return res.status(500).send('Erro ao cadastrar usuário.');
          }

          res.status(201).send('Usuário cadastrado com sucesso!');
        }
      );
    });
  } catch (error) {
    console.error('Erro geral no cadastro:', error);
    res.status(500).send('Erro interno ao cadastrar.');
  }
};

// SOLICITAÇÃO DE REDEFINIÇÃO DE SENHA
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
    const expires = Date.now() + 3600000; // 1 hora

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

// REDEFINIÇÃO DE SENHA
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
