// auth/jwt.js
const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  const hdr = req.headers.authorization || '';
  // aceita "Bearer <token>" em qualquer caixa
  const m = /^Bearer\s+(.+)$/i.exec(hdr);
  let token = m ? m[1] : null;

  if (token) {
    token = token.trim().replace(/^"|"$/g, ''); // remove aspas acidentais
  }

  if (!token) {
    return res.status(401).json('missing_token');
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // padronize conforme seu login
    req.user = { id: payload.id, email: payload.email, nome: payload.nome };
    next();
  } catch (e) {
    console.error('[auth] invalid_token:', e.message);
    return res.status(401).json('invalid_token');
  }
};
