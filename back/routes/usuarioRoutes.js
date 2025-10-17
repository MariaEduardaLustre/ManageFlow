// back/src/routes/usuarioRoutes.js
const express = require('express');
const router = express.Router();

const db = require('../database/connection');

// Controllers
const usuarioController = require('../controllers/usuarioController');

// Auth (JWT) – usa o middleware do seu projeto
const ensureAuth = require('../auth/jwt');

// RBAC opcional
let authorize;
try {
  authorize = require('../auth/authorize').authorize;
} catch {
  authorize = () => (req, res, next) => next();
}

// Upload da foto de perfil
let usuarioPerfilSingle;
try {
  // export esperado do seu projeto: { usuarioPerfilSingle }
  usuarioPerfilSingle = require('../middlewares/s3Upload').usuarioPerfilSingle;
} catch {
  // fallback pra não quebrar se não existir ainda
  usuarioPerfilSingle = (req, res, next) => next();
}

/* ========= ROTAS PÚBLICAS ========= */

// Cadastro
router.post('/usuarios', usuarioController.cadastrarUsuario);

// Login (suporta os dois caminhos por compatibilidade)
router.post('/login', usuarioController.loginUsuario);
router.post('/usuarios/login', usuarioController.loginUsuario);

// Esqueci/Reset senha
router.post('/usuarios/forgot', usuarioController.solicitarRedefinicaoSenha);
router.post('/usuarios/reset', usuarioController.redefinirSenha);

/* ========= PERFIL DO USUÁRIO (JWT) ========= */

router.get('/usuarios/:id', ensureAuth, usuarioController.getUsuarioPorId);
router.put('/usuarios/:id', ensureAuth, usuarioController.atualizarUsuario);
router.put('/usuarios/:id/password', ensureAuth, usuarioController.alterarSenhaAutenticado);

router.put(
  '/usuarios/:id/photo',
  ensureAuth,
  usuarioPerfilSingle,            // multer campo: img_perfil
  usuarioController.uploadFotoPerfil
);

router.get(
  '/usuarios/:id/sole-admin-companies',
  ensureAuth,
  usuarioController.getEmpresasOndeUnicoAdmin
);

router.delete('/usuarios/:id', ensureAuth, usuarioController.excluirUsuario);

/* ========= HELPERS / RBAC AUXILIAR ========= */


// Solicitação de redefinição de senha
router.post('/esqueci-senha', usuarioController.solicitarRedefinicaoSenha);


// Redefinição de senha com o token
router.post('/redefinir-senha', usuarioController.redefinirSenha);

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

    return res.status(403).json({ error: 'Sem permissão para visualizar usuários.' });
  } catch (err) {
    console.error('Erro no allowStaffOrAdminList:', err);
    return res.status(500).json({ error: 'Falha na verificação de permissão.' });
  }
}

/* ========= ROTAS PROTEGIDAS (EMPRESA / PERMISSÕES) ========= */

// Lista usuários da empresa
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

// GET /empresa/:idEmpresa (alias)
router.get(
  '/empresa/:idEmpresa',
  ensureAuth,
  authorize('usersRoles', 'view'),
  allowStaffOrAdminList,
  listarUsuariosEmpresa
);

// GET /empresa/:idEmpresa/usuarios (alias)
router.get(
  '/empresa/:idEmpresa/usuarios',
  ensureAuth,
  authorize('usersRoles', 'view'),
  allowStaffOrAdminList,
  listarUsuariosEmpresa
);

// POST /empresa/:idEmpresa/adicionar-usuario
router.post(
  '/empresa/:idEmpresa/adicionar-usuario',
  ensureAuth,
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
      if (!usuarioRows.length) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      const idUsuario = usuarioRows[0].ID;

      const [perfilRows] = await db.query(
        'SELECT NIVEL FROM perfil WHERE ID_PERFIL = ? AND ID_EMPRESA = ? LIMIT 1',
        [idPerfil, idEmpresa]
      );
      if (!perfilRows.length) {
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

// PUT /permissoes/:idEmpresa/:idUsuario
router.put(
  '/permissoes/:idEmpresa/:idUsuario',
  ensureAuth,
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
      if (!perfilRows.length) {
        return res.status(400).json({ error: 'Perfil não pertence a esta empresa.' });
      }

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

// DELETE /empresa/:idEmpresa/remover-usuario/:idUsuario
router.delete(
  '/empresa/:idEmpresa/remover-usuario/:idUsuario',
  ensureAuth,
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