// src/components/PainelFilaExibicao/PainelFilaExibicao.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

import './PainelFilaExibicao.css'; 

const PainelFilaExibicao = () => {
    const { idEmpresa, dtMovto, idFila } = useParams();
    const navigate = useNavigate();

    const [clientesAguardando, setClientesAguardando] = useState([]);
    const [clientesConfirmados, setClientesConfirmados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
            console.log("-----------------------------------------");
            console.log(`DEBUG: Iniciando fetch para Empresa: ${idEmpresa}, Data: ${dtMovto}, Fila: ${idFila}`);
            const url = `/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/clientes`;
            console.log(`DEBUG: URL da requisição API: ${url}`);

            const response = await api.get(url);
            const allClients = response.data;

            console.log("DEBUG: Resposta da API recebida (dados brutos):");
            console.log(allClients); 
            console.log(`DEBUG: Total de clientes recebidos: ${allClients.length}`);

            const aguardando = allClients.filter(cliente => {
                const situacaoNumerica = Number(cliente.SITUACAO); 
                console.log(`DEBUG: Cliente ID: ${cliente.ID_CLIENTE}, Nome: ${cliente.NOME}, SITUACAO ORIGINAL: ${cliente.SITUACAO}, SITUACAO NUMÉRICA: ${situacaoNumerica}`);
                return situacaoNumerica === 0;
            });
            const confirmados = allClients.filter(cliente => {
                const situacaoNumerica = Number(cliente.SITUACAO); 
                return situacaoNumerica === 1;
            });

            setClientesAguardando(aguardando);
            setClientesConfirmados(confirmados);

            console.log(`DEBUG: Clientes Aguardando (filtrados): ${aguardando.length}`);
            console.log(aguardando); 
            console.log(`DEBUG: Clientes Confirmados (filtrados): ${confirmados.length}`);
            console.log(confirmados); 
            console.log("-----------------------------------------");

        } catch (err) {
            setClientesAguardando([]);
            setClientesConfirmados([]);
            console.error("DEBUG: Erro ao carregar clientes da fila:", err.response?.data || err.message || err);
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
            console.warn("DEBUG: Parâmetros de URL faltando, redirecionando para /filas.");
            navigate('/filas'); 
            return;
        }

        fetchClientesFila();

        const intervalId = setInterval(fetchClientesFila, 5000); 

        return () => clearInterval(intervalId);
    }, [idEmpresa, dtMovto, idFila, navigate, fetchClientesFila]);

    // Função para voltar para a tela anterior
    const handleGoBack = () => {
        navigate(-1); // Volta para a página anterior no histórico
    };

    return (
        <div className="painel-exibicao-container">
            <header className="painel-header">
                {/* Contêiner para alinhar o botão e o título */}
                <div className="painel-header-content">
                    {/* Botão de Voltar */}
                    <button className="btn-voltar" onClick={handleGoBack}>
                        &larr; Voltar
                    </button>
                    <h1>Painel da Fila</h1>
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
                                <span className="cliente-hora">{formatarHora(cliente.DT_ENTRA)}</span>
                                <span className="cliente-espera">Tempo de Espera: {calcularTempoEspera(cliente.DT_ENTRA)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="coluna-clientes confirmados">
                    <h2>Confirmados</h2> 
                    {clientesConfirmados.length === 0 && !loading && !error && (
                        <p className="no-clients">Nenhum cliente confirmado ainda.</p>
                    )}
                    <div className="lista-clientes">
                        {clientesConfirmados.map(cliente => (
                            <div key={`${cliente.ID_EMPRESA}-${cliente.DT_MOVTO}-${cliente.ID_FILA}-${cliente.ID_CLIENTE}`} className="cartao-cliente confirmado">
                                <span className="cliente-nome">{cliente.NOME || 'Cliente Desconhecido'}</span>
                                <span className="cliente-hora">{formatarHora(cliente.DT_APRE)}</span> 
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PainelFilaExibicao;