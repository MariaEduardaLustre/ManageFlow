import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';        // <<< use o axios com interceptor
import './configuracao.css';

const FormularioConfiguracaoFila = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
  const idEmpresa = empresaSelecionada?.ID_EMPRESA || null;

  const [formData, setFormData] = useState({
    id_empresa: idEmpresa,
    nome_fila: '',
    ini_vig: '',
    fim_vig: '',
    campos: {
      cpf: true, rg: false, telefone: true, endereco: false,
      data_nascimento: false, email: false, qtde_pessoas: false
    },
    mensagem: '',
    img_banner: { url: '' },
    img_logo: { url: '' }, // só front
    temp_tol: '',
    qtde_min: '',
    qtde_max: '',
    per_sair: false,
    per_loc: false,
    situacao: 1,
  });

  const [loading, setLoading] = useState(true);
  const [mostrarModalSucesso, setMostrarModalSucesso] = useState(false);
  const [mensagemSucessoModal, setMensagemSucessoModal] = useState('');
  const [mostrarModalErro, setMostrarModalErro] = useState(false);
  const [mensagemErroModal, setMensagemErroModal] = useState('');

  // link/QR do backend ao cadastrar
  const [linkConvite, setLinkConvite] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [tokenFila, setTokenFila] = useState('');

  useEffect(() => {
    const fetchConfiguracaoFila = async () => {
      if (!id) { setLoading(false); return; }
      try {
        const { data } = await api.get(`/configuracao/configuracao-fila/${id}`);
        const loadedData = {
          ...data,
          id_empresa: data.id_empresa || idEmpresa,
          nome_fila: data.nome_fila || '',
          ini_vig: data.ini_vig || '',
          fim_vig: data.fim_vig || '',
          campos: {
            cpf: false, rg: false, telefone: false, endereco: false,
            data_nascimento: false, email: false, qtde_pessoas: false,
            ...(data.campos && Array.isArray(data.campos)
              ? data.campos.reduce((acc, current) => {
                  const key = String(current.campo).toLowerCase().replace(/\s/g, '_');
                  acc[key] = true;
                  return acc;
                }, {})
              : (typeof data.campos === 'object' && data.campos ? data.campos : {}))
          },
          img_banner: data.img_banner || { url: '' },
          img_logo: { url: '' },
          temp_tol: data.temp_tol ?? '',
          qtde_min: data.qtde_min ?? '',
          qtde_max: data.qtde_max ?? '',
          per_sair: !!data.per_sair,
          per_loc: !!data.per_loc,
          situacao: Number.isFinite(Number(data.situacao)) ? Number(data.situacao) : 1,
        };
        setFormData(loadedData);
      } catch (err) {
        console.error('Erro ao carregar configuração:', err);
        setMensagemErroModal('Erro ao carregar os dados. Faça login novamente se necessário.');
        setMostrarModalErro(true);
      } finally {
        setLoading(false);
      }
    };
    fetchConfiguracaoFila();
  }, [id, idEmpresa]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else if (['temp_tol', 'qtde_min', 'qtde_max'].includes(name)) {
      setFormData({ ...formData, [name]: value === '' ? '' : Number(value) });
    } else if (name === 'situacao') {
      setFormData({ ...formData, [name]: Number(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleCamposChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, campos: { ...prev.campos, [name]: checked } }));
  };

  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, [fieldName]: { url: reader.result, file } }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.id_empresa) {
      setMensagemErroModal('Empresa não identificada. Faça login novamente.');
      setMostrarModalErro(true);
      return;
    }

    const dataToSend = { ...formData };

    // datas -> INT YYYYMMDD
    dataToSend.ini_vig = dataToSend.ini_vig ? parseInt(String(dataToSend.ini_vig).replace(/-/g, ''), 10) : null;
    dataToSend.fim_vig = dataToSend.fim_vig ? parseInt(String(dataToSend.fim_vig).replace(/-/g, ''), 10) : null;

    // campos -> array
    const camposArray = Object.entries(formData.campos)
      .filter(([, ativo]) => ativo)
      .map(([campoName]) => {
        let tipo = 'texto';
        const pretty = campoName.replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
        if (campoName === 'cpf' || campoName === 'qtde_pessoas') tipo = 'numero';
        else if (campoName === 'data_nascimento') tipo = 'data';
        else if (campoName === 'email') tipo = 'email';
        return { campo: pretty, tipo };
      });
    dataToSend.campos = camposArray;

    // imagens
    dataToSend.img_banner = dataToSend.img_banner?.url ? { url: dataToSend.img_banner.url } : { url: '' };
    delete dataToSend.img_logo;

    // booleanos -> tinyint
    dataToSend.per_sair = dataToSend.per_sair ? 1 : 0;
    dataToSend.per_loc  = dataToSend.per_loc ? 1 : 0;

    // numéricos opcionais
    dataToSend.temp_tol = dataToSend.temp_tol === '' ? null : Number(dataToSend.temp_tol);
    dataToSend.qtde_min = dataToSend.qtde_min === '' ? null : Number(dataToSend.qtde_min);
    dataToSend.qtde_max = dataToSend.qtde_max === '' ? null : Number(dataToSend.qtde_max);
    dataToSend.situacao = Number(dataToSend.situacao);

    try {
      let resp;
      if (id) {
        resp = await api.put(`/configuracao/configuracao-fila/${id}`, dataToSend);
      } else {
        resp = await api.post('/configuracao/configuracao-fila', dataToSend);
      }

      const data = resp.data || {};
      if (!id) {
        setTokenFila(data.token_fila || '');
        setLinkConvite(data.join_url || '');
        setQrDataUrl(data.qr_data_url || '');
      }

      setMensagemSucessoModal(`Configuração de fila ${id ? 'atualizada' : 'cadastrada'} com sucesso!${!id && data.token_fila ? ' Token: ' + data.token_fila : ''}`);
      setMostrarModalSucesso(true);

      if (id || (!data.join_url && !data.qr_data_url)) {
        setTimeout(() => {
          setMostrarModalSucesso(false);
          navigate('/filas-cadastradas');
        }, 2000);
      }

      if (!id) {
        setFormData({
          id_empresa: idEmpresa,
          nome_fila: '',
          ini_vig: '',
          fim_vig: '',
          campos: { cpf: true, rg: false, telefone: true, endereco: false, data_nascimento: false, email: false, qtde_pessoas: false },
          mensagem: '',
          img_banner: { url: '' },
          img_logo: { url: '' },
          temp_tol: '',
          qtde_min: '',
          qtde_max: '',
          per_sair: false,
          per_loc: false,
          situacao: 1,
        });
      }
    } catch (err) {
      console.error('Erro ao salvar configuração:', err);
      const msg = err.response?.data || err.message || 'Falha ao salvar.';
      setMensagemErroModal(typeof msg === 'string' ? msg : JSON.stringify(msg));
      setMostrarModalErro(true);
    }
  };

  const fecharModalSucesso = () => {
    setMostrarModalSucesso(false);
    navigate('/filas-cadastradas');
  };
  const fecharModalErro = () => setMostrarModalErro(false);

  const camposIcons = {
    cpf: '/imagens/cpf.png',
    rg: '/imagens/rg.png',
    telefone: '/imagens/telefone.png',
    endereco: '/imagens/endereco.png',
    data_nascimento: '/imagens/data-nascimento.png',
    email: '/imagens/o-email.png',
    qtde_pessoas: '/imagens/pessoas-icon.png',
  };
  const uploadIconPath = '/imagens/upload-icon.png';

  if (loading) return <p>Carregando formulário...</p>;

  return (
    <div className="configuracao-fila">
      <div className="header">
        <button className="voltar-btn" onClick={() => navigate('/filas-cadastradas')}>← Voltar</button>
        <h2>{id ? 'Editar Configuração de Fila' : 'Configuração de Fila'}</h2>
        <p className="subtitle">Preencha os dados abaixo para {id ? 'editar a' : 'configurar a sua'} fila de espera</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="section-card">
          <div className="group-inputs">
            <div className="input-field">
              <label>Tempo de tolerância</label>
              <input type="number" name="temp_tol" value={formData.temp_tol} onChange={handleChange} placeholder="Ex: 5" />
              <span>minutos</span>
            </div>
            <div className="input-field">
              <label>Quantidade mínima</label>
              <input type="number" name="qtde_min" value={formData.qtde_min} onChange={handleChange} placeholder="Ex: 1" />
            </div>
            <div className="input-field">
              <label>Quantidade Máxima</label>
              <input type="number" name="qtde_max" value={formData.qtde_max} onChange={handleChange} placeholder="Ex: 8" />
            </div>
          </div>

          <div className="permissoes">
            <label className="permissoes-title">Permissões</label>

            <div className="toggle-switch-container">
              <label className="switch">
                <input type="checkbox" name="per_sair" checked={formData.per_sair} onChange={handleChange} />
                <span className="slider round"></span>
              </label>
              <div className="toggle-text">
                <p>Permite sair</p>
                <span>Permite que clientes saiam da fila enquanto aguardam.</span>
              </div>
            </div>

            <div className="toggle-switch-container">
              <label className="switch">
                <input type="checkbox" name="per_loc" checked={formData.per_loc} onChange={handleChange} />
                <span className="slider round"></span>
              </label>
              <div className="toggle-text">
                <p>Permite localização</p>
                <span>Bloqueia entrada de clientes a mais de 8km do estabelecimento.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="section-card">
          <label className="section-title">Informações da fila</label>

          <div className="input-field full-width">
            <label>Nome da fila</label>
            <input type="text" name="nome_fila" value={formData.nome_fila} onChange={handleChange} placeholder="Nome da fila" required />
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

          {/* Logo (somente front) */}
          <div className="upload-box">
            <label>Logo</label>
            <div className="upload-area" onClick={() => document.getElementById('logo-upload').click()}>
              {formData.img_logo.url ? (
                <img src={formData.img_logo.url} alt="Logo Preview" className="uploaded-image-preview" />
              ) : (
                <>
                  <img src="/imagens/upload-icon.png" alt="Upload Icon" className="upload-icon" />
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
            <textarea name="mensagem" value={formData.mensagem} onChange={handleChange} placeholder="Digite sua mensagem..." />
          </div>

          {/* Banner (vai ao backend como {url}) */}
          <div className="upload-box">
            <label>Imagem para banner</label>
            <div className="upload-area" onClick={() => document.getElementById('banner-upload').click()}>
              {formData.img_banner.url ? (
                <img src={formData.img_banner.url} alt="Banner Preview" className="uploaded-image-preview" />
              ) : (
                <>
                  <img src="/imagens/upload-icon.png" alt="Upload Icon" className="upload-icon" />
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
        </div>

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
                  style={{ display: 'none' }}
                />
                <div className="campo-content">
                  <img src={`/imagens/${campo}.png`} alt={`${campo} icon`} className="campo-icon" />
                  <span>{campo.replace(/_/g, ' ')}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="botoes">
          <button type="button" className="cancel-btn" onClick={() => navigate('/filas-cadastradas')}>Cancelar</button>
          <button type="submit" className="save-btn">Salvar</button>
        </div>
      </form>

      {/* Modal Sucesso */}
      {mostrarModalSucesso && mensagemSucessoModal && (
        <div className="modal-overlay">
          <div className="modal sucesso">
            <p className="mensagem-sucesso">{mensagemSucessoModal}</p>

            {(linkConvite || qrDataUrl) && (
              <div className="convite-bloco" style={{ marginTop: 12 }}>
                {linkConvite && (
                  <>
                    <p><strong>Link para o cliente entrar na fila:</strong></p>
                    <a href={linkConvite} target="_blank" rel="noopener noreferrer">{linkConvite}</a>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <input type="text" readOnly value={linkConvite} style={{ flex: 1 }} onFocus={(e) => e.target.select()} />
                      <button type="button" onClick={() => navigator.clipboard.writeText(linkConvite)}>Copiar link</button>
                      <a href={linkConvite} target="_blank" rel="noopener noreferrer" className="btn-abrir-link">Abrir</a>
                    </div>
                  </>
                )}
                {qrDataUrl && (
                  <>
                    <p style={{ marginTop: 12 }}><strong>QR Code:</strong></p>
                    <img src={qrDataUrl} alt="QR Code da fila" style={{ width: 200, height: 200 }} />
                  </>
                )}
              </div>
            )}

            <button onClick={fecharModalSucesso} className="btn-fechar-modal">Fechar</button>
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
