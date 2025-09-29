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
    return totalAdmins <= 1;
  }
  const isTargetAdmin = rows.some(r => Number(r.ID_USUARIO) === Number(idUsuarioParaAlterarOpcional));
  return { totalAdmins, isTargetAdmin };
}

/**
 * Descobre o nível do usuário logado na empresa informada.
 * Retorna { nivel, idPerfil } ou null se não tiver vínculo.
 */
async function getNivelUsuarioNaEmpresa(idEmpresa, idUsuario) {
  const [rows] = await db.query(
    `
    SELECT p.NIVEL, p.ID_PERFIL
      FROM permissoes pm
      JOIN perfil p
        ON p.ID_PERFIL  = pm.ID_PERFIL
       AND p.ID_EMPRESA = pm.ID_EMPRESA
     WHERE pm.ID_EMPRESA = ?
       AND pm.ID_USUARIO = ?
     LIMIT 1
    `,
    [idEmpresa, idUsuario]
  );
  if (!rows.length) return null;
  return { nivel: Number(rows[0].NIVEL), idPerfil: Number(rows[0].ID_PERFIL) };
}

/**
 * Middleware: permite visualizar a lista de usuários se for Admin (NIVEL=1) ou Staff (NIVEL=2).
 * Mantém compatibilidade com RBAC caso exista: se o authorize já tiver liberado, ok;
 * se o authorize bloquear, ainda assim o Staff/Admin conseguem ver a lista via este middleware.
 */
async function allowStaffOrAdminList(req, res, next) {
  try {
    const { idEmpresa } = req.params;
    const userId =
      req.user?.id ||
      req.user?.ID ||
      req.userId ||
      req.idUsuario ||
      req.auth?.id ||
      null;

    if (!idEmpresa || !userId) {
      return res.status(400).json({ error: 'Parâmetros inválidos.' });
    }

    const nivelInfo = await getNivelUsuarioNaEmpresa(idEmpresa, userId);
    if (!nivelInfo) {
      return res.status(403).json({ error: 'Sem vínculo com a empresa.' });
    }

    if (nivelInfo.nivel === 1 || nivelInfo.nivel === 2) {
      return next(); // Admin e Staff podem listar
    }

    // Analyst (NIVEL=3) não visualiza a tabela de usuários
    return res.status(403).json({ error: 'Sem permissão para visualizar usuários.' });
  } catch (err) {
    console.error('Erro no allowStaffOrAdminList:', err);
    return res.status(500).json({ error: 'Falha na verificação de permissão.' });
  }
}

/* ========= ROTAS PROTEGIDAS (JWT + RBAC opcional) ========= */

/**
 * GET /empresa/:idEmpresa
 * GET /empresa/:idEmpresa/usuarios  (alias para compatibilidade com o front)
 * Lista usuários da empresa. Permite Admin e Staff verem em modo leitura.
 */
async function listarUsuariosEmpresa(req, res) {
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
    return res.json(usuarios);
  } catch (error) {
    console.error('Erro ao buscar usuários da empresa:', error);
    return res.status(500).json({ error: 'Erro ao buscar usuários da empresa' });
  }
}

// Mantém JWT; tenta RBAC; e garante fallback para Admin/Staff
router.get(
  '/empresa/:idEmpresa',
  authMiddleware,
  // primeiro tenta o RBAC; se seu authorize não existir, ele é no-op
  authorize('usersRoles', 'view'),
  // fallback explícito garantindo Admin/Staff
  allowStaffOrAdminList,
  listarUsuariosEmpresa
);

// Alias compatível com o front: /empresa/:idEmpresa/usuarios
router.get(
  '/empresa/:idEmpresa/usuarios',
  authMiddleware,
  authorize('usersRoles', 'view'),
  allowStaffOrAdminList,
  listarUsuariosEmpresa
);

