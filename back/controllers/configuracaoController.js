import React, { useState } from 'react';

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

  const [linkFila, setLinkFila] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else if (['temp_tol', 'qtde_min', 'qtde_max', 'situacao'].includes(name)) {
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
        const urlFila = `https://meusistema.com/fila/${data.token_fila}`;
        setLinkFila(urlFila);
      } else {
        alert('Erro: ' + (data.erro || 'Erro ao cadastrar'));
      }
    } catch (err) {
      console.error('Erro ao enviar:', err);
    }
  };

  const copiarLink = () => {
    navigator.clipboard.writeText(linkFila);
    alert('Link copiado para a área de transferência!');
  };

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', padding: '1rem', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ textAlign: 'center' }}>Configurar Fila de Espera</h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label>
          Nome da Fila:
          <input type="text" name="nome_fila" value={formData.nome_fila} onChange={handleChange} required />
        </label>

        <label>
          Início Vigência (ex: 20250101):
          <input type="number" name="ini_vig" value={formData.ini_vig} onChange={handleChange} />
        </label>

        <label>
          Fim Vigência (ex: 20251231):
          <input type="number" name="fim_vig" value={formData.fim_vig} onChange={handleChange} />
        </label>

        <label>
          Mensagem:
          <input type="text" name="mensagem" value={formData.mensagem} onChange={handleChange} />
        </label>

        <label>
          URL do Banner:
          <input
            type="text"
            name="img_banner_url"
            value={formData.img_banner.url}
            onChange={(e) => setFormData({ ...formData, img_banner: { url: e.target.value } })}
          />
        </label>

        <fieldset>
          <legend>Campos que o cliente precisa preencher:</legend>
          <label><input type="checkbox" name="cpf" checked={formData.campos.cpf} onChange={handleCamposChange} /> CPF</label>
          <label><input type="checkbox" name="nome" checked={formData.campos.nome} onChange={handleCamposChange} /> Nome</label>
          <label><input type="checkbox" name="telefone" checked={formData.campos.telefone} onChange={handleCamposChange} /> Telefone</label>
        </fieldset>

        <label>
          Tempo de Tolerância (min):
          <input type="number" name="temp_tol" value={formData.temp_tol} onChange={handleChange} />
        </label>

        <label>
          Quantidade Mínima:
          <input type="number" name="qtde_min" value={formData.qtde_min} onChange={handleChange} />
        </label>

        <label>
          Quantidade Máxima:
          <input type="number" name="qtde_max" value={formData.qtde_max} onChange={handleChange} />
        </label>

        <label>
          Permite Sair da Fila:
          <input type="checkbox" name="per_sair" checked={formData.per_sair} onChange={handleChange} />
        </label>

        <label>
          Permite Localização:
          <input type="checkbox" name="per_loc" checked={formData.per_loc} onChange={handleChange} />
        </label>

        <label>
          Situação:
          <select name="situacao" value={formData.situacao} onChange={handleChange}>
            <option value={1}>Ativa</option>
            <option value={0}>Inativa</option>
          </select>
        </label>

        <button type="submit" style={{ padding: '0.5rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}>
          Cadastrar Fila
        </button>
      </form>

      {linkFila && (
        <div style={{ marginTop: '20px', background: '#f0f0f0', padding: '1rem', borderRadius: '6px' }}>
          <p><strong>Link da Fila Gerado:</strong></p>
          <input type="text" value={linkFila} readOnly style={{ width: '100%', padding: '5px' }} />
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
            <button onClick={copiarLink}>Copiar Link</button>
            <a href={linkFila} target="_blank" rel="noopener noreferrer">
              <button>Abrir Fila</button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormularioConfiguracaoFila;
