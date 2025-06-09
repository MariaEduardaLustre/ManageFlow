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
    // A query de login já está correta, buscando por EMAIL.
    const [results] = await db.query('SELECT * FROM Usuario WHERE EMAIL = ?', [email]);

    if (results.length === 0) {
      console.log('[ERRO] Usuário não encontrado');
      return res.status(401).send('Usuário ou senha inválidos.'); // Mensagem mais segura
    }

    const usuario = results[0];
    const senhaValida = await bcrypt.compare(senha, usuario.SENHA);

    if (!senhaValida) {
      console.log('[ERRO] Senha incorreta');
      return res.status(401).send('Usuário ou senha inválidos.'); // Mensagem mais segura
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

// =================================================================
// FUNÇÃO DE CADASTRO TOTALMENTE ATUALIZADA
// =================================================================
exports.cadastrarUsuario = async (req, res) => {
  // 1. Capturar TODOS os campos que vêm do formulário
  const { nome, email, cpfCnpj, senha, cep, endereco, numero, complemento, ddi, ddd, telefone } = req.body;

  console.log('[CADASTRO] Dados recebidos:', req.body);

  // 2. Validação mais completa dos campos obrigatórios do formulário
  if (!nome || !email || !cpfCnpj || !senha || !cep || !endereco || !numero || !ddi || !ddd || !telefone) {
    return res.status(400).send('Preencha todos os campos obrigatórios.');
  }

  try {
    // 3. Corrigir a query para buscar na coluna CPFCNPJ
    const [usuariosExistentes] = await db.query(
      'SELECT * FROM Usuario WHERE EMAIL = ? OR CPFCNPJ = ?',
      [email, cpfCnpj]
    );

    if (usuariosExistentes.length > 0) {
      const existente = usuariosExistentes[0];
      if (existente.EMAIL === email) {
        return res.status(409).send('E-mail já cadastrado.');
      }
      // 4. Corrigir a verificação do campo CPFCNPJ
      if (existente.CPFCNPJ === cpfCnpj) {
        return res.status(409).send('CPF/CNPJ já cadastrado.');
      }
    }

    const senhaCriptografada = await bcrypt.hash(senha, 10);

    // 5. Query INSERT final e correta, com todas as colunas e valores
    await db.query(
      `INSERT INTO Usuario (NOME, EMAIL, CPFCNPJ, SENHA, CEP, ENDERECO, NUMERO, COMPLEMENTO, DDI, DDD, TELEFONE)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nome, email, cpfCnpj, senhaCriptografada, cep, endereco, numero, complemento, ddi, ddd, telefone]
    );

    return res.status(201).send('Usuário cadastrado com sucesso!');
  } catch (error) {
    console.error('[ERRO] Erro ao cadastrar usuário:', error);
    // Envia uma mensagem de erro mais específica do banco, se disponível
    return res.status(500).send(error.sqlMessage || 'Erro interno ao cadastrar usuário.');
  }
};


exports.solicitarRedefinicaoSenha = async (req, res) => {
  console.log('📩 Rota /esqueci-senha chamada com:', req.body);
  const { email } = req.body;

  if (!email) {
    return res.status(400).send('Por favor, informe seu e-mail.');
  }

  try {
    console.log('🔍 Buscando usuário com email:', email);
    const [results] = await db.query('SELECT * FROM Usuario WHERE EMAIL = ?', [email]);

    if (results.length === 0) {
      console.warn('⚠️ Nenhum usuário encontrado com esse e-mail');
      return res.status(404).send('E-mail não encontrado.');
    }

    const usuario = results[0];
    const token = crypto.randomBytes(20).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hora a partir de agora

    console.log('🔐 Gerando token para usuário ID:', usuario.ID);

    await db.query(
      'UPDATE Usuario SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE ID = ?',
      [token, expires, usuario.ID]
    );

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

    console.log('📤 Enviando e-mail para:', usuario.EMAIL);
    await transporter.sendMail(mailOptions);

    res.send('Um link para redefinição de senha foi enviado para o seu e-mail.');
  } catch (err) {
    console.error('❌ Erro geral em solicitarRedefinicaoSenha:', err);
    res.status(500).send('Erro interno ao processar solicitação de senha.');
  }
};


exports.redefinirSenha = async (req, res) => {
  const { token, novaSenha } = req.body;

  if (!token || !novaSenha) {
    return res.status(400).send('Token e nova senha são obrigatórios.');
  }

  try {
    const [results] = await db.query(
      'SELECT * FROM Usuario WHERE resetPasswordToken = ? AND resetPasswordExpires > ?',
      [token, new Date()]
    );

    if (results.length === 0) {
      return res.status(400).send('Token inválido ou expirado.');
    }

    const usuario = results[0];
    const senhaCriptografada = await bcrypt.hash(novaSenha, 10);

    await db.query(
      `UPDATE Usuario
       SET SENHA = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL
       WHERE ID = ?`,
      [senhaCriptografada, usuario.ID]
    );

    res.send('Senha redefinida com sucesso!');
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).send('Erro interno ao redefinir a senha.');
  }
};