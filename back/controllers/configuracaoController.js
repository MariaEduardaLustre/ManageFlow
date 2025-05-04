const db = require('../database/connection');
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

return res.status(400).json({ erro: 'Campos obrigatórios ausentes.' });

}

const token_fila = uuidv4(); // gera um token único

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

ini_vig,

fim_vig,

JSON.stringify(campos),

mensagem,

JSON.stringify(img_banner),

temp_tol,

qtde_min,

qtde_max,

per_sair,

per_loc,

situacao

], (err, result) => {

if (err) {

  console.error('Erro ao inserir ConfiguracaoFila:', err);

  return res.status(500).send('Erro interno ao salvar configuração.');

}



res.status(201).json({ mensagem: 'Fila configurada com sucesso!', token_fila });

});

};

