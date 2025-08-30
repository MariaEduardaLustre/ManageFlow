// Arquivo: server.js
require('dotenv').config();
const express = require('express');
const http = require('http'); 
const cors = require('cors');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app); 
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST", "PUT"]
    }
});

// AQUI ESTÁ A CORREÇÃO: Exporte o objeto 'io' antes de importar o cronJobs e as rotas que precisam dele
module.exports = { app, server, io };

// Agora, importe o cronJobs e as rotas que dependem do 'io' DEPOIS da exportação
require('./cronJobs');
const empresaRoutes = require('./routes/empresaRoutes');

// Importe as outras rotas que não dependem do 'io'
const usuarioRoutes = require('./routes/usuarioRoutes');
const configuracaoRoutes = require('./routes/configuracaoRoutes');
const filaRoutes = require('./routes/filaRoutes');


const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// As rotas que precisam do 'io' agora são inicializadas com ele
app.use('/api/empresas', empresaRoutes(io));

// As outras rotas podem ser usadas como antes
app.use('/api', usuarioRoutes);
app.use('/api/configuracao-fila', configuracaoRoutes);
app.use('/api/filas', filaRoutes);

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
