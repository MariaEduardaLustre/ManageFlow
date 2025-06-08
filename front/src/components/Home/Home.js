import React, { useEffect, useState } from 'react';
import Menu from '../Menu/Menu';
import { FaPlus, FaTrash } from 'react-icons/fa';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import { Modal, Button } from 'react-bootstrap';

const Home = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [novoUsuario, setNovoUsuario] = useState('');
    const [mostrarModalEmpresa, setMostrarModalEmpresa] = useState(false);
    const [detalhesEmpresa, setDetalhesEmpresa] = useState(null);
    const navigate = useNavigate();

    // << NOVOS STATES >> Para gerenciar perfis
    const [perfis, setPerfis] = useState([]);
    const [perfilSelecionado, setPerfilSelecionado] = useState('');

    const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
    const idEmpresa = empresaSelecionada?.ID_EMPRESA;
    const nomeEmpresa = empresaSelecionada?.NOME_EMPRESA;
    const nivel = Number(empresaSelecionada?.NIVEL);

    useEffect(() => {
        if (!idEmpresa) {
            navigate('/empresas');
            return;
        }

        // << FUNÇÃO MODIFICADA >> Agora busca usuários e perfis
        async function fetchData() {
            try {
                const [usuariosRes, perfisRes] = await Promise.all([
                    api.get(`/empresa/${idEmpresa}`),
                    api.get(`/empresas/perfis/${idEmpresa}`) // Busca os perfis
                ]);
                
                setUsuarios(Array.isArray(usuariosRes.data) ? usuariosRes.data : []);
                setPerfis(Array.isArray(perfisRes.data) ? perfisRes.data : []);
                // Define um perfil padrão para o dropdown de adicionar
                if (perfisRes.data.length > 0) {
                    setPerfilSelecionado(perfisRes.data.find(p => p.NIVEL === 3)?.ID_PERFIL || perfisRes.data[0].ID_PERFIL);
                }

            } catch (error) {
                console.error('Erro ao buscar dados da empresa:', error);
                alert('Não foi possível carregar os dados. Tente novamente.');
            }
        }

        fetchData();
    }, [idEmpresa, navigate]);

    // << FUNÇÃO MODIFICADA >> Agora envia o perfil selecionado
    const adicionarUsuario = async () => {
        if (!novoUsuario || !perfilSelecionado) {
            alert('Por favor, preencha o CPF/Email e selecione um perfil.');
            return;
        }
        try {
            await api.post(`/empresa/${idEmpresa}/adicionar-usuario`, {
                cpfOuEmail: novoUsuario,
                idPerfil: perfilSelecionado // Envia o ID do perfil
            });
            setNovoUsuario('');
            alert('Usuário adicionado com sucesso!');
            // Refresca a lista de usuários
            const response = await api.get(`/empresa/${idEmpresa}`);
            setUsuarios(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            const msg = error.response?.data?.error || 'Erro ao adicionar usuário.';
            alert(msg);
        }
    };

    // << NOVA FUNÇÃO >> Para mudar a permissão de um usuário existente
    const handleMudarPermissao = async (idUsuario, novoIdPerfil) => {
        try {
            await api.put(`/permissoes/${idEmpresa}/${idUsuario}`, { idPerfil: novoIdPerfil });

            // Atualiza o estado local para refletir a mudança instantaneamente
            setUsuarios(usuarios.map(user => {
                if (user.ID === idUsuario) {
                    const perfilAtualizado = perfis.find(p => p.ID_PERFIL === parseInt(novoIdPerfil));
                    return { ...user, ID_PERFIL: perfilAtualizado.ID_PERFIL, NOME_PERFIL: perfilAtualizado.NOME_PERFIL };
                }
                return user;
            }));

            alert('Permissão atualizada com sucesso!');
        } catch (error) {
            console.error('Erro ao mudar permissão:', error);
            alert('Não foi possível atualizar a permissão.');
        }
    };


    // ... (suas outras funções como removerUsuario, exibirDetalhesEmpresa, etc. continuam aqui) ...
    const removerUsuario = async (idUsuarioRemover) => {
        if (!window.confirm('Tem certeza que deseja remover este usuário da empresa?')) return;
        try {
            await api.delete(`/empresa/${idEmpresa}/remover-usuario/${idUsuarioRemover}`);
            setUsuarios((prev) => prev.filter((u) => u.ID !== idUsuarioRemover));
            alert('Usuário removido com sucesso!');
        } catch (error) {
            console.error('Erro ao remover usuário:', error);
            alert('Erro ao remover usuário.');
        }
    };

    const exibirDetalhesEmpresa = async () => {
        try {
            const response = await api.get(`/empresas/detalhes/${idEmpresa}`);
            setDetalhesEmpresa(response.data);
            setMostrarModalEmpresa(true);
        } catch (error) {
            alert('Erro ao carregar os detalhes da empresa.');
        }
    };

    const fecharModalEmpresa = () => setMostrarModalEmpresa(false);


    return (
        <div className="home-container">
            <Menu />
            <main className="main-content">
                <h1 className="main-content-empresa-titulo" onClick={exibirDetalhesEmpresa} title="Clique para ver os detalhes">
                    {nomeEmpresa || 'Carregando...'}
                </h1>

                <section className="usuarios-section">
                    {nivel === 1 && (
                        // << UI MODIFICADA >> Adicionado dropdown de perfis
                        <div className="adicionar-usuario">
                            <input
                                type="text"
                                placeholder="CPF ou E-mail do usuário"
                                value={novoUsuario}
                                onChange={(e) => setNovoUsuario(e.target.value)}
                            />
                            <select value={perfilSelecionado} onChange={(e) => setPerfilSelecionado(e.target.value)}>
                                {perfis.map(perfil => (
                                    <option key={perfil.ID_PERFIL} value={perfil.ID_PERFIL}>
                                        {perfil.NOME_PERFIL}
                                    </option>
                                ))}
                            </select>
                            <button onClick={adicionarUsuario}><FaPlus /> Adicionar</button>
                        </div>
                    )}

                    <div className="table-responsive">
                        <table className="usuarios-table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Email</th>
                                    <th>Permissão</th>
                                    {nivel === 1 && <th>Ações</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {usuarios.map((user) => (
                                    <tr key={user.ID}>
                                        <td data-label="Nome">{user.NOME}</td>
                                        <td data-label="Email">{user.EMAIL}</td>
                                        {/* << UI MODIFICADA >> Dropdown para editar permissão */}
                                        <td data-label="Permissão">
                                            {nivel === 1 ? (
                                                <select
                                                    value={user.ID_PERFIL}
                                                    onChange={(e) => handleMudarPermissao(user.ID, e.target.value)}
                                                    className="permissao-select"
                                                >
                                                    {perfis.map(p => (
                                                        <option key={p.ID_PERFIL} value={p.ID_PERFIL}>{p.NOME_PERFIL}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                user.NOME_PERFIL
                                            )}
                                        </td>
                                        {nivel === 1 && (
                                            <td data-label="Ações">
                                                <button onClick={() => removerUsuario(user.ID)} className="btn-remover"><FaTrash /></button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            {/* Modal de Detalhes da Empresa */}
            {detalhesEmpresa && (
                <Modal show={mostrarModalEmpresa} onHide={fecharModalEmpresa} centered>
                    <Modal.Header closeButton><Modal.Title>Detalhes da Empresa</Modal.Title></Modal.Header>
                    <Modal.Body>
                        <p><strong>Nome:</strong> {detalhesEmpresa.NOME_EMPRESA}</p>
                        <p><strong>CNPJ:</strong> {detalhesEmpresa.CNPJ}</p>
                    </Modal.Body>
                    <Modal.Footer><Button variant="secondary" onClick={fecharModalEmpresa}>Fechar</Button></Modal.Footer>
                </Modal>
            )}
        </div>
    );
};

export default Home;