require('dotenv').config();
const express = require('express');
const cors = require('cors');

const usuarioRoutes = require('./routes/usuarioRoutes');    // rotas públicas (login/cadastro)
const empresaRoutes = require('./routes/empresaRoutes');
const configuracaoRoutes = require('./routes/configuracaoRoutes');

const authMiddleware = require('./auth/jwt');               // <<< NOVO
const meRoutes = require('./routes/me');                    // <<< NOVO

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// públicas
app.use('/api', usuarioRoutes);

// autenticadas
app.use('/api', authMiddleware, meRoutes);                  // /api/me/permissions
app.use('/api/empresas', authMiddleware, empresaRoutes);
app.use('/api/configuracao', authMiddleware, configuracaoRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
