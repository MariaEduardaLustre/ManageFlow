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
    situacao: 1
  });

  const [isOpen, setIsOpen] = useState(true); // O modal começa aberto, pode ser controlado por um estado externo

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
        alert('Cadastro realizado com sucesso! Token: ' + data.token_fila);
        setIsOpen(false); // Fechar o modal após sucesso
      } else {
        alert('Erro: ' + (data.erro || 'Erro ao cadastrar'));
      }
    } catch (err) {
      console.error('Erro ao enviar:', err);
    }
  };

  if (!isOpen) return null; // Não renderiza o modal se isOpen for falso

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Cadastro de Configuração de Fila</h2>

        <form onSubmit={handleSubmit}>
          <label>
            Nome da Fila:
            <input type="text" name="nome_fila" value={formData.nome_fila} onChange={handleChange} required />
          </label>

          <br />
          <label>
            Início Vigência (ex: 20250101):
            <input type="number" name="ini_vig" value={formData.ini_vig} onChange={handleChange} />
          </label>

          <br />
          <label>
            Fim Vigência (ex: 20251231):
            <input type="number" name="fim_vig" value={formData.fim_vig} onChange={handleChange} />
          </label>

          <br />
          <label>
            Mensagem:
            <input type="text" name="mensagem" value={formData.mensagem} onChange={handleChange} />
          </label>

          <br />
          <label>
            URL do Banner:
            <input
              type="text"
              name="img_banner_url"
              value={formData.img_banner.url}
              onChange={(e) => setFormData({ ...formData, img_banner: { url: e.target.value } })}
            />
          </label>

          <br />
          <fieldset>
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

          <br />
          <label>
            Tempo de Tolerância (min):
            <input type="number" name="temp_tol" value={formData.temp_tol} onChange={handleChange} />
          </label>

          <br />
          <label>
            Quantidade Mínima:
            <input type="number" name="qtde_min" value={formData.qtde_min} onChange={handleChange} />
          </label>

          <br />
          <label>
            Quantidade Máxima:
            <input type="number" name="qtde_max" value={formData.qtde_max} onChange={handleChange} />
          </label>

          <br />
          <label>
            Permite Sair da Fila:
            <input type="checkbox" name="per_sair" checked={formData.per_sair} onChange={handleChange} />
          </label>

          <br />
          <label>
            Permite Localização:
            <input type="checkbox" name="per_loc" checked={formData.per_loc} onChange={handleChange} />
          </label>

          <br />
          <label>
            Situação:
            <select name="situacao" value={formData.situacao} onChange={handleChange}>
              <option value={1}>Ativa</option>
              <option value={0}>Inativa</option>
            </select>
          </label>

          <br />
          <button type="submit">Cadastrar Fila</button>
        </form>

        <button className="close-modal" onClick={() => setIsOpen(false)}>Fechar</button>
      </div>
    </div>
  );
};

export default FormularioConfiguracaoFila;
