import React, { useState } from 'react';
import './configuracao.css';

const FormularioConfiguracaoFila = () => {
  const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
  const idEmpresa = empresaSelecionada?.ID_EMPRESA || null;

  const [formData, setFormData] = useState({
    id_empresa: idEmpresa,
    nome_fila: '',
    ini_vig: '',
    fim_vig: '',
    campos: { cpf: true, nome: true, telefone: false },
    mensagem: '',
    img_banner: { url: '' },
    temp_tol: 10,
    qtde_min: 1,
    qtde_max: 5,
    per_sair: false,
    per_loc: false,
    situacao: 1,
  });

  const [mostrarModalSucesso, setMostrarModalSucesso] = useState(false);
  const [mensagemSucessoModal, setMensagemSucessoModal] = useState('');
  const [mostrarModalErro, setMostrarModalErro] = useState(false);
  const [mensagemErroModal, setMensagemErroModal] = useState('');

  // novos estados para link/QR/token
  const [linkConvite, setLinkConvite] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [tokenFila, setTokenFila] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else if (['temp_tol', 'qtde_min', 'qtde_max', 'situacao', 'ini_vig', 'fim_vig'].includes(name)) {
      setFormData({ ...formData, [name]: Number(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleCamposChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      campos: {
        ...prev.campos,
        [name]: checked
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.id_empresa) {
      setMensagemErroModal('Empresa não identificada. Faça login novamente.');
      setMostrarModalErro(true);
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/configuracao/configuracao-fila', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        // guarda os retornos do backend
        setTokenFila(data.token_fila || '');
        setLinkConvite(data.join_url || '');
        setQrDataUrl(data.qr_data_url || '');

        setMensagemSucessoModal(
          'Configuração de fila cadastrada com sucesso!' +
          (data.token_fila ? ` Token: ${data.token_fila}` : '')
        );
        setMostrarModalSucesso(true);

        // limpa o form (mantendo o id_empresa)
        setFormData({
          id_empresa: idEmpresa,
          nome_fila: '',
          ini_vig: '',
          fim_vig: '',
          campos: { cpf: true, nome: true, telefone: false },
          mensagem: '',
          img_banner: { url: '' },
          temp_tol: 10,
          qtde_min: 1,
          qtde_max: 5,
          per_sair: false,
          per_loc: false,
          situacao: 1,
        });
      } else {
        setMensagemErroModal('Erro ao cadastrar configuração: ' + (data.erro || 'Erro desconhecido'));
        setMostrarModalErro(true);
      }
    } catch (err) {
      console.error('Erro ao enviar dados:', err);
      setMensagemErroModal('Ocorreu um erro ao enviar os dados.');
      setMostrarModalErro(true);
    }
  };

  const fecharModalSucesso = () => setMostrarModalSucesso(false);
  const fecharModalErro = () => setMostrarModalErro(false);

  return (
    <div className="form-container-config">
      <h2>Configuração de Fila</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nome_fila">Nome da Fila:</label>
          <input
            type="text"
            name="nome_fila"
            id="nome_fila"
            value={formData.nome_fila}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="ini_vig">Início Vigência (ex: 20250101):</label>
          <input
            type="number"
            name="ini_vig"
            id="ini_vig"
            value={formData.ini_vig}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="fim_vig">Fim Vigência (ex: 20251231):</label>
          <input
            type="number"
            name="fim_vig"
            id="fim_vig"
            value={formData.fim_vig}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="mensagem">Mensagem:</label>
          <input
            type="text"
            name="mensagem"
            id="mensagem"
            value={formData.mensagem}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="img_banner_url">URL do Banner:</label>
          <input
            type="text"
            name="img_banner_url"
            id="img_banner_url"
            value={formData.img_banner.url}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, img_banner: { url: e.target.value } }))
            }
          />
        </div>

        <fieldset className="form-group">
          <legend>Campos do Formulário:</legend>
          <label>
            <input
              type="checkbox"
              name="cpf"
              checked={formData.campos.cpf}
              onChange={handleCamposChange}
            />{' '}
            CPF
          </label>
          <label>
            <input
              type="checkbox"
              name="nome"
              checked={formData.campos.nome}
              onChange={handleCamposChange}
            />{' '}
            Nome
          </label>
          <label>
            <input
              type="checkbox"
              name="telefone"
              checked={formData.campos.telefone}
              onChange={handleCamposChange}
            />{' '}
            Telefone
          </label>
        </fieldset>

        <div className="form-group">
          <label htmlFor="temp_tol">Tempo de Tolerância (min):</label>
          <input
            type="number"
            name="temp_tol"
            id="temp_tol"
            value={formData.temp_tol}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="qtde_min">Quantidade Mínima:</label>
          <input
            type="number"
            name="qtde_min"
            id="qtde_min"
            value={formData.qtde_min}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="qtde_max">Quantidade Máxima:</label>
          <input
            type="number"
            name="qtde_max"
            id="qtde_max"
            value={formData.qtde_max}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>
            Permite Sair da Fila:
            <input
              type="checkbox"
              name="per_sair"
              checked={formData.per_sair}
              onChange={handleChange}
            />
          </label>
        </div>

        <div className="form-group">
          <label>
            Permite Localização:
            <input
              type="checkbox"
              name="per_loc"
              checked={formData.per_loc}
              onChange={handleChange}
            />
          </label>
        </div>

        <div className="form-group">
          <label htmlFor="situacao">Situação:</label>
          <select
            name="situacao"
            id="situacao"
            value={formData.situacao}
            onChange={handleChange}
          >
            <option value={1}>Ativa</option>
            <option value={0}>Inativa</option>
          </select>
        </div>

        <button className="botao" type="submit">Cadastrar Fila</button>
      </form>

      {/* Modal Sucesso */}
      {mostrarModalSucesso && mensagemSucessoModal && (
        <div className="modal-overlay">
          <div className="modal sucesso">
            <p className="mensagem-sucesso">{mensagemSucessoModal}</p>

            {/* Bloco com link e QR code se o backend retornou */}
            {(linkConvite || qrDataUrl) && (
              <div className="convite-bloco" style={{ marginTop: 12 }}>
                {linkConvite && (
                  <>
                    <p><strong>Link para o cliente entrar na fila:</strong></p>
                    <a href={linkConvite} target="_blank" rel="noopener noreferrer">
                      {linkConvite}
                    </a>

                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        readOnly
                        value={linkConvite}
                        style={{ flex: 1 }}
                        onFocus={(e) => e.target.select()}
                      />
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(linkConvite)}
                      >
                        Copiar link
                      </button>
                      <a
                        href={linkConvite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-abrir-link"
                      >
                        Abrir
                      </a>
                    </div>
                  </>
                )}

                {qrDataUrl && (
                  <>
                    <p style={{ marginTop: 12 }}><strong>QR Code:</strong></p>
                    <img
                      src={qrDataUrl}
                      alt="QR Code da fila"
                      style={{ width: 200, height: 200 }}
                    />
                    {/* Se você criou o endpoint de download do QR, pode exibir um link: */}
                    {/* {tokenFila && (
                      <div style={{ marginTop: 8 }}>
                        <a
                          href={`http://localhost:3001/api/configuracao/qr/${tokenFila}`}
                          download={`qr-fila-${tokenFila}.png`}
                        >
                          Baixar QR em PNG
                        </a>
                      </div>
                    )} */}
                  </>
                )}
              </div>
            )}

            <button onClick={fecharModalSucesso} className="btn-fechar-modal">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal Erro */}
      {mostrarModalErro && mensagemErroModal && (
        <div className="modal-overlay">
          <div className="modal erro">
            <p className="mensagem-erro">{mensagemErroModal}</p>
            <button onClick={fecharModalErro} className="btn-fechar-modal">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormularioConfiguracaoFila;
