// auth/authorize.js
const db = require('../database/connection');
const { can } = require('./permissions');

function normalizeRoleByNivel(nivel) {
  const n = Number(nivel);
  if (n === 1) return 'ADM';
  if (n === 2) return 'STAF';
  if (n === 3) return 'ANALYST';
  return 'CUSTOMER';
}

async function getUserRoleInCompany(userId, empresaId) {
  const [rows] = await db.query(
    `SELECT p.NIVEL
       FROM permissoes pm
       JOIN perfil p ON p.ID_EMPRESA = pm.ID_EMPRESA AND p.ID_PERFIL = pm.ID_PERFIL
      WHERE pm.ID_USUARIO = ? AND pm.ID_EMPRESA = ?
      ORDER BY p.NIVEL ASC
      LIMIT 1`,
    [userId, empresaId]
  );
  if (!rows.length) return null;
  return normalizeRoleByNivel(rows[0].NIVEL);
}

function authorize(resource, action = 'view') {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const empresaId = Number(req.headers['x-empresa-id'] ?? req.query.empresaId ?? req.body.empresaId);
      if (!userId || !empresaId) return res.status(401).json('unauthorized');

      const role = await getUserRoleInCompany(userId, empresaId);
      if (!role) return res.status(403).json('forbidden');

      if (!can(role, action, resource)) return res.status(403).json('forbidden');

      next();
    } catch (e) {
      console.error(e);
      res.status(500).json('auth_error');
    }
  };
}

module.exports = { authorize };
