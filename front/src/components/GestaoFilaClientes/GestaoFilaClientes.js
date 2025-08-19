// Arquivo: GestaoFilaClientes.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { io } from "socket.io-client"; // Importe o cliente do Socket.IO

import { FaCog, FaTv, FaChartBar, FaClipboardList, FaUser, FaSignOutAlt, FaCheckCircle, FaPaperPlane, FaTimesCircle, FaPlus } from 'react-icons/fa';
import { Modal, Button, Form } from 'react-bootstrap';
import Menu from '../Menu/Menu';
import './GestaoFilaClientes.css';

const GestaoFilaClientes = () => {
    const { idEmpresa, dtMovto, idFila } = useParams();
    const navigate = useNavigate();

    const [clientesFila, setClientesFila] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [novoCliente, setNovoCliente] = useState({ NOME: '', CPFCNPJ: '', DT_NASC: '', DDDCEL: '', NR_CEL: '' });
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [feedbackVariant, setFeedbackVariant] = useState('info');

    const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
    const nomeEmpresa = empresaSelecionada?.NOME_EMPRESA;
    const nomeUsuario = localStorage.getItem('nomeUsuario') || "Usuário";
    const cargoUsuario = "Gerente";

    const formatarData = (dataSQL) => {
        if (!dataSQL) return 'N/A';
        const date = new Date(dataSQL);
        if (isNaN(date.getTime())) return dataSQL.toString().substring(0, 10);
        const options = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' };
        return new Intl.DateTimeFormat('pt-BR', options).format(date);
    };

    const formatarHora = (timestampSQL) => {
        if (!timestampSQL) return 'N/A';
        const date = new Date(timestampSQL);
        if (isNaN(date.getTime())) return 'N/A';
        const options = { hour: '2-digit', minute: '2-digit', hour12: false };
        return new Intl.DateTimeFormat('pt-BR', options).format(date);
    };

    const formatarCpfCnpj = (valor) => {
        if (!valor) return 'N/A';
        const limpo = String(valor).replace(/\D/g, '');
        if (limpo.length === 11) return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        if (limpo.length === 14) return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        return valor;
    };

    const formatarCelular = (ddd, numero) => {
        if (!ddd || !numero) return 'N/A';
        const dddLimpo = String(ddd).replace(/\D/g, '');
        const numeroLimpo = String(numero).replace(/\D/g, '');

        if (numeroLimpo.length === 8) {
            return `(${dddLimpo}) ${numeroLimpo.replace(/(\d{4})(\d{4})/, '$1-$2')}`;
        } else if (numeroLimpo.length === 9) {
            return `(${dddLimpo}) ${numeroLimpo.replace(/(\d{5})(\d{4})/, '$1-$2')}`;
        }
        return `(${dddLimpo}) ${numeroLimpo}`;
    };

    const fetchClientesFilaCompleta = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/clientes`);
            setClientesFila(response.data);
        } catch (err) {
            setClientesFila([]);
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

        // 1. Conecta ao servidor WebSocket
        const socket = io("http://localhost:3001"); // Conecte ao seu servidor Node.js
        console.log("Conectado ao servidor WebSocket.");

        // 2. Escuta o evento 'cliente_atualizado'
        socket.on('cliente_atualizado', (data) => {
            console.log("Recebida notificação de cliente atualizado:", data);
            
            // Atualiza o estado local apenas para o cliente que mudou
            setClientesFila(prevClientes => {
                return prevClientes.map(cliente => {
                    if (cliente.ID_CLIENTE === data.idCliente) {
                        return { ...cliente, SITUACAO: data.novaSituacao };
                    }
                    return cliente;
                });
            });
        });

        // 3. Busca a lista completa na primeira carga
        fetchClientesFilaCompleta();

        // 4. Limpa a conexão e a busca quando o componente é desmontado
        return () => {
            socket.disconnect();
            console.log("Desconectado do servidor WebSocket.");
        };

    }, [idEmpresa, dtMovto, idFila, navigate, fetchClientesFilaCompleta]);

    const getSituacaoText = (situacao) => {
        switch (Number(situacao)) {
            case 0: return 'Aguardando';
            case 1: return 'Presença Confirmada';
            case 2: return 'Não Compareceu';
            case 3: return 'Chamado';
            case 4: return 'Atendido';
            default: return 'Desconhecido';
        }
    };

    const getSituacaoClass = (situacao) => {
        switch (Number(situacao)) {
            case 0: return 'aguardando';
            case 1: return 'presenca-confirmada';
            case 2: return 'nao-compareceu';
            case 3: return 'chamado';
            case 4: return 'atendido';
            default: return 'desconhecido';
        }
    };

    const openFeedbackModal = (message, variant = 'info') => {
        setFeedbackMessage(message);
        setFeedbackVariant(variant);
        setShowFeedbackModal(true);
    };

    const handleUpdateSituacao = async (cliente, novaSituacao, mensagemSucesso, mensagemErro) => {
        const situacaoOriginal = cliente.SITUACAO;

        setClientesFila(prev => prev.map(c =>
            c.ID_CLIENTE === cliente.ID_CLIENTE ? { ...c, SITUACAO: novaSituacao } : c
        ));

        try {
            await api.put(`/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/cliente/${cliente.ID_CLIENTE}/atualizar-situacao`, { novaSituacao });
            openFeedbackModal(mensagemSucesso, 'success');
        } catch (err) {
            console.error('Erro ao atualizar situação:', err);
            openFeedbackModal(mensagemErro, 'danger');
            setClientesFila(prev => prev.map(c =>
                c.ID_CLIENTE === cliente.ID_CLIENTE ? { ...c, SITUacao: situacaoOriginal } : c
            ));
        }
    };

    const handleConfirmarPresenca = (cliente) => handleUpdateSituacao(cliente, 1, `Presença de ${cliente.NOME} confirmada!`, 'Erro ao confirmar presença.');
    const handleNaoCompareceu = (cliente) => handleUpdateSituacao(cliente, 2, `${cliente.NOME} marcado como não compareceu.`, 'Erro ao marcar ausência.');
    
    const handleEnviarNotificacao = async (cliente) => {
        const url = `/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/cliente/${cliente.ID_CLIENTE}/enviar-notificacao`;
        try {
            const response = await api.post(url, {});

            setClientesFila(prev => prev.map(c =>
                c.ID_CLIENTE === cliente.ID_CLIENTE ? { ...c, SITUACAO: 3 } : c
            ));

            openFeedbackModal(response.data.message, 'success');
        } catch (err) {
            console.error('Erro ao enviar notificação:', err);
            const errorMessage = err.response?.data?.error || 'Erro ao agendar o timeout. Tente novamente.';
            openFeedbackModal(errorMessage, 'danger');
        }
    };

    const logout = () => {
        localStorage.clear();
        navigate('/');
    };

    const handleCloseAddModal = () => setShowAddModal(false);
    const handleShowAddModal = () => {
        setNovoCliente({ NOME: '', CPFCNPJ: '', DT_NASC: '', DDDCEL: '', NR_CEL: '' });
        setShowAddModal(true);
    };
    const handleNovoClienteChange = (e) => setNovoCliente(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleAdicionarCliente = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/adicionar-cliente`, novoCliente);
            handleCloseAddModal();
            openFeedbackModal('Cliente adicionado com sucesso!', 'success');
            fetchClientesFilaCompleta();
        } catch (err) {
            const msg = err.response?.data?.error || 'Erro ao adicionar cliente.';
            openFeedbackModal(msg, 'danger');
        }
    };

    const handleVerPainel = () => {
        navigate(`/painel-fila/${idEmpresa}/${dtMovto}/${idFila}`);
    };

    return (
        <div className="home-container">
            <Menu />
            <main className="main-content">
                

                <section className="clientes-fila-section">
                    <div className="section-header">
                        <h2 className="section-title">Clientes na Fila</h2>
                        <div className="header-buttons">
                            <Button variant="primary" onClick={handleShowAddModal} className="me-2"><FaPlus /> Adicionar Cliente</Button>
                            <Button variant="info" onClick={handleVerPainel}><FaTv /> Ver Painel</Button>
                        </div>
                    </div>

                    {loading && <p>Carregando clientes...</p>}
                    {error && <p className="error-message">{error}</p>}
                    {!loading && clientesFila.length === 0 && !error && (
                        <p>Nenhum cliente na fila. Clique em "Adicionar Cliente" para começar.</p>
                    )}

                    {!loading && clientesFila.length > 0 && (
                        <div className="table-responsive">
                            <table className="clientes-fila-table">
                                <thead>
                                    <tr>
                                        <th>NOME CLIENTE</th>
                                        <th>CPF/CNPJ</th>
                                        <th>ENTRADA</th>
                                        <th>STATUS E AÇÕES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clientesFila.map((cliente) => (
                                        <tr key={String(cliente.ID_EMPRESA) + '-' + String(cliente.DT_MOVTO) + '-' + String(cliente.ID_FILA) + '-' + String(cliente.ID_CLIENTE)} className="linha-cliente">
                                            <td>{cliente.NOME || 'N/A'}</td>
                                            <td>{formatarCpfCnpj(cliente.CPFCNPJ)}</td>
                                            <td>{formatarHora(cliente.DT_ENTRA)} - {formatarData(cliente.DT_MOVTO)}</td>
                                            <td className="coluna-status-acoes">
                                                <div className="conteudo-status-acoes">
                                                    <div className="situacao-wrapper">
                                                        <span className={`situacao-badge ${getSituacaoClass(cliente.SITUACAO)}`}>
                                                            {getSituacaoText(cliente.SITUACAO)}
                                                        </span>
                                                    </div>
                                                    <div className="botoes-acoes-contexto">
                                                        <button className="btn-acao btn-notificar" onClick={() => handleEnviarNotificacao(cliente)} title="Enviar Notificação"><FaPaperPlane /></button>
                                                        
                                                        <button className="btn-acao btn-confirmar" onClick={() => handleConfirmarPresenca(cliente)} title="Confirmar Presença"><FaCheckCircle /></button>
                                                        
                                                        <button className="btn-acao btn-nao-compareceu" onClick={() => handleNaoCompareceu(cliente)} title="Não Compareceu"><FaTimesCircle /></button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>

            <Modal show={showAddModal} onHide={handleCloseAddModal} centered>
                <Modal.Header closeButton><Modal.Title>Adicionar Novo Cliente</Modal.Title></Modal.Header>
                <Form onSubmit={handleAdicionarCliente}>
                    <Modal.Body>
                        <Form.Group className="mb-3"><Form.Label>Nome Completo*</Form.Label><Form.Control type="text" name="NOME" value={novoCliente.NOME} onChange={handleNovoClienteChange} required /></Form.Group>
                        <Form.Group className="mb-3"><Form.Label>CPF/CNPJ*</Form.Label><Form.Control type="text" name="CPFCNPJ" value={novoCliente.CPFCNPJ} onChange={handleNovoClienteChange} required /></Form.Group>
                        <Form.Group className="mb-3"><Form.Label>Data de Nascimento</Form.Label><Form.Control type="date" name="DT_NASC" value={novoCliente.DT_NASC} onChange={handleNovoClienteChange} /></Form.Group>
                        <div className="d-flex gap-3">
                            <Form.Group><Form.Label>DDD</Form.Label><Form.Control type="text" name="DDDCEL" value={novoCliente.DDDCEL} onChange={handleNovoClienteChange} /></Form.Group>
                            <Form.Group className="flex-grow-1"><Form.Label>Celular</Form.Label><Form.Control type="text" name="NR_CEL" value={novoCliente.NR_CEL} onChange={handleNovoClienteChange} /></Form.Group>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseAddModal}>Cancelar</Button>
                        <Button variant="primary" type="submit">Adicionar à Fila</Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            <Modal show={showFeedbackModal} onHide={() => setShowFeedbackModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{feedbackVariant === 'success' ? 'Sucesso!' : 'Aviso'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>{feedbackMessage}</Modal.Body>
                <Modal.Footer>
                    <Button variant={feedbackVariant} onClick={() => setShowFeedbackModal(false)}>OK</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default GestaoFilaClientes;