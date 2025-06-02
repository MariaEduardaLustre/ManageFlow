// src/pages/GestaoFilaClientes/GestaoFilaClientes.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { FaCog, FaTv, FaChartBar, FaClipboardList, FaUser, FaSignOutAlt, FaCheckCircle, FaPaperPlane, FaTimesCircle } from 'react-icons/fa';
import './GestaoFilaClientes.css'; // Importa o CSS para este componente

const GestaoFilaClientes = () => {
    const { idEmpresa, dtMovto, idFila } = useParams(); // Captura os parâmetros da URL
    const navigate = useNavigate();
    const [clientesFila, setClientesFila] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Dados do usuário e empresa para o sidebar (reaproveitados de FilaLista)
    const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
    const nomeEmpresa = empresaSelecionada?.NOME_EMPRESA;
    const nomeUsuario = "Usuário"; // Substitua com o nome do usuário logado se tiver
    const cargoUsuario = "Gerente de Projeto"; // Substitua com o cargo do usuário logado se tiver

    // Função para formatar a data (reaproveitada de FilaLista)
    const formatarData = (dataSQL) => {
        if (!dataSQL) return 'N/A';
        const date = new Date(dataSQL);
        if (isNaN(date.getTime())) {
            const dataStr = String(dataSQL);
            if (dataStr.length === 8) {
                const ano = dataStr.substring(0, 4);
                const mes = dataStr.substring(4, 6);
                const dia = dataStr.substring(6, 8);
                return `${dia}/${mes}/${ano}`;
            }
            return dataSQL;
        }
        const dia = String(date.getDate()).padStart(2, '0');
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const ano = date.getFullYear();
        return `${dia}/${mes}/${ano}`;
    };

    const formatarHora = (timestampSQL) => {
        if (!timestampSQL) return 'N/A';
        const date = new Date(timestampSQL);
        if (isNaN(date.getTime())) {
            return 'N/A';
        }
        const horas = String(date.getHours()).padStart(2, '0');
        const minutos = String(date.getMinutes()).padStart(2, '0');
        return `${horas}:${minutos}`;
    };

    const fetchClientesFila = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // A rota de backend espera ID_EMPRESA, DT_MOVTO, ID_FILA
            const response = await api.get(`/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/clientes`);
            setClientesFila(response.data);
        } catch (err) {
            if (err.response && err.response.status === 404) {
                console.log('Nenhum cliente encontrado para esta fila.');
                setClientesFila([]);
            } else {
                console.error('Erro ao buscar clientes da fila:', err);
                setError('Não foi possível carregar os clientes da fila. Tente novamente mais tarde.');
            }
        } finally {
            setLoading(false);
        }
    }, [idEmpresa, dtMovto, idFila]);

    useEffect(() => {
        if (!idEmpresa || !dtMovto || !idFila) {
            navigate('/filas'); // Redireciona se os parâmetros da fila não estiverem completos
            return;
        }
        fetchClientesFila();
    }, [idEmpresa, dtMovto, idFila, navigate, fetchClientesFila]);

    const handleConfirmarPresenca = async (cliente) => {
        try {
            await api.put(`/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/cliente/${cliente.ID_CLIENTE}/atualizar-situacao`, { novaSituacao: 1 }); // 1 = Confirmado Presença
            alert(`Presença de ${cliente.NOME} confirmada!`);
            fetchClientesFila(); // Recarrega a lista para refletir a mudança
        } catch (err) {
            console.error('Erro ao confirmar presença:', err);
            alert('Erro ao confirmar presença do cliente.');
        }
    };

    const handleNaoCompareceu = async (cliente) => {
        try {
            await api.put(`/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/cliente/${cliente.ID_CLIENTE}/atualizar-situacao`, { novaSituacao: 2 }); // 2 = Não Compareceu
            alert(`Cliente ${cliente.NOME} marcado como não compareceu.`);
            fetchClientesFila(); // Recarrega a lista para refletir a mudança
        } catch (err) {
            console.error('Erro ao marcar não compareceu:', err);
            alert('Erro ao marcar cliente como não compareceu.');
        }
    };

    const handleEnviarNotificacao = (cliente) => {
        // Implementação futura para enviar notificação
        alert(`Funcionalidade de Notificação para ${cliente.NOME} em desenvolvimento!`);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('idUsuario');
        localStorage.removeItem('empresaSelecionada');
        navigate('/');
    };

    return (
        <div className="home-container">
            <aside className="sidebar">
                <div className="logo">
                    <img src="/imagens/logoManageflow.png" alt="Manageflow Logo" className="responsive-image" />
                </div>
                <nav>
                    <ul>
                        <li>
                            <Link to="/home" style={{ textDecoration: 'none', color: 'inherit' }}>
                                <FaTv /> Dashboard
                            </Link>
                        </li>
                        <li>
                            <Link to="/configuracao" style={{ textDecoration: 'none', color: 'inherit' }}>
                                <FaCog /> Configuração de fila
                            </Link>
                        </li>
                        <li><FaTv /> Painel de TV</li>
                        <li className="active">
                            {/* O link para /filas agora leva de volta para a lista de filas da empresa */}
                            <Link to="/filas" style={{ textDecoration: 'none', color: 'inherit' }}>
                                <FaClipboardList /> Gestão da fila
                            </Link>
                        </li>
                        <li><FaChartBar /> Relatórios</li>
                        <li>
                            <Link to="/home" style={{ textDecoration: 'none', color: 'inherit' }}>
                                <FaUser /> Usuários
                            </Link>
                        </li>
                        <li onClick={logout} style={{ cursor: 'pointer', color: 'red', marginTop: '20px' }}><FaSignOutAlt /> Sair</li>
                    </ul>
                </nav>
                <div className="user-info">
                    <img src="https://i.pravatar.cc/40" alt={nomeUsuario} />
                    <div>{nomeUsuario}<br /><small>{cargoUsuario}</small></div>
                </div>
            </aside>

            <main className="main-content">
                <h1 className="main-content-empresa-titulo">
                    {nomeEmpresa || 'Empresa Carregando...'} - Gestão da Fila ({idFila} - {formatarData(dtMovto)})
                </h1>

                <section className="clientes-fila-section">
                    <h2 className="section-title">Clientes na Fila</h2>

                    {loading && <p>Carregando clientes...</p>}
                    {error && <p className="error-message">{error}</p>}

                    {!loading && clientesFila.length === 0 && !error && (
                        <p>Nenhum cliente disponível nesta fila.</p>
                    )}

                    {!loading && clientesFila.length > 0 && (
                        <table className="clientes-fila-table">
                            <thead>
                                <tr>
                                    <th>Nome do Cliente</th>
                                    <th>Entrada</th>
                                    <th>Situação</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientesFila.map((cliente) => (
                                    <tr key={`${cliente.ID_EMPRESA}-${cliente.DT_MOVTO}-${cliente.ID_FILA}-${cliente.ID_CLIENTE}`}>
                                        <td>{cliente.NOME || 'N/A'}</td>
                                        <td>{formatarHora(cliente.DT_ENTRA)} - {formatarData(cliente.DT_MOVTO)}</td>
                                        <td>
                                            {cliente.SITUACAO === 0 && 'Aguardando'}
                                            {cliente.SITUACAO === 1 && 'Confirmado'}
                                            {cliente.SITUACAO === 2 && 'Não Compareceu'}
                                        </td>
                                        <td className="acao-buttons">
                                            {/* Botões de Ação */}
                                            {cliente.SITUACAO !== 1 && cliente.SITUACAO !== 2 ? ( // Exibe botões se não foi confirmado nem não compareceu
                                                <>
                                                    <button
                                                        className="btn-confirmar"
                                                        onClick={() => handleConfirmarPresenca(cliente)}
                                                        title="Confirmar Presença"
                                                    >
                                                        <FaCheckCircle /> Confirmar
                                                    </button>
                                                    <button
                                                        className="btn-notificar"
                                                        onClick={() => handleEnviarNotificacao(cliente)}
                                                        title="Enviar Notificação"
                                                    >
                                                        <FaPaperPlane /> Notificar
                                                    </button>
                                                    <button
                                                        className="btn-nao-compareceu"
                                                        onClick={() => handleNaoCompareceu(cliente)}
                                                        title="Não Compareceu"
                                                    >
                                                        <FaTimesCircle /> Não Compareceu
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="acao-disabled-message">
                                                    {cliente.SITUACAO === 1 ? 'Presença Confirmada' : 'Não Compareceu'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            </main>
        </div>
    );
};

export default GestaoFilaClientes;