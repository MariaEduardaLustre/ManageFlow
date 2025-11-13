// auth/jwt.js
const jwt = require('jsonwebtoken');

// Rotas públicas que NÃO exigem token
const PUBLIC_ROUTES = [
  // Swagger / Docs
  { method: 'GET',  rx: /^\/api\/docs(?:\/.*)?$/ },   // UI e assets do swagger-ui-express
  { method: 'GET',  rx: /^\/api\/docs\.json$/ },      // JSON do OpenAPI

  // Healthcheck
  { method: 'GET',  rx: /^\/api\/health$/ },

  // Portal público por TOKEN_FILA (ajuste conforme suas rotas públicas)
  { method: 'GET',  rx: /^\/api\/configuracao\/public\/info\/[^/]+$/ },
  { method: 'GET',  rx: /^\/api\/configuracao\/public\/status\/[^/]+$/ },
  { method: 'POST', rx: /^\/api\/configuracao\/public\/join\/[^/]+$/ },
  { method: 'POST', rx: /^\/api\/configuracao\/public\/leave\/[^/]+$/ },
  { method: 'POST', rx: /^\/api\/configuracao\/public\/confirm\/[^/]+$/ },

  // Fila - validação pública (se aplicável no seu projeto)
  { method: 'GET',  rx: /^\/api\/fila\/[^/]+\/validate-location$/ },
  { method: 'POST', rx: /^\/api\/fila\/[^/]+\/validate-address$/ }, // fallback por endereço

  // Se expõe QR sem auth (remova se não usar)
  { method: 'GET',  rx: /^\/api\/configuracao\/qr\/[^/]+$/ },
];

module.exports = function authMiddleware(req, res, next) {
  // Remove querystring para casar regex de rota
  const path = (req.originalUrl || req.url || '').split('?')[0];
  const method = req.method;

  // Preflight CORS sempre liberado
  if (method === 'OPTIONS') return res.sendStatus(204);

  // Libera rotas públicas
  const isPublic = PUBLIC_ROUTES.some(r => r.method === method && r.rx.test(path));
  if (isPublic) return next();

  // Aceita Authorization: "Bearer <token>" (qualquer caixa)
  const hdr = req.headers.authorization || req.headers.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(hdr);
  let token = m ? m[1] : null;

  if (token) token = token.trim().replace(/^"|"$/g, '');

  if (!token) {
    return res.status(401).json({ message: 'missing_token' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const payload = jwt.verify(token, secret);

    // Padroniza o que você usa no req.user
    req.user = {
      id: payload.id || payload.sub,
      email: payload.email,
      nome: payload.nome
    };
    return next();
  } catch (e) {
    console.error('[auth] invalid_token:', e.message);
    return res.status(401).json({ message: 'invalid_token' });
  }
};
