// Arquivo: routes/empresaRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// AQUI ESTÁ A MUDANÇA: Exporte uma função que recebe 'io'
module.exports = (io) => {

    // Rota para criar empresa
    router.post('/criar-empresa', async (req, res) => {
        console.log('Dados recebidos para criar empresa:', req.body);
        const {
            nomeEmpresa,
            cnpj,
            email,
            ddi,
            ddd,
            telefone,
            endereco,
            numero,
            logo,
            idUsuario
        } = req.body;

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [empresaResult] = await connection.query(`
                INSERT INTO empresa (
                    NOME_EMPRESA, CNPJ, EMAIL, DDI, DDD, TELEFONE, ENDERECO, NUMERO, LOGO
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [nomeEmpresa, cnpj, email, ddi, ddd, telefone, endereco, numero, logo]);

            const idEmpresa = empresaResult.insertId;

            const perfis = [
                { nome: 'Administrador', nivel: 1 },
                { nome: 'Editor', nivel: 2 },
                { nome: 'Leitor', nivel: 3 }
            ];

            for (const perfil of perfis) {
                await connection.query(`
                    INSERT INTO perfil (NOME_PERFIL, ID_EMPRESA, NIVEL)
                    VALUES (?, ?, ?)
                `, [perfil.nome, idEmpresa, perfil.nivel]);
            }

            const [[perfilAdmin]] = await connection.query(`
                SELECT ID_PERFIL FROM perfil
                WHERE ID_EMPRESA = ? AND NIVEL = 1
            `, [idEmpresa]);

            await connection.query(`
                INSERT INTO permissoes (ID_EMPRESA, ID_PERFIL, ID_USUARIO)
                VALUES (?, ?, ?)
            `, [idEmpresa, perfilAdmin.ID_PERFIL, idUsuario]);

            await connection.commit();
            res.json({ message: 'Empresa criada com sucesso!', idEmpresa });

        } catch (error) {
            await connection.rollback();
            console.error('Erro ao criar empresa:', error);
            res.status(500).json({ error: 'Erro ao criar empresa' });
        } finally {
            connection.release();
        }
    });

    // Rota para buscar empresas que o usuário tem acesso
    router.get('/empresas-do-usuario/:idUsuario', async (req, res) => {
        const { idUsuario } = req.params;
        try {
            const [results] = await db.query(`
                SELECT
                    e.ID_EMPRESA,
                    e.NOME_EMPRESA,
                    p.NOME_PERFIL,
                    p.NIVEL
                FROM permissoes pe
                JOIN empresa e ON e.ID_EMPRESA = pe.ID_EMPRESA
                JOIN perfil p ON p.ID_PERFIL = pe.ID_PERFIL
                WHERE pe.ID_USUARIO = ?
            `, [idUsuario]);
            res.json(results);
        } catch (err) {
            console.error('Erro ao buscar empresas do usuário:', err);
            res.status(500).json({ error: 'Erro interno ao buscar empresas.' });
        }
    });

    // Rota para detalhes da empresa
    router.get('/detalhes/:idEmpresa', async (req, res) => {
        const { idEmpresa } = req.params;
        try {
            const [empresa] = await db.query(
                `SELECT
                    ID_EMPRESA, NOME_EMPRESA, CNPJ, EMAIL, DDI, DDD, TELEFONE, ENDERECO, NUMERO, LOGO
                FROM empresa
                WHERE ID_EMPRESA = ?`, [idEmpresa]);
            if (empresa.length === 0) {
                return res.status(404).json({ error: 'Empresa não encontrada.' });
            }
            res.json(empresa[0]);
        } catch (err) {
            console.error('Erro ao buscar detalhes da empresa:', err);
            res.status(500).json({ error: 'Erro interno ao buscar detalhes da empresa.' });
        }
    });

    // Rota para buscar perfis de uma empresa específica
    router.get('/perfis/:idEmpresa', async (req, res) => {
        const { idEmpresa } = req.params;
        try {
            const [perfis] = await db.query(
                `SELECT ID_PERFIL, NOME_PERFIL, NIVEL FROM perfil WHERE ID_EMPRESA = ? ORDER BY NIVEL`,
                [idEmpresa]
            );
            res.json(perfis);
        } catch (err) {
            console.error('Erro ao buscar perfis da empresa:', err);
            res.status(500).json({ error: 'Erro interno ao buscar perfis.' });
        }
    });

    // Rota para buscar filas da empresa
    router.get('/filas/:idEmpresa', async (req, res) => {
        const { idEmpresa } = req.params;
        try {
            const [filas] = await db.query(`
                SELECT
                    f.ID_FILA, f.ID_EMPRESA, f.DT_MOVTO, f.DT_INI, f.DT_FIM, f.DT_INATIV, f.BLOCK, f.SITUACAO,
                    cf.NOME_FILA, cf.TOKEN_FILA, cf.MENSAGEM, cf.TEMP_TOL
                FROM Fila f
                JOIN ConfiguracaoFila cf ON f.ID_CONF_FILA = cf.ID_CONF_FILA AND f.ID_EMPRESA = cf.ID_EMPRESA
                WHERE f.ID_EMPRESA = ?
                ORDER BY f.DT_INI DESC, cf.NOME_FILA ASC
            `, [idEmpresa]);
            if (filas.length === 0) {
                return res.status(404).json({ message: 'Nenhuma fila encontrada para esta empresa.' });
            }
            res.json(filas);
        } catch (err) {
            console.error('Erro ao buscar filas da empresa:', err);
            res.status(500).json({ error: 'Erro interno ao buscar filas da empresa.' });
        }
    });

    // Rota para buscar clientes de uma fila específica
    router.get('/fila/:idEmpresa/:dtMovto/:idFila/clientes', async (req, res) => {
        const { idEmpresa, dtMovto, idFila } = req.params;

        const dtMovtoFormatted = dtMovto.split('T')[0];
        console.log(`Backend GET Clientes: idEmpresa=${idEmpresa}, dtMovto(raw)=${dtMovto}, dtMovto(formatted)=${dtMovtoFormatted}, idFila=${idFila}`);

        try {
            const [clientes] = await db.query(`
                SELECT
                    ID_EMPRESA, DT_MOVTO, ID_FILA, ID_CLIENTE, CPFCNPJ, RG, NOME, DT_NASC, EMAIL,
                    NR_QTDPES, DDDCEL, NR_CEL, CAMPOS, DT_ENTRA, DT_CHAMA, DT_LIMAPRE, DT_APRE, DT_SAIDA, SITUACAO
                FROM clientesfila
                WHERE ID_EMPRESA = ? AND DATE(DT_MOVTO) = ? AND ID_FILA = ?
                ORDER BY DT_ENTRA ASC
            `, [idEmpresa, dtMovtoFormatted, idFila]);

            if (clientes.length === 0) {
                return res.status(404).json({ message: 'Nenhum cliente encontrado para esta fila.' });
            }
            res.json(clientes);
        } catch (err) {
            console.error('Erro ao buscar clientes da fila:', err);
            res.status(500).json({ error: 'Erro interno ao buscar clientes da fila.' });
        }
    });

    // Rota para buscar apenas clientes com status "Não Compareceu"
    router.get('/fila/:idEmpresa/:dtMovto/:idFila/clientes-nao-compareceu', async (req, res) => {
        const { idEmpresa, dtMovto, idFila } = req.params;
        const dtMovtoFormatted = dtMovto.split('T')[0];

        try {
            const [clientes] = await db.query(`
                SELECT ID_CLIENTE, SITUACAO
                FROM clientesfila
                WHERE ID_EMPRESA = ? AND DATE(DT_MOVTO) = ? AND ID_FILA = ? AND SITUACAO = 2
            `, [idEmpresa, dtMovtoFormatted, idFila]);

            res.json(clientes);
        } catch (err) {
            console.error('Erro ao buscar clientes com status "Não Compareceu":', err);
            res.status(500).json({ error: 'Erro interno ao buscar clientes atualizados.' });
        }
    });

    // ROTA CRÍTICA: ATUALIZAR STATUS DO CLIENTE NA FILA
    router.put('/fila/:idEmpresa/:dtMovto/:idFila/cliente/:idCliente/atualizar-situacao', async (req, res) => {
        const { idEmpresa, dtMovto, idFila, idCliente } = req.params;
        const { novaSituacao } = req.body;
        const dtMovtoFormatted = dtMovto.split('T')[0]; 

        console.log('--- REQUISIÇÃO PUT ATUALIZAR SITUAÇÃO ---');
        console.log(`Parâmetros da URL: idEmpresa=${idEmpresa}, dtMovto=${dtMovto}(raw), idFila=${idFila}, idCliente=${idCliente}`);
        console.log(`Data de Movimento Formatada para DB: ${dtMovtoFormatted}`);
        console.log(`Body da Requisição: novaSituacao=${novaSituacao}`);

        if (typeof novaSituacao === 'undefined' || novaSituacao === null) {
            console.error('Erro: Nova situação não fornecida na requisição.');
            return res.status(400).json({ error: 'Nova situação não fornecida.' });
        }

        const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

        let updateField = '';
        switch (novaSituacao) {
            case 1: // Confirmado Presença
                updateField = 'DT_APRE = ?';
                break;
            case 2: // Não Compareceu
                updateField = 'DT_SAIDA = ?';
                break;
            case 3: // Chamado
            case 4: // Atendido
                updateField = '';
                break;
            default:
                console.error(`Erro: Situação inválida fornecida: ${novaSituacao}`);
                return res.status(400).json({ error: 'Situação inválida fornecida.' });
        }

        try {
            let query;
            let params;
            if (updateField === '') {
                query = `
                    UPDATE clientesfila
                    SET SITUACAO = ?
                    WHERE ID_EMPRESA = ? AND DATE(DT_MOVTO) = ? AND ID_FILA = ? AND ID_CLIENTE = ?
                `;
                params = [novaSituacao, idEmpresa, dtMovtoFormatted, idFila, idCliente];
            } else {
                query = `
                    UPDATE clientesfila
                    SET SITUACAO = ?, ${updateField}
                    WHERE ID_EMPRESA = ? AND DATE(DT_MOVTO) = ? AND ID_FILA = ? AND ID_CLIENTE = ?
                `;
                params = [novaSituacao, currentTimestamp, idEmpresa, dtMovtoFormatted, idFila, idCliente];
            }

            console.log('Query SQL a ser executada:', query);
            console.log('Parâmetros da Query:', params);

            const [result] = await db.query(query, params);
            console.log('Resultado do UPDATE no DB:', result);

            if (result.affectedRows === 0) {
                console.warn(`Alerta: Nenhum registro atualizado. Cliente ID: ${idCliente}, Empresa: ${idEmpresa}, Fila: ${idFila}, Data Movto: ${dtMovtoFormatted}. Verifique se o registro existe e se o WHERE está correto.`);
                return res.status(404).json({ message: 'Cliente da fila não encontrado ou dados já atualizados (nenhuma linha afetada).' });
            }

            // Emita a notificação via WebSocket
            io.emit('cliente_atualizado', {
                idEmpresa: idEmpresa,
                idFila: idFila,
                idCliente: idCliente,
                novaSituacao: novaSituacao
            });

            console.log(`Sucesso: Situação do cliente ${idCliente} atualizada para ${novaSituacao}. Linhas afetadas: ${result.affectedRows}`);
            res.json({ message: 'Situação do cliente atualizada com sucesso!' });

        } catch (err) {
            console.error('Erro detalhado ao atualizar situação do cliente na fila:', err);
            res.status(500).json({ error: 'Erro interno ao atualizar situação do cliente na fila.' });
        }
    });

    // ROTA PARA ENVIAR NOTIFICAÇÃO E AGENDAR TIMEOUT
    router.post('/fila/:idEmpresa/:dtMovto/:idFila/cliente/:idCliente/enviar-notificacao', async (req, res) => {
        const { idEmpresa, dtMovto, idFila, idCliente } = req.params;

        try {
            const [result] = await db.query(
                'UPDATE clientesfila SET DT_NOTIFICACAO = NOW(), SITUACAO = 3 WHERE ID_EMPRESA = ? AND ID_FILA = ? AND ID_CLIENTE = ? AND DATE(DT_MOVTO) = ?',
                [idEmpresa, idFila, idCliente, dtMovto.split('T')[0]]
            );
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Cliente não encontrado para o agendamento.' });
            }

            // Emita a notificação via WebSocket
            io.emit('cliente_atualizado', { 
                idEmpresa: idEmpresa,
                idFila: idFila,
                idCliente: idCliente,  
                novaSituacao: 3
            });

            res.status(200).json({ message: 'Notificação enviada e timeout agendado com sucesso!' });
            
        } catch (error) {
            console.error('Erro ao agendar o timeout no MySQL:', error);
            res.status(500).json({ error: 'Erro interno do servidor ao agendar o timeout.' });
        }
    });

    // Rota para adicionar cliente na fila
    router.post('/fila/:idEmpresa/:dtMovto/:idFila/adicionar-cliente', async (req, res) => {
        const { idEmpresa, dtMovto, idFila } = req.params;
        const { NOME, CPFCNPJ, DT_NASC, DDDCEL, NR_CEL, EMAIL, RG, NR_QTDPES } = req.body;

        if (!NOME || !CPFCNPJ) {
            return res.status(400).json({ error: 'Nome e CPF/CNPJ são obrigatórios.' });
        }

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [clienteExistente] = await connection.query(
                'SELECT ID_CLIENTE FROM clientesfila WHERE CPFCNPJ = ? ORDER BY DT_ENTRA DESC LIMIT 1',
                [CPFCNPJ]
            );

            let idCliente;

            if (clienteExistente.length > 0) {
                idCliente = clienteExistente[0].ID_CLIENTE;
            } else {
                const [[maxIdResult]] = await connection.query(
                    'SELECT MAX(ID_CLIENTE) as maxId FROM clientesfila'
                );
                idCliente = (maxIdResult.maxId || 0) + 1;
            }

            const [jaNaFila] = await connection.query(
                'SELECT 1 FROM clientesfila WHERE ID_EMPRESA = ? AND DT_MOVTO = ? AND ID_FILA = ? AND ID_CLIENTE = ?',
                [idEmpresa, dtMovto, idFila, idCliente]
            );

            if (jaNaFila.length > 0) {
                await connection.rollback();
                return res.status(409).json({ error: 'Este cliente já se encontra na fila.' });
            }

            await connection.query(
                `INSERT INTO clientesfila (
                    ID_EMPRESA, DT_MOVTO, ID_FILA, ID_CLIENTE, 
                    CPFCNPJ, RG, NOME, DT_NASC, EMAIL, NR_QTDPES, DDDCEL, NR_CEL, 
                    DT_ENTRA, SITUACAO
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
                [
                    idEmpresa, dtMovto, idFila, idCliente,
                    CPFCNPJ, RG, NOME, DT_NASC, EMAIL, NR_QTDPES || 0, DDDCEL, NR_CEL
                ]
            );

            await connection.commit();
            
            // Emita a notificação via WebSocket
            io.emit('cliente_atualizado', {
                idEmpresa: idEmpresa,
                idFila: idFila,
                idCliente: idCliente,
                novaSituacao: 0
            });
            
            res.status(201).json({ message: 'Cliente adicionado à fila com sucesso!' });

        } catch (error) {
            await connection.rollback();
            console.error('Erro ao adicionar cliente na fila:', error);
            res.status(500).json({ error: 'Erro interno ao adicionar cliente.' });
        } finally {
            connection.release();
        }
    });
    
    // Retorne o roteador configurado
    return router;
};
