// Arquivo: server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const authMiddleware = require('./auth/jwt');     // mantém seu fluxo
const meRoutes = require('./routes/me');

const app = express();
const server = http.createServer(app);

// ---- CORS compartilhado (API e Socket.IO) ----
const allowedOrigins = [
  'http://localhost:3000',
  'http://192.168.1.32:3000',           // seu IP de front local (ajuste se mudar)
  process.env.PUBLIC_FRONT_BASE_URL,     // ex.: http://192.168.0.10:3000
  process.env.FRONT_ORIGIN               // opcional
].filter(Boolean);

// ---- Socket.IO (preservando o outro branch) ----
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  }
});

// Exporta antes de carregar módulos que podem depender de io
module.exports = { app, server, io };

// ---- CronJobs (preservado, mas opcional para não alterar comportamento) ----
if (process.env.ENABLE_CRONJOBS === 'true') {
  try {
    require('./cronJobs');
    console.log('[cronJobs] habilitado via ENABLE_CRONJOBS=true');
  } catch (e) {
    console.warn('[cronJobs] não carregado:', e.message);
  }
}

// ---- Rotas (mantém seu comportamento atual) ----
app.use(express.json());
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Rotas públicas (login/cadastro)
const usuarioRoutes = require('./routes/usuarioRoutes');
app.use('/api', usuarioRoutes);

// Rotas autenticadas principais (SEU fluxo)
const meRoutesBase = meRoutes; // apenas semântica
app.use('/api', authMiddleware, meRoutesBase);   // /api/me/permissions

// empresaRoutes: aceita tanto router direto quanto fábrica(io)
let empresaRoutesModule = require('./routes/empresaRoutes');
const empresaRoutesResolved =
  typeof empresaRoutesModule === 'function'
    ? empresaRoutesModule(io)    // formato do outro branch
    : empresaRoutesModule;       // formato do seu branch

app.use('/api/empresas', authMiddleware, empresaRoutesResolved);

// configuracaoRoutes (mantém seu prefixo atual)
const configuracaoRoutes = require('./routes/configuracaoRoutes');
app.use('/api/configuracao', authMiddleware, configuracaoRoutes);

// filaRoutes (preservado do outro branch, só se existir)
let filaRoutes;
try {
  filaRoutes = require('./routes/filaRoutes');
} catch (e) {
  // ok se não existir neste branch
}
if (filaRoutes) {
  // Coloque com auth se fizer sentido no seu projeto;
  // se preferir público, remova o authMiddleware abaixo.
  app.use('/api/filas', authMiddleware, filaRoutes);
}

// ---- Startup (preserva bind em 0.0.0.0) ----
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`API ouvindo em http://0.0.0.0:${PORT}`);
});
