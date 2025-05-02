require('dotenv').config();
const express = require('express');
const cors = require('cors');
const usuarioRoutes = require('./routes/usuarioRoutes');
const empresaRoutes = require('./routes/empresaRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/usuarios', usuarioRoutes);

// nova rota
app.use('/api/empresas', empresaRoutes); // <<< MONTA A ROTA /api/empresas

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
