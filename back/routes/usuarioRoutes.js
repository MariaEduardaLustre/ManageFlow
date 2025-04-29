const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const authMiddleware = require('../middlewares/auth');

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

module.exports = router;