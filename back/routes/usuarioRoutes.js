// routes/usuarioRoutes.js
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const db = require('../database/connection');

// Proteção (JWT) e RBAC (opcional)
const authMiddleware = require('../auth/jwt'); // precisa existir
let authorize;
try {
  authorize = require('../auth/authorize').authorize;
} catch {
  // se não houver RBAC no back ainda, segue só com JWT
  authorize = () => (req, res, next) => next();
}

/* ========= ROTAS PÚBLICAS ========= */

// Cadastro de usuário
router.post('/usuarios', usuarioController.cadastrarUsuario);

// Login
router.post('/login', usuarioController.loginUsuario);

/* ========= HELPERS ========= */

async function isLastAdmin(idEmpresa, idUsuarioParaAlterarOpcional = null) {
  // Conta quantos usuários com NIVEL=1 (ADM) existem na empresa
  // Se idUsuarioParaAlterarOpcional for passado, podemos checar se ele é ADM
  const [rows] = await db.query(
    `
    SELECT pm.ID_USUARIO, p.NIVEL
      FROM permissoes pm
      JOIN perfil p
        ON p.ID_PERFIL = pm.ID_PERFIL
       AND p.ID_EMPRESA = pm.ID_EMPRESA
     WHERE pm.ID_EMPRESA = ?
       AND p.NIVEL = 1
    `,
    [idEmpresa]
  );
  const totalAdmins = rows.length;
  if (idUsuarioParaAlterarOpcional == null) {
    return totalAdmins <= 1; // true se só existe 1 ADM
  }
  const isTargetAdmin = rows.some(r => Number(r.ID_USUARIO) === Number(idUsuarioParaAlterarOpcional));
  return { totalAdmins, isTargetAdmin };
}

/* ========= ROTAS PROTEGIDAS (JWT + opcional RBAC) ========= */

// Listar usuários de uma empresa
router.get(
  '/empresa/:idEmpresa',
  authMiddleware,
  authorize('usersRoles', 'view'),
  async (req, res) => {
    const { idEmpresa } = req.params;
    try {
      const [usuarios] = await db.query(
        `
        SELECT 
          u.ID, u.NOME, u.EMAIL, u.CPFCNPJ, u.CEP, u.DDI, u.DDD, u.TELEFONE,
          perf.ID_PERFIL, perf.NOME_PERFIL, perf.NIVEL
        FROM usuario u
        INNER JOIN permissoes pm
                ON pm.ID_USUARIO = u.ID
        INNER JOIN perfil perf
                ON perf.ID_PERFIL  = pm.ID_PERFIL
               AND perf.ID_EMPRESA = pm.ID_EMPRESA
        WHERE pm.ID_EMPRESA = ?
        ORDER BY u.NOME ASC
        `,
        [idEmpresa]
      );
      res.json(usuarios);
    } catch (error) {
      console.error('Erro ao buscar usuários da empresa:', error);
      res.status(500).json({ error: 'Erro ao buscar usuários da empresa' });
    }
  }
);

