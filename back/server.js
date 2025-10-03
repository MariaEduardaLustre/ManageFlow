// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');
const authMiddleware = require('./auth/jwt');
const meRoutes = require('./routes/me');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:3000',
  'http://192.168.0.57:3000',
  process.env.PUBLIC_FRONT_BASE_URL,
  process.env.FRONT_ORIGIN
].filter(Boolean);

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET','POST','PUT','PATCH','DELETE'], credentials: true }
});

app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, _res, next) => {
  const len = req.headers['content-length'];
  if (len) console.log('[body-size]', req.method, req.url, `${len} bytes`);
  next();
});

// Carregamos as rotas públicas passando a instância 'io' para a fábrica.
const configuracaoPublic = require('./routes/configuracaoPublicRoutes')(io);
app.use('/api/configuracao', configuracaoPublic);

const dashboardRoutes = require('./routes/dashboardRoutes')(io);
app.use('/api/dashboard', dashboardRoutes);

// 🔸 Restante das rotas...
const usuarioRoutes = require('./routes/usuarioRoutes');
app.use('/api', usuarioRoutes);

app.use('/api', authMiddleware, meRoutes);

let empresaRoutesModule = require('./routes/empresaRoutes');
const empresaRoutesResolved = typeof empresaRoutesModule === 'function' ? empresaRoutesModule(io) : empresaRoutesModule;
app.use('/api/empresas', authMiddleware, empresaRoutesResolved);

const configuracaoRoutes = require('./routes/configuracaoRoutes');
app.use('/api/configuracao', authMiddleware, configuracaoRoutes);

const filaRoutes = require('./routes/filaRoutes');
app.use('/api/fila', filaRoutes);
app.use('/api/filas', authMiddleware, filaRoutes);


// Relatórios (sempre com JWT)
const relatorioRoutes = require('./routes/relatorioRoutes');
app.use('/api/relatorios', authMiddleware, relatorioRoutes);

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => console.log(`API ouvindo em http://0.0.0.0:${PORT}`));