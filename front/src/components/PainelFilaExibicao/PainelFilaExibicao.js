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
        <div className="painel-exibicao-container">
            <header className="painel-header">
                <div className="painel-header-content">
                    {!isFullscreen && (
                        <button className="btn-voltar" onClick={handleGoBack}>
                            &larr; Voltar
                        </button>
                    )}
                    <h1>Painel da Fila</h1>
                    <button className="btn-fullscreen" onClick={handleFullscreenToggle} title="Alternar Tela Cheia">
                        {isFullscreen ? <BiExitFullscreen /> : <BiFullscreen />}
                    </button>
                </div>
            </header>

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
            {/* Banner de Mensagens Rotativas */}
            <div className="mensagens-rotativas-container">
                <div className="mensagem-texto">
                    {/* Renderiza as mensagens uma vez */}
                    {mensagens.map((msg, index) => (
                        <span key={`primeiro-${index}`} className="mensagem-item">{msg}</span>
                    ))}
                    {/* E renderiza as mensagens uma segunda vez */}
                    {mensagens.map((msg, index) => (
                        <span key={`segundo-${index}`} className="mensagem-item">{msg}</span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PainelFilaExibicao;

