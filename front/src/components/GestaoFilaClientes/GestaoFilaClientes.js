// src/pages/GestaoFilaClientes/GestaoFilaClientes.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { io } from 'socket.io-client';

import {
  FaCheckCircle,
  FaPaperPlane,
  FaTimesCircle,
  FaPlus,
  FaLock,
  FaUnlock,
  FaTv
} from 'react-icons/fa';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import Menu from '../Menu/Menu';
import './GestaoFilaClientes.css';

const GestaoFilaClientes = () => {
  const { idEmpresa, dtMovto, idFila } = useParams();
  const navigate = useNavigate();

<<<<<<< HEAD
  const [clientesFila, setClientesFila] = useState([]);
  const [loading, setLoading] = useState(true);
=======
    const [clientesFila, setClientesFila] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    
    // RENOMEADO: Agora usa 'MEIO_NOTIFICACAO'
    const [novoCliente, setNovoCliente] = useState({ 
        NOME: '', 
        CPFCNPJ: '', 
        DT_NASC: '', 
        DDDCEL: '', 
        NR_CEL: '',
        MEIO_NOTIFICACAO: 'whatsapp',
        EMAIL: ''
    });
    
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [feedbackVariant, setFeedbackVariant] = useState('info');
>>>>>>> origin/Notificação_EntradaFila

  const [statusLoading, setStatusLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false); // estado real do bloqueio vindo do back
  const [error, setError] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [novoCliente, setNovoCliente] = useState({
    NOME: '',
    CPFCNPJ: '',
    DT_NASC: '',
    DDDCEL: '',
    NR_CEL: ''
  });

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackVariant, setFeedbackVariant] = useState('info');

  const [abaAtiva, setAbaAtiva] = useState('aguardando');

  const openFeedbackModal = (message, variant = 'info') => {
    setFeedbackMessage(message);
    setFeedbackVariant(variant);
    setShowFeedbackModal(true);
  };

  const formatarData = (dataSQL) => {
    if (!dataSQL) return 'N/A';
    const date = new Date(dataSQL);
    if (isNaN(date.getTime())) return String(dataSQL).substring(0, 10);
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

  const fetchClientesFilaCompleta = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/clientes`);
      setClientesFila(response.data || []);
    } catch (err) {
      setClientesFila([]);
      if (err.response?.status !== 404) setError('Não foi possível carregar os clientes da fila.');
      else setError('Nenhum cliente encontrado para esta fila.');
    } finally {
      setLoading(false);
    }
  }, [idEmpresa, dtMovto, idFila]);

  /**
   * Busca o status (BLOCK) do back no mount e sempre que precisar (após toggle, etc.)
   * Usa a rota disponível: GET /api/filas?idEmpresa=123
   * Nela já vêm: ID_FILA, BLOCK (como boolean transformado no controller), SITUACAO...
   */
  const fetchFilaStatus = useCallback(async () => {
    if (!idEmpresa || !idFila) return;
    setStatusLoading(true);
    try {
      const { data } = await api.get('/filas', { params: { idEmpresa } });
      const lista = Array.isArray(data) ? data : [];
      // procura a fila específica pelo ID_FILA
      const item = lista.find((f) => String(f.ID_FILA) === String(idFila));
      if (item && typeof item.BLOCK !== 'undefined') {
        setIsBlocked(Boolean(item.BLOCK));
      }
    } catch (e) {
      // silencioso (não bloqueia a UI)
    } finally {
      setStatusLoading(false);
    }
  }, [idEmpresa, idFila]);

  useEffect(() => {
    if (!idEmpresa || !dtMovto || !idFila) {
      navigate('/filas');
      return;
    }

    const socket = io('http://localhost:3001');

    socket.on('cliente_atualizado', (data) => {
      setClientesFila((prevClientes) => {
        const clienteExistente = prevClientes.find((c) => c.ID_CLIENTE === data.idCliente);
        if (clienteExistente) {
          return prevClientes.map((cliente) =>
            cliente.ID_CLIENTE === data.idCliente
              ? { ...cliente, SITUACAO: data.novaSituacao }
              : cliente
          );
        } else {
          fetchClientesFilaCompleta();
          return prevClientes;
        }
      });
    });

    // Carrega clientes e, em paralelo, o status da fila
    fetchClientesFilaCompleta();
    fetchFilaStatus();

    return () => {
      socket.disconnect();
    };
  }, [idEmpresa, dtMovto, idFila, navigate, fetchClientesFilaCompleta, fetchFilaStatus]);

  const getSituacaoText = (situacao) => {
    switch (Number(situacao)) {
      case 0:
        return 'Aguardando';
      case 1:
        return 'Presença Confirmada';
      case 2:
        return 'Não Compareceu';
      case 3:
        return 'Chamado';
      case 4:
        return 'Atendido';
      default:
        return 'Desconhecido';
    }
  };

  const getSituacaoClass = (situacao) => {
    switch (Number(situacao)) {
      case 0:
        return 'aguardando';
      case 1:
        return 'presenca-confirmada';
      case 2:
        return 'nao-compareceu';
      case 3:
        return 'chamado';
      case 4:
        return 'atendido';
      default:
        return 'desconhecido';
    }
  };

  const handleUpdateSituacao = async (cliente, novaSituacao, mensagemSucesso, mensagemErro) => {
    const situacaoOriginal = cliente.SITUACAO;

<<<<<<< HEAD
    setClientesFila((prev) =>
      prev.map((c) => (c.ID_CLIENTE === cliente.ID_CLIENTE ? { ...c, SITUACAO: novaSituacao } : c))
=======
        socket.on('cliente_atualizado', (data) => {
            console.log("Recebida notificação de cliente atualizado:", data);
            
            setClientesFila(prevClientes => {
                const clienteExistente = prevClientes.find(c => c.ID_CLIENTE === data.idCliente);
                if (clienteExistente) {
                    return prevClientes.map(cliente =>
                        cliente.ID_CLIENTE === data.idCliente ? { ...cliente, SITUACAO: data.novaSituacao } : cliente
                    );
                } else {
                    fetchClientesFilaCompleta();
                    return prevClientes;
                }
            });
        });

        fetchClientesFilaCompleta();

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

    const handleAdicionarCliente = async (e) => {
        e.preventDefault();
        try {
            // Nenhum ajuste necessário aqui, pois a função já envia o estado `novoCliente` completo.
            await api.post(`/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/adicionar-cliente`, novoCliente);
            handleCloseAddModal();
            openFeedbackModal('Cliente adicionado com sucesso!', 'success');
            fetchClientesFilaCompleta();
        } catch (err) {
            const msg = err.response?.data?.error || 'Erro ao adicionar cliente.';
            openFeedbackModal(msg, 'danger');
        }
    };

    const handleCloseAddModal = () => setShowAddModal(false);
    
    // RENOMEADO: Agora usa 'MEIO_NOTIFICACAO' no estado inicial
    const handleShowAddModal = () => {
        setNovoCliente({ 
            NOME: '', 
            CPFCNPJ: '', 
            DT_NASC: '', 
            DDDCEL: '', 
            NR_CEL: '',
            MEIO_NOTIFICACAO: 'whatsapp',
            EMAIL: ''
        });
        setShowAddModal(true);
    };
    
    const handleNovoClienteChange = (e) => setNovoCliente(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleVerPainel = () => {
        navigate(`/painel-fila/${idEmpresa}/${dtMovto}/${idFila}`);
    };

    const filtrarClientes = () => {
        switch (abaAtiva) {
            case 'aguardando':
                return clientesFila.filter(cliente => Number(cliente.SITUACAO) === 0 || Number(cliente.SITUACAO) === 3);
            case 'confirmados':
                return clientesFila.filter(cliente => Number(cliente.SITUACAO) === 1 || Number(cliente.SITUACAO) === 4);
            case 'nao-compareceu':
                return clientesFila.filter(cliente => Number(cliente.SITUACAO) === 2);
            default:
                return [];
        }
    };

    const clientesFiltrados = filtrarClientes();

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
                    
                    <div className="tabs-container">
                        <div className="tabs-list">
                            <button
                                className={`tab-button ${abaAtiva === 'aguardando' ? 'active' : ''}`}
                                onClick={() => setAbaAtiva('aguardando')}
                            >
                                Aguardando & Chamados
                            </button>
                            <button
                                className={`tab-button ${abaAtiva === 'confirmados' ? 'active' : ''}`}
                                onClick={() => setAbaAtiva('confirmados')}
                            >
                                Confirmados
                            </button>
                            <button
                                className={`tab-button ${abaAtiva === 'nao-compareceu' ? 'active' : ''}`}
                                onClick={() => setAbaAtiva('nao-compareceu')}
                            >
                                Não Compareceu
                            </button>
                        </div>
                    </div>

                    {loading && <p>Carregando clientes...</p>}
                    {error && <p className="error-message">{error}</p>}
                    {!loading && clientesFiltrados.length === 0 && !error && (
                        <p>Nenhum cliente na fila.</p>
                    )}

                    {!loading && clientesFiltrados.length > 0 && (
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
                                    {clientesFiltrados.map((cliente) => (
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
                        {/* CAMPOS EXISTENTES */}
                        <Form.Group className="mb-3"><Form.Label>Nome Completo*</Form.Label><Form.Control type="text" name="NOME" value={novoCliente.NOME} onChange={handleNovoClienteChange} required /></Form.Group>
                        <Form.Group className="mb-3"><Form.Label>CPF/CNPJ*</Form.Label><Form.Control type="text" name="CPFCNPJ" value={novoCliente.CPFCNPJ} onChange={handleNovoClienteChange} required /></Form.Group>
                        <Form.Group className="mb-3"><Form.Label>Data de Nascimento</Form.Label><Form.Control type="date" name="DT_NASC" value={novoCliente.DT_NASC} onChange={handleNovoClienteChange} /></Form.Group>
                        
                        {/* NOVO CAMPO: SELEÇÃO DA FORMA DE NOTIFICAÇÃO */}
                        <Form.Group className="mb-3">
                            <Form.Label>Forma de Notificação</Form.Label>
                            <Form.Select 
                                name="MEIO_NOTIFICACAO" 
                                value={novoCliente.MEIO_NOTIFICACAO} 
                                onChange={handleNovoClienteChange} 
                                required
                            >
                                <option value="whatsapp">WhatsApp</option>
                                <option value="sms">SMS</option>
                                <option value="email">E-mail</option>
                            </Form.Select>
                        </Form.Group>
                        
                        {/* NOVO CAMPO CONDICIONAL: E-MAIL */}
                        {novoCliente.MEIO_NOTIFICACAO === 'email' && (
                            <Form.Group className="mb-3">
                                <Form.Label>E-mail</Form.Label>
                                <Form.Control 
                                    type="email" 
                                    name="EMAIL" 
                                    value={novoCliente.EMAIL} 
                                    onChange={handleNovoClienteChange} 
                                    required={novoCliente.MEIO_NOTIFICACAO === 'email'}
                                />
                            </Form.Group>
                        )}
                        
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
>>>>>>> origin/Notificação_EntradaFila
    );

    try {
      await api.put(
        `/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/cliente/${cliente.ID_CLIENTE}/atualizar-situacao`,
        { novaSituacao }
      );
      openFeedbackModal(mensagemSucesso, 'success');
    } catch (err) {
      openFeedbackModal(mensagemErro, 'danger');
      // rollback
      setClientesFila((prev) =>
        prev.map((c) => (c.ID_CLIENTE === cliente.ID_CLIENTE ? { ...c, SITUACAO: situacaoOriginal } : c))
      );
    }
  };

  const handleConfirmarPresenca = (cliente) =>
    handleUpdateSituacao(cliente, 1, `Presença de ${cliente.NOME} confirmada!`, 'Erro ao confirmar presença.');

  const handleNaoCompareceu = (cliente) =>
    handleUpdateSituacao(cliente, 2, `${cliente.NOME} marcado como não compareceu.`, 'Erro ao marcar ausência.');

  const handleEnviarNotificacao = async (cliente) => {
    const url = `/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/cliente/${cliente.ID_CLIENTE}/enviar-notificacao`;
    try {
      const response = await api.post(url, {});
      setClientesFila((prev) =>
        prev.map((c) => (c.ID_CLIENTE === cliente.ID_CLIENTE ? { ...c, SITUACAO: 3 } : c))
      );
      openFeedbackModal(response?.data?.message || 'Cliente notificado.', 'success');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Erro ao agendar o timeout. Tente novamente.';
      openFeedbackModal(errorMessage, 'danger');
    }
  };

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

  const handleCloseAddModal = () => setShowAddModal(false);
  const handleShowAddModal = () => {
    setNovoCliente({ NOME: '', CPFCNPJ: '', DT_NASC: '', DDDCEL: '', NR_CEL: '' });
    setShowAddModal(true);
  };
  const handleNovoClienteChange = (e) =>
    setNovoCliente((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleVerPainel = () => {
    navigate(`/painel-fila/${idEmpresa}/${dtMovto}/${idFila}`);
  };

  /**
   * Bloquear/desbloquear garantindo coerência:
   * - desired = true  -> bloqueia (BLOCK=1) e inativa (SITUACAO=0)
   * - desired = false -> desbloqueia (BLOCK=0) e ativa (SITUACAO=1)
   *
   * Usa:
   *   PUT /api/filas/:id_fila/block   { block: boolean }
   *   PUT /api/filas/:id_fila/status  { situacao: boolean }
   *
   * E DEPOIS chama fetchFilaStatus() para, ao voltar na tela, a UI começar já com o estado certo.
   */
  const toggleBlockFila = async () => {
    if (!idFila) return;
    setStatusLoading(true);
    const desired = !isBlocked;

    try {
      // 1) Atualiza BLOCK
      await api.put(`/filas/${idFila}/block`, { block: desired });

      // 2) Mantém coerência com SITUACAO
      const situacao = desired ? false : true;
      await api.put(`/filas/${idFila}/status`, { situacao });

      // 3) Atualiza UI imediata
      setIsBlocked(desired);

      // 4) Garante que o estado inicial (quando reabrir a tela) venha correto
      await fetchFilaStatus();

      openFeedbackModal(
        desired
          ? 'Fila bloqueada para novas entradas públicas hoje.'
          : 'Fila desbloqueada para novas entradas públicas.',
        'success'
      );
    } catch (err) {
      const msg =
        err.response?.data?.erro ||
        err.response?.data?.mensagem ||
        err.response?.data?.error ||
        'Não foi possível alterar o bloqueio da fila.';
      openFeedbackModal(msg, 'danger');
    } finally {
      setStatusLoading(false);
    }
  };

  const filtrarClientes = () => {
    switch (abaAtiva) {
      case 'aguardando':
        return clientesFila.filter(
          (cliente) => Number(cliente.SITUACAO) === 0 || Number(cliente.SITUACAO) === 3
        );
      case 'confirmados':
        return clientesFila.filter(
          (cliente) => Number(cliente.SITUACAO) === 1 || Number(cliente.SITUACAO) === 4
        );
      case 'nao-compareceu':
        return clientesFila.filter((cliente) => Number(cliente.SITUACAO) === 2);
      default:
        return [];
    }
  };

  const clientesFiltrados = filtrarClientes();

  return (
    <div className="home-container">
      <Menu />
      <main className="main-content">
        <section className="clientes-fila-section">
          <div className="section-header">
            <h2 className="section-title">Clientes na Fila</h2>
            <div className="header-buttons">
              {/* Bloquear/Desbloquear Fila */}
              <Button
                variant={isBlocked ? 'success' : 'warning'}
                onClick={toggleBlockFila}
                className="me-2"
                disabled={statusLoading}
                title={
                  isBlocked
                    ? 'Desbloquear fila (permitir novas entradas públicas)'
                    : 'Bloquear fila (impedir novas entradas públicas)'
                }
              >
                {statusLoading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" />&nbsp;Carregando...
                  </>
                ) : isBlocked ? (
                  <>
                    <FaUnlock /> Desbloquear fila
                  </>
                ) : (
                  <>
                    <FaLock /> Bloquear fila
                  </>
                )}
              </Button>

              <Button variant="primary" onClick={handleShowAddModal} className="me-2">
                <FaPlus /> Adicionar Cliente
              </Button>
              <Button variant="info" onClick={handleVerPainel}>
                <FaTv /> Ver Painel
              </Button>
            </div>
          </div>

          {/* Aviso quando bloqueada (bloqueio diário só impede entradas públicas) */}
          {isBlocked && (
            <Alert variant="warning" className="mb-3">
              <strong>Fila bloqueada hoje:</strong> novas entradas <em>públicas</em> estão impedidas.
              A gestão dos clientes já na fila segue normal.
            </Alert>
          )}

          <div className="tabs-container">
            <div className="tabs-list">
              <button
                className={`tab-button ${abaAtiva === 'aguardando' ? 'active' : ''}`}
                onClick={() => setAbaAtiva('aguardando')}
              >
                Aguardando & Chamados
              </button>
              <button
                className={`tab-button ${abaAtiva === 'confirmados' ? 'active' : ''}`}
                onClick={() => setAbaAtiva('confirmados')}
              >
                Confirmados
              </button>
              <button
                className={`tab-button ${abaAtiva === 'nao-compareceu' ? 'active' : ''}`}
                onClick={() => setAbaAtiva('nao-compareceu')}
              >
                Não Compareceu
              </button>
            </div>
          </div>

          {loading && <p>Carregando clientes...</p>}
          {error && <p className="error-message">{error}</p>}
          {!loading && clientesFiltrados.length === 0 && !error && <p>Nenhum cliente na fila.</p>}

          {!loading && clientesFiltrados.length > 0 && (
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
                  {clientesFiltrados.map((cliente) => (
                    <tr
                      key={
                        String(cliente.ID_EMPRESA) +
                        '-' +
                        String(cliente.DT_MOVTO) +
                        '-' +
                        String(cliente.ID_FILA) +
                        '-' +
                        String(cliente.ID_CLIENTE)
                      }
                      className="linha-cliente"
                    >
                      <td>{cliente.NOME || 'N/A'}</td>
                      <td>{formatarCpfCnpj(cliente.CPFCNPJ)}</td>
                      <td>
                        {formatarHora(cliente.DT_ENTRA)} - {formatarData(cliente.DT_MOVTO)}
                      </td>
                      <td className="coluna-status-acoes">
                        <div className="conteudo-status-acoes">
                          <div className="situacao-wrapper">
                            <span className={`situacao-badge ${getSituacaoClass(cliente.SITUACAO)}`}>
                              {getSituacaoText(cliente.SITUACAO)}
                            </span>
                          </div>
                          <div className="botoes-acoes-contexto">
                            <button
                              className="btn-acao btn-notificar"
                              onClick={() => handleEnviarNotificacao(cliente)}
                              title="Enviar Notificação"
                            >
                              <FaPaperPlane />
                            </button>
                            <button
                              className="btn-acao btn-confirmar"
                              onClick={() => handleConfirmarPresenca(cliente)}
                              title="Confirmar Presença"
                            >
                              <FaCheckCircle />
                            </button>
                            <button
                              className="btn-acao btn-nao-compareceu"
                              onClick={() => handleNaoCompareceu(cliente)}
                              title="Não Compareceu"
                            >
                              <FaTimesCircle />
                            </button>
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
        <Modal.Header closeButton>
          <Modal.Title>Adicionar Novo Cliente</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAdicionarCliente}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nome Completo*</Form.Label>
              <Form.Control
                type="text"
                name="NOME"
                value={novoCliente.NOME}
                onChange={handleNovoClienteChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>CPF/CNPJ*</Form.Label>
              <Form.Control
                type="text"
                name="CPFCNPJ"
                value={novoCliente.CPFCNPJ}
                onChange={handleNovoClienteChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Data de Nascimento</Form.Label>
              <Form.Control
                type="date"
                name="DT_NASC"
                value={novoCliente.DT_NASC}
                onChange={handleNovoClienteChange}
              />
            </Form.Group>
            <div className="d-flex gap-3">
              <Form.Group>
                <Form.Label>DDD</Form.Label>
                <Form.Control
                  type="text"
                  name="DDDCEL"
                  value={novoCliente.DDDCEL}
                  onChange={handleNovoClienteChange}
                />
              </Form.Group>
              <Form.Group className="flex-grow-1">
                <Form.Label>Celular</Form.Label>
                <Form.Control
                  type="text"
                  name="NR_CEL"
                  value={novoCliente.NR_CEL}
                  onChange={handleNovoClienteChange}
                />
              </Form.Group>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseAddModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Adicionar à Fila
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showFeedbackModal} onHide={() => setShowFeedbackModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{feedbackVariant === 'success' ? 'Sucesso!' : 'Aviso'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{feedbackMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant={feedbackVariant} onClick={() => setShowFeedbackModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default GestaoFilaClientes;