// Adicionar um usuário existente a uma empresa (recebe idPerfil no body)
router.post(
  '/empresa/:idEmpresa/adicionar-usuario',
  authMiddleware,
  authorize('usersRoles', 'create'),
  async (req, res) => {
    const { cpfOuEmail, idPerfil } = req.body;
    const { idEmpresa } = req.params;

    if (!cpfOuEmail || !idPerfil) {
      return res.status(400).json({ error: 'Informe CPF/E-mail e o perfil (idPerfil).' });
    }

    try {
      // 1) Usuário existe?
      const [usuarioRows] = await db.query(
        'SELECT ID FROM usuario WHERE CPFCNPJ = ? OR EMAIL = ? LIMIT 1',
        [cpfOuEmail, cpfOuEmail]
      );
      if (usuarioRows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      const idUsuario = usuarioRows[0].ID;

      // 2) Perfil pertence à empresa?
      const [perfilRows] = await db.query(
        'SELECT NIVEL FROM perfil WHERE ID_PERFIL = ? AND ID_EMPRESA = ? LIMIT 1',
        [idPerfil, idEmpresa]
      );
      if (perfilRows.length === 0) {
        return res.status(400).json({ error: 'Perfil não pertence a esta empresa.' });
      }

      // 3) Já existe vínculo empresa/usuário?
      const [jaExiste] = await db.query(
        'SELECT 1 FROM permissoes WHERE ID_EMPRESA = ? AND ID_USUARIO = ? LIMIT 1',
        [idEmpresa, idUsuario]
      );
      if (jaExiste.length > 0) {
        return res.status(409).json({ error: 'Usuário já faz parte da empresa.' });
      }

      // 4) Insere vínculo com o perfil
      await db.query(
        'INSERT INTO permissoes (ID_EMPRESA, ID_PERFIL, ID_USUARIO) VALUES (?, ?, ?)',
        [idEmpresa, idPerfil, idUsuario]
      );

      res.json({ message: 'Usuário adicionado à empresa com sucesso.' });
    } catch (err) {
      console.error('Erro ao adicionar usuário à empresa:', err);
      res.status(500).json({ error: 'Erro interno ao adicionar usuário.' });
    }
  }
);

// Editar a permissão (trocar perfil) de um usuário na empresa
router.put(
  '/permissoes/:idEmpresa/:idUsuario',
  authMiddleware,
  authorize('usersRoles', 'edit'),
  async (req, res) => {
    const { idEmpresa, idUsuario } = req.params;
    const { idPerfil } = req.body;

    console.log('[PUT /permissoes] params=', { idEmpresa, idUsuario }, 'body=', { idPerfil });

    if (!idPerfil) {
      return res.status(400).json({ error: 'Informe o novo idPerfil.' });
    }

    try {
      const [perfilRows] = await db.query(
        'SELECT NIVEL FROM perfil WHERE ID_PERFIL = ? AND ID_EMPRESA = ? LIMIT 1',
        [idPerfil, idEmpresa]
      );
      if (perfilRows.length === 0) {
        return res.status(400).json({ error: 'Perfil não pertence a esta empresa.' });
      }

      // opcional: proteção do último ADM (já te mandei antes)
      // ...

      const [result] = await db.query(
        'UPDATE permissoes SET ID_PERFIL = ? WHERE ID_EMPRESA = ? AND ID_USUARIO = ?',
        [idPerfil, idEmpresa, idUsuario]
      );
      console.log('[PUT /permissoes] mysql result=', result); // affectedRows, changedRows, info, etc.

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Permissão não encontrada para este usuário e empresa.' });
      }

      // lê de volta o que ficou no banco, pra resposta ser a fonte da verdade
      const [rows] = await db.query(`
        SELECT pm.ID_EMPRESA, pm.ID_USUARIO, pm.ID_PERFIL,
               p.NOME_PERFIL, p.NIVEL
          FROM permissoes pm
          JOIN perfil p
            ON p.ID_PERFIL=pm.ID_PERFIL
           AND p.ID_EMPRESA=pm.ID_EMPRESA
         WHERE pm.ID_EMPRESA=? AND pm.ID_USUARIO=? LIMIT 1
      `, [idEmpresa, idUsuario]);

      return res.json({ message: 'Permissão atualizada', registro: rows[0] || null });
    } catch (error) {
      // FK quebrada (perfil de outra empresa, etc.)
      if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1452) {
        return res.status(400).json({ error: 'Falha de integridade: o perfil não é válido para esta empresa.' });
      }
      console.error('Erro ao atualizar permissão:', error);
      return res.status(500).json({ error: 'Erro interno ao atualizar a permissão.' });
    }
  }
);

// Remover usuário da empresa
router.delete(
  '/empresa/:idEmpresa/remover-usuario/:idUsuario',
  authMiddleware,
  authorize('usersRoles', 'delete'),
  async (req, res) => {
    const { idEmpresa, idUsuario } = req.params;
    try {
      // proteção: não permitir remover o último ADM
      const { totalAdmins, isTargetAdmin } = await isLastAdmin(idEmpresa, idUsuario);
      if (isTargetAdmin && totalAdmins <= 1) {
        return res.status(409).json({ error: 'Não é possível remover o último Administrador da empresa.' });
      }

      const [result] = await db.query(
        'DELETE FROM permissoes WHERE ID_EMPRESA = ? AND ID_USUARIO = ?',
        [idEmpresa, idUsuario]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Registro de permissão não encontrado.' });
      }

      res.json({ message: 'Usuário removido da empresa com sucesso.' });
    } catch (err) {
      console.error('Erro ao remover usuário da empresa:', err);
      res.status(500).json({ error: 'Erro interno ao remover usuário.' });
    }
  }
);

module.exports = router;
