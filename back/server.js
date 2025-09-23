// Arquivo: server.js
require('dotenv').config();
const express = require('express');
const http = require('http'); 
const cors = require('cors');
const { Server } = require("socket.io"); 

// Importe as rotas
const usuarioRoutes = require('./routes/usuarioRoutes');
const empresaRoutes = require('./routes/empresaRoutes');
const configuracaoRoutes = require('./routes/configuracaoRoutes');
const filaRoutes = require('./routes/filaRoutes');
const relatorioRoutes = require('./controllers/relatorioController'); 

const app = express();
const server = http.createServer(app); 
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Exporte io para outros arquivos
module.exports = { app, server, io };

// Importar cronJobs DEPOIS de exportar io
require('./cronJobs');

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Rotas
app.use('/api', usuarioRoutes);
app.use('/api/empresas', empresaRoutes);
app.use('/api/configuracao-fila', configuracaoRoutes);
app.use('/api/filas', filaRoutes);
app.use('/api/relatorios', relatorioRoutes); // ✅ novo

// Inicie o servidor
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
