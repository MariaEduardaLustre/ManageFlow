// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const usuarioRoutes = require('./routes/usuarioRoutes');
const empresaRoutes = require('./routes/empresaRoutes');
const configuracaoRoutes = require('./routes/configuracaoRoutes');
const filaRoutes = require('./routes/filaRoutes'); // <-- ESTE É O CRÍTICO PARA FILAS CADASTradas

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', usuarioRoutes);
app.use('/api/empresas', empresaRoutes);
app.use('/api/configuracao-fila', configuracaoRoutes); // Rotas de configuração
app.use('/api/filas', filaRoutes); // <-- ESTE PRECISA ESTAR AQUI e ser o /api/filas

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});