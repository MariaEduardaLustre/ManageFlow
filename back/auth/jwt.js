// auth/jwt.js
const jwt = require('jsonwebtoken');

// Rotas públicas que NÃO exigem token
const PUBLIC_ROUTES = [
  { method: 'GET',  rx: /^\/api\/configuracao\/public\/info\/[^/]+$/ },
  { method: 'GET',  rx: /^\/api\/fila\/[^/]+\/validate-location$/ },
  { method: 'POST', rx: /^\/api\/fila\/[^/]+\/validate-address$/ }, // se você usa o fallback por endereço
  { method: 'GET',  rx: /^\/api\/health$/ }
];

module.exports = function authMiddleware(req, res, next) {
  const path = (req.originalUrl || req.url || '').split('?')[0]; // sem querystring
  const method = req.method;

  console.log('[auth/jwt.js]', method, path);

  // Preflight CORS
  if (method === 'OPTIONS') return res.sendStatus(204);

  // Liberar rotas públicas
  const isPublic = PUBLIC_ROUTES.some(r => r.method === method && r.rx.test(path));
  if (isPublic) return next();

  // Aceita Authorization: "Bearer <token>" (qualquer caixa)
  const hdr = req.headers.authorization || req.headers.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(hdr);
  let token = m ? m[1] : null;

  if (token) token = token.trim().replace(/^"|"$/g, '');

  if (!token) {
    return res.status(401).json('missing_token');
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, email: payload.email, nome: payload.nome };
    next();
  } catch (e) {
    console.error('[auth] invalid_token:', e.message);
    return res.status(401).json('invalid_token');
  }
};
