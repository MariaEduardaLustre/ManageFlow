// utils/url.js
const os = require('os');

function getLanIPv4() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

/**
 * Base da URL pública onde o CLIENTE irá acessar a página de entrada na fila.
 * Preferimos variável de ambiente (quando você quiser apontar pro front),
 * e se não houver, montamos com IP local + porta do front (3000 por padrão).
 */
function getPublicFrontBaseUrl(req) {
  const explicit =
    process.env.PUBLIC_FRONT_BASE_URL || process.env.PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const ip = getLanIPv4();
  const port = process.env.FRONT_PORT || 3000;        // <-- front React
  const protocol = process.env.FRONT_PROTOCOL || 'http';
  return `${protocol}://${ip}:${port}`;
}

module.exports = { getPublicFrontBaseUrl };
