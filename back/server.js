// Arquivo: server.js
require('dotenv').config();
const express = require('express');
const http = require('http'); // Importe o módulo http
const cors = require('cors');
const { Server } = require("socket.io"); // Importe a classe Server do socket.io

// Importe as rotas
const usuarioRoutes = require('./routes/usuarioRoutes');
const empresaRoutes = require('./routes/empresaRoutes');
const configuracaoRoutes = require('./routes/configuracaoRoutes');
const filaRoutes = require('./routes/filaRoutes');

const app = express();
const server = http.createServer(app); // Crie um servidor HTTP a partir do seu app Express
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // A URL do seu frontend em desenvolvimento
        methods: ["GET", "POST"]
    }
});

// NOVO: Exporte o objeto 'io' para que outros arquivos possam usá-lo
module.exports = { app, server, io };

// Agora, importe o cronJobs DEPOIS de exportar o 'io'
require('./cronJobs');

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', usuarioRoutes);
app.use('/api/empresas', empresaRoutes);
app.use('/api/configuracao-fila', configuracaoRoutes);
app.use('/api/filas', filaRoutes);

// Remova o app.listen() e use server.listen() no lugar
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});