import React, { useEffect, useState } from 'react';
import Menu from '../Menu/Menu';
import { FaUsers, FaUserPlus, FaCog, FaTrash } from 'react-icons/fa';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import { Modal, Button, Form } from 'react-bootstrap';

const Home = () => {
    // --- STATES DO COMPONENTE ---
    const [usuarios, setUsuarios] = useState([]);
    const [perfis, setPerfis] = useState([]);
    const [detalhesEmpresa, setDetalhesEmpresa] = useState(null);
    const [nomeUsuarioLogado, setNomeUsuarioLogado] = useState('');

    // States para o formulário de adicionar usuário
    const [novoUsuario, setNovoUsuario] = useState('');
    const [perfilSelecionado, setPerfilSelecionado] = useState('');

    // States para controle de modais
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [usuarioParaExcluir, setUsuarioParaExcluir] = useState(null);
    
    const [mostrarModalEmpresa, setMostrarModalEmpresa] = useState(false);

    const navigate = useNavigate();
    const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
    const idEmpresa = empresaSelecionada?.ID_EMPRESA;
    const nomeEmpresa = empresaSelecionada?.NOME_EMPRESA;
    const nivel = Number(empresaSelecionada?.NIVEL);

    // --- EFEITOS E BUSCA DE DADOS ---
    useEffect(() => {
        if (!idEmpresa) {
            navigate('/empresas');
            return;
        }
        
        const nomeSalvo = localStorage.getItem('nomeUsuario') || 'Usuário';
        setNomeUsuarioLogado(nomeSalvo);

        async function fetchData() {
            try {
                const [usuariosRes, perfisRes] = await Promise.all([
                    api.get(`/empresa/${idEmpresa}`),
                    api.get(`/empresas/perfis/${idEmpresa}`)
                ]);
                setUsuarios(Array.isArray(usuariosRes.data) ? usuariosRes.data : []);
                setPerfis(Array.isArray(perfisRes.data) ? perfisRes.data : []);
                if (perfisRes.data.length > 0) {
                    const perfilPadrao = perfisRes.data.find(p => p.NIVEL === 3)?.ID_PERFIL || perfisRes.data[0].ID_PERFIL;
                    setPerfilSelecionado(perfilPadrao);
                }
            } catch (error) {
                handleShowErrorModal('Não foi possível carregar os dados da página. Tente novamente.');
            }
        }
        fetchData();
    }, [idEmpresa, navigate]);

    // --- FUNÇÕES DE HANDLER PARA MODAIS ---
    const handleShowErrorModal = (message) => { setErrorMessage(message); setShowErrorModal(true); };
    const handleCloseErrorModal = () => setShowErrorModal(false);
    const handleShowSuccessModal = (message) => { setSuccessMessage(message); setShowSuccessModal(true); };
    const handleCloseSuccessModal = () => setShowSuccessModal(false);
    const handleShowConfirmDelete = (usuario) => { setUsuarioParaExcluir(usuario); setShowConfirmDeleteModal(true); };
    const handleCloseConfirmDelete = () => { setUsuarioParaExcluir(null); setShowConfirmDeleteModal(false); };
    const handleShowAddUserModal = () => setShowAddUserModal(true);
    const handleCloseAddUserModal = () => setShowAddUserModal(false);
    const fecharModalEmpresa = () => setMostrarModalEmpresa(false);

    // --- FUNÇÕES DE AÇÃO ---
    const adicionarUsuario = async (event) => {
        event.preventDefault();
        if (!novoUsuario || !perfilSelecionado) {
            handleShowErrorModal('Por favor, preencha o campo de CPF/Email e selecione um perfil.');
            return;
        }
        try {
            await api.post(`/empresa/${idEmpresa}/adicionar-usuario`, {
                cpfOuEmail: novoUsuario,
                idPerfil: perfilSelecionado
            });
            handleCloseAddUserModal(); // Fecha o modal de adição
            handleShowSuccessModal('Usuário adicionado com sucesso!');
            setNovoUsuario('');
            const response = await api.get(`/empresa/${idEmpresa}`);
            setUsuarios(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            const msg = error.response?.data?.error || 'Erro ao adicionar usuário.';
            handleShowErrorModal(msg);
        }
    };

    const removerUsuario = async () => {
        if (!usuarioParaExcluir) return;
        try {
            await api.delete(`/empresa/${idEmpresa}/remover-usuario/${usuarioParaExcluir.ID}`);
            setUsuarios((prev) => prev.filter((u) => u.ID !== usuarioParaExcluir.ID));
            handleShowSuccessModal('Usuário removido com sucesso!');
        } catch (error) {
            handleShowErrorModal('Erro ao remover usuário.');
        } finally {
            handleCloseConfirmDelete();
        }
    };

    const handleMudarPermissao = async (idUsuario, novoIdPerfil) => {
        try {
            await api.put(`/permissoes/${idEmpresa}/${idUsuario}`, { idPerfil: novoIdPerfil });
            setUsuarios(usuarios.map(user => 
                user.ID === idUsuario ? { ...user, ID_PERFIL: parseInt(novoIdPerfil), NOME_PERFIL: perfis.find(p => p.ID_PERFIL === parseInt(novoIdPerfil)).NOME_PERFIL } : user
            ));
            handleShowSuccessModal('Permissão atualizada com sucesso!');
        } catch (error) {
            handleShowErrorModal('Não foi possível atualizar a permissão.');
        }
    };
    
    const exibirDetalhesEmpresa = async () => {
        try {
            const response = await api.get(`/empresas/detalhes/${idEmpresa}`);
            setDetalhesEmpresa(response.data);
            setMostrarModalEmpresa(true);
        } catch (error) {
            handleShowErrorModal('Erro ao carregar os detalhes da empresa.');
        }
    };

    return (
        <div className="home-container">
            <Menu />
            <main className="home-main-content">
                <header className="home-header">
                    <h1 className="home-header-greeting">Olá {nomeUsuarioLogado} 👋,</h1>
                    <Button variant="light" onClick={exibirDetalhesEmpresa} className="home-empresa-btn">
                        Empresa: <strong>{nomeEmpresa || '...'}</strong>
                    </Button>
                </header>

                <section className="home-cards-section">
                    <div className="home-card">
                        <div className="home-card-icon-wrapper total-membros"><FaUsers /></div>
                        <div className="home-card-info">
                            <span className="home-card-title">Total de Membros</span>
                            <span className="home-card-value">{usuarios.length}</span>
                        </div>
                    </div>
                    {nivel === 1 && (
                        <>
                            <div className="home-card action-card" onClick={handleShowAddUserModal}>
                                <div className="home-card-icon-wrapper adicionar-membro"><FaUserPlus /></div>
                                <div className="home-card-info"><span className="home-card-title">Adicionar membro</span></div>
                            </div>
                        </>
                    )}
                </section>

                <section className="home-usuarios-section">
                    <h2 className="home-section-title">Usuários da Empresa</h2>
                    <div className="table-responsive">
                        <table className="home-usuarios-table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Email</th>
                                    {/* LINHA REMOVIDA: <th>Nome do Pet</th> */} {/* Antiga coluna aqui */}
                                    <th>Permissão</th>
                                    {nivel === 1 && <th>Ações</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {usuarios.map((user) => (
                                    <tr key={user.ID}>
                                        <td data-label="Nome">{user.NOME}</td>
                                        <td data-label="Email">{user.EMAIL}</td>
                                        {/* LINHA REMOVIDA: <td data-label="Nome do Pet">{user.NOMEPET || '-'}</td> */} {/* Antigo dado do pet aqui */}
                                        <td data-label="Permissão">
                                            {nivel === 1 ? (
                                                <select value={user.ID_PERFIL} onChange={(e) => handleMudarPermissao(user.ID, e.target.value)} className="home-permissao-select">
                                                    {perfis.map(p => (<option key={p.ID_PERFIL} value={p.ID_PERFIL}>{p.NOME_PERFIL}</option>))}
                                                </select>
                                            ) : (user.NOME_PERFIL)}
                                        </td>
                                        {nivel === 1 && (
                                            <td data-label="Ações">
                                                <button onClick={() => handleShowConfirmDelete(user)} className="home-btn-remover" title="Remover Usuário"><FaTrash /></button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            {/* --- SEÇÃO DE MODAIS --- */}

            <Modal show={showAddUserModal} onHide={handleCloseAddUserModal} centered>
                <Form onSubmit={adicionarUsuario}>
                    <Modal.Header closeButton>
                        <Modal.Title>Adicionar Novo Membro</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group className="mb-3" controlId="formNovoUsuario">
                            <Form.Label>CPF ou Email do Usuário</Form.Label>
                            <Form.Control type="text" placeholder="Digite o CPF ou Email" value={novoUsuario} onChange={(e) => setNovoUsuario(e.target.value)} required />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="formPerfil">
                            <Form.Label>Perfil de Permissão</Form.Label>
                            <Form.Select value={perfilSelecionado} onChange={(e) => setPerfilSelecionado(e.target.value)} required>
                                {perfis.map(perfil => (
                                    <option key={perfil.ID_PERFIL} value={perfil.ID_PERFIL}>{perfil.NOME_PERFIL}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseAddUserModal}>Cancelar</Button>
                        <Button variant="primary" type="submit">Adicionar</Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            <Modal show={showConfirmDeleteModal} onHide={handleCloseConfirmDelete} centered backdrop="static">
                <Modal.Header closeButton>
                    <Modal.Title>Confirmar Exclusão</Modal.Title>
                </Modal.Header>
                <Modal.Body>Tem certeza que deseja remover o usuário <strong>{usuarioParaExcluir?.NOME}</strong> da empresa?</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseConfirmDelete}>Cancelar</Button>
                    <Button variant="danger" onClick={removerUsuario}>Sim, Excluir</Button>
                </Modal.Footer>
            </Modal>
            
            <Modal show={showErrorModal} onHide={handleCloseErrorModal} centered>
                <Modal.Header closeButton><Modal.Title>Ocorreu um Erro</Modal.Title></Modal.Header>
                <Modal.Body>{errorMessage}</Modal.Body>
                <Modal.Footer><Button variant="danger" onClick={handleCloseErrorModal}>Fechar</Button></Modal.Footer>
            </Modal>
            
            <Modal show={showSuccessModal} onHide={handleCloseSuccessModal} centered>
                <Modal.Header closeButton><Modal.Title>Sucesso!</Modal.Title></Modal.Header>
                <Modal.Body>{successMessage}</Modal.Body>
                <Modal.Footer><Button variant="success" onClick={handleCloseSuccessModal}>OK</Button></Modal.Footer>
            </Modal>
            
            <Modal show={mostrarModalEmpresa} onHide={fecharModalEmpresa} centered>
                <Modal.Header closeButton><Modal.Title>Detalhes da Empresa</Modal.Title></Modal.Header>
                <Modal.Body>
                    {detalhesEmpresa && (<>
                        <p><strong>Nome:</strong> {detalhesEmpresa.NOME_EMPRESA}</p>
                        <p><strong>CNPJ:</strong> {detalhesEmpresa.CNPJ}</p>
                    </>)}
                </Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={fecharModalEmpresa}>Fechar</Button></Modal.Footer>
            </Modal>
        </div>
    );
};

export default Home;