import React, { useEffect, useState, useMemo } from 'react';
import Menu from '../Menu/Menu';
import { FaUsers, FaUserPlus, FaTrash } from 'react-icons/fa';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import { Modal, Button, Form } from 'react-bootstrap';

const Home = () => {
  // --- STATES ---
  const [usuarios, setUsuarios] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [detalhesEmpresa, setDetalhesEmpresa] = useState(null);
  const [nomeUsuarioLogado, setNomeUsuarioLogado] = useState('');

  const [novoUsuario, setNovoUsuario] = useState('');
  const [perfilSelecionado, setPerfilSelecionado] = useState('');

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState(null);
  const [mostrarModalEmpresa, setMostrarModalEmpresa] = useState(false);

  const navigate = useNavigate();

  const empresaSelecionada = useMemo(
    () => JSON.parse(localStorage.getItem('empresaSelecionada') || 'null'),
    []
  );

  const idEmpresa = empresaSelecionada?.ID_EMPRESA;
  const nomeEmpresa = empresaSelecionada?.NOME_EMPRESA;
  const nivel = Number(empresaSelecionada?.NIVEL);
  const myUserId = Number(localStorage.getItem('idUsuario'));

  const snapshotPerms = Array.isArray(empresaSelecionada?.PERMISSIONS)
    ? empresaSelecionada.PERMISSIONS
    : [];

  const hasPerm = (resource, action) => {
    if (snapshotPerms.length) {
      if (Array.isArray(action)) {
        return action.some((a) => snapshotPerms.includes(`${resource}:${a}`));
      }
      return snapshotPerms.includes(`${resource}:${action}`);
    }
    if (resource === 'usersRoles') return nivel === 1;
    return false;
  };

  const canInvite = hasPerm('usersRoles', 'create');
  const canEdit   = hasPerm('usersRoles', 'edit');
  const canDelete = hasPerm('usersRoles', 'delete');

  useEffect(() => {
    if (!idEmpresa) {
      navigate('/escolher-empresa');
      return;
    }
    const nomeSalvo = localStorage.getItem('nomeUsuario') || 'Usuário';
    setNomeUsuarioLogado(nomeSalvo);

    async function fetchData() {
      try {
        const [usuariosRes, perfisRes] = await Promise.all([
          api.get(`/empresa/${idEmpresa}`),
          api.get(`/empresas/perfis/${idEmpresa}`),
        ]);

        setUsuarios(Array.isArray(usuariosRes.data) ? usuariosRes.data : []);
        const listaPerfis = Array.isArray(perfisRes.data) ? perfisRes.data : [];
        setPerfis(listaPerfis);

        const perfilPadrao =
          listaPerfis.find((p) => Number(p.NIVEL) === 3)?.ID_PERFIL ||
          listaPerfis[0]?.ID_PERFIL ||
          '';
        setPerfilSelecionado(perfilPadrao);
      } catch (error) {
        const status = error.response?.status;
        if (status === 401) return navigate('/login');
        if (status === 403) return navigate('/403');
        handleShowErrorModal('Não foi possível carregar os dados da página. Tente novamente.');
      }
    }
    fetchData();
  }, [idEmpresa, navigate]);

  // --- MODALS ---
  const handleShowErrorModal = (message) => { setErrorMessage(message); setShowErrorModal(true); };
  const handleCloseErrorModal = () => setShowErrorModal(false);
  const handleShowSuccessModal = (message) => { setSuccessMessage(message); setShowSuccessModal(true); };
  const handleCloseSuccessModal = () => setShowSuccessModal(false);
  const handleShowConfirmDelete = (usuario) => { setUsuarioParaExcluir(usuario); setShowConfirmDeleteModal(true); };
  const handleCloseConfirmDelete = () => { setUsuarioParaExcluir(null); setShowConfirmDeleteModal(false); };
  const handleShowAddUserModal = () => setShowAddUserModal(true);
  const handleCloseAddUserModal = () => setShowAddUserModal(false);
  const fecharModalEmpresa = () => setMostrarModalEmpresa(false);

  // --- AÇÕES ---
  const adicionarUsuario = async (event) => {
    event.preventDefault();
    if (!canInvite) return handleShowErrorModal('Você não tem permissão para adicionar membros.');
    if (!novoUsuario || !perfilSelecionado) return handleShowErrorModal('Por favor, preencha o CPF/Email e selecione um perfil.');

    try {
      await api.post(`/empresa/${idEmpresa}/adicionar-usuario`, {
        cpfOuEmail: novoUsuario,
        idPerfil: perfilSelecionado,
      });
      handleCloseAddUserModal();
      handleShowSuccessModal('Usuário adicionado com sucesso!');
      setNovoUsuario('');
      const response = await api.get(`/empresa/${idEmpresa}`);
      setUsuarios(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      const status = error.response?.status;
      if (status === 401) return navigate('/login');
      if (status === 403) return navigate('/403');
      const msg = error.response?.data?.error || 'Erro ao adicionar usuário.';
      handleShowErrorModal(msg);
    }
  };

  const removerUsuario = async () => {
    if (!usuarioParaExcluir) return;
    if (!canDelete) return handleShowErrorModal('Você não tem permissão para remover membros.');
    if (usuarioParaExcluir.ID === myUserId) return handleShowErrorModal('Você não pode se remover da empresa por aqui.');

    try {
      await api.delete(`/empresa/${idEmpresa}/remover-usuario/${usuarioParaExcluir.ID}`);
      setUsuarios((prev) => prev.filter((u) => u.ID !== usuarioParaExcluir.ID));
      handleShowSuccessModal('Usuário removido com sucesso!');
    } catch (error) {
      const status = error.response?.status;
      if (status === 401) return navigate('/login');
      if (status === 403) return navigate('/403');
      const msg =
        error.response?.data?.error ||
        'Erro ao remover usuário. (Dica: não é possível remover o último Administrador.)';
      handleShowErrorModal(msg);
    } finally {
      handleCloseConfirmDelete();
    }
  };

  const handleMudarPermissao = async (idUsuario, novoIdPerfil) => {
    if (!canEdit) return handleShowErrorModal('Você não tem permissão para alterar perfis.');
    try {
      await api.put(`/permissoes/${idEmpresa}/${idUsuario}`, { idPerfil: novoIdPerfil });
      setUsuarios((prev) =>
        prev.map((user) =>
          user.ID === idUsuario
            ? {
                ...user,
                ID_PERFIL: parseInt(novoIdPerfil, 10),
                NOME_PERFIL:
                  perfis.find((p) => p.ID_PERFIL === parseInt(novoIdPerfil, 10))?.NOME_PERFIL ||
                  user.NOME_PERFIL,
              }
            : user
        )
      );
      handleShowSuccessModal('Permissão atualizada com sucesso!');
    } catch (error) {
      const status = error.response?.status;
      if (status === 401) return navigate('/login');
      if (status === 403) return navigate('/403');
      const msg =
        error.response?.data?.error ||
        'Não foi possível atualizar a permissão. (Dica: não é possível rebaixar o último Administrador.)';
      handleShowErrorModal(msg);
    }
  };

  const exibirDetalhesEmpresa = async () => {
    try {
      const response = await api.get(`/empresas/detalhes/${idEmpresa}`);
      setDetalhesEmpresa(response.data);
      setMostrarModalEmpresa(true);
    } catch (error) {
      const status = error.response?.status;
      if (status === 401) return navigate('/login');
      if (status === 403) return navigate('/403');
      handleShowErrorModal('Erro ao carregar os detalhes da empresa.');
    }
  };

  return (
    <div className="mf-home home-container">
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

          {canInvite && (
            <div className="home-card action-card" onClick={handleShowAddUserModal}>
              <div className="home-card-icon-wrapper adicionar-membro"><FaUserPlus /></div>
              <div className="home-card-info"><span className="home-card-title">Adicionar membro</span></div>
            </div>
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
                  <th>Permissão</th>
                  {(canEdit || canDelete) && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((user) => (
                  <tr key={user.ID}>
                    <td data-label="Nome">{user.NOME}</td>
                    <td data-label="Email">{user.email || user.EMAIL}</td>
                    <td data-label="Permissão">
                      {canEdit ? (
                        <select
                          value={user.ID_PERFIL}
                          onChange={(e) => handleMudarPermissao(user.ID, e.target.value)}
                          className="home-permissao-select"
                        >
                          {perfis.map((p) => (
                            <option key={p.ID_PERFIL} value={p.ID_PERFIL}>
                              {p.NOME_PERFIL}
                            </option>
                          ))}
                        </select>
                      ) : (
                        user.NOME_PERFIL
                      )}
                    </td>
                    {(canEdit || canDelete) && (
                      <td data-label="Ações">
                        {canDelete && user.ID !== myUserId && (
                          <button
                            onClick={() => handleShowConfirmDelete(user)}
                            className="home-btn-remover"
                            title="Remover Usuário"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Modais iguais... */}
      <Modal show={showAddUserModal} onHide={handleCloseAddUserModal} centered>
        <Form onSubmit={adicionarUsuario}>
          <Modal.Header closeButton>
            <Modal.Title>Adicionar Novo Membro</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3" controlId="formNovoUsuario">
              <Form.Label>CPF ou Email do Usuário</Form.Label>
              <Form.Control
                type="text"
                placeholder="Digite o CPF ou Email"
                value={novoUsuario}
                onChange={(e) => setNovoUsuario(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formPerfil">
              <Form.Label>Perfil de Permissão</Form.Label>
              <Form.Select
                value={perfilSelecionado}
                onChange={(e) => setPerfilSelecionado(e.target.value)}
                required
              >
                {perfis.map((perfil) => (
                  <option key={perfil.ID_PERFIL} value={perfil.ID_PERFIL}>
                    {perfil.NOME_PERFIL}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseAddUserModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Adicionar
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showConfirmDeleteModal} onHide={handleCloseConfirmDelete} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Exclusão</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Tem certeza que deseja remover o usuário <strong>{usuarioParaExcluir?.NOME}</strong> da empresa?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseConfirmDelete}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={removerUsuario}>
            Sim, Excluir
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showErrorModal} onHide={handleCloseErrorModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Ocorreu um Erro</Modal.Title>
        </Modal.Header>
        <Modal.Body>{errorMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={handleCloseErrorModal}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showSuccessModal} onHide={handleCloseSuccessModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Sucesso!</Modal.Title>
        </Modal.Header>
        <Modal.Body>{successMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={handleCloseSuccessModal}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={mostrarModalEmpresa} onHide={fecharModalEmpresa} centered>
        <Modal.Header closeButton>
          <Modal.Title>Detalhes da Empresa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detalhesEmpresa && (
            <>
              <p><strong>Nome:</strong> {detalhesEmpresa.NOME_EMPRESA}</p>
              <p><strong>CNPJ:</strong> {detalhesEmpresa.CNPJ}</p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={fecharModalEmpresa}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Home;
