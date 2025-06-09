// Este é o seu back-end, REVISADO para garantir que a SQL está correta e a ordem dos parâmetros também.
const db = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

exports.cadastrarConfiguracaoFila = (req, res) => {
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

  if (!id_empresa || !nome_fila) {
    return res.status(400).json({ erro: 'Campos obrigatórios ausentes: ID da Empresa e Nome da Fila.' });
  }

  // --- TRATAMENTO DOS TIPOS DE DADOS PARA O MYSQL ---

  // 1. Tratamento das datas para INT (YYYYMMDD)
  // Certifique-se que ini_vig e fim_vig são strings no formato YYYY-MM-DD ou YYYYMMDD vindo do front-end/Postman
  let iniVigInt = null;
  if (ini_vig) {
    // Tenta remover hífens se for YYYY-MM-DD, ou assume que já é YYYYMMDD
    const cleanedIniVig = String(ini_vig).replace(/-/g, '');
    iniVigInt = parseInt(cleanedIniVig, 10);
    // Validação básica se a conversão resultou em NaN
    if (isNaN(iniVigInt)) {
      return res.status(400).json({ erro: 'Formato inválido para INI_VIG. Esperado YYYYMMDD.' });
    }
  }

  let fimVigInt = null;
  if (fim_vig) {
    const cleanedFimVig = String(fim_vig).replace(/-/g, '');
    fimVigInt = parseInt(cleanedFimVig, 10);
    if (isNaN(fimVigInt)) {
      return res.status(400).json({ erro: 'Formato inválido para FIM_VIG. Esperado YYYYMMDD.' });
    }
  }

  // 2. Tratamento de booleanos para 0 ou 1
  const perSairBoolean = per_sair ? 1 : 0; // Converte true/false para 1/0
  const perLocBoolean = per_loc ? 1 : 0;   // Converte true/false para 1/0

  // 3. Tratamento de situação para INT (garante que é número)
  const situacaoInt = parseInt(situacao, 10);
  if (isNaN(situacaoInt) || (situacaoInt !== 0 && situacaoInt !== 1)) {
      return res.status(400).json({ erro: 'Formato inválido para SITUACAO. Esperado 0 ou 1.' });
  }

  // 4. Tratamento de campos opcionais numéricos para null se vazios
  const parsedTempTol = temp_tol === '' || temp_tol === null ? null : parseInt(temp_tol, 10);
  const parsedQtdeMin = qtde_min === '' || qtde_min === null ? null : parseInt(qtde_min, 10);
  const parsedQtdeMax = qtde_max === '' || qtde_max === null ? null : parseInt(qtde_max, 10);
  
  // Geração do token
  const token_fila = uuidv4();

  // --- SQL QUERY CORRIGIDA E COMPLETA ---
  // A lista de colunas deve corresponder EXATAMENTE à lista de valores.
  // A ordem é crucial.
  const sql = `
    INSERT INTO ConfiguracaoFila (
      ID_EMPRESA, NOME_FILA, TOKEN_FILA, INI_VIG, FIM_VIG,
      CAMPOS, MENSAGEM, IMG_BANNER, TEMP_TOL, QDTE_MIN, QTDE_MAX,
      PER_SAIR, PER_LOC, SITUACAO
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    id_empresa,
    nome_fila,
    token_fila,
    iniVigInt,          // Usar o valor inteiro formatado
    fimVigInt,          // Usar o valor inteiro formatado
    JSON.stringify(campos), // CAMPOS como JSON string
    mensagem,
    JSON.stringify(img_banner), // IMG_BANNER como JSON string
    parsedTempTol,
    parsedQtdeMin,
    parsedQtdeMax,
    perSairBoolean,     // Usar 0 ou 1
    perLocBoolean,      // Usar 0 ou 1
    situacaoInt         // Usar 0 ou 1
  ], (err, result) => {
    if (err) {
      console.error('Erro ao inserir ConfiguracaoFila:', err);
      // Retorne uma mensagem de erro mais detalhada
      return res.status(500).json({ erro: 'Erro interno ao salvar configuração. Detalhes: ' + err.message });
    }

    res.status(201).json({ mensagem: 'Fila configurada com sucesso!', token_fila });
  });
};
