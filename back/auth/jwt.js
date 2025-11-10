// auth/jwt.js
const jwt = require('jsonwebtoken');
// Precisamos do 'db' aqui agora
const db = require('../database/connection');

/**
 * Rotas públicas que NÃO exigem token
 */
const PUBLIC_ROUTES = [
  // Swagger / Docs
  { method: 'GET',  rx: /^\/api\/docs(?:\/.*)?$/ },   // UI e assets do swagger-ui-express
  { method: 'GET',  rx: /^\/api\/docs\.json$/ },      // JSON do OpenAPI

  // Healthcheck
  { method: 'GET',  rx: /^\/api\/health$/ },

  // Portal público por TOKEN_FILA
  { method: 'GET',  rx: /^\/api\/configuracao\/public\/info\/[^/]+$/ },
  { method: 'GET',  rx: /^\/api\/configuracao\/public\/status\/[^/]+$/ },
  { method: 'POST', rx: /^\/api\/configuracao\/public\/join\/[^/]+$/ },
  { method: 'POST', rx: /^\/api\/configuracao\/public\/leave\/[^/]+$/ },
  { method: 'POST', rx: /^\/api\/configuracao\/public\/confirm\/[^/]+$/ },

  // Fila - validação pública (se aplicável)
  { method: 'GET',  rx: /^\/api\/fila\/[^/]+\/validate-location$/ },
  { method: 'POST', rx: /^\/api\/fila\/[^/]+\/validate-address$/ }, // fallback por endereço

  // QR sem auth (remova se não usar)
  { method: 'GET',  rx: /^\/api\/configuracao\/qr\/[^/]+$/ },
];

/**
 * Middleware de autenticação + injeção de contexto de empresa (quando existir)
 * - Libera OPTIONS (preflight) e rotas públicas
 * - Valida Bearer token
 * - Carrega ID_EMPRESA do usuário (tabela 'permissoes')
 * - Exige empresa apenas em rotas de relatórios (/api/relatorio ou /api/relatorios)
 */
module.exports = async function authMiddleware(req, res, next) {
  try {
    const path = (req.originalUrl || req.url || '').split('?')[0];
    const method = req.method || 'GET';

    // Preflight CORS sempre liberado
    if (method === 'OPTIONS') return res.sendStatus(204);

    // Libera rotas públicas
    const isPublic = PUBLIC_ROUTES.some(r => r.method === method && r.rx.test(path));
    if (isPublic) return next();

    // Extrai Authorization: Bearer <token> (case-insensitive)
    const hdr = req.headers.authorization || req.headers.Authorization || '';
    const m = /^Bearer\s+(.+)$/i.exec(hdr);
    let token = m ? m[1] : null;

    if (token) token = token.trim().replace(/^"|"$/g, '');

    if (!token) {
      return res.status(401).json({ message: 'missing_token' });
    }

    // Verifica o token (síncrono)
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const payload = jwt.verify(token, secret);

    const userId = payload.id || payload.sub || null;

    // Busca empresa associada (se existir)
    let idEmpresa = null;
    try {
      if (userId) {
        const [rows] = await db.query(
          'SELECT ID_EMPRESA FROM permissoes WHERE ID_USUARIO = ? ORDER BY ID_EMPRESA LIMIT 1',
          [userId]
        );
        if (rows && rows.length > 0 && rows[0].ID_EMPRESA) {
          idEmpresa = rows[0].ID_EMPRESA;
        }
      }
    } catch (dbErr) {
      console.error('[auth] db_error:', dbErr.message);
      // Prossegue sem id_empresa; validação específica é feita abaixo p/ relatórios
    }

    // Monta req.user padronizado
    req.user = {
      id: userId,
      email: payload.email,
      nome: payload.nome,
      id_empresa: idEmpresa,
    };

    // Para rotas de relatórios, exigir empresa associada
    const isRelatorio = /^\/api\/relatorio(s)?(?:\/|$)/i.test(path);
    if (isRelatorio && !idEmpresa) {
      console.warn(`[auth] Acesso negado: usuário ${userId} sem empresa associada para relatórios.`);
      return res.status(403).json({ message: 'no_company_associated' });
    }

    return next();
  } catch (e) {
    console.error('[auth] invalid_token:', e.message);
    return res.status(401).json({ message: 'invalid_token' });
  }
};
