// auth/authorize.js
const db = require('../database/connection');
const { can } = require('./permissions');

function normalizeRoleByNivel(nivel) {
  const n = Number(nivel);
  if (n === 1) return 'ADM';
  if (n === 2) return 'STAFF';
  if (n === 3) return 'ANALYST';
  return 'CUSTOMER';
}

async function getUserRoleInCompany(userId, empresaId) {
  const [rows] = await db.query(
    `
    SELECT p.NIVEL
      FROM permissoes pm
      JOIN perfil p
        ON p.ID_EMPRESA = pm.ID_EMPRESA
       AND p.ID_PERFIL  = pm.ID_PERFIL
     WHERE pm.ID_USUARIO = ?
       AND pm.ID_EMPRESA = ?
     ORDER BY p.NIVEL ASC
     LIMIT 1
    `,
    [userId, empresaId]
  );
  if (!rows.length) return null;
  return normalizeRoleByNivel(rows[0].NIVEL);
}

function extractEmpresaId(req) {
  const fromHeader = req.headers['x-empresa-id'];
  const fromQuery  = req.query?.empresaId ?? req.query?.idEmpresa;
  const fromBody   = req.body?.empresaId ?? req.body?.idEmpresa;
  const fromParams = req.params?.idEmpresa ?? req.params?.empresaId ?? req.params?.ID_EMPRESA ?? null;

  const raw = fromHeader ?? fromQuery ?? fromBody ?? fromParams;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function authorize(resource, action = 'view') {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id ?? req.user?.ID;
      const empresaId = extractEmpresaId(req);
      if (!userId || !empresaId) return res.status(401).json('unauthorized');

      const role = await getUserRoleInCompany(userId, empresaId);
      if (!role) return res.status(403).json('forbidden');

      // ✅ Bloqueio explícito para ANALYST nas telas proibidas
      const resKey = String(resource || '').toLowerCase();
      const analystDeny = new Set(['usersroles', 'settings', 'queues', 'queueentries']);
      if (role === 'ANALYST' && analystDeny.has(resKey)) {
        return res.status(403).json('forbidden');
      }

      // Grace path: ADM/STAFF podem ver lista de usuários
      if (resKey === 'usersroles' && action === 'view' && (role === 'ADM' || role === 'STAFF')) {
        return next();
      }

      if (!can(role, action, resource)) return res.status(403).json('forbidden');

      next();
    } catch (e) {
      console.error(e);
      res.status(500).json('auth_error');
    }
  };
}

module.exports = { authorize };
