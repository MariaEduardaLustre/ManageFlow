import React, { useState } from 'react';
import './configuracao.css'; // Certifique-se de ter esse arquivo de estilo

const FormularioConfiguracaoFila = () => {
  const [formData, setFormData] = useState({
    id_empresa: 1,
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
    setFormData({
      ...formData,
      campos: {
        ...formData.campos,
        [name]: checked
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:3001/api/configuracao-fila', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setMensagemSucessoModal('Configuração de fila cadastrada com sucesso! Token: ' + data.token_fila);
        setMostrarModalSucesso(true);
        setFormData({ // Limpa o formulário após o sucesso
          id_empresa: 1,
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

  const fecharModalSucesso = () => {
    setMostrarModalSucesso(false);
  };

  const fecharModalErro = () => {
    setMostrarModalErro(false);
  };

  return (
    <div className="form-container-config">
      <h2>Configuração de Fila</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nome_fila">Nome da Fila:</label>
          <input
            type="text"
            name="nome_fila"
            value={formData.nome_fila}
            onChange={handleChange}
            required
            id="nome_fila"
          />
        </div>

        <div className="form-group">
          <label htmlFor="ini_vig">Início Vigência (ex: 20250101):</label>
          <input
            type="number"
            name="ini_vig"
            value={formData.ini_vig}
            onChange={handleChange}
            id="ini_vig"
          />
        </div>

        <div className="form-group">
          <label htmlFor="fim_vig">Fim Vigência (ex: 20251231):</label>
          <input
            type="number"
            name="fim_vig"
            value={formData.fim_vig}
            onChange={handleChange}
            id="fim_vig"
          />
        </div>

        <div className="form-group">
          <label htmlFor="mensagem">Mensagem:</label>
          <input
            type="text"
            name="mensagem"
            value={formData.mensagem}
            onChange={handleChange}
            id="mensagem"
          />
        </div>

        <div className="form-group">
          <label htmlFor="img_banner_url">URL do Banner:</label>
          <input
            type="text"
            name="img_banner_url"
            value={formData.img_banner.url}
            onChange={(e) => setFormData({ ...formData, img_banner: { url: e.target.value } })}
            id="img_banner_url"
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
            />
            CPF
          </label>
          <label>
            <input
              type="checkbox"
              name="nome"
              checked={formData.campos.nome}
              onChange={handleCamposChange}
            />
            Nome
          </label>
          <label>
            <input
              type="checkbox"
              name="telefone"
              checked={formData.campos.telefone}
              onChange={handleCamposChange}
            />
            Telefone
          </label>
        </fieldset>

        <div className="form-group">
          <label htmlFor="temp_tol">Tempo de Tolerância (min):</label>
          <input
            type="number"
            name="temp_tol"
            value={formData.temp_tol}
            onChange={handleChange}
            id="temp_tol"
          />
        </div>

        <div className="form-group">
          <label htmlFor="qtde_min">Quantidade Mínima:</label>
          <input
            type="number"
            name="qtde_min"
            value={formData.qtde_min}
            onChange={handleChange}
            id="qtde_min"
          />
        </div>

        <div className="form-group">
          <label htmlFor="qtde_max">Quantidade Máxima:</label>
          <input
            type="number"
            name="qtde_max"
            value={formData.qtde_max}
            onChange={handleChange}
            id="qtde_max"
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
          <select name="situacao" value={formData.situacao} onChange={handleChange} id="situacao">
            <option value={1}>Ativa</option>
            <option value={0}>Inativa</option>
          </select>
        </div>

        <button className="botao" type="submit">Cadastrar Fila</button>
      </form>

      {/* Modal de Sucesso */}
      {mostrarModalSucesso && mensagemSucessoModal && (
        <div className="modal-overlay">
          <div className="modal sucesso">
            <p className="mensagem-sucesso">{mensagemSucessoModal}</p>
            <button onClick={fecharModalSucesso} className="btn-fechar-modal">Fechar</button>
          </div>
        </div>
      )}

      {/* Modal de Erro */}
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