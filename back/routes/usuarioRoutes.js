const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const authMiddleware = require('../middlewares/auth');
const db = require('../database/connection');


// Rota de cadastro
router.post('/usuarios', usuarioController.cadastrarUsuario);

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
        u.NUMERO,
        u.COMPLEMENTO
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

router.post('/empresa/:idEmpresa/adicionar-usuario', async (req, res) => {
  const { cpfOuEmail } = req.body;
  const { idEmpresa } = req.params;

  try {
    console.log('Adicionando usuário:', cpfOuEmail, 'para empresa', idEmpresa);

    const [usuarioRows] = await db.query(
      'SELECT ID FROM Usuario WHERE CPF = ? OR EMAIL = ?',
      [cpfOuEmail, cpfOuEmail]
    );

    if (usuarioRows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const idUsuario = usuarioRows[0].ID;

    const [jaExiste] = await db.query(
      'SELECT * FROM permissoes WHERE ID_EMPRESA = ? AND ID_USUARIO = ?',
      [idEmpresa, idUsuario]
    );

    if (jaExiste.length > 0) {
      return res.status(409).json({ error: 'Usuário já faz parte da empresa' });
    }

    // ⛔ Possível erro aqui:
    const [[perfilLeitor]] = await db.query(
      'SELECT ID_PERFIL FROM perfil WHERE ID_EMPRESA = ? AND NIVEL = 3',
      [idEmpresa]
    );

    if (!perfilLeitor) {
      return res.status(500).json({ error: 'Perfil Leitor (nível 3) não encontrado' });
    }

    await db.query(
      'INSERT INTO permissoes (ID_EMPRESA, ID_PERFIL, ID_USUARIO) VALUES (?, ?, ?)',
      [idEmpresa, perfilLeitor.ID_PERFIL, idUsuario]
    );

    res.json({ message: 'Usuário adicionado à empresa com sucesso.' });
  } catch (err) {
    console.error('Erro ao adicionar usuário à empresa:', err);
    res.status(500).json({ error: 'Erro interno ao adicionar usuário' });
  }
});


router.delete('/empresa/:idEmpresa/remover-usuario/:idUsuario', async (req, res) => {
  const { idEmpresa, idUsuario } = req.params;

  try {
    await db.query(
      'DELETE FROM permissoes WHERE ID_EMPRESA = ? AND ID_USUARIO = ?',
      [idEmpresa, idUsuario]
    );

    res.json({ message: 'Usuário removido da empresa com sucesso.' });
  } catch (err) {
    console.error('Erro ao remover usuário da empresa:', err);
    res.status(500).json({ error: 'Erro interno ao remover usuário' });
  }
});


module.exports = router;