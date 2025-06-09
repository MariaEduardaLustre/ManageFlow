require('dotenv').config();
const express = require('express');
const cors = require('cors');
const usuarioRoutes = require('./routes/usuarioRoutes');
const configuracaoRoutes = require('./routes/configuracaoRoutes'); // ConfiguracaFila adicionada
const empresaRoutes = require('./routes/empresaRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/usuarios', usuarioRoutes);
app.use('/api', configuracaoRoutes); // adiciona a nova rota de configuração de fila
app.use('/api', usuarioRoutes);
app.use('/api/empresas', empresaRoutes);
app.use('/api/configuracao', configuracaoRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
