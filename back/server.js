// back/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');

const authMiddleware = require('./auth/jwt');

const app = express();
const server = http.createServer(app);

/* ====== CORS ====== */
const allowedOrigins = [
  'http://localhost:3000',
  'http://192.168.0.52:3000',
  process.env.PUBLIC_FRONT_BASE_URL,
  process.env.FRONT_ORIGIN,
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));

/* ====== Body Parsers ====== */
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

/* ====== Logs de tamanho (opcional) ====== */
app.use((req, _res, next) => {
  const len = req.headers['content-length'];
  if (len) console.log('[body-size]', req.method, req.url, `${len} bytes`);
  next();
});

/* ====== Socket.IO ====== */
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET','POST','PUT','PATCH','DELETE'], credentials: true },
});

/* ====== Arquivos estáticos (imagens já salvas localmente) ====== */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ====== Rotas ====== */

// --- Públicas (sem JWT) ---
const configuracaoPublicRoutes = require('./routes/configuracaoPublicRoutes'); // use o nome que você tem no disco
app.use('/api/configuracao', configuracaoPublicRoutes);

// Dashboard público/realtime (se for público)
const dashboardRoutes = require('./routes/dashboardRoutes')(io);
app.use('/api/dashboard', dashboardRoutes);

// API de upload (S3) – pública ou privada? geralmente privada:
const uploadRoutes = require('./routes/uploadRoutes');
app.use('/api/uploads', uploadRoutes); // <-- endpoints de API; NÃO confundir com estático acima

// --- Privadas (com JWT) ---
const meRoutes = require('./routes/me');
app.use('/api', authMiddleware, meRoutes);

const usuarioRoutes = require('./routes/usuarioRoutes');
app.use('/api', usuarioRoutes); // se algumas rotas aqui forem privadas, mova-as para baixo com authMiddleware

let empresaRoutesModule = require('./routes/empresaRoutes');
const empresaRoutesResolved = typeof empresaRoutesModule === 'function' ? empresaRoutesModule(io) : empresaRoutesModule;
app.use('/api/empresas', authMiddleware, empresaRoutesResolved);

const configuracaoRoutes = require('./routes/configuracaoRoutes');
app.use('/api/configuracao', authMiddleware, configuracaoRoutes);

const filaRoutes = require('./routes/filaRoutes');
app.use('/api/filas', authMiddleware, filaRoutes); // monte UMA vez só

/* ====== Start ====== */
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () =>
  console.log(`API ouvindo em http://0.0.0.0:${PORT}`)
);
