// routes/me.js
const router = require('express').Router();
const db = require('../database/connection');

function normalizeRoleByNivel(nivel) {
  const n = Number(nivel);
  if (n === 1) return 'ADM';
  if (n === 2) return 'STAF';
  if (n === 3) return 'ANALYST';
  return 'CUSTOMER';
}

router.get('/me/permissions', async (req, res) => {
  const userId = req.user?.id;
  const empresaId = Number(req.query.empresaId);
  if (!userId || !empresaId) return res.status(400).json('missing_params');

  try {
    const [rows] = await db.query(
      `SELECT p.ID_PERFIL, p.NOME_PERFIL, p.NIVEL
         FROM permissoes pm
         JOIN perfil p
           ON p.ID_EMPRESA = pm.ID_EMPRESA
          AND p.ID_PERFIL  = pm.ID_PERFIL
        WHERE pm.ID_USUARIO = ?
          AND pm.ID_EMPRESA = ?
        ORDER BY p.NIVEL ASC
        LIMIT 1`,
      [userId, empresaId]
    );

    if (!rows.length) return res.status(404).json('no_role');
    const { ID_PERFIL, NOME_PERFIL, NIVEL } = rows[0];
    const role = normalizeRoleByNivel(NIVEL);

    // Snapshot simples (bate com o PrivateRoute do front)
    const permissions = {
      dashboard:   ['view'], // todos enxergam algo do dashboard
      queues:      role === 'ADM' ? ['create','view','edit','reorder','clear','delete']
                  : role === 'STAF' ? ['create','view','edit','reorder','clear']
                  : role === 'ANALYST' ? ['view']
                  : ['view'],
      queueEntries:role === 'ADM' || role === 'STAF' ? ['create','view','edit','transfer','clear','delete']
                  : role === 'ANALYST' ? ['view']
                  : ['checkin','view','delete'],
      usersRoles:  role === 'ADM' ? ['create','edit','delete','view'] : [],
      analytics:   role === 'ADM' ? ['view']
                  : (role === 'STAF' || role === 'ANALYST') ? ['reports_own'] : [],
      settings:    role === 'ADM' ? ['view','edit'] : role === 'STAF' ? ['view'] : [],
      reviews:     role === 'ADM' ? ['view','respond','delete']
                  : (role === 'STAF' || role === 'ANALYST') ? ['view'] : ['create','view'],
    };

    res.json({
      empresaId,
      role,
      nomePerfil: NOME_PERFIL,
      nivel: NIVEL,
      idPerfil: ID_PERFIL,
      permissions,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json('server_error');
  }
});

module.exports = router;
