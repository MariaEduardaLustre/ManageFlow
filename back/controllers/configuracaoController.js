// controllers/configuracaoController.js
const db = require('../database/connection'); // Certifique-se que esta é a sua conexão mysql2/promise
const { v4: uuidv4 } = require('uuid');

// Função para cadastrar uma nova configuração de fila
exports.cadastrarConfiguracaoFila = async (req, res) => { // Adicionado 'async'
    const {
        id_empresa,
        nome_fila,
        ini_vig,
        fim_vig,
        campos,
        mensagem,
        img_banner,
        temp_tol,
        qtde_min,
        qtde_max,
        per_sair,
        per_loc,
        situacao
    } = req.body;

    // Validação de campos obrigatórios
    if (!id_empresa || !nome_fila) {
        return res.status(400).json({ erro: 'Campos obrigatórios ausentes: ID da Empresa e Nome da Fila.' });
    }

    // --- TRATAMENTO DOS TIPOS DE DADOS PARA O MYSQL ---

    // 1. Tratamento das datas para INT (YYYYMMDD)
    // Converte 'YYYY-MM-DD' do frontend para INT 'YYYYMMDD' para o banco
    let iniVigInt = null;
    if (ini_vig) {
        const cleanedIniVig = String(ini_vig).replace(/-/g, '');
        iniVigInt = parseInt(cleanedIniVig, 10);
        if (isNaN(iniVigInt)) {
            return res.status(400).json({ erro: 'Formato inválido para INI_VIG. Esperado YYYY-MM-DD.' });
        }
    }

    let fimVigInt = null;
    if (fim_vig) {
        const cleanedFimVig = String(fim_vig).replace(/-/g, '');
        fimVigInt = parseInt(cleanedFimVig, 10);
        if (isNaN(fimVigInt)) {
            return res.status(400).json({ erro: 'Formato inválido para FIM_VIG. Esperado YYYY-MM-DD.' });
        }
    }

    // 2. Tratamento de booleanos (true/false) para 0 ou 1
    const perSairBoolean = per_sair ? 1 : 0;
    const perLocBoolean = per_loc ? 1 : 0;

    // 3. Tratamento de situação para INT (garante que é 0 ou 1)
    const situacaoInt = parseInt(situacao, 10);
    if (isNaN(situacaoInt) || (situacaoInt !== 0 && situacaoInt !== 1)) {
        return res.status(400).json({ erro: 'Formato inválido para SITUACAO. Esperado 0 ou 1.' });
    }

    // 4. Tratamento de campos opcionais numéricos: converte string vazia para null
    const parsedTempTol = temp_tol === '' || temp_tol === null ? null : parseInt(temp_tol, 10);
    const parsedQtdeMin = qtde_min === '' || qtde_min === null ? null : parseInt(qtde_min, 10);
    const parsedQtdeMax = qtde_max === '' || qtde_max === null ? null : parseInt(qtde_max, 10);

    // Geração do TOKEN_FILA para um novo cadastro
    const token_fila = uuidv4();

    // SQL para inserção na tabela ConfiguracaoFila
    const sql = `
        INSERT INTO ConfiguracaoFila (
            ID_EMPRESA, NOME_FILA, TOKEN_FILA, INI_VIG, FIM_VIG,
            CAMPOS, MENSAGEM, IMG_BANNER, TEMP_TOL, QDTE_MIN, QTDE_MAX,
            PER_SAIR, PER_LOC, SITUACAO
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        // Usando db.execute para mysql2/promise
        const [result] = await db.execute(sql, [
            id_empresa,
            nome_fila,
            token_fila,
            iniVigInt,
            fimVigInt,
            JSON.stringify(campos), // Converte o objeto/array 'campos' para JSON string
            mensagem,
            JSON.stringify(img_banner), // Converte o objeto 'img_banner' para JSON string
            parsedTempTol,
            parsedQtdeMin,
            parsedQtdeMax,
            perSairBoolean,
            perLocBoolean,
            situacaoInt
        ]);
        // Retorna sucesso e o token gerado
        res.status(201).json({ mensagem: 'Fila configurada com sucesso!', token_fila, id_conf_fila: result.insertId });
    } catch (err) {
        console.error('Erro ao inserir ConfiguracaoFila (configuracaoController):', err);
        return res.status(500).json({ erro: 'Erro interno ao salvar configuração. Detalhes: ' + err.message });
    }
};

// Função para buscar uma configuração de fila por ID (para edição)
exports.buscarConfiguracaoFilaPorId = async (req, res) => { // Adicionado 'async'
    const { id } = req.params; // ID_CONF_FILA da URL

    const sql = `SELECT * FROM ConfiguracaoFila WHERE ID_CONF_FILA = ?`;

    try {
        // Usando db.execute para mysql2/promise
        const [results] = await db.execute(sql, [id]);
        if (results.length === 0) {
            return res.status(404).json({ mensagem: 'Configuração de fila não encontrada.' });
        }

        const configFila = results[0];

        // --- TRATAMENTO DE DADOS PARA O FRONTEND ---

        // Parse de campos JSON (se existirem e forem strings válidas)
        if (configFila.CAMPOS) {
            try {
                configFila.CAMPOS = JSON.parse(configFila.CAMPOS);
            } catch (e) {
                console.error('Erro ao parsear CAMPOS (configuracaoController):', e);
                configFila.CAMPOS = {}; // Fallback para objeto vazio em caso de erro
            }
        } else {
            configFila.CAMPOS = {};
        }

        if (configFila.IMG_BANNER) {
            try {
                configFila.IMG_BANNER = JSON.parse(configFila.IMG_BANNER);
            } catch (e) {
                console.error('Erro ao parsear IMG_BANNER (configuracaoController):', e);
                configFila.IMG_BANNER = { url: '' };
            }
        } else {
            configFila.IMG_BANNER = { url: '' };
        }

        // Formata datas INT (YYYYMMDD) de volta para string 'YYYY-MM-DD' para input type="date" no frontend
        if (configFila.INI_VIG) {
            const iniVigStr = String(configFila.INI_VIG);
            configFila.INI_VIG = `${iniVigStr.substring(0, 4)}-${iniVigStr.substring(4, 6)}-${iniVigStr.substring(6, 8)}`;
        } else {
            configFila.INI_VIG = ''; // Define vazio se não houver data
        }

        if (configFila.FIM_VIG) {
            const fimVigStr = String(configFila.FIM_VIG);
            configFila.FIM_VIG = `${fimVigStr.substring(0, 4)}-${fimVigStr.substring(4, 6)}-${fimVigStr.substring(6, 8)}`;
        } else {
            configFila.FIM_VIG = ''; // Define vazio se não houver data
        }

        // Converte tinyint(1) para boolean para os checkboxes do frontend
        configFila.PER_SAIR = configFila.PER_SAIR === 1;
        configFila.PER_LOC = configFila.PER_LOC === 1;

        // Formata os nomes das chaves para camelCase se o frontend espera isso
        const formattedConfig = {
            id_conf_fila: configFila.ID_CONF_FILA,
            id_empresa: configFila.ID_EMPRESA,
            nome_fila: configFila.NOME_FILA,
            token_fila: configFila.TOKEN_FILA,
            ini_vig: configFila.INI_VIG,
            fim_vig: configFila.FIM_VIG,
            campos: configFila.CAMPOS,
            mensagem: configFila.MENSAGEM,
            img_banner: configFila.IMG_BANNER,
            temp_tol: configFila.TEMP_TOL,
            qtde_min: configFila.QDTE_MIN, // Nome da coluna no DB é QDTE_MIN
            qtde_max: configFila.QDTE_MAX, // Nome da coluna no DB é QDTE_MAX
            per_sair: configFila.PER_SAIR,
            per_loc: configFila.PER_LOC,
            situacao: configFila.SITUACAO,
        };

        res.status(200).json(formattedConfig);
    } catch (err) {
        console.error('Erro ao buscar configuração de fila por ID (configuracaoController):', err);
        return res.status(500).json({ erro: 'Erro interno ao buscar configuração de fila.', detalhes: err.message });
    }
};

// Função para atualizar uma configuração de fila existente
exports.atualizarConfiguracaoFila = async (req, res) => { // Adicionado 'async'
    const { id } = req.params; // ID_CONF_FILA a ser atualizado
    const {
        id_empresa,
        nome_fila,
        ini_vig,
        fim_vig,
        campos,
        mensagem,
        img_banner,
        temp_tol,
        qtde_min,
        qtde_max,
        per_sair,
        per_loc,
        situacao
    } = req.body;

    // Validação de campos obrigatórios
    if (!id_empresa || !nome_fila) {
        return res.status(400).json({ erro: 'Campos obrigatórios ausentes: ID da Empresa e Nome da Fila.' });
    }

    // --- TRATAMENTO DOS TIPOS DE DADOS PARA O MYSQL (MESMO DO CADASTRO) ---

    let iniVigInt = null;
    if (ini_vig) {
        const cleanedIniVig = String(ini_vig).replace(/-/g, '');
        iniVigInt = parseInt(cleanedIniVig, 10);
        if (isNaN(iniVigInt)) {
            return res.status(400).json({ erro: 'Formato inválido para INI_VIG. Esperado YYYY-MM-DD.' });
        }
    }

    let fimVigInt = null;
    if (fim_vig) {
        const cleanedFimVig = String(fim_vig).replace(/-/g, '');
        fimVigInt = parseInt(cleanedFimVig, 10);
        if (isNaN(fimVigInt)) {
            return res.status(400).json({ erro: 'Formato inválido para FIM_VIG. Esperado YYYY-MM-DD.' });
        }
    }

    const perSairBoolean = per_sair ? 1 : 0;
    const perLocBoolean = per_loc ? 1 : 0;

    const situacaoInt = parseInt(situacao, 10);
    if (isNaN(situacaoInt) || (situacaoInt !== 0 && situacaoInt !== 1)) {
        return res.status(400).json({ erro: 'Formato inválido para SITUACAO. Esperado 0 ou 1.' });
    }

    const parsedTempTol = temp_tol === '' || temp_tol === null ? null : parseInt(temp_tol, 10);
    const parsedQtdeMin = qtde_min === '' || qtde_min === null ? null : parseInt(qtde_min, 10);
    const parsedQtdeMax = qtde_max === '' || qtde_max === null ? null : parseInt(qtde_max, 10);

    // SQL para atualização na tabela ConfiguracaoFila (TOKEN_FILA não é atualizado)
    const sql = `
        UPDATE ConfiguracaoFila SET
            ID_EMPRESA = ?, NOME_FILA = ?, INI_VIG = ?, FIM_VIG = ?,
            CAMPOS = ?, MENSAGEM = ?, IMG_BANNER = ?, TEMP_TOL = ?, QDTE_MIN = ?, QTDE_MAX = ?,
            PER_SAIR = ?, PER_LOC = ?, SITUACAO = ?
        WHERE ID_CONF_FILA = ?
    `;

    try {
        // Usando db.execute para mysql2/promise
        const [result] = await db.execute(sql, [
            id_empresa,
            nome_fila,
            iniVigInt,
            fimVigInt,
            JSON.stringify(campos), // Converte para JSON string
            mensagem,
            JSON.stringify(img_banner), // Converte para JSON string
            parsedTempTol,
            parsedQtdeMin,
            parsedQtdeMax,
            perSairBoolean,
            perLocBoolean,
            situacaoInt,
            id // ID_CONF_FILA para a cláusula WHERE
        ]);

        if (result.affectedRows === 0) {
            // Se nenhuma linha foi afetada, significa que a configuração de fila com o ID especificado não foi encontrada
            return res.status(404).json({ mensagem: 'Configuração de fila não encontrada para atualização.' });
        }
        res.status(200).json({ mensagem: 'Configuração de fila atualizada com sucesso.' });
    } catch (err) {
        console.error('Erro ao atualizar ConfiguracaoFila (configuracaoController):', err);
        return res.status(500).json({ erro: 'Erro interno ao atualizar configuração. Detalhes: ' + err.message });
    }
};

// Função para contar quantas filas uma empresa tem configuradas
exports.contarFilasPorEmpresa = async (req, res) => {
    const { id_empresa } = req.params; // Ou extraia da sessão/token

    if (!id_empresa) {
        return res.status(400).json({ erro: 'ID da empresa é obrigatório.' });
    }

    const sql = `SELECT COUNT(*) AS totalFilas FROM ConfiguracaoFila WHERE ID_EMPRESA = ?`;

    try {
        const [results] = await db.execute(sql, [id_empresa]);
        const totalFilas = results[0].totalFilas || 0;

        res.status(200).json({ id_empresa, totalFilas });
    } catch (err) {
        console.error('Erro ao contar filas por empresa:', err);
        res.status(500).json({ erro: 'Erro interno ao contar filas.', detalhes: err.message });
    }
};

exports.listarFilasPorEmpresa = async (req, res) => {
  const { id_empresa } = req.params;

  if (!id_empresa) {
    return res.status(400).json({ erro: 'ID da empresa é obrigatório.' });
  }

  const sql = `
  SELECT 
    cf.ID_CONF_FILA,
    cf.NOME_FILA,
    COALESCE(COUNT(clf.ID_CLIENTE), 0) AS contagem,
    cf.DT_CRIACAO AS data_configuracao,
    cf.DT_ALTERACAO AS data_atualizacao
  FROM 
    configuracaofila cf
  LEFT JOIN 
    fila f ON f.ID_CONF_FILA = cf.ID_CONF_FILA
  LEFT JOIN 
    clientesfila clf ON clf.ID_FILA = f.ID_FILA AND clf.ID_EMPRESA = ?
  WHERE 
    cf.ID_EMPRESA = ?
  GROUP BY 
    cf.ID_CONF_FILA, cf.NOME_FILA, cf.DT_CRIACAO, cf.DT_ALTERACAO
  ORDER BY 
    data_configuracao DESC;
`;

  try {
    const [results] = await db.execute(sql, [id_empresa, id_empresa]);
    res.status(200).json(results);
  } catch (err) {
    console.error('Erro ao listar filas por empresa:', err);
    res.status(500).json({ erro: 'Erro interno ao listar filas.', detalhes: err.message });
  }
};