/**
 * POST /empresa/:idEmpresa/adicionar-usuario
 * Adicionar um usuário existente à empresa (mantém JWT + RBAC).
 */
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
      const [usuarioRows] = await db.query(
        'SELECT ID FROM usuario WHERE CPFCNPJ = ? OR EMAIL = ? LIMIT 1',
        [cpfOuEmail, cpfOuEmail]
      );
      if (usuarioRows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      const idUsuario = usuarioRows[0].ID;

      const [perfilRows] = await db.query(
        'SELECT NIVEL FROM perfil WHERE ID_PERFIL = ? AND ID_EMPRESA = ? LIMIT 1',
        [idPerfil, idEmpresa]
      );
      if (perfilRows.length === 0) {
        return res.status(400).json({ error: 'Perfil não pertence a esta empresa.' });
      }

      const [jaExiste] = await db.query(
        'SELECT 1 FROM permissoes WHERE ID_EMPRESA = ? AND ID_USUARIO = ? LIMIT 1',
        [idEmpresa, idUsuario]
      );
      if (jaExiste.length > 0) {
        return res.status(409).json({ error: 'Usuário já faz parte da empresa.' });
      }

      await db.query(
        'INSERT INTO permissoes (ID_EMPRESA, ID_PERFIL, ID_USUARIO) VALUES (?, ?, ?)',
        [idEmpresa, idPerfil, idUsuario]
      );

      return res.json({ message: 'Usuário adicionado à empresa com sucesso.' });
    } catch (err) {
      console.error('Erro ao adicionar usuário à empresa:', err);
      return res.status(500).json({ error: 'Erro interno ao adicionar usuário.' });
    }
  }
);

/**
 * PUT /permissoes/:idEmpresa/:idUsuario
 * Editar a permissão (trocar perfil) de um usuário na empresa (mantém JWT + RBAC).
 */
router.put(
  '/permissoes/:idEmpresa/:idUsuario',
  authMiddleware,
  authorize('usersRoles', 'edit'),
  async (req, res) => {
    const { idEmpresa, idUsuario } = req.params;
    const { idPerfil } = req.body;

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

      // Proteção do último ADM (opcional)
      // const { totalAdmins, isTargetAdmin } = await isLastAdmin(idEmpresa, idUsuario);
      // if (isTargetAdmin && totalAdmins <= 1 && perfilRows[0].NIVEL !== 1) {
      //   return res.status(409).json({ error: 'Não é possível remover o último Administrador da empresa.' });
      // }

      const [result] = await db.query(
        'UPDATE permissoes SET ID_PERFIL = ? WHERE ID_EMPRESA = ? AND ID_USUARIO = ?',
        [idPerfil, idEmpresa, idUsuario]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Permissão não encontrada para este usuário e empresa.' });
      }

      const [rows] = await db.query(
        `
        SELECT pm.ID_EMPRESA, pm.ID_USUARIO, pm.ID_PERFIL,
               p.NOME_PERFIL, p.NIVEL
          FROM permissoes pm
          JOIN perfil p
            ON p.ID_PERFIL=pm.ID_PERFIL
           AND p.ID_EMPRESA=pm.ID_EMPRESA
         WHERE pm.ID_EMPRESA=? AND pm.ID_USUARIO=? LIMIT 1
        `,
        [idEmpresa, idUsuario]
      );

      return res.json({ message: 'Permissão atualizada', registro: rows[0] || null });
    } catch (error) {
      if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1452) {
        return res.status(400).json({ error: 'Falha de integridade: o perfil não é válido para esta empresa.' });
      }
      console.error('Erro ao atualizar permissão:', error);
      return res.status(500).json({ error: 'Erro interno ao atualizar a permissão.' });
    }
  }
);

/**
 * DELETE /empresa/:idEmpresa/remover-usuario/:idUsuario
 * Remover usuário da empresa (mantém JWT + RBAC e proteção do último ADM).
 */
router.delete(
  '/empresa/:idEmpresa/remover-usuario/:idUsuario',
  authMiddleware,
  authorize('usersRoles', 'delete'),
  async (req, res) => {
    const { idEmpresa, idUsuario } = req.params;
    try {
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

      return res.json({ message: 'Usuário removido da empresa com sucesso.' });
    } catch (err) {
      console.error('Erro ao remover usuário da empresa:', err);
      return res.status(500).json({ error: 'Erro interno ao remover usuário.' });
    }
  }
);

module.exports = router;
