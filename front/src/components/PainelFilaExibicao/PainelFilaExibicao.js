import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { io } from "socket.io-client";
import { BiFullscreen, BiExitFullscreen } from 'react-icons/bi';

import './PainelFilaExibicao.css';

const PainelFilaExibicao = () => {
    const { idEmpresa, dtMovto, idFila } = useParams();
    const navigate = useNavigate();

    const [clientesAguardando, setClientesAguardando] = useState([]);
    const [clientesChamados, setClientesChamados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [weatherData, setWeatherData] = useState(null);
    const [weatherError, setWeatherError] = useState(null);
    const [showWeather, setShowWeather] = useState(true);

    const [newsData, setNewsData] = useState([]);
    const [newsError, setNewsError] = useState(null);
    const [showNews, setShowNews] = useState(true);

    const [showBanner, setShowBanner] = useState(true);
    const [showBannerPreview, setShowBannerPreview] = useState(true);

    const [customTitle, setCustomTitle] = useState('');
    const [backgroundColor, setBackgroundColor] = useState('#f4f7f6');
    const [logoBase64, setLogoBase64] = useState('');
    const [titleColor, setTitleColor] = useState('#3A5AFE'); 
    const [columnTitleColor, setColumnTitleColor] = useState('#3A5AFE'); 
    const [columnBgColor, setColumnBgColor] = useState('#ffffff'); 
    const [clientNameColor, setClientNameColor] = useState('#333'); 
    const [bannerTextColor, setBannerTextColor] = useState('#333');
    const [bannerBgColor, setBannerBgColor] = useState('#e9ecef');
    const defaultMessages = [
        "Bem-vindo(a) ao nosso painel de atendimento!",
        "Fique atento(a) ao seu nome e número de guichê.",
        "Seu tempo de espera pode variar.",
        "Agradecemos a sua paciência!",
        "Não se esqueça de verificar nossas promoções no balcão de atendimento."
    ];
    const [customMessages, setCustomMessages] = useState([]);
    const [messagesInput, setMessagesInput] = useState(defaultMessages.join('\n'));
    
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');

    const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
    const nomeEmpresa = empresaSelecionada?.NOME_EMPRESA;

    const formatarHora = (timestampSQL) => {
        if (!timestampSQL) return 'N/A';
        const date = new Date(timestampSQL);
        if (isNaN(date.getTime())) return 'N/A';
        const options = { hour: '2-digit', minute: '2-digit', hour12: false };
        return new Intl.DateTimeFormat('pt-BR', options).format(date);
    };

    const fetchClientesFila = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const url = `/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/clientes`;
            const response = await api.get(url);
            const allClients = response.data;

            const aguardando = allClients.filter(cliente => Number(cliente.SITUACAO) === 0);
            
            const chamados = allClients
                .filter(cliente => Number(cliente.SITUACAO) === 3)
                .sort((a, b) => new Date(b.DT_ENTRA) - new Date(a.DT_ENTRA))
                .slice(0, 5);
            
            setClientesAguardando(aguardando);
            setClientesChamados(chamados);

        } catch (err) {
            setClientesAguardando([]);
            setClientesChamados([]);
            if (err.response?.status !== 404) {
                setError('Não foi possível carregar os clientes da fila.');
            } else {
                setError('Nenhum cliente encontrado para esta fila.');
            }
        } finally {
            setLoading(false);
        }
    }, [idEmpresa, dtMovto, idFila, navigate]);

    const fetchWeather = async () => {
        const apiKey = 'SUA_CHAVE_DO_CLIMA_AQUI'; 
        const city = 'Curitiba';
        const countryCode = 'BR';
        try {
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city},${countryCode}&appid=${apiKey}&units=metric&lang=pt_br`);
            if (!response.ok) {
                throw new Error('Não foi possível obter os dados do clima.');
            }
            const data = await response.json();
            setWeatherData(data);
        } catch (err) {
            console.error('Erro ao buscar o clima:', err);
            setWeatherError('Falha ao carregar o clima.');
            setWeatherData(null);
        }
    };
    
    const fetchNews = async () => {
        const apiKey = 'SUA_CHAVE_DE_NOTICIAS_AQUI'; 
        const query = 'noticias do brasil'; 
        try {
            const response = await fetch(`https://newsapi.org/v2/everything?q=${query}&language=pt&apiKey=${apiKey}`);
            if (!response.ok) {
                throw new Error('Não foi possível obter os dados das notícias.');
            }
            const data = await response.json();
            setNewsData(data.articles.slice(0, 5));
        } catch (err) {
            console.error('Erro ao buscar as notícias:', err);
            setNewsError('Falha ao carregar as notícias.');
            setNewsData([]);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoBase64(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setLogoBase64('');
        }
    };
    
    const handleSaveSettings = () => {
        const settings = {
            customTitle,
            backgroundColor,
            logoBase64,
            titleColor,
            columnTitleColor,
            columnBgColor,
            clientNameColor,
            bannerTextColor,
            bannerBgColor,
            messages: messagesInput.split('\n').map(msg => msg.trim()).filter(msg => msg !== ''),
            showBanner: showBannerPreview
        };
        localStorage.setItem('painelSettings', JSON.stringify(settings));
        setCustomMessages(settings.messages);
        
        setShowBanner(showBannerPreview);

        setNotificationMessage('Configurações salvas com sucesso!');
        setShowNotification(true);
        setTimeout(() => {
            setShowNotification(false);
        }, 3000); 
    };

    const handleRemoveLogo = () => {
        setLogoBase64('');
        const fileInput = document.getElementById('logo-upload');
        if (fileInput) {
            fileInput.value = '';
        }
    };

    useEffect(() => {
        if (!idEmpresa || !dtMovto || !idFila) {
            navigate('/filas');
            return;
        }

        const savedSettings = localStorage.getItem('painelSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            setCustomTitle(settings.customTitle || '');
            setBackgroundColor(settings.backgroundColor || '#f4f7f6');
            setLogoBase64(settings.logoBase64 || '');
            setTitleColor(settings.titleColor || '#3A5AFE');
            setColumnTitleColor(settings.columnTitleColor || '#3A5AFE');
            setColumnBgColor(settings.columnBgColor || '#ffffff');
            setClientNameColor(settings.clientNameColor || '#333');
            setBannerTextColor(settings.bannerTextColor || '#333');
            setBannerBgColor(settings.bannerBgColor || '#e9ecef');
            if (settings.messages && settings.messages.length > 0) {
                setCustomMessages(settings.messages);
                setMessagesInput(settings.messages.join('\n'));
            } else {
                setCustomMessages([]);
                setMessagesInput(defaultMessages.join('\n'));
            }
            if (settings.hasOwnProperty('showBanner')) {
                setShowBanner(settings.showBanner);
                setShowBannerPreview(settings.showBanner);
            }
        }

        const socket = io("http://localhost:3001");
        console.log("Painel conectado ao servidor WebSocket.");

        socket.on('cliente_atualizado', (data) => {
            console.log("Notificação recebida via WebSocket:", data);
            fetchClientesFila();
        });

        fetchClientesFila();

        return () => {
            socket.disconnect();
            console.log("Painel desconectado do servidor WebSocket.");
        };

    }, [idEmpresa, dtMovto, idFila, navigate, fetchClientesFila, isFullscreen]);

    useEffect(() => {
        fetchWeather();
        fetchNews();
        const weatherIntervalId = setInterval(fetchWeather, 600000);
        const newsIntervalId = setInterval(fetchNews, 1800000);
        return () => {
            clearInterval(weatherIntervalId);
            clearInterval(newsIntervalId);
        };
    }, []);

    const handleGoBack = () => {
        navigate(-1);
    };

    const handleFullscreenToggle = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Erro ao tentar ativar tela cheia: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };
    
    const handleToggleBannerPreview = () => {
        setShowBannerPreview(prevShowBanner => !prevShowBanner);
    };

    const handleToggleWeather = () => {
        setShowWeather(prevShowWeather => !prevShowWeather);
    };

    const handleToggleNews = () => {
        setShowNews(prevShowNews => !prevShowNews);
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);
    
    const messagesToDisplay = customMessages.length > 0 ? customMessages : defaultMessages;
    
    if (!isFullscreen) {
        return (
            <div className="painel-exibicao-container">
                <header className="painel-header">
                    <div className="painel-header-content">
                        <button className="btn-voltar" onClick={handleGoBack}>
                            &larr; Voltar
                        </button>
                        <h1>Configuração do Painel</h1>
                        <button className="btn-fullscreen" onClick={handleFullscreenToggle} title="Ativar Tela Cheia">
                            <BiFullscreen />
                        </button>
                    </div>
                </header>

                <div className="painel-configuracao-wrapper">
                    <div className="painel-configuracao">
                        <div className="config-group">
                            <label>Título do Painel:</label>
                            <input type="text" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Ex: Painel da Fila da Loja X"/>
                        </div>
                        <div className="config-group">
                            <label>Logo da Empresa:</label>
                            <div className="file-input-wrapper">
                                <input
                                    type="file"
                                    id="logo-upload"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                {logoBase64 && (
                                    <button className="btn-remover-logo" onClick={handleRemoveLogo}>
                                        Remover
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="config-group">
                            <div className="toggle-switch-container">
                                <label>Exibir Banner Rotativo:</label>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={showBannerPreview}
                                        onChange={handleToggleBannerPreview}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>
                            <label>Mensagens do Banner (uma por linha):</label>
                            <textarea
                                value={messagesInput}
                                onChange={(e) => setMessagesInput(e.target.value)}
                                rows="5"
                                placeholder="Digite cada mensagem em uma linha separada."
                            />  
                        </div>
                        
                        <div className="color-card-group">
                            <div className="color-card">
                                <h5>Cores do Painel</h5>
                                <div className="color-option">
                                    <label>Fundo do Painel:</label>
                                    <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)}/>
                                </div>
                                <div className="color-option">
                                    <label>Letra do Título:</label>
                                    <input type="color" value={titleColor} onChange={(e) => setTitleColor(e.target.value)}/>
                                </div>
                            </div>
                            <div className="color-card">
                                <h5>Cores das Colunas</h5>
                                <div className="color-option">
                                    <label>Fundo das Colunas:</label>
                                    <input type="color" value={columnBgColor} onChange={(e) => setColumnBgColor(e.target.value)}/>
                                </div>
                                <div className="color-option">
                                    <label>Letras do Título:</label>
                                    <input type="color" value={columnTitleColor} onChange={(e) => setColumnTitleColor(e.target.value)}/>
                                </div>
                                <div className="color-option">
                                    <label>Letras dos Clientes:</label>
                                    <input type="color" value={clientNameColor} onChange={(e) => setClientNameColor(e.target.value)}/>
                                </div>
                            </div>
                            <div className="color-card">
                                <h5>Cores do Banner</h5>
                                <div className="color-option">
                                    <label>Cor de Fundo:</label>
                                    <input type="color" value={bannerBgColor} onChange={(e) => setBannerBgColor(e.target.value)}/>
                                </div>
                                <div className="color-option">
                                    <label>Cor da Letra:</label>
                                    <input type="color" value={bannerTextColor} onChange={(e) => setBannerTextColor(e.target.value)}/>
                                </div>
                            </div>
                        </div>

                        <button className="btn-save-settings" onClick={handleSaveSettings}>
                            Salvar Configurações
                        </button>
                    </div>

                    <div className="painel-preview" style={{ backgroundColor: backgroundColor }}>
                        <div className="painel-preview-content">
                            <header className="painel-header" style={{ backgroundColor: 'var(--card-background)' }}>
                                <div className="painel-header-content">
                                    {logoBase64 && <img src={logoBase64} alt="Logo da Empresa" className="painel-logo" />}
                                    <h1 style={{ color: titleColor }}>{customTitle || 'Painel da Fila'}</h1>
                                </div>
                            </header>
                            
                            <div className="painel-colunas">
                                <div className="coluna-clientes na-fila" style={{ backgroundColor: columnBgColor }}>
                                    <h2 style={{ color: columnTitleColor }}>Aguardando</h2>
                                    <div className="lista-clientes">
                                        {clientesAguardando.slice(0, 3).map(cliente => (
                                            <div key={`${cliente.ID_EMPRESA}-${cliente.DT_MOVTO}-${cliente.ID_FILA}-${cliente.ID_CLIENTE}`} className="cartao-cliente aguardando" style={{ backgroundColor: 'var(--background-light)' }}>
                                                <span className="cliente-nome" style={{ color: clientNameColor }}>{cliente.NOME || 'Cliente'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="coluna-clientes chamados" style={{ backgroundColor: columnBgColor }}>
                                    <h2 style={{ color: columnTitleColor }}>Chamados</h2>
                                    <div className="lista-clientes">
                                        {clientesChamados.slice(0, 2).map(cliente => (
                                            <div key={`${cliente.ID_EMPRESA}-${cliente.DT_MOVTO}-${cliente.ID_FILA}-${cliente.ID_CLIENTE}`} className="cartao-cliente chamado" style={{ backgroundColor: 'var(--background-light)' }}>
                                                <span className="cliente-nome" style={{ color: clientNameColor }}>{cliente.NOME || 'Cliente'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            {showBannerPreview && (
                                <div className="mensagens-rotativas-container" style={{ backgroundColor: bannerBgColor }}>
                                    <div className="mensagem-texto" style={{ color: bannerTextColor }}>
                                        {messagesInput.split('\n').filter(m => m.trim() !== '').map((msg, index) => (
                                            <span key={`primeiro-${index}`} className="mensagem-item">{msg}</span>
                                        ))}
                                        {messagesInput.split('\n').filter(m => m.trim() !== '').map((msg, index) => (
                                            <span key={`segundo-${index}`} className="mensagem-item">{msg}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {showNotification && (
                    <div className="custom-notification">
                        <p>{notificationMessage}</p>
                    </div>
                )}
            </div>
        );
    }
    
    return (
        <div className="painel-exibicao-container fullscreen-ativo" style={{ backgroundColor: backgroundColor }}>
            <header className="painel-header" style={{ backgroundColor: 'var(--card-background)' }}>
                <div className="painel-header-content">
                    {logoBase64 && <img src={logoBase64} alt="Logo da Empresa" className="painel-logo" />}
                    <h1 style={{ color: titleColor }}>{customTitle || 'Painel da Fila'}</h1>
                    <button className="btn-fullscreen" onClick={handleFullscreenToggle} title="Sair da Tela Cheia">
                        <BiExitFullscreen />
                    </button>
                </div>
            </header>

            {showWeather && weatherData && (
                <div className="weather-widget">
                    <div className="weather-icon">
                        <img src={`http://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`} alt="Ícone do Clima" />
                    </div>
                    <div className="weather-info-text">
                        <span className="weather-temp">{Math.round(weatherData.main.temp)}°C</span>
                        <span className="weather-description">{weatherData.weather[0].description}</span>
                    </div>
                </div>
            )}
            
            {loading && <div className="loading-message">Carregando painel da fila...</div>}
            {error && <div className="error-message-panel">{error}</div>}

            <div className="painel-colunas">
                <div className="coluna-clientes na-fila" style={{ backgroundColor: columnBgColor }}>
                    <h2 style={{ color: columnTitleColor }}>Aguardando</h2>
                    {clientesAguardando.length === 0 && !loading && !error && (
                        <p className="no-clients">Nenhum cliente aguardando no momento.</p>
                    )}
                    <div className="lista-clientes">
                        {clientesAguardando.map(cliente => (
                            <div key={`${cliente.ID_EMPRESA}-${cliente.DT_MOVTO}-${cliente.ID_FILA}-${cliente.ID_CLIENTE}`} className="cartao-cliente aguardando" style={{ backgroundColor: 'var(--background-light)' }}>
                                <span className="cliente-nome" style={{ color: clientNameColor }}>{cliente.NOME || 'Cliente Desconhecido'}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="coluna-clientes chamados" style={{ backgroundColor: columnBgColor }}>
                    <h2 style={{ color: columnTitleColor }}>Chamados</h2>
                    {clientesChamados.length === 0 && !loading && !error && (
                        <p className="no-clients">Nenhum cliente chamado ainda.</p>
                    )}
                    <div className="lista-clientes">
                        {clientesChamados.map(cliente => (
                            <div key={`${cliente.ID_EMPRESA}-${cliente.DT_MOVTO}-${cliente.ID_FILA}-${cliente.ID_CLIENTE}`} className="cartao-cliente chamado" style={{ backgroundColor: 'var(--background-light)' }}>
                                <span className="cliente-nome" style={{ color: clientNameColor }}>{cliente.NOME || 'Cliente Desconhecido'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {showNews && newsData.length > 0 && (
                <div className="news-widget">
                    <h2>Últimas Notícias</h2>
                    <ul className="news-list">
                        {newsData.map((article, index) => (
                            <li key={index} className="news-item">
                                <span className="news-title">{article.title}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            {showBanner && (
                <div className="mensagens-rotativas-container" style={{ backgroundColor: bannerBgColor }}>
                    <div className="mensagem-texto" style={{ color: bannerTextColor }}>
                        {messagesToDisplay.map((msg, index) => (
                            <span key={`primeiro-${index}`} className="mensagem-item">{msg}</span>
                        ))}
                        {messagesToDisplay.map((msg, index) => (
                            <span key={`segundo-${index}`} className="mensagem-item">{msg}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PainelFilaExibicao;