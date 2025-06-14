const express = require('express');
const router = express.Router();
const db = require('../database/connection'); // Certifique-se de que este caminho está correto

// Rota para criar empresa (mantida para contexto, sem alterações)
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

    const connection = await db.getConnection(); // cria uma conexão dedicada para transação

    try {
        await connection.beginTransaction();

        // 1. Cria a empresa
        const [empresaResult] = await connection.query(`
            INSERT INTO empresa (
                NOME_EMPRESA, CNPJ, EMAIL, DDI, DDD, TELEFONE, ENDERECO, NUMERO, LOGO
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [nomeEmpresa, cnpj, email, ddi, ddd, telefone, endereco, numero, logo]);

        const idEmpresa = empresaResult.insertId;

        // 2. Cria os 3 perfis padrão
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

        // 3. Busca o ID_PERFIL do Administrador recém-criado
        const [[perfilAdmin]] = await connection.query(`
            SELECT ID_PERFIL FROM perfil
            WHERE ID_EMPRESA = ? AND NIVEL = 1
        `, [idEmpresa]);

        // 4. Cria a permissão do usuário como administrador
        await connection.query(`
            INSERT INTO permissoes (ID_EMPRESA, ID_PERFIL, ID_USUARIO)
            VALUES (?, ?, ?)
        `, [idEmpresa, perfilAdmin.ID_PERFIL, idUsuario]);

        // 5. Confirma a transação
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

// Rota para buscar empresas que o usuário tem acesso (mantida)
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

// Rota para detalhes da empresa (mantida)
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

// Rota para buscar perfis de uma empresa específica (mantida)
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

// Rota para buscar filas da empresa (mantida)
router.get('/filas/:idEmpresa', async (req, res) => {
    const { idEmpresa } = req.params;
    try {
        const [filas] = await db.query(`
            SELECT
                f.ID_FILA, f.ID_EMPRESA, f.DT_MOVTO, f.DT_INI, f.DT_FIM, f.DT_INATIV, f.BLOCK, f.SITUACAO,
                cf.NOME_FILA, cf.TOKEN_FILA, cf.MENSAGEM, cf.TEMP_TOL, cf.QDTE_MIN, cf.QTDE_MAX
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

// Rota para buscar clientes de uma fila específica (mantida)
router.get('/fila/:idEmpresa/:dtMovto/:idFila/clientes', async (req, res) => {
    const { idEmpresa, dtMovto, idFila } = req.params;

    // --- IMPORTANTE: Formatar dtMovto para corresponder ao formato DATE do MySQL se necessário ---
    // Se dtMovto no seu DB é DATE, e o param da URL é algo como 'YYYY-MM-DDTHH:MM:SS.sssZ',
    // ou se o seu campo DT_MOVTO no DB tem horário e você quer comparar só a data.
    const dtMovtoFormatted = dtMovto.split('T')[0]; // Ex: '2024-06-14T00:00:00.000Z' -> '2024-06-14'
    console.log(`Backend GET Clientes: idEmpresa=${idEmpresa}, dtMovto(raw)=${dtMovto}, dtMovto(formatted)=${dtMovtoFormatted}, idFila=${idFila}`);

    try {
        const [clientes] = await db.query(`
            SELECT
                ID_EMPRESA, DT_MOVTO, ID_FILA, ID_CLIENTE, CPFCNPJ, RG, NOME, DT_NASC, EMAIL,
                NR_QTDPES, DDDCEL, NR_CEL, CAMPOS, DT_ENTRA, DT_CHAMA, DT_LIMAPRE, DT_APRE, DT_SAIDA, SITUACAO
            FROM clientesfila
            WHERE ID_EMPRESA = ? AND DATE(DT_MOVTO) = ? AND ID_FILA = ?
            ORDER BY DT_ENTRA ASC
        `, [idEmpresa, dtMovtoFormatted, idFila]); // Usando dtMovtoFormatted aqui!

        if (clientes.length === 0) {
            return res.status(404).json({ message: 'Nenhum cliente encontrado para esta fila.' });
        }
        res.json(clientes);
    } catch (err) {
        console.error('Erro ao buscar clientes da fila:', err);
        res.status(500).json({ error: 'Erro interno ao buscar clientes da fila.' });
    }
});

// >>> ROTA CRÍTICA: ATUALIZAR STATUS DO CLIENTE NA FILA <<<
router.put('/fila/:idEmpresa/:dtMovto/:idFila/cliente/:idCliente/atualizar-situacao', async (req, res) => {
    const { idEmpresa, dtMovto, idFila, idCliente } = req.params;
    const { novaSituacao } = req.body;

    // --- IMPORTANTE: Formatar dtMovto para corresponder ao formato DATE do MySQL se necessário ---
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
        // Se você tiver outras situações que não precisam de DT_APRE ou DT_SAIDA, adicione-as aqui.
        // Por exemplo, para SITUACAO = 0 (Aguardando), 3 (Chamado), 4 (Atendido)
        case 0: // Aguardando
        case 3: // Chamado
        case 4: // Atendido
            updateField = 'DT_APRE = NULL, DT_SAIDA = NULL'; // Limpa campos de data se voltando para um status "neutro"
            // Neste caso, você precisaria passar um valor nulo ou vazio para '?' se updateField ainda usar '?'
            // Uma abordagem mais robusta seria ter duas queries diferentes ou montar o SET de forma mais dinâmica.
            // Para simplicidade e considerando que a requisição só vem com 1 ou 2, mantemos assim.
            return res.status(400).json({ error: 'Situação inválida para atualização direta (use 1 ou 2).' });
            // ^^^ OBS: Se você quiser "voltar" um status de 1 ou 2 para 0, 3 ou 4, você precisará
            // enviar uma novaSituacao diferente de 1 ou 2, e ajustar a lógica aqui para
            // resetar DT_APRE ou DT_SAIDA para NULL e atualizar apenas SITUACAO.
            // Por enquanto, esta rota só aceita 1 ou 2 para simplificar.
        default:
            console.error(`Erro: Situação inválida fornecida: ${novaSituacao}`);
            return res.status(400).json({ error: 'Situação inválida fornecida.' });
    }

    try {
        const query = `
            UPDATE clientesfila
            SET SITUACAO = ?, ${updateField}
            WHERE ID_EMPRESA = ? AND DATE(DT_MOVTO) = ? AND ID_FILA = ? AND ID_CLIENTE = ?
        `;
        // ATENÇÃO: Verifique a ordem dos parâmetros aqui novamente!
        // SITUACAO = ?, DT_APRE/DT_SAIDA = ? , ID_EMPRESA = ?, DT_MOVTO = ?, ID_FILA = ?, ID_CLIENTE = ?
        const params = [novaSituacao, currentTimestamp, idEmpresa, dtMovtoFormatted, idFila, idCliente];

        console.log('Query SQL a ser executada:', query);
        console.log('Parâmetros da Query:', params);

        const [result] = await db.query(query, params);

        console.log('Resultado do UPDATE no DB:', result);

        if (result.affectedRows === 0) {
            console.warn(`Alerta: Nenhum registro atualizado. Cliente ID: ${idCliente}, Empresa: ${idEmpresa}, Fila: ${idFila}, Data Movto: ${dtMovtoFormatted}. Verifique se o registro existe e se o WHERE está correto.`);
            return res.status(404).json({ message: 'Cliente da fila não encontrado ou dados já atualizados (nenhuma linha afetada).' });
        }

        console.log(`Sucesso: Situação do cliente ${idCliente} atualizada para ${novaSituacao}. Linhas afetadas: ${result.affectedRows}`);
        res.json({ message: 'Situação do cliente atualizada com sucesso!' });

    } catch (err) {
        console.error('Erro detalhado ao atualizar situação do cliente na fila:', err);
        // Em um ambiente de produção, evite expor detalhes completos do erro ao cliente.
        res.status(500).json({ error: 'Erro interno ao atualizar situação do cliente na fila.' });
    }
});

// Rota para adicionar cliente na fila (mantida)
router.post('/fila/:idEmpresa/:dtMovto/:idFila/adicionar-cliente', async (req, res) => {
    const { idEmpresa, dtMovto, idFila } = req.params;
    const { NOME, CPFCNPJ, DT_NASC, DDDCEL, NR_CEL, EMAIL, RG, NR_QTDPES } = req.body;

    if (!NOME || !CPFCNPJ) {
        return res.status(400).json({ error: 'Nome e CPF/CNPJ são obrigatórios.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Passo 1: Procurar se o CPFCNPJ já existe em algum registro da tabela clientesfila.
        const [clienteExistente] = await connection.query(
            'SELECT ID_CLIENTE FROM clientesfila WHERE CPFCNPJ = ? ORDER BY DT_ENTRA DESC LIMIT 1',
            [CPFCNPJ]
        );

        let idCliente;

        if (clienteExistente.length > 0) {
            // Se já existe, reutiliza o mesmo ID_CLIENTE.
            idCliente = clienteExistente[0].ID_CLIENTE;
        } else {
            // Se não existe, precisamos criar um novo ID.
            // Para isso, pegamos o maior ID existente e somamos 1.
            const [[maxIdResult]] = await connection.query(
                'SELECT MAX(ID_CLIENTE) as maxId FROM clientesfila'
            );
            // Se a tabela estiver vazia, maxIdResult.maxId será null, então começamos com 1.
            idCliente = (maxIdResult.maxId || 0) + 1;
        }

        // Passo 2: Verificar se este cliente (com o ID encontrado ou criado) já está na fila específica.
        const [jaNaFila] = await connection.query(
            'SELECT 1 FROM clientesfila WHERE ID_EMPRESA = ? AND DT_MOVTO = ? AND ID_FILA = ? AND ID_CLIENTE = ?',
            [idEmpresa, dtMovto, idFila, idCliente]
        );

        if (jaNaFila.length > 0) {
            await connection.rollback();
            return res.status(409).json({ error: 'Este cliente já se encontra na fila.' });
        }

        // Passo 3: Inserir o novo registro na tabela 'clientesfila'.
        await connection.query(
            `INSERT INTO clientesfila (
                ID_EMPRESA, DT_MOVTO, ID_FILA, ID_CLIENTE, 
                CPFCNPJ, RG, NOME, DT_NASC, EMAIL, NR_QTDPES, DDDCEL, NR_CEL, 
                DT_ENTRA, SITUACAO
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`, // SITUACAO = 0 para Aguardando
            [
                idEmpresa, dtMovto, idFila, idCliente,
                CPFCNPJ, RG, NOME, DT_NASC, EMAIL, NR_QTDPES || 0, DDDCEL, NR_CEL
            ]
        );

        await connection.commit();
        res.status(201).json({ message: 'Cliente adicionado à fila com sucesso!' });

    } catch (error) {
        await connection.rollback();
        console.error('Erro ao adicionar cliente na fila:', error);
        res.status(500).json({ error: 'Erro interno ao adicionar cliente.' });
    } finally {
        connection.release();
    }
});

module.exports = router;