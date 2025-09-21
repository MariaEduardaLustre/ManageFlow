// controllers/filaController.js
const db = require('../database/connection'); 

// Função para listar as filas configuradas com informações da tabela 'fila' e 'ConfiguracaoFila'
exports.listarFilasComConfiguracao = async (req, res) => {
    
    const { idEmpresa } = req.query; 

   
    if (!idEmpresa) {
        // Se o idEmpresa não for fornecido na URL, retorne um erro 400
        console.error('Erro: ID da Empresa não fornecido na requisição de listagem de filas.');
        return res.status(400).json({ erro: 'ID da Empresa é obrigatório para listar as filas.' });
    }

    const parsedIdEmpresa = parseInt(idEmpresa, 10);
    if (isNaN(parsedIdEmpresa)) {
        // Se o ID não for um número válido após a conversão, retorne um erro 400
        console.error('Erro: ID da Empresa inválido (não é um número).');
        return res.status(400).json({ erro: 'ID da Empresa deve ser um número válido.' });
    }

    // Consulta SQL para selecionar as filas, fazendo JOIN com configuracaofila
    // e aplicando o filtro por ID_EMPRESA
    const sql = `
        SELECT
            f.ID_FILA,
            f.DT_MOVTO,
            f.BLOCK,
            f.SITUACAO,
            f.ID_CONF_FILA,
            cf.NOME_FILA,
            -- Assumindo 0 para QTDE_PESSOAS_FILA por enquanto,
            -- pois não há uma coluna explícita na sua tabela 'fila' para isso.
            -- Se tiver uma forma de contar, ajuste esta linha.
            0 AS QTDE_PESSOAS_FILA
        FROM
            fila f
        INNER JOIN
            ConfiguracaoFila cf ON f.ID_CONF_FILA = cf.ID_CONF_FILA
        WHERE
            f.ID_EMPRESA = ? -- <--- CLÁUSULA WHERE QUE FILTRA AS FILAS POR ID_EMPRESA
        ORDER BY
            f.DT_MOVTO DESC;
    `;

    console.log('Executando query para listar filas para idEmpresa:', parsedIdEmpresa); // Log de depuração

    try {
        // Usando db.execute para mysql2/promise, que retorna um array com [rows, fields].
        // Passamos parsedIdEmpresa como o parâmetro para a query.
        const [rows] = await db.execute(sql, [parsedIdEmpresa]);
        console.log('Resultados brutos da query (filaController):', rows);

        // Formata os resultados para o frontend
        const formattedResults = rows.map(fila => ({
            ...fila,
            // Formata a data para 'DD/MM/YYYY' para exibição no frontend
            DT_MOVTO: fila.DT_MOVTO ? new Date(fila.DT_MOVTO).toLocaleDateString('pt-BR') : null,
            // Converte tinyint(1) (0 ou 1) para booleano (false ou true) para os toggles do frontend
            BLOCK: fila.BLOCK === 1,
            SITUACAO: fila.SITUACAO === 1
        }));

        console.log('Resultados formatados para o frontend (filaController):', formattedResults);
        res.status(200).json(formattedResults); // Envia os resultados filtrados
    } catch (err) {
        console.error('Erro ao listar filas com configuração (filaController):', err);
        // Em caso de erro no banco de dados ou query, retorne um erro 500
        res.status(500).json({ erro: 'Erro interno ao listar filas.', detalhes: err.message });
    }
};

// --- Funções de Toggle (Bloqueio e Situação) - SEM FILTRO DE ID_EMPRESA NESSAS ---
// Essas funções são para atualizar uma fila específica por ID_FILA, não listar.

// Função para alternar o status de bloqueio (BLOCK) de uma fila específica
exports.toggleFilaBlock = async (req, res) => {
    const { id_fila } = req.params; // ID da fila a ser atualizada, vindo da URL
    const { block } = req.body; // Novo estado de bloqueio (booleano true/false), vindo do corpo da requisição

    // Validação básica do input 'block'
    if (typeof block === 'undefined' || (block !== true && block !== false)) {
        return res.status(400).json({ erro: 'Status de bloqueio inválido. Esperado true ou false.' });
    }

    // Converte o booleano do frontend para tinyint(1) (0 ou 1) para o banco de dados
    const blockValue = block ? 1 : 0;

    const sql = `UPDATE fila SET BLOCK = ? WHERE ID_FILA = ?`;

    try {
        const [result] = await db.execute(sql, [blockValue, id_fila]); // Executa a query de atualização
        if (result.affectedRows === 0) {
            // Se nenhuma linha foi afetada, a fila com o ID especificado não foi encontrada
            return res.status(404).json({ mensagem: 'Fila não encontrada para atualizar o status de bloqueio.' });
        }
        res.status(200).json({ mensagem: 'Status de bloqueio da fila atualizado com sucesso.' });
    } catch (err) {
        console.error('Erro ao atualizar status de bloqueio da fila (filaController):', err);
        res.status(500).json({ erro: 'Erro interno ao atualizar status de bloqueio.', detalhes: err.message });
    }
};

// Função para alternar o status de ativação/inativação (SITUACAO) de uma fila específica
exports.toggleFilaSituacao = async (req, res) => {
    const { id_fila } = req.params; // ID da fila a ser atualizada
    const { situacao } = req.body; // Novo estado de situação (booleano true/false)

    // Validação básica do input 'situacao'
    if (typeof situacao === 'undefined' || (situacao !== true && situacao !== false)) {
        return res.status(400).json({ erro: 'Status de situação inválido. Esperado true ou false.' });
    }

    // Converte o booleano do frontend para tinyint(1) (0 ou 1)
    const situacaoValue = situacao ? 1 : 0;
    // Define DT_INATIV: se a fila for inativada (situacaoValue = 0), registra a data atual; caso contrário, é nulo
    const dtInativ = situacaoValue === 0 ? new Date() : null;

    const sql = `UPDATE fila SET SITUACAO = ?, DT_INATIV = ? WHERE ID_FILA = ?`;

    try {
        const [result] = await db.execute(sql, [situacaoValue, dtInativ, id_fila]); // Executa a query de atualização
        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Fila não encontrada para atualizar o status de situação.' });
        }
        res.status(200).json({ mensagem: 'Status da fila atualizado com sucesso.' });
    } catch (err) {
        console.error('Erro ao atualizar status da fila (filaController):', err);
        res.status(500).json({ erro: 'Erro interno ao atualizar status da fila.', detalhes: err.message });
    }
};
// Função para listar as filas configuradas por empresa
exports.listarFilasPorEmpresa = async (req, res) => {
    const { id_empresa } = req.params; // ID da empresa passada como parâmetro

    if (!id_empresa) {
        return res.status(400).json({ erro: 'ID da empresa é obrigatório.' });
    }

    const sql = `
        SELECT 
            f.NOME_FILA, 
            COUNT(cf.ID_FILA) AS contagem, 
            COALESCE(f.DT_ALTERACAO, f.INI_VIG, NOW()) AS data_configuracao
        FROM 
            clientesfila cf
        JOIN 
            ConfiguracaoFila f ON f.ID_FILA = cf.ID_FILA
        WHERE 
            cf.ID_EMPRESA = ?
        GROUP BY 
            f.NOME_FILA
        ORDER BY 
            data_configuracao DESC
    `;

    try {
        const [results] = await db.execute(sql, [id_empresa]);
        res.status(200).json(results); // Retorna as filas encontradas
    } catch (err) {
        console.error('Erro ao listar filas por empresa:', err);
        res.status(500).json({ erro: 'Erro interno ao listar filas.', detalhes: err.message });
    }
};
