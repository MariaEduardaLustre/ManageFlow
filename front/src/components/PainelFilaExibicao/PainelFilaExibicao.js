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

    // --- Novos estados para Notícias ---
    const [newsData, setNewsData] = useState([]);
    const [newsError, setNewsError] = useState(null);
    const [showNews, setShowNews] = useState(true);
    // -----------------------------------

    const mensagens = [
        "Bem-vindo(a) ao nosso painel de atendimento!",
        "Fique atento(a) ao seu nome e número de guichê.",
        "Seu tempo de espera pode variar.",
        "Agradecemos a sua paciência!",
        "Não se esqueça de verificar nossas promoções no balcão de atendimento."
    ];
    
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

    // --- Função para buscar os dados do clima ---
    const fetchWeather = async () => {
        const apiKey = 'f8aaf7be83364aba956f8ded73591533'; // Substitua pela sua chave real
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
    // ---------------------------------------------
    
    // --- NOVA Função para buscar as notícias ---
    const fetchNews = async () => {
        // Importante: Substitua 'SUA_CHAVE_DE_NOTICIAS_AQUI' pela sua chave de API real da News API
        const apiKey = 'SUA_CHAVE_DE_NOTICIAS_AQUI'; 
        const query = 'noticias do brasil'; // Você pode mudar o tema das notícias
        try {
            const response = await fetch(`https://newsapi.org/v2/everything?q=${query}&language=pt&apiKey=${apiKey}`);
            if (!response.ok) {
                throw new Error('Não foi possível obter os dados das notícias.');
            }
            const data = await response.json();
            setNewsData(data.articles.slice(0, 5)); // Pega os 5 primeiros artigos
        } catch (err) {
            console.error('Erro ao buscar as notícias:', err);
            setNewsError('Falha ao carregar as notícias.');
            setNewsData([]);
        }
    };
    // ------------------------------------------

    useEffect(() => {
        if (!idEmpresa || !dtMovto || !idFila) {
            navigate('/filas');
            return;
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

    }, [idEmpresa, dtMovto, idFila, navigate, fetchClientesFila]);

    // --- useEffect para buscar o clima e as notícias periodicamente ---
    useEffect(() => {
        fetchWeather();
        fetchNews();
        const weatherIntervalId = setInterval(fetchWeather, 600000); // 10 minutos
        const newsIntervalId = setInterval(fetchNews, 1800000); // 30 minutos

        return () => {
            clearInterval(weatherIntervalId);
            clearInterval(newsIntervalId);
        };
    }, []);
    // -----------------------------------------------------------------

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

    const handleToggleWeather = () => {
        setShowWeather(prevShowWeather => !prevShowWeather);
    };

    // --- Nova função para alternar a exibição das notícias ---
    const handleToggleNews = () => {
        setShowNews(prevShowNews => !prevShowNews);
    };
    // --------------------------------------------------------

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
            const mainContainer = document.querySelector('.painel-exibicao-container');
            if (mainContainer) {
                if (document.fullscreenElement) {
                    mainContainer.classList.add('fullscreen-ativo');
                } else {
                    mainContainer.classList.remove('fullscreen-ativo');
                }
            }
        };
        
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    return (
        <div className={`painel-exibicao-container ${isFullscreen ? 'fullscreen-ativo' : ''}`}>
            <header className="painel-header">
                <div className="painel-header-content">
                    {!isFullscreen && (
                        <button className="btn-voltar" onClick={handleGoBack}>
                            &larr; Voltar
                        </button>
                    )}
                    <h1>Painel da Fila</h1>
                    
                    {/* Botão para alternar o clima */}
                    {!isFullscreen && (
                        <button className="btn-toggle-weather" onClick={handleToggleWeather} title="Exibir/Ocultar Clima">
                            {showWeather ? 'Ocultar Clima' : 'Exibir Clima'}
                        </button>
                    )}
                    
                    {/* NOVO: Botão para alternar as notícias */}
                    {!isFullscreen && (
                        <button className="btn-toggle-news" onClick={handleToggleNews} title="Exibir/Ocultar Notícias">
                            {showNews ? 'Ocultar Notícias' : 'Exibir Notícias'}
                        </button>
                    )}

                    <button className="btn-fullscreen" onClick={handleFullscreenToggle} title="Alternar Tela Cheia">
                        {isFullscreen ? <BiExitFullscreen /> : <BiFullscreen />}
                    </button>
                </div>
            </header>

            {/* Widget do clima */}
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
                <div className="coluna-clientes na-fila">
                    <h2>Aguardando</h2>
                    {clientesAguardando.length === 0 && !loading && !error && (
                        <p className="no-clients">Nenhum cliente aguardando no momento.</p>
                    )}
                    <div className="lista-clientes">
                        {clientesAguardando.map(cliente => (
                            <div key={`${cliente.ID_EMPRESA}-${cliente.DT_MOVTO}-${cliente.ID_FILA}-${cliente.ID_CLIENTE}`} className="cartao-cliente aguardando">
                                <span className="cliente-nome">{cliente.NOME || 'Cliente Desconhecido'}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="coluna-clientes chamados">
                    <h2>Chamados</h2>
                    {clientesChamados.length === 0 && !loading && !error && (
                        <p className="no-clients">Nenhum cliente chamado ainda.</p>
                    )}
                    <div className="lista-clientes">
                        {clientesChamados.map(cliente => (
                            <div key={`${cliente.ID_EMPRESA}-${cliente.DT_MOVTO}-${cliente.ID_FILA}-${cliente.ID_CLIENTE}`} className="cartao-cliente chamado">
                                <span className="cliente-nome">{cliente.NOME || 'Cliente Desconhecido'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* NOVO: Widget de notícias */}
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
            
            {/* Banner de Mensagens Rotativas */}
            <div className="mensagens-rotativas-container">
                <div className="mensagem-texto">
                    {mensagens.map((msg, index) => (
                        <span key={`primeiro-${index}`} className="mensagem-item">{msg}</span>
                    ))}
                    {mensagens.map((msg, index) => (
                        <span key={`segundo-${index}`} className="mensagem-item">{msg}</span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PainelFilaExibicao;