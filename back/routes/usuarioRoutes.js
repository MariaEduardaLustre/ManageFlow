const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const authMiddleware = require('../middlewares/auth');
const db = require('../database/connection');


// Rota de cadastro
router.post('/', usuarioController.cadastrarUsuario);

// Rota de login
router.post('/login', usuarioController.loginUsuario);

// Rota para solicitar a redefinição de senha
router.post('/esqueci-senha', usuarioController.solicitarRedefinicaoSenha);

// Rota para redefinir a senha
router.post('/redefinir-senha', usuarioController.redefinirSenha);

// Rota protegida
router.get('/protegida', authMiddleware, (req, res) => {
  res.send(`Bem-vindo, usuário ID ${req.usuario.id}`);
});

// Listar usuários de uma empresa
router.get('/empresa/:idEmpresa', async (req, res) => {
  const { idEmpresa } = req.params;

  try {
    const [usuarios] = await db.query(`
      SELECT 
        u.ID,
        u.NOME,
        u.EMAIL,
        u.CPF,
        u.ENDERECO,
        u.NUMERO
      FROM usuario u
      INNER JOIN permissoes p ON p.ID_USUARIO = u.ID
      WHERE p.ID_EMPRESA = ?
    `, [idEmpresa]);

    res.json(usuarios);
  } catch (error) {
    console.error('Erro ao buscar usuários da empresa:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários da empresa' });
  }
});

module.exports = router;