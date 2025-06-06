import React, { useState } from 'react';
import './configuracao.css';
import api from '../../services/api';

const FormularioConfiguracaoFila = () => {
    const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
    const idEmpresa = empresaSelecionada?.ID_EMPRESA || null;

    const [formData, setFormData] = useState({
        id_empresa: idEmpresa,
        nome_fila: '',
        ini_vig: '', // Manter vazio para o input type="date"
        fim_vig: '', // Manter vazio para o input type="date"
        // Definir 'campos' como um array vazio para coletar os campos selecionados
        // O back-end espera um array de objetos, ex: [{ "campo": "CPF", "tipo": "numero" }]
        campos: { cpf: true, rg: false, telefone: true, endereco: false, data_nascimento: false, email: false, qtde_pessoas: false },
        mensagem: '',
        img_banner: { url: '' }, // Objeto para URL do banner
        img_logo: { url: '' }, // Adicionado ao estado para controle no front-end, mas será removido no payload
        temp_tol: '',
        qtde_min: '',
        qtde_max: '',
        per_sair: false, // Booleano
        per_loc: false,  // Booleano
        situacao: 1,     // Número (1 ou 0)
    });

    const [mostrarModalSucesso, setMostrarModalSucesso] = useState(false);
    const [mensagemSucessoModal, setMensagemSucessoModal] = useState('');
    const [mostrarModalErro, setMostrarModalErro] = useState(false);
    const [mensagemErroModal, setMensagemErroModal] = useState('');

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (type === 'checkbox') {
            setFormData({ ...formData, [name]: checked });
        } else if (["temp_tol", "qtde_min", "qtde_max"].includes(name)) { // Situacao já é Number, não precisa forçar de novo aqui.
            setFormData({ ...formData, [name]: value === '' ? '' : Number(value) });
        } else if (name === 'situacao') { // Garante que situacao é um número
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
                    [fieldName]: { url: reader.result, file: file } // Guarda a URL base64 e o File object
                }));
            };
            reader.readAsDataURL(file); // Lê o arquivo como URL base64
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

        // --- PREPARANDO OS DADOS PARA O BACK-END ---

        // 1. Tratamento das datas para INT (YYYYMMDD)
        // O input type="date" retorna "YYYY-MM-DD". O back-end espera YYYYMMDD (int).
        dataToSend.ini_vig = dataToSend.ini_vig ? parseInt(dataToSend.ini_vig.replace(/-/g, ''), 10) : null;
        dataToSend.fim_vig = dataToSend.fim_vig ? parseInt(dataToSend.fim_vig.replace(/-/g, ''), 10) : null;

        // 2. Tratamento dos campos selecionados para o formato que o back-end espera
        // Seu back-end espera um array de objetos como: [{"campo":"Nome","tipo":"texto"}, {"campo":"CPF","tipo":"numero"}]
        // E depois converte para JSON.stringified.
        const camposArray = Object.entries(formData.campos)
            .filter(([, ativo]) => ativo) // Filtra apenas os campos que estão 'true'
            .map(([campoName]) => {
                // Mapeia os nomes dos campos para algo mais legível e define um tipo padrão
                let tipo = 'texto'; // Tipo padrão
                let nomeCampo = campoName.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); // Capitaliza e remove underscores
                
                // Tipos específicos para CPF e outros, se necessário.
                if (campoName === 'cpf' || campoName === 'qtde_pessoas') {
                    tipo = 'numero';
                } else if (campoName === 'data_nascimento') {
                    tipo = 'data';
                } else if (campoName === 'email') {
                    tipo = 'email';
                }
                
                return { campo: nomeCampo, tipo: tipo };
            });
        
        dataToSend.campos = camposArray; // Atribui o array de objetos 'campos'

        // 3. Tratamento de IMG_BANNER
        // Seu back-end espera um JSON string da URL do banner, ex: '{"url":"data:image/png;base64,..."}'
        // E o Postman usa { "url": "https://example.com/banner.png", "descricao": "..." }
        // Se você está enviando base64, o backend espera o objeto { url: 'base64...' }
        // Se a url for uma URL externa (vindo de um input text), use essa url.
        // Se você quer que o backend salve a base64 string, o formato abaixo está correto.
        if (dataToSend.img_banner && dataToSend.img_banner.url) {
            // Se formData.img_banner.file existe, significa que veio de um upload.
            // O backend espera um objeto {url: "base64"} ou {url: "http://..."}
            // Não há 'descricao' no seu backend para IMG_BANNER, apenas 'url'.
            dataToSend.img_banner = { url: dataToSend.img_banner.url };
        } else {
            dataToSend.img_banner = { url: '' }; // Envia objeto vazio se não houver banner
        }

        // 4. Remover img_logo do payload, pois não existe na tabela ConfiguracaoFila
        delete dataToSend.img_logo;

        // 5. Tratamento de booleanos para 0 ou 1
        // Seu back-end espera 0 ou 1 para per_sair e per_loc.
        dataToSend.per_sair = dataToSend.per_sair ? 1 : 0;
        dataToSend.per_loc = dataToSend.per_loc ? 1 : 0;

        // Converta strings vazias para null para campos numéricos opcionais
        dataToSend.temp_tol = dataToSend.temp_tol === '' ? null : Number(dataToSend.temp_tol);
        dataToSend.qtde_min = dataToSend.qtde_min === '' ? null : Number(dataToSend.qtde_min);
        dataToSend.qtde_max = dataToSend.qtde_max === '' ? null : Number(dataToSend.qtde_max);

        // O 'situacao' já está como Number no handleChange, mas garante aqui
        dataToSend.situacao = Number(dataToSend.situacao);


        // LOG FINAL DOS DADOS ANTES DE ENVIAR (CRUCIAL PARA DEPURAR)
        console.log('Dados do formulário final (dataToSend) sendo enviados:', dataToSend);

        try {
            // VERIFIQUE SE A URL DA API ESTÁ CORRETA!
            // No seu back-end, a rota é `/api/configurar-fila`.
            // No seu front-end, você está usando `http://localhost:3001/api/configuracao/configuracao-fila`.
            // A rota correta é `http://localhost:3001/api/configurar-fila` (assumindo porta 3001).
          const response = await api.post('/configuracao-fila', dataToSend);


            // --- Tratamento de Erros Aprimorado ---
            if (!response.ok) {
                let errorMessage = 'Erro desconhecido ao cadastrar configuração.';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.erro || errorData.mensagem || JSON.stringify(errorData);
                } catch (parseError) {
                    errorMessage = `Erro ${response.status}: ${response.statusText || 'Resposta não JSON'}`;
                }
                setMensagemErroModal(`Falha ao cadastrar: ${errorMessage}`);
                setMostrarModalErro(true);
                console.error('Erro na resposta da API:', response.status, response.statusText, errorMessage);
                return;
            }

            const data = await response.json();

            setMensagemSucessoModal('Configuração de fila cadastrada com sucesso! Token: ' + data.token_fila);
            setMostrarModalSucesso(true);

            // Limpa o formulário após o sucesso
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
        } catch (err) {
            console.error('Erro de rede ou na requisição:', err);
            setMensagemErroModal('Ocorreu um erro ao enviar os dados. Verifique sua conexão ou se o servidor está ativo.');
            setMostrarModalErro(true);
        }
    };

    const fecharModalSucesso = () => {
        setMostrarModalSucesso(false);
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
                        <input type="text" name="nome_fila" value={formData.nome_fila} onChange={handleChange} placeholder="Nome da fila" />
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
                    <button type="button" className="cancel-btn">Cancelar</button>
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