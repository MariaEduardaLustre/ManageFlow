require('dotenv').config();
const express = require('express');
const cors = require('cors');

const usuarioRoutes = require('./routes/usuarioRoutes');    // rotas públicas (login/cadastro)
const empresaRoutes = require('./routes/empresaRoutes');
const configuracaoRoutes = require('./routes/configuracaoRoutes');

const authMiddleware = require('./auth/jwt');               // <<< NOVO
const meRoutes = require('./routes/me');                    // <<< NOVO

const app = express();



app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://192.168.1.32:3000',             // <-- seu IP do front
    process.env.PUBLIC_FRONT_BASE_URL       // <-- se usar a env
  ].filter(Boolean),
  credentials: true
}));

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API ouvindo em http://0.0.0.0:${PORT}`);
});
// públicas
app.use('/api', usuarioRoutes);

// autenticadas
app.use('/api', authMiddleware, meRoutes);                  // /api/me/permissions
app.use('/api/empresas', authMiddleware, empresaRoutes);
app.use('/api/configuracao', authMiddleware, configuracaoRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
