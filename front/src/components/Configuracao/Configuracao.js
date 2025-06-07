import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Importar useParams e useNavigate
import './configuracao.css'; // Mantenha seu CSS existente

const FormularioConfiguracaoFila = () => {
    const { id } = useParams(); // Pega o ID da URL para modo de edição (ID_CONF_FILA)
    const navigate = useNavigate(); // Para redirecionar após salvar/cancelar

    const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
    const idEmpresa = empresaSelecionada?.ID_EMPRESA || null;

    const [formData, setFormData] = useState({
        id_empresa: idEmpresa,
        nome_fila: '',
        ini_vig: '',
        fim_vig: '',
        campos: { cpf: true, rg: false, telefone: true, endereco: false, data_nascimento: false, email: false, qtde_pessoas: false },
        mensagem: '',
        img_banner: { url: '' },
        img_logo: { url: '' }, // Mantido para controle no front, será removido no payload
        temp_tol: '',
        qtde_min: '',
        qtde_max: '',
        per_sair: false,
        per_loc: false,
        situacao: 1,
    });

    const [loading, setLoading] = useState(true); // Novo estado para controlar o carregamento dos dados
    const [mostrarModalSucesso, setMostrarModalSucesso] = useState(false);
    const [mensagemSucessoModal, setMensagemSucessoModal] = useState('');
    const [mostrarModalErro, setMostrarModalErro] = useState(false);
    const [mensagemErroModal, setMensagemErroModal] = useState('');

    useEffect(() => {
        const fetchConfiguracaoFila = async () => {
            if (id) { // Se um ID for passado, estamos no modo de edição
                try {
                    const response = await fetch(`http://localhost:3001/api/configuracao-fila/${id}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();

                    // Ajusta os dados recebidos do backend para o formato do seu formData
                    const loadedData = {
                        ...data,
                        id_empresa: data.id_empresa || idEmpresa, // Usa o ID da empresa do banco ou do localStorage
                        nome_fila: data.nome_fila || '',
                        ini_vig: data.ini_vig || '', // Deve vir como 'YYYY-MM-DD' do backend
                        fim_vig: data.fim_vig || '', // Deve vir como 'YYYY-MM-DD' do backend
                        
                        // Reconstroi o objeto `campos` do array `[{campo: "CPF", tipo: "numero"}, ...]`
                        campos: {
                            cpf: false, rg: false, telefone: false, endereco: false,
                            data_nascimento: false, email: false, qtde_pessoas: false,
                            // Sobrescreve com os que vieram do banco se existirem
                            ...(data.campos && Array.isArray(data.campos) ? data.campos.reduce((acc, current) => {
                                const key = current.campo.toLowerCase().replace(/\s/g, '_');
                                acc[key] = true;
                                return acc;
                            }, {}) : {} )
                        },
                        img_banner: data.img_banner || { url: '' },
                        img_logo: { url: '' }, // img_logo não é persistido, então inicializa vazio
                        temp_tol: data.temp_tol === null ? '' : data.temp_tol, // Converte null para '' para input number
                        qtde_min: data.qtde_min === null ? '' : data.qtde_min,
                        qtde_max: data.qtde_max === null ? '' : data.qtde_max,
                        per_sair: data.per_sair, // Já deve vir como boolean do backend
                        per_loc: data.per_loc,   // Já deve vir como boolean do backend
                        situacao: data.situacao,
                    };
                    setFormData(loadedData);
                } catch (err) {
                    console.error('Erro ao carregar configuração de fila para edição:', err);
                    setMensagemErroModal('Erro ao carregar os dados da configuração de fila. Verifique a conexão ou se o ID é válido.');
                    setMostrarModalErro(true);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false); // Não há ID, é um novo cadastro
            }
        };

        fetchConfiguracaoFila();
    }, [id, idEmpresa]); // Dependência do ID para recarregar se o ID na URL mudar, e idEmpresa

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setFormData({ ...formData, [name]: checked });
        } else if (["temp_tol", "qtde_min", "qtde_max"].includes(name)) {
            // Garante que o valor é um número ou string vazia para null
            setFormData({ ...formData, [name]: value === '' ? '' : Number(value) });
        } else if (name === 'situacao') {
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
                [name]: checked,
            },
        });
    };

    const handleFileUpload = (e, fieldName) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prevData => ({
                    ...prevData,
                    [fieldName]: { url: reader.result, file: file }
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.id_empresa) {
            setMensagemErroModal('Empresa não identificada. Faça login novamente.');
            setMostrarModalErro(true);
            return;
        }

        const dataToSend = { ...formData };

        // Tratamento das datas para INT (YYYYMMDD)
        dataToSend.ini_vig = dataToSend.ini_vig ? parseInt(dataToSend.ini_vig.replace(/-/g, ''), 10) : null;
        dataToSend.fim_vig = dataToSend.fim_vig ? parseInt(dataToSend.fim_vig.replace(/-/g, ''), 10) : null;

        // Converte o objeto de campos para o array que o backend espera
        const camposArray = Object.entries(formData.campos)
            .filter(([, ativo]) => ativo)
            .map(([campoName]) => {
                let tipo = 'texto';
                let nomeCampo = campoName.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

                if (campoName === 'cpf' || campoName === 'qtde_pessoas') {
                    tipo = 'numero';
                } else if (campoName === 'data_nascimento') {
                    tipo = 'data';
                } else if (campoName === 'email') {
                    tipo = 'email';
                }
                return { campo: nomeCampo, tipo: tipo };
            });
        dataToSend.campos = camposArray;

        // Trata img_banner
        if (dataToSend.img_banner && dataToSend.img_banner.url) {
            dataToSend.img_banner = { url: dataToSend.img_banner.url };
        } else {
            dataToSend.img_banner = { url: '' };
        }

        delete dataToSend.img_logo; // Remove img_logo antes de enviar, pois não vai para o banco

        dataToSend.per_sair = dataToSend.per_sair ? 1 : 0; // Converte boolean para 0/1
        dataToSend.per_loc = dataToSend.per_loc ? 1 : 0;     // Converte boolean para 0/1

        // Converte strings vazias para null para campos numéricos opcionais
        dataToSend.temp_tol = dataToSend.temp_tol === '' ? null : Number(dataToSend.temp_tol);
        dataToSend.qtde_min = dataToSend.qtde_min === '' ? null : Number(dataToSend.qtde_min);
        dataToSend.qtde_max = dataToSend.qtde_max === '' ? null : Number(dataToSend.qtde_max);
        
        dataToSend.situacao = Number(dataToSend.situacao); // Garante que situacao é número

        console.log('Dados do formulário final (dataToSend) sendo enviados:', dataToSend);

        try {
            const url = id
                ? `http://localhost:3001/api/configuracao-fila/${id}` // URL para PUT (edição)
                : 'http://localhost:3001/api/configuracao-fila'; // URL para POST (cadastro)

            const method = id ? 'PUT' : 'POST'; // Método HTTP

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend)
            });

            if (!response.ok) {
                let errorMessage = 'Erro desconhecido ao salvar configuração.';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.erro || errorData.mensagem || JSON.stringify(errorData);
                } catch (parseError) {
                    errorMessage = `Erro ${response.status}: ${response.statusText || 'Resposta não JSON'}`;
                }
                setMensagemErroModal(`Falha ao salvar: ${errorMessage}`);
                setMostrarModalErro(true);
                console.error('Erro na resposta da API:', response.status, response.statusText, errorMessage);
                return;
            }

            const data = await response.json();
            setMensagemSucessoModal(`Configuração de fila ${id ? 'atualizada' : 'cadastrada'} com sucesso!`);
            if (!id && data.token_fila) { // Mostra o token apenas para novos cadastros
                setMensagemSucessoModal(prev => prev + ` Token: ${data.token_fila}`);
            }
            setMostrarModalSucesso(true);

            // Redireciona após um pequeno delay para o usuário ver a mensagem
            setTimeout(() => {
                setMostrarModalSucesso(false);
                navigate('/filas-cadastradas'); // Redireciona para a lista após o sucesso
            }, 2000); 
            
            // Se for um novo cadastro, limpa o formulário
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
            console.error('Erro de rede ou na requisição:', err);
            setMensagemErroModal('Ocorreu um erro ao enviar os dados. Verifique sua conexão ou se o servidor está ativo.');
            setMostrarModalErro(true);
        }
    };

    const fecharModalSucesso = () => {
        setMostrarModalSucesso(false);
        navigate('/filas-cadastradas'); // Garante redirecionamento mesmo se o usuário fechar o modal
    };

    const fecharModalErro = () => {
        setMostrarModalErro(false);
    };

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

    if (loading) {
        return <p>Carregando formulário...</p>;
    }

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

                    {/* Campo de Logo */}
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
                        <textarea name="mensagem" value={formData.mensagem} onChange={handleChange} placeholder="Digite sua mensagem..." />
                    </div>

                    {/* Campo de Banner */}
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
                                    <img src={camposIcons[campo]} alt={`${campo} icon`} className="campo-icon" />
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

            {/* Modais de Sucesso e Erro */}
            {mostrarModalSucesso && mensagemSucessoModal && (
                <div className="modal-overlay">
                    <div className="modal sucesso">
                        <p className="mensagem-sucesso">{mensagemSucessoModal}</p>
                        <button onClick={fecharModalSucesso} className="btn-fechar-modal">Fechar</button>
                    </div>
                </div>
            )}

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