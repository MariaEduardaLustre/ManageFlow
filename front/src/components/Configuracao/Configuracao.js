// FormularioConfiguracaoFila.js
import React, { useState } from 'react';
import './configuracao.css';

// No need to import images if they are in the public folder.
// We will reference them directly using their public paths.

const FormularioConfiguracaoFila = () => {
  const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
  const idEmpresa = empresaSelecionada?.ID_EMPRESA || null;

  const [formData, setFormData] = useState({
    id_empresa: idEmpresa,
    nome_fila: 'Teste', // Set initial value as per image
    ini_vig: '2019-06-05', // Set initial value as per image (YYYY-MM-DD for date input)
    fim_vig: '2019-06-05', // Set initial value as per image (YYYY-MM-DD for date input)
    campos: { cpf: true, rg: false, telefone: true, endereco: false, data_nascimento: false, email: false, qtde_pessoas: false }, // Telefone checked as per image
    mensagem: 'Olá bem vindo', // Set initial value as per image
    img_banner: { url: '' },   // Placeholder for banner image URL
    img_logo: { url: '' },     // New state for logo image URL
    temp_tol: 5, // Value as per image
    qtde_min: 1, // Value as per image
    qtde_max: 8, // Value as per image
    per_sair: true, // Checked as per image
    per_loc: true, // Checked as per image
    situacao: 1,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else if (["temp_tol", "qtde_min", "qtde_max", "situacao"].includes(name)) {
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

  // Handler for file uploads - remains the same, but now `url` might not be a direct path
  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prevData => ({
          ...prevData,
          [fieldName]: { url: reader.result, file: file } // Store both URL for preview and file object
        }));
      };
      reader.readAsDataURL(file); // Read as Data URL for immediate preview
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.id_empresa) {
      alert('Empresa não identificada. Faça login novamente.');
      return;
    }

    // When images are in the public folder, for newly uploaded files,
    // you'd still send them to the backend or convert them to base64
    // if your API expects that. For existing images, you'd just send the path.
    const dataToSend = { ...formData };
    // If you are sending base64 for new uploads, keep the logic below.
    // Otherwise, if your backend expects a file upload, you'd use FormData here.
    if (dataToSend.img_logo && dataToSend.img_logo.file) {
        dataToSend.img_logo = dataToSend.img_logo.url; // Sending base64 for new uploads
    } else {
        dataToSend.img_logo = ''; // Or the path if there was an existing one not changed
    }
    if (dataToSend.img_banner && dataToSend.img_banner.file) {
        dataToSend.img_banner = dataToSend.img_banner.url; // Sending base64 for new uploads
    } else {
        dataToSend.img_banner = ''; // Or the path if there was an existing one not changed
    }


    try {
      const response = await fetch('http://localhost:3001/api/configuracao/configuracao-fila', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Configuração de fila cadastrada com sucesso! Token: ' + data.token_fila);
      } else {
        alert('Erro ao cadastrar configuração: ' + (data.erro || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao enviar dados:', err);
      alert('Ocorreu um erro ao enviar os dados.');
    }
  };

  // Map icon names to their public paths
  const camposIcons = {
    cpf: '/imagens/cpf-icon.png', // Assuming your icons are named like this
    rg: '/imagens/rg-icon.png',
    telefone: '/imagens/telefone-icon.png',
    endereco: '/imagens/endereco-icon.png',
    data_nascimento: '/imagens/data-nascimento-icon.png',
    email: '/imagens/email-icon.png',
    qtde_pessoas: '/imagens/qtde-pessoas-icon.png',
  };
  const uploadIconPath = '/imagens/upload-icon.png'; // Path to your upload icon

  return (
    <div className="configuracao-fila">
      <div className="header">
        <button className="voltar-btn">← Voltar</button>
        <h2>Configuração de fila</h2>
         <p className="subtitle">Preencha os dados abaixo para configurar a sua fila de espera</p>
      </div>
     
      <form onSubmit={handleSubmit}>
        <div className="section-card">
          <div className="group-inputs">
            <div className="input-field">
              <label>Tempo de tolerância</label>
              {/* For static text, consider just a <span> or styled <p> instead of disabled input */}
              <input type="number" name="temp_tol" value={formData.temp_tol} onChange={handleChange} disabled />
              <span>minutos</span>
            </div>
            <div className="input-field">
              <label>Quantidade mínima</label>
              <input type="number" name="qtde_min" value={formData.qtde_min} onChange={handleChange} disabled />
            </div>
            <div className="input-field">
              <label>Quantidade Máxima</label>
              <input type="number" name="qtde_max" value={formData.qtde_max} onChange={handleChange} disabled />
            </div>
          </div>

          <div className="permissoes">
            <label className="permissoes-title">Permissões</label>

            <div className="toggle-switch-container">
              <label className="switch">
                <input
                  type="checkbox"
                  name="per_sair"
                  checked={formData.per_sair}
                  onChange={handleChange}
                />
                <span className="slider round"></span>
              </label>
              <div className="toggle-text">
                <p>Permite sair</p>
                <span>Ativando essa opção você irá permitir que os clientes saiam da fila enquanto aguardam ser chamados</span>
              </div>
            </div>

            <div className="toggle-switch-container">
              <label className="switch">
                <input
                  type="checkbox"
                  name="per_loc"
                  checked={formData.per_loc}
                  onChange={handleChange}
                />
                <span className="slider round"></span>
              </label>
              <div className="toggle-text">
                <p>Permite localização</p>
                <span>Ativando essa opção você irá bloquear a entrada de clientes que estiverem a mais de 8km de distância do estabelecimento</span>
              </div>
            </div>
          </div>
        </div> {/* End of section-card */}


        <div className="section-card">
          <label className="section-title">Informações da fila</label>

          <div className="input-field full-width">
            <label>Nome da fila</label>
            <input type="text" name="nome_fila" value={formData.nome_fila} onChange={handleChange} placeholder="Teste" />
          </div>

          <div className="group-inputs date-inputs">
            <div className="input-field">
              <label>Início da vigência</label>
              <input type="date" name="ini_vig" value={formData.ini_vig} onChange={handleChange} />
            </div>
            <div className="input-field">
              <label>Fim da vigência</label>
              <input type="date" name="fim_vig" value={formData.fim_vig} onChange={handleChange} />
            </div>
          </div>

          <div className="upload-box">
            <label>Logo</label>
            <div className="upload-area" onClick={() => document.getElementById('logo-upload').click()}>
              {formData.img_logo.url ? (
                <img src={formData.img_logo.url} alt="Logo Preview" className="uploaded-image-preview" />
              ) : (
                <>
                  <img src={uploadIconPath} alt="Upload Icon" className="upload-icon" />
                  <span>Clique aqui para selecionar arquivos</span>
                </>
              )}
            </div>
            <input
              type="file"
              id="logo-upload"
              style={{ display: 'none' }}
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'img_logo')}
            />
          </div>

          <div className="input-field full-width">
            <label>Mensagem Whatsapp/SMS</label>
            <textarea name="mensagem" value={formData.mensagem} onChange={handleChange} placeholder="Olá bem vindo" />
          </div>

          <div className="upload-box">
            <label>Imagem para banner</label>
            <div className="upload-area" onClick={() => document.getElementById('banner-upload').click()}>
              {formData.img_banner.url ? (
                <img src={formData.img_banner.url} alt="Banner Preview" className="uploaded-image-preview" />
              ) : (
                <>
                  <img src={uploadIconPath} alt="Upload Icon" className="upload-icon" />
                  <span>Clique aqui para selecionar arquivos</span>
                </>
              )}
            </div>
            <input
              type="file"
              id="banner-upload"
              style={{ display: 'none' }}
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'img_banner')}
            />
          </div>
        </div> {/* End of section-card */}


        <div className="section-card campos-cliente-section">
          <p className="section-title">Campos do cliente</p>
          <p className="subtitle">Escolha os campos que o cliente deverá preencher. *O campo de CPF é obrigatório</p>
          <div className="campos-grid">
            {Object.entries(formData.campos).map(([campo, ativo]) => (
              <label key={campo} className={`campo-box ${ativo ? 'ativo' : ''} ${campo === 'cpf' ? 'disabled' : ''}`}>
                <input
                  type="checkbox"
                  name={campo}
                  checked={ativo}
                  onChange={handleCamposChange}
                  disabled={campo === 'cpf'}
                  style={{ display: 'none' }} // Hide default checkbox
                />
                <div className="campo-content">
                  <img src={camposIcons[campo]} alt={`${campo} icon`} className="campo-icon" />
                  <span>{campo.replace(/_/g, ' ').toUpperCase()}</span> {/* Format field names */}
                </div>
              </label>
            ))}
          </div>
        </div> {/* End of section-card */}


        <div className="botoes">
          <button type="button" className="cancel-btn">Cancelar</button>
          <button type="submit" className="save-btn">Salvar</button>
        </div>
      </form>
    </div>
  );
};

export default FormularioConfiguracaoFila;