// src/pages/Home/Home.jsx
import React, { useEffect, useState, useMemo } from 'react';
import Menu from '../Menu/Menu';
import { FaUsers, FaUserPlus, FaTrash } from 'react-icons/fa';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import { Modal, Button, Form, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

// ALTERADO: A página agora recebe 'onLogout' como uma propriedade
const Home = ({ onLogout }) => {
  const { t } = useTranslation();

  // --- STATES ---
  const [usuarios, setUsuarios] = useState([]);
  const [perfis, setPerfis] = useState([]);
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
    // Fallback legado: NIVEL 1 = Admin
    if (resource === 'usersRoles') return nivel === 1;
    return false;
  };

  const canInvite = hasPerm('usersRoles', 'create');
  const canEdit   = hasPerm('usersRoles', 'edit');
  const canDelete = hasPerm('usersRoles', 'delete');
  const canView   = hasPerm('usersRoles', ['read', 'edit', 'delete', 'create']) || nivel === 2 || nivel === 1;
  const viewOnly  = !canInvite && !canEdit && !canDelete && (nivel === 2);

  const adminPerfilIds = useMemo(() => {
    if (!Array.isArray(perfis)) return [];
    return perfis.filter(p => Number(p.NIVEL) === 1).map(p => Number(p.ID_PERFIL));
  }, [perfis]);

  const isUserAdmin = (user) => adminPerfilIds.includes(Number(user?.ID_PERFIL));

  useEffect(() => {
    if (!idEmpresa) {
      navigate('/escolher-empresa');
      return;
    }
    const nomeSalvo = localStorage.getItem('nomeUsuario') || t('home.usuarioPadrao');
    setNomeUsuarioLogado(nomeSalvo);

    async function fetchData() {
      try {
        const [usuariosRes, perfisRes] = await Promise.all([
          api.get(`/empresa/${idEmpresa}/usuarios`),
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
        if (status === 403) {
          try {
            const perfisRes = await api.get(`/empresas/perfis/${idEmpresa}`);
            const listaPerfis = Array.isArray(perfisRes.data) ? perfisRes.data : [];
            setPerfis(listaPerfis);
          } catch (_) {}
          setUsuarios([]);
          handleShowErrorModal(t('home.erros.visualizacaoSomenteLeitura'));
          return;
        }
        handleShowErrorModal(t('home.erros.carregarDados'));
      }
    }
    fetchData();
  }, [idEmpresa, navigate, t]);

  const handleShowErrorModal = (message) => { setErrorMessage(message); setShowErrorModal(true); };
  const handleCloseErrorModal = () => setShowErrorModal(false);
  const handleShowSuccessModal = (message) => { setSuccessMessage(message); setShowSuccessModal(true); };
  const handleCloseSuccessModal = () => setShowSuccessModal(false);
  const handleShowConfirmDelete = (usuario) => { setUsuarioParaExcluir(usuario); setShowConfirmDeleteModal(true); };
  const handleCloseConfirmDelete = () => { setUsuarioParaExcluir(null); setShowConfirmDeleteModal(false); };
  const handleShowAddUserModal = () => setShowAddUserModal(true);
  const handleCloseAddUserModal = () => setShowAddUserModal(false);

  const adicionarUsuario = async (event) => {
    event.preventDefault();
    if (!canInvite) return handleShowErrorModal(t('home.erros.semPermissaoAdicionar'));
    if (!novoUsuario || !perfilSelecionado) return handleShowErrorModal(t('home.erros.preenchaCampos'));

    try {
      await api.post(`/empresa/${idEmpresa}/adicionar-usuario`, {
        cpfOuEmail: novoUsuario,
        idPerfil: perfilSelecionado,
      });
      handleCloseAddUserModal();
      handleShowSuccessModal(t('home.sucesso.usuarioAdicionado'));
      setNovoUsuario('');
      const response = await api.get(`/empresa/${idEmpresa}/usuarios`);
      setUsuarios(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      const status = error.response?.status;
      if (status === 401) return navigate('/login');
      if (status === 403) return handleShowErrorModal(t('home.erros.semPermissaoAdicionar'));
      const msg = error.response?.data?.error || t('home.erros.adicionarUsuario');
      handleShowErrorModal(msg);
    }
  };

  const removerUsuario = async () => {
    if (!usuarioParaExcluir) return;
    if (!canDelete) return handleShowErrorModal(t('home.erros.semPermissaoRemover'));
    if (usuarioParaExcluir.ID === myUserId) return handleShowErrorModal(t('home.erros.autoRemocao'));
    if (isUserAdmin(usuarioParaExcluir)) return handleShowErrorModal(t('home.erros.removerAdmin'));

    try {
      await api.delete(`/empresa/${idEmpresa}/remover-usuario/${usuarioParaExcluir.ID}`);
      setUsuarios((prev) => prev.filter((u) => u.ID !== usuarioParaExcluir.ID));
      handleShowSuccessModal(t('home.sucesso.usuarioRemovido'));
    } catch (error) {
      const status = error.response?.status;
      if (status === 401) return navigate('/login');
      if (status === 403) return handleShowErrorModal(t('home.erros.semPermissaoRemover'));
      const msg = error.response?.data?.error || t('home.erros.removerUsuario');
      handleShowErrorModal(msg);
    } finally {
      handleCloseConfirmDelete();
    }
  };

  const handleMudarPermissao = async (idUsuario, novoIdPerfil) => {
    if (!canEdit) return handleShowErrorModal(t('home.erros.semPermissaoAlterar'));
    const alvo = usuarios.find(u => u.ID === idUsuario);
    if (alvo && isUserAdmin(alvo)) {
      return handleShowErrorModal(t('home.erros.alterarAdmin'));
    }

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
      handleShowSuccessModal(t('home.sucesso.permissaoAtualizada'));
    } catch (error) {
      const status = error.response?.status;
      if (status === 401) return navigate('/login');
      if (status === 403) return handleShowErrorModal(t('home.erros.semPermissaoAlterar'));
      const msg = error.response?.data?.error || t('home.erros.atualizarPermissao');
      handleShowErrorModal(msg);
    }
  };

  return (
    <div className="mf-home home-container">
      <Menu onLogout={onLogout} />
      
      <main className="home-main-content">
        <header className="home-header">
          <h1 className="home-header-greeting">
            {t('home.saudacao', { nome: nomeUsuarioLogado })} 👋,
          </h1>
          <div className="d-flex align-items-center gap-2">
            {viewOnly && (
              <Badge bg="secondary" pill title={t('home.somenteLeitura.hint')}>
                {t('home.somenteLeitura.label') || 'Somente leitura'}
              </Badge>
            )}
            <Button
              variant="light"
              onClick={() => navigate(`/empresa/editar/${idEmpresa}`)}
              className="home-empresa-btn"
            >
              {t('home.empresa')}: <strong>{nomeEmpresa || '...'}</strong>
            </Button>
          </div>
        </header>

        <section className="home-cards-section">
          <div className="home-card">
            <div className="home-card-icon-wrapper total-membros"><FaUsers /></div>
            <div className="home-card-info">
              <span className="home-card-title">{t('home.totalMembros')}</span>
              <span className="home-card-value">{usuarios.length}</span>
            </div>
          </div>

          {canInvite && (
            <div className="home-card action-card" onClick={handleShowAddUserModal} role="button" tabIndex={0}>
              <div className="home-card-icon-wrapper adicionar-membro"><FaUserPlus /></div>
              <div className="home-card-info"><span className="home-card-title">{t('home.adicionarMembro')}</span></div>
            </div>
          )}
        </section>

        {canView ? (
          <section className="home-usuarios-section">
            <div className="d-flex align-items-center justify-content-between">
              <h2 className="home-section-title">{t('home.usuariosDaEmpresa')}</h2>
            </div>

            <div className="table-responsive">
              <table className="home-usuarios-table">
                <thead>
                  <tr>
                    <th>{t('home.tabela.nome')}</th>
                    <th>{t('home.tabela.email')}</th>
                    <th>{t('home.tabela.permissao')}</th>
                    {(canEdit || canDelete) && <th>{t('home.tabela.acoes')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((user) => {
                    const adminDaLinha = isUserAdmin(user);
                    return (
                      <tr key={user.ID}>
                        <td data-label={t('home.tabela.nome')}>{user.NOME}</td>
                        <td data-label={t('home.tabela.email')}>{user.email || user.EMAIL}</td>
                        <td data-label={t('home.tabela.permissao')}>
                          {canEdit && !adminDaLinha ? (
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
                          <td data-label={t('home.tabela.acoes')}>
                            {canDelete && user.ID !== myUserId && !adminDaLinha && (
                              <button
                                onClick={() => handleShowConfirmDelete(user)}
                                className="home-btn-remover"
                                title={t('home.tabela.removerUsuario')}
                              >
                                <FaTrash />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {usuarios.length === 0 && (
                    <tr>
                      <td colSpan={(canEdit || canDelete) ? 4 : 3} className="text-center py-3">
                        {t('home.semUsuarios') || 'Nenhum usuário encontrado.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="home-usuarios-section">
            <h2 className="home-section-title">{t('home.usuariosDaEmpresa')}</h2>
            <div className="alert alert-warning" role="alert">
              {t('home.semPermissaoVisualizar') || 'Você não tem permissão para visualizar os usuários.'}
            </div>
          </section>
        )}
      </main>

      <Modal show={showAddUserModal} onHide={handleCloseAddUserModal} centered>
        <Form onSubmit={adicionarUsuario}>
          <Modal.Header closeButton>
            <Modal.Title>{t('home.modalAdicionar.titulo')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3" controlId="formNovoUsuario">
              <Form.Label>{t('home.modalAdicionar.labelCpfEmail')}</Form.Label>
              <Form.Control
                type="text"
                placeholder={t('home.modalAdicionar.placeholderCpfEmail')}
                value={novoUsuario}
                onChange={(e) => setNovoUsuario(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formPerfil">
              <Form.Label>{t('home.modalAdicionar.labelPerfil')}</Form.Label>
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
              {t('home.botoes.cancelar')}
            </Button>
            <Button variant="primary" type="submit">
              {t('home.botoes.adicionar')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showConfirmDeleteModal} onHide={handleCloseConfirmDelete} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>{t('home.modalExcluir.titulo')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {t('home.modalExcluir.confirmacao', { nome: usuarioParaExcluir?.NOME })}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseConfirmDelete}>
            {t('home.botoes.cancelar')}
          </Button>
          <Button variant="danger" onClick={removerUsuario}>
            {t('home.botoes.simExcluir')}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showErrorModal} onHide={handleCloseErrorModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('home.modalErro.titulo')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{errorMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={handleCloseErrorModal}>
            {t('home.botoes.fechar')}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showSuccessModal} onHide={handleCloseSuccessModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('home.modalSucesso.titulo')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{successMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={handleCloseSuccessModal}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Home;