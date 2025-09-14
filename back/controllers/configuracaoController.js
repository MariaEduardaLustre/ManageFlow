// controllers/configuracaoController.js
const db = require('../database/connection');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { getPublicFrontBaseUrl } = require('../utils/url');

exports.cadastrarConfiguracaoFila = async (req, res) => {
  const {
    id_empresa, nome_fila, ini_vig, fim_vig, campos, mensagem,
    img_banner, temp_tol, qtde_min, qtde_max, per_sair, per_loc, situacao
  } = req.body;

  if (!id_empresa || !nome_fila) {
    return res.status(400).json({ erro: 'Campos obrigatórios ausentes.' });
  }

  const token_fila = uuidv4();

  const sql = `
    INSERT INTO ConfiguracaoFila (
      ID_EMPRESA, NOME_FILA, TOKEN_FILA, INI_VIG, FIM_VIG,
      CAMPOS, MENSAGEM, IMG_BANNER, TEMP_TOL, QDTE_MIN, QTDE_MAX,
      PER_SAIR, PER_LOC, SITUACAO
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    id_empresa,
    nome_fila,
    token_fila,
    ini_vig,
    fim_vig,
    JSON.stringify(campos || {}),
    mensagem || '',
    JSON.stringify(img_banner || { url: '' }),
    temp_tol ?? null,
    qtde_min ?? null,
    qtde_max ?? null,
    !!per_sair,
    !!per_loc,
    situacao ?? 1
  ], async (err) => {
    if (err) {
      console.error('Erro ao inserir ConfiguracaoFila:', err);
      return res.status(500).send('Erro interno ao salvar configuração.');
    }

    try {
      // Onde o cliente vai entrar (rota do FRONT!)
      // Ex.: http://192.168.0.10:3000/entrar-fila/<token>
      const baseUrl = getPublicFrontBaseUrl(req);
      const joinPath = `/entrar-fila/${token_fila}`;
      const join_url = `${baseUrl}${joinPath}`;

      // Gera o QR (data URL base64 pra você já exibir no <img />)
      const qr_data_url = await QRCode.toDataURL(join_url, {
        margin: 1,
        width: 256
      });

      return res.status(201).json({
        mensagem: 'Fila configurada com sucesso!',
        token_fila,
        join_url,
        qr_data_url
      });
    } catch (e) {
      console.error('Erro ao gerar QR:', e);
      // Mesmo que o QR falhe, devolvemos o link.
      const baseUrl = getPublicFrontBaseUrl(req);
      const join_url = `${baseUrl}/entrar-fila/${token_fila}`;
      return res.status(201).json({
        mensagem: 'Fila configurada com sucesso!',
        token_fila,
        join_url,
        qr_data_url: null
      });
    }
  });
};
