import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { io } from 'socket.io-client';
import { useTranslation } from 'react-i18next';

import {
    FaCheckCircle,
    FaPaperPlane,
    FaTimesCircle,
    FaPlus,
    FaLock,
    FaUnlock,
    FaTv,
} from 'react-icons/fa';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import Menu from '../Menu/Menu';
import './GestaoFilaClientes.css';

// Página recebe 'onLogout' como prop
const GestaoFilaClientes = ({ onLogout }) => {
    const { idEmpresa, dtMovto, idFila } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation(); // <- agora também usamos i18n

    const [clientesFila, setClientesFila] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusLoading, setStatusLoading] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [feedbackVariant, setFeedbackVariant] = useState('info');
    const [novoCliente, setNovoCliente] = useState({
        NOME: '',
        CPFCNPJ: '',
        DT_NASC: '',
        DDDCEL: '',
        NR_CEL: '',
        MEIO_NOTIFICACAO: 'whatsapp',
        EMAIL: '',
    });
    const [abaAtiva, setAbaAtiva] = useState('aguardando');

    // ======== NOVO: garante idioma do HTML para inputs nativos (date) ========
    useEffect(() => {
        const htmlLang = i18n.language?.startsWith('en') ? 'en' : 'pt-BR';
        document.documentElement.lang = htmlLang;
    }, [i18n.language]);

    // ======== NOVO: helpers do campo de data ========
    const getDateInputLang = () => (i18n.language?.startsWith('en') ? 'en-US' : 'pt-BR');
    const getDatePlaceholder = () => (i18n.language?.startsWith('en') ? 'mm/dd/yyyy' : 'dd/mm/aaaa');

    // ------------------------
    // helpers
    // ------------------------
    const isValidCPF = (cpf) => {
        if (typeof cpf !== 'string') return false;
        cpf = cpf.replace(/[^\d]+/g, '');
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        let soma = 0;
        let resto;
        for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;
        soma = 0;
        for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11))) return false;
        return true;
    };

    const isValidCNPJ = (cnpj) => {
        if (typeof cnpj !== 'string') return false;
        cnpj = cnpj.replace(/[^\d]+/g, '');
        if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
        let tamanho = cnpj.length - 2;
        let numeros = cnpj.substring(0, tamanho);
        let digitos = cnpj.substring(tamanho);
        let soma = 0;
        let pos = tamanho - 7;
        for (let i = tamanho; i >= 1; i--) {
            soma += numeros.charAt(tamanho - i) * pos--;
            if (pos < 2) pos = 9;
        }
        let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
        if (resultado != digitos.charAt(0)) return false;
        tamanho = tamanho + 1;
        numeros = cnpj.substring(0, tamanho);
        soma = 0;
        pos = tamanho - 7;
        for (let i = tamanho; i >= 1; i--) {
            soma += numeros.charAt(tamanho - i) * pos--;
            if (pos < 2) pos = 9;
        }
        resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
        if (resultado != digitos.charAt(1)) return false;
        return true;
    };

    const openFeedbackModal = (message, variant = 'info') => {
        setFeedbackMessage(message);
        setFeedbackVariant(variant);
        setShowFeedbackModal(true);
    };

    // Locale dinâmico a partir do i18n
    const getLocale = () => {
        const lang = (i18n.language || 'pt-BR').toLowerCase();
        if (lang.startsWith('en')) return 'en-US';
        if (lang.startsWith('pt')) return 'pt-BR';
        // fallback
        return 'en-US';
    };

    // 🔄 Datas e horários internacionalizados
    const formatarData = (dataSQL) => {
        if (!dataSQL) return 'N/A';
        const date = new Date(dataSQL);
        if (isNaN(date.getTime())) return String(dataSQL).substring(0, 10);

        // dtMovto vem como "data do movimento" (data pura). Para evitar off-by-one,
        // mantemos timezone em UTC na data (sem hora).
        const options = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' };
        return new Intl.DateTimeFormat(getLocale(), options).format(date);
    };

    const formatarHora = (timestampSQL) => {
        if (!timestampSQL) return 'N/A';
        const date = new Date(timestampSQL);
        if (isNaN(date.getTime())) return 'N/A';

        const isEnglish = getLocale() === 'en-US';
        const options = { hour: '2-digit', minute: '2-digit', hour12: isEnglish };
        return new Intl.DateTimeFormat(getLocale(), options).format(date);
    };

    const formatarCpfCnpj = (valor) => {
        if (!valor) return 'N/A';
        const limpo = String(valor).replace(/\D/g, '');
        if (limpo.length === 11) return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        if (limpo.length === 14) return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        return valor;
    };

    // ------------------------
    // data fetching
    // ------------------------
    const fetchClientesFilaCompleta = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/clientes`);
            setClientesFila(response.data || []);
        } catch (err) {
            setClientesFila([]);
            if (err.response?.status !== 404) setError(t('gestaoFila.erros.carregarClientes'));
            else setError(t('gestaoFila.erros.nenhumCliente'));
        } finally {
            setLoading(false);
        }
    }, [idEmpresa, dtMovto, idFila, t]);

    const fetchFilaStatus = useCallback(async () => {
        if (!idEmpresa || !idFila) return;
        setStatusLoading(true);
        try {
            const { data } = await api.get('/filas', { params: { idEmpresa } });
            const lista = Array.isArray(data) ? data : [];
            const item = lista.find((f) => String(f.ID_FILA) === String(idFila));
            if (item && typeof item.BLOCK !== 'undefined') {
                setIsBlocked(Boolean(item.BLOCK));
            }
        } catch (e) {
            // silencioso
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

        fetchClientesFilaCompleta();
        fetchFilaStatus();

        return () => {
            socket.disconnect();
        };
    }, [idEmpresa, dtMovto, idFila, navigate, fetchClientesFilaCompleta, fetchFilaStatus]);

    // ------------------------
    // UI helpers
    // ------------------------
    const getSituacaoText = (situacao) => {
        switch (Number(situacao)) {
            case 0: return t('gestaoFila.status.aguardando');
            case 1: return t('gestaoFila.status.confirmado');
            case 2: return t('gestaoFila.status.naoCompareceu');
            case 3: return t('gestaoFila.status.chamado');
            case 4: return t('gestaoFila.status.atendido');
            default: return t('gestaoFila.status.desconhecido');
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

    // ------------------------
    // actions
    // ------------------------
    const handleUpdateSituacao = async (cliente, novaSituacao, mensagemSucesso, mensagemErro) => {
        const situacaoOriginal = cliente.SITUACAO;
        setClientesFila((prev) =>
            prev.map((c) => (c.ID_CLIENTE === cliente.ID_CLIENTE ? { ...c, SITUACAO: novaSituacao } : c))
        );
        try {
            await api.put(
                `/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/cliente/${cliente.ID_CLIENTE}/atualizar-situacao`,
                { novaSituacao }
            );
            openFeedbackModal(mensagemSucesso, 'success');
        } catch (err) {
            openFeedbackModal(mensagemErro, 'danger');
            setClientesFila((prev) =>
                prev.map((c) =>
                    c.ID_CLIENTE === cliente.ID_CLIENTE ? { ...c, SITUACAO: situacaoOriginal } : c
                )
            );
        }
    };

    const handleConfirmarPresenca = (cliente) =>
        handleUpdateSituacao(
            cliente,
            1,
            t('gestaoFila.feedback.presencaConfirmada', { nome: cliente.NOME }),
            t('gestaoFila.erros.confirmarPresenca')
        );

    const handleNaoCompareceu = (cliente) =>
        handleUpdateSituacao(
            cliente,
            2,
            t('gestaoFila.feedback.naoCompareceu', { nome: cliente.NOME }),
            t('gestaoFila.erros.marcarAusencia')
        );

    const handleEnviarNotificacao = async (cliente) => {
        const url = `/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/cliente/${cliente.ID_CLIENTE}/enviar-notificacao`;
        try {
            const response = await api.post(url, {});
            setClientesFila((prev) =>
                prev.map((c) => (c.ID_CLIENTE === cliente.ID_CLIENTE ? { ...c, SITUACAO: 3 } : c))
            );
            openFeedbackModal(response?.data?.message || t('gestaoFila.feedback.notificado'), 'success');
        } catch (err) {
            const errorMessage = err.response?.data?.error || t('gestaoFila.erros.agendarTimeout');
            openFeedbackModal(errorMessage, 'danger');
        }
    };

    const handleAdicionarCliente = async (e) => {
        e.preventDefault();

        if (novoCliente.NOME.trim().length < 3) {
            openFeedbackModal('O nome deve ter no mínimo 3 letras.', 'danger');
            return;
        }

        const doc = novoCliente.CPFCNPJ.replace(/[^\d]+/g, '');
        if (doc.length === 11) {
            if (!isValidCPF(doc)) {
                openFeedbackModal('O CPF informado é inválido. Por favor, verifique.', 'danger');
                return;
            }
        } else if (doc.length === 14) {
            if (!isValidCNPJ(doc)) {
                openFeedbackModal('O CNPJ informado é inválido. Por favor, verifique.', 'danger');
                return;
            }
        } else {
            openFeedbackModal('O campo CPF/CNPJ deve conter 11 ou 14 dígitos.', 'danger');
            return;
        }

        try {
            await api.post(`/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/adicionar-cliente`, novoCliente);
            handleCloseAddModal();
            openFeedbackModal(t('gestaoFila.feedback.clienteAdicionado'), 'success');
            fetchClientesFilaCompleta();
        } catch (err) {
            const msg = err.response?.data?.error || t('gestaoFila.erros.adicionarCliente');
            openFeedbackModal(msg, 'danger');
        }
    };

    const handleCloseAddModal = () => setShowAddModal(false);
    const handleShowAddModal = () => {
        setNovoCliente({ NOME: '', CPFCNPJ: '', DT_NASC: '', DDDCEL: '', NR_CEL: '', MEIO_NOTIFICACAO: 'whatsapp', EMAIL: '' });
        setShowAddModal(true);
    };
    const handleNovoClienteChange = (e) => setNovoCliente((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleVerPainel = () => {
        navigate(`/painel-fila/${idEmpresa}/${dtMovto}/${idFila}`);
    };

    const toggleBlockFila = async () => {
        if (!idFila) return;
        setStatusLoading(true);
        const desired = !isBlocked;
        try {
            await api.put(`/filas/${idFila}/block`, { block: desired });
            const situacao = desired ? false : true;
            await api.put(`/filas/${idFila}/status`, { situacao });
            setIsBlocked(desired);
            await fetchFilaStatus();
            openFeedbackModal(
                desired ? t('gestaoFila.feedback.filaBloqueada') : t('gestaoFila.feedback.filaDesbloqueada'),
                'success'
            );
        } catch (err) {
            const msg = err.response?.data?.erro || err.response?.data?.mensagem || err.response?.data?.error || t('gestaoFila.erros.alterarBloqueio');
            openFeedbackModal(msg, 'danger');
        } finally {
            setStatusLoading(false);
        }
    };

    // ------------------------
    // filtros
    // ------------------------
    const filtrarClientes = () => {
        switch (abaAtiva) {
            case 'aguardando': return clientesFila.filter((c) => Number(c.SITUACAO) === 0 || Number(c.SITUACAO) === 3);
            case 'confirmados': return clientesFila.filter((c) => Number(c.SITUACAO) === 1 || Number(c.SITUACAO) === 4);
            case 'nao-compareceu': return clientesFila.filter((c) => Number(c.SITUACAO) === 2);
            default: return [];
        }
    };

    const clientesFiltrados = filtrarClientes();

    // ------------------------
    // render
    // ------------------------
    return (
        <div className="home-container">
            <Menu onLogout={onLogout} />
            <main className="main-content">
                <section className="clientes-fila-section">
                    <div className="section-header">
                        <h2 className="section-title">{t('gestaoFila.titulo')}</h2>
                        <div className="header-buttons">
                            <Button
                                variant={isBlocked ? 'success' : 'warning'}
                                onClick={toggleBlockFila}
                                className="me-2"
                                disabled={statusLoading}
                                title={isBlocked ? t('gestaoFila.botoes.desbloquearTitle') : t('gestaoFila.botoes.bloquearTitle')}
                            >
                                {statusLoading ? (
                                    <><Spinner as="span" animation="border" size="sm" />&nbsp;{t('geral.carregando')}</>
                                ) : isBlocked ? (
                                    <><FaUnlock /> {t('gestaoFila.botoes.desbloquear')}</>
                                ) : (
                                    <><FaLock /> {t('gestaoFila.botoes.bloquear')}</>
                                )}
                            </Button>
                            <Button variant="primary" onClick={handleShowAddModal} className="me-2" disabled={isBlocked}>
                                <FaPlus /> {t('gestaoFila.botoes.adicionar')}
                            </Button>
                            <Button variant="info" onClick={handleVerPainel}>
                                <FaTv /> {t('gestaoFila.botoes.verPainel')}
                            </Button>
                        </div>
                    </div>

                    {isBlocked && (
                        <Alert variant="warning" className="mb-3">
                            <strong>{t('gestaoFila.alertaBloqueio.titulo')}</strong> {t('gestaoFila.alertaBloqueio.texto')}
                        </Alert>
                    )}

                    <div className="tabs-container">
                        <div className="tabs-list">
                            <button className={`tab-button ${abaAtiva === 'aguardando' ? 'active' : ''}`} onClick={() => setAbaAtiva('aguardando')}>
                                {t('gestaoFila.abas.aguardando')}
                            </button>
                            <button className={`tab-button ${abaAtiva === 'confirmados' ? 'active' : ''}`} onClick={() => setAbaAtiva('confirmados')}>
                                {t('gestaoFila.abas.confirmados')}
                            </button>
                            <button className={`tab-button ${abaAtiva === 'nao-compareceu' ? 'active' : ''}`} onClick={() => setAbaAtiva('nao-compareceu')}>
                                {t('gestaoFila.abas.naoCompareceu')}
                            </button>
                        </div>
                    </div>

                    {loading && <p>{t('geral.carregandoClientes')}</p>}
                    {error && <p className="error-message">{error}</p>}
                    {!loading && clientesFiltrados.length === 0 && !error && (
                        <p>{t('gestaoFila.nenhumCliente')}</p>
                    )}

                    {!loading && clientesFiltrados.length > 0 && (
                        <div className="table-responsive">
                            <table className="clientes-fila-table">
                                <thead>
                                    <tr>
                                        <th>{t('gestaoFila.tabela.cliente')}</th>
                                        <th>{t('gestaoFila.tabela.cpfCnpj')}</th>
                                        <th>{t('gestaoFila.tabela.entrada')}</th>
                                        <th>{t('gestaoFila.tabela.statusAcoes')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clientesFiltrados.map((cliente) => (
                                        <tr
                                          key={
                                            String(cliente.ID_EMPRESA) + '-' +
                                            String(cliente.DT_MOVTO) + '-' +
                                            String(cliente.ID_FILA) + '-' +
                                            String(cliente.ID_CLIENTE)
                                          }
                                          className="linha-cliente"
                                        >
                                            <td>{cliente.NOME || 'N/A'}</td>
                                            <td>{formatarCpfCnpj(cliente.CPFCNPJ)}</td>
                                            <td>
                                                {formatarHora(cliente.DT_ENTRA)} - {formatarData(cliente.DT_ENTRA)}
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
                                                            title={t('gestaoFila.acoes.notificar')}
                                                        >
                                                            <FaPaperPlane />
                                                        </button>
                                                        <button
                                                            className="btn-acao btn-confirmar"
                                                            onClick={() => handleConfirmarPresenca(cliente)}
                                                            title={t('gestaoFila.acoes.confirmar')}
                                                        >
                                                            <FaCheckCircle />
                                                        </button>
                                                        <button
                                                            className="btn-acao btn-nao-compareceu"
                                                            onClick={() => handleNaoCompareceu(cliente)}
                                                            title={t('gestaoFila.acoes.naoCompareceu')}
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
                    <Modal.Title>{t('gestaoFila.modalAdicionar.titulo')}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleAdicionarCliente}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>{t('gestaoFila.modalAdicionar.nome')}*</Form.Label>
                            <Form.Control type="text" name="NOME" value={novoCliente.NOME} onChange={handleNovoClienteChange} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>{t('gestaoFila.modalAdicionar.cpfCnpj')}*</Form.Label>
                            <Form.Control type="text" name="CPFCNPJ" value={novoCliente.CPFCNPJ} onChange={handleNovoClienteChange} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>{t('gestaoFila.modalAdicionar.nascimento')}</Form.Label>
                            <Form.Control
                                type="date"
                                name="DT_NASC"
                                value={novoCliente.DT_NASC}
                                onChange={handleNovoClienteChange}
                                // ======== NOVO: idioma do calendário e dica visual ========
                                lang={getDateInputLang()}
                                placeholder={getDatePlaceholder()}
                                inputMode="numeric"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>{t('gestaoFila.modalAdicionar.notificacao')}</Form.Label>
                            <Form.Select name="MEIO_NOTIFICACAO" value={novoCliente.MEIO_NOTIFICACAO} onChange={handleNovoClienteChange} required>
                                <option value="whatsapp">WhatsApp</option>
                                <option value="sms">SMS</option>
                                <option value="email">E-mail</option>
                            </Form.Select>
                        </Form.Group>
                        {novoCliente.MEIO_NOTIFICACAO === 'email' && (
                            <Form.Group className="mb-3">
                                <Form.Label>E-mail</Form.Label>
                                <Form.Control type="email" name="EMAIL" value={novoCliente.EMAIL} onChange={handleNovoClienteChange} required={novoCliente.MEIO_NOTIFICACAO === 'email'} />
                            </Form.Group>
                        )}
                        <div className="d-flex gap-3">
                            <Form.Group>
                                <Form.Label>DDD</Form.Label>
                                <Form.Control type="text" name="DDDCEL" value={novoCliente.DDDCEL} onChange={handleNovoClienteChange} />
                            </Form.Group>
                            <Form.Group className="flex-grow-1">
                                <Form.Label>{t('gestaoFila.modalAdicionar.celular')}</Form.Label>
                                <Form.Control type="text" name="NR_CEL" value={novoCliente.NR_CEL} onChange={handleNovoClienteChange} />
                            </Form.Group>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseAddModal}>{t('geral.cancelar')}</Button>
                        <Button variant="primary" type="submit">{t('gestaoFila.modalAdicionar.adicionar')}</Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            <Modal show={showFeedbackModal} onHide={() => setShowFeedbackModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{feedbackVariant === 'success' ? t('geral.sucesso') : t('geral.aviso')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>{feedbackMessage}</Modal.Body>
                <Modal.Footer>
                    <Button variant={feedbackVariant} onClick={() => setShowFeedbackModal(false)}>{t('geral.ok')}</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default GestaoFilaClientes;
