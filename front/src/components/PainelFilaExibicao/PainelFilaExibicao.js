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

    const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
    const nomeEmpresa = empresaSelecionada?.NOME_EMPRESA;

    const formatarHora = (timestampSQL) => {
        if (!timestampSQL) return 'N/A';
        const date = new Date(timestampSQL);
        if (isNaN(date.getTime())) return 'N/A';
        const options = { hour: '2-digit', minute: '2-digit', hour12: false };
        return new Intl.DateTimeFormat('pt-BR', options).format(date);
    };

    const calcularTempoEspera = (dtEntra) => {
        if (!dtEntra) return 'Calculando...';
        const entrada = new Date(dtEntra);
        const agora = new Date();
        const diffMs = agora - entrada;

        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const remainingMinutes = diffMinutes % 60;

        if (diffHours > 0) {
            return `${diffHours}h ${remainingMinutes}m`;
        } else {
            return `${diffMinutes}m`;
        }
    };

    const fetchClientesFila = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const url = `/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/clientes`;
            const response = await api.get(url);
            const allClients = response.data;

            const aguardando = allClients.filter(cliente => Number(cliente.SITUACAO) === 0);
            const chamados = allClients.filter(cliente => Number(cliente.SITUACAO) === 3);

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
    }, [idEmpresa, dtMovto, idFila]);

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
                    {/* O botão "Voltar" só é exibido se não estiver em tela cheia */}
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
                {/* COLUNA: AGUARDANDO */}
                <div className="coluna-clientes na-fila">
                    <h2>Aguardando</h2>
                    {clientesAguardando.length === 0 && !loading && !error && (
                        <p className="no-clients">Nenhum cliente aguardando no momento.</p>
                    )}
                    <div className="lista-clientes">
                        {clientesAguardando.map(cliente => (
                            <div key={`${cliente.ID_EMPRESA}-${cliente.DT_MOVTO}-${cliente.ID_FILA}-${cliente.ID_CLIENTE}`} className="cartao-cliente aguardando">
                                <span className="cliente-nome">{cliente.NOME || 'Cliente Desconhecido'}</span>
                                <span className="cliente-hora">Tempo de Espera: {calcularTempoEspera(cliente.DT_ENTRA)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* COLUNA: CHAMADOS */}
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
        </div>
    );
};

export default PainelFilaExibicao;