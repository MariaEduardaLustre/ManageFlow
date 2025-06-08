import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { FaCog, FaTv, FaChartBar, FaClipboardList, FaUser, FaSignOutAlt, FaCheckCircle, FaPaperPlane, FaTimesCircle, FaEdit, FaUndo } from 'react-icons/fa';
import './GestaoFilaClientes.css';

const GestaoFilaClientes = () => {
    const { idEmpresa, dtMovto, idFila } = useParams();
    const navigate = useNavigate();
    const [clientesFila, setClientesFila] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingClienteId, setEditingClienteId] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
    const nomeEmpresa = empresaSelecionada?.NOME_EMPRESA;
    const nomeUsuario = "Usuário";
    const cargoUsuario = "Gerente de Projeto";

    const formatarData = (dataSQL) => {
        if (!dataSQL) return 'N/A';
        const dataStr = String(dataSQL);
        if (dataStr.length === 8) {
            const ano = dataStr.substring(0, 4);
            const mes = dataStr.substring(4, 6);
            const dia = dataStr.substring(6, 8);
            return `${dia}/${mes}/${ano}`;
        }
        const date = new Date(dataSQL);
        if (isNaN(date.getTime())) {
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

    const formatarCpfCnpj = (valor) => {
        if (!valor) return 'N/A';
        const limpo = String(valor).replace(/\D/g, '');
        if (limpo.length === 11) {
            return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        } else if (limpo.length === 14) {
            return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
        return valor;
    };

    const formatarCelular = (ddd, numero) => {
        if (!ddd || !numero) return 'N/A';
        const dddLimpo = String(ddd).replace(/\D/g, '');
        const numeroLimpo = String(numero).replace(/\D/g, '');
        const numeroCompleto = dddLimpo + numeroLimpo;

        if (numeroCompleto.length === 11) {
            return `(${numeroCompleto.substring(0, 2)}) ${numeroCompleto.substring(2, 7)}-${numeroCompleto.substring(7, 11)}`;
        } else if (numeroCompleto.length === 10) {
            return `(${numeroCompleto.substring(0, 2)}) ${numeroCompleto.substring(2, 6)}-${numeroCompleto.substring(6, 10)}`;
        }
        return `(${dddLimpo}) ${numeroLimpo}`;
    };

    const fetchClientesFila = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/clientes`);
            setClientesFila(response.data);
            setEditingClienteId(null);
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
            navigate('/filas');
            return;
        }
        fetchClientesFila();
    }, [idEmpresa, dtMovto, idFila, navigate, fetchClientesFila]);

    const getSituacaoText = (situacao) => {
        switch (situacao) {
            case 1:
                return 'Presença Confirmada';
            case 2:
                return 'Não Compareceu';
            case 3:
                return 'Chamado';
            case 4:
                return 'Atendido';
            case 0:
            default:
                return 'Aguardando';
        }
    };

    const updateClienteSituacaoLocal = (clienteId, novaSituacao) => {
        setClientesFila(prevClientes =>
            prevClientes.map(cliente =>
                cliente.ID_CLIENTE === clienteId ? { ...cliente, SITUACAO: novaSituacao } : cliente
            )
        );
    };

    const openModal = (message) => {
        setModalMessage(message);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setModalMessage('');
    };

    const handleUpdateSituacao = async (cliente, novaSituacao, mensagemSucesso, mensagemErro) => {
        const situacaoOriginal = cliente.SITUACAO;
        
        updateClienteSituacaoLocal(cliente.ID_CLIENTE, novaSituacao);
        setEditingClienteId(null);

        try {
            await api.put(`/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/cliente/${cliente.ID_CLIENTE}/atualizar-situacao`, { novaSituacao });
            openModal(mensagemSucesso);
        } catch (err) {
            console.error('Erro ao atualizar situação:', err);
            openModal(mensagemErro);
            updateClienteSituacaoLocal(cliente.ID_CLIENTE, situacaoOriginal);
        } finally {
            // fetchClientesFila();
        }
    };

    const handleConfirmarPresenca = (cliente) => {
        handleUpdateSituacao(cliente, 1, `Presença de ${cliente.NOME} confirmada!`, 'Erro ao confirmar presença do cliente. Revertendo situação.');
    };

    const handleNaoCompareceu = (cliente) => {
        handleUpdateSituacao(cliente, 2, `Cliente ${cliente.NOME} marcado como não compareceu.`, 'Erro ao marcar cliente como não compareceu. Revertendo situação.');
    };

    const handleAlterarSituacao = (clienteId) => {
        setEditingClienteId(clienteId);
    };

    const handleCancelarAlteracao = () => {
        setEditingClienteId(null);
    };

    const handleEnviarNotificacao = (cliente) => {
        openModal(`Funcionalidade de Notificação para ${cliente.NOME} em desenvolvimento!`);
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
                            {/* LINHA CORRIGIDA AQUI: REMOVIDO O ">" EXTRA */}
                            <Link to="/configuracao" style={{ textDecoration: 'none', color: 'inherit' }}>
                                <FaCog /> Configuração de fila
                            </Link>
                        </li>
                        <li><FaTv /> Painel de TV</li>
                        <li className="active">
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
                <div className="empresa-titulo-container">
                    <span className="empresa-nome">{nomeEmpresa || 'Carregando...'}</span>
                </div>

                <section className="clientes-fila-section">
                    <h2 className="section-title">Clientes</h2>

                    {loading && <p>Carregando clientes...</p>}
                    {error && <p className="error-message">{error}</p>}

                    {!loading && clientesFila.length === 0 && !error && (
                        <p>Nenhum cliente disponível nesta fila.</p>
                    )}

                    {!loading && clientesFila.length > 0 && (
                        <table className="clientes-fila-table">
                            <thead>
                                <tr>
                                    <th>NOME CLIENTE</th>
                                    <th>CPF/CNPJ</th>
                                    <th>DATA DE NASCIMENTO</th>
                                    <th>CELULAR</th>
                                    <th>ENTRADA</th>
                                    <th>STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientesFila.map((cliente) => (
                                    <tr key={`${cliente.ID_EMPRESA}-${cliente.DT_MOVTO}-${cliente.ID_FILA}-${cliente.ID_CLIENTE}`}>
                                        <td>{cliente.NOME || 'N/A'}</td>
                                        <td>{formatarCpfCnpj(cliente.CPFCNPJ)}</td>
                                        <td>{formatarData(cliente.DT_NASC)}</td>
                                        <td>{formatarCelular(cliente.DDDCEL, cliente.NR_CEL)}</td>
                                        <td>{formatarHora(cliente.DT_ENTRA)} - {formatarData(cliente.DT_MOVTO)}</td>
                                        <td className="acao-buttons">
                                            {/* Lógica para exibir os botões de ação ou a mensagem de status */}
                                            {editingClienteId === cliente.ID_CLIENTE ? (
                                                // MODO DE EDIÇÃO: Sempre exibe todos os botões de ação para alterar
                                                <div className="icone-buttons-group">
                                                    <button
                                                        className="btn-acao btn-confirmar"
                                                        onClick={() => handleConfirmarPresenca(cliente)}
                                                        title="Confirmar Presença"
                                                    >
                                                        <FaCheckCircle />
                                                    </button>
                                                    <button
                                                        className="btn-acao btn-notificar"
                                                        onClick={() => handleEnviarNotificacao(cliente)}
                                                        title="Enviar Notificação"
                                                    >
                                                        <FaPaperPlane />
                                                    </button>
                                                    <button
                                                        className="btn-acao btn-nao-compareceu"
                                                        onClick={() => handleNaoCompareceu(cliente)}
                                                        title="Não Compareceu"
                                                    >
                                                        <FaTimesCircle />
                                                    </button>
                                                    <button
                                                        className="btn-acao btn-cancelar"
                                                        onClick={handleCancelarAlteracao}
                                                        title="Cancelar Alteração"
                                                    >
                                                        <FaUndo />
                                                    </button>
                                                </div>
                                            ) : (
                                                // MODO DE VISUALIZAÇÃO:
                                                <>
                                                    {cliente.SITUACAO === 1 || cliente.SITUACAO === 2 ? (
                                                        // Situações 1 (Presença Confirmada) ou 2 (Não Compareceu)
                                                        <div className="icone-buttons-group status-display">
                                                            <span className="acao-disabled-message">{getSituacaoText(cliente.SITUACAO)}</span>
                                                            <button
                                                                className="btn-acao btn-alterar"
                                                                onClick={() => handleAlterarSituacao(cliente.ID_CLIENTE)}
                                                                title="Alterar Situação"
                                                            >
                                                                <FaEdit />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        // Qualquer outra situação (0 - Aguardando, 3 - Chamado, 4 - Atendido, etc.)
                                                        <div className="icone-buttons-group">
                                                            <button
                                                                className="btn-acao btn-confirmar"
                                                                onClick={() => handleConfirmarPresenca(cliente)}
                                                                title="Confirmar Presença"
                                                            >
                                                                <FaCheckCircle />
                                                            </button>
                                                            <button
                                                                className="btn-acao btn-notificar"
                                                                onClick={() => handleEnviarNotificacao(cliente)}
                                                                title="Enviar Notificação"
                                                            >
                                                                <FaPaperPlane />
                                                            </button>
                                                            <button
                                                                className="btn-acao btn-nao-compareceu"
                                                                onClick={() => handleNaoCompareceu(cliente)}
                                                                title="Não Compareceu"
                                                            >
                                                                <FaTimesCircle />
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>

                {showModal && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-body modal-body-simplified">
                                <p>{modalMessage}</p>
                            </div>
                            <div className="modal-footer">
                                <button className="modal-ok-button" onClick={closeModal}>OK</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default GestaoFilaClientes;