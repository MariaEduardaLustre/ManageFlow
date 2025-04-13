const db = require('../database/connection');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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

    // Comparar senha simples ou criptografada
    const senhaValida = await bcrypt.compare(senha, usuario.SENHA);
    if (!senhaValida) {
      return res.status(401).send('Senha incorreta.');
    }

    const token = jwt.sign(
      { id: usuario.ID, email: usuario.EMAIL },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({ token, usuario: { id: usuario.ID, nome: usuario.NOME } });
  });
};


exports.cadastrarUsuario = async (req, res) => {
    const { nome, email, cpfCnpj, senha, numero, endereco } = req.body;
  
    if (!nome || !email || !cpfCnpj || !senha) {
      return res.status(400).send('Preencha todos os campos obrigatórios.');
    }
  
    try {
      // Verifica se já existe e-mail OU CPF no banco
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
  
        // Criptografar senha
        const senhaCriptografada = await bcrypt.hash(senha, 10);
  
        // Inserir novo usuário
        const insertQuery = `
          INSERT INTO Usuario (ID, NOME, EMAIL, CPF, SENHA, ENDERECO, NUMERO)
          VALUES (NULL, ?, ?, ?, ?, ?, ?)
        `;
  
        db.query(
          insertQuery,
          [nome, email, cpfCnpj, senhaCriptografada, endereco, numero],
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