// auth/jwt.js
const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json('missing_token');

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // padronize os campos conforme o que você assina no login
    req.user = { id: payload.id, email: payload.email, nome: payload.nome };
    next();
  } catch (e) {
    return res.status(401).json('invalid_token');
  }
};
