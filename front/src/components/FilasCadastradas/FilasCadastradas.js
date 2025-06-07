// src/components/FilasCadastradas/FilasCadastradas.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaTv, FaCog, FaChartBar, FaUser, FaSignOutAlt, FaPlus, FaUsers, FaSearch } from 'react-icons/fa';
import './FilasCadastradas.css';

const FilasCadastradas = () => {
    const [filas, setFilas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    const logout = () => {
        localStorage.removeItem('userToken');
        localStorage.removeItem('empresaSelecionada');
        navigate('/login');
    };

    // Dados do usuário (fixos para o sidebar)
    const userInfo = {
        name: 'Evano',
        role: 'Project Manager',
        avatar: 'https://i.pravatar.cc/40'
    };
    
    // *** MUITO IMPORTANTE: Obtenha o ID_EMPRESA da empresa selecionada do localStorage ***
    const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
    const idEmpresaLogada = empresaSelecionada?.ID_EMPRESA || null;

    useEffect(() => {
        // Chame fetchFilas apenas se houver um ID_EMPRESA logado
        if (idEmpresaLogada) {
            fetchFilas(idEmpresaLogada); // <--- Passe o ID_EMPRESA para a função de fetch
        } else {
            // Se não houver empresa logada, defina o erro e pare o carregamento
            setError("Nenhuma empresa selecionada. Por favor, faça login e selecione uma empresa.");
            setLoading(false);
            // Opcional: Redirecionar para a tela de escolha de empresa
            // navigate('/escolher-empresa');
        }
    }, [idEmpresaLogada, navigate]); // Adicione navigate às dependências para evitar warnings

    const fetchFilas = async (idEmpresa) => { // <--- Função agora aceita idEmpresa
        setLoading(true); // Garante que o loading seja true ao iniciar a busca
        setError(null);   // Limpa erros anteriores
        try {
            // *** MUITO IMPORTANTE: Adicione idEmpresa como um query parameter na URL ***
            // Ex: http://localhost:3001/api/filas?idEmpresa=123
            const response = await fetch(`http://localhost:3001/api/filas?idEmpresa=${idEmpresa}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
                throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || JSON.stringify(errorData)}`);
            }
            const data = await response.json();
            setFilas(data);
        } catch (err) {
            setError(`Erro ao carregar as filas configuradas. Detalhes: ${err.message}`);
            console.error('Erro no frontend ao carregar filas:', err);
        } finally {
            setLoading(false); // Sempre defina loading como false ao final
        }
    };

    const handleToggleBlock = async (id_fila, currentBlockStatus) => {
        try {
            const response = await fetch(`http://localhost:3001/api/filas/${id_fila}/block`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ block: !currentBlockStatus })
            });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
                throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || JSON.stringify(errorData)}`);
            }
            fetchFilas(idEmpresaLogada); // <--- Recarrega as filas com o ID da empresa após a mudança
        } catch (err) {
            console.error('Erro ao atualizar status de bloqueio:', err);
            alert(`Erro ao atualizar status de bloqueio. Detalhes: ${err.message}`);
        }
    };

    const handleToggleStatus = async (id_fila, currentStatus) => {
        try {
            const response = await fetch(`http://localhost:3001/api/filas/${id_fila}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ situacao: !currentStatus })
            });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
                throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || JSON.stringify(errorData)}`);
            }
            fetchFilas(idEmpresaLogada); // <--- Recarrega as filas com o ID da empresa após a mudança
        } catch (err) {
            console.error('Erro ao atualizar status da fila:', err);
            alert(`Erro ao atualizar status da fila. Detalhes: ${err.message}`);
        }
    };

    const handleEditFila = (id_conf_fila) => {
        navigate(`/configuracao/${id_conf_fila}`);
    };

    const isLinkActive = (path) => location.pathname === path;

    return (
        <div className="dashboard-container">
            <aside className="sidebar">
                <div className="logo">
                    <img src="/imagens/logoManageflow.png" alt="ManageFlow Logo" className="responsive-image" />
                </div>
                <nav>
                    <ul>
                        <li className={isLinkActive('/home') ? 'active' : ''}>
                            <Link to="/home"><FaTv /> Dashboard</Link>
                        </li>
                        <li className={isLinkActive('/filas-cadastradas') ? 'active' : ''}>
                            <Link to="/filas-cadastradas">
                                <FaCog /> Configuração de fila
                            </Link>
                        </li>
                        <li><FaTv /> Painel de TV</li>
                        <li>
                            <Link to="/gestao-fila/1/2025-01-01/1">
                                <FaCog /> Gestão da fila
                            </Link>
                        </li>
                        <li><FaChartBar /> Relatórios</li>
                        <li><FaUser /> Usuários</li>
                        <li onClick={logout} className="logout-link">
                            <FaSignOutAlt /> Sair
                        </li>
                    </ul>
                </nav>
                <div className="user-info">
                    <img src={userInfo.avatar} alt={userInfo.name} />
                    <div>{userInfo.name}<br /><small>{userInfo.role}</small></div>
                </div>
            </aside>

            <main className="main-content">
                <div className="cards-section">
                    <div className="card total-filas">
                        <FaUsers className="card-icon" />
                        <div className="card-text">
                            <p>Total de filas</p>
                            <h3>{filas.length}</h3>
                        </div>
                    </div>
                    <div className="card add-fila" onClick={() => navigate('/configuracao')}>
                        <FaPlus className="card-icon" />
                        <div className="card-text">
                            <p>Adicionar fila</p>
                        </div>
                    </div>
                </div>

                <div className="page-content">
                    <h2>Configurações de fila</h2>

                    <div className="search-sort-section">
                        <div className="search-bar">
                            <FaSearch />
                            <input type="text" placeholder="Search" />
                        </div>
                        <div className="sort-by">
                            Short by: <select><option>Newest</option></select>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Nome da fila</th>
                                <th>ID fila</th>
                                <th>Data movimentação</th>
                                <th>Nº pessoas fila</th>
                                <th>Bloqueio</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{textAlign: 'center'}}>Carregando configurações de fila...</td></tr>
                            ) : error ? (
                                <tr><td colSpan="6" style={{textAlign: 'center', color: 'red'}}>{error}</td></tr>
                            ) : filas.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center' }}>Nenhuma fila configurada encontrada.</td></tr>
                            ) : (
                                filas.map((fila) => (
                                    <tr key={fila.ID_FILA}>
                                        <td
                                            onClick={() => handleEditFila(fila.ID_CONF_FILA)}
                                            style={{ cursor: 'pointer', color: '#007bff', textDecoration: 'underline' }}
                                        >
                                            {fila.NOME_FILA}
                                        </td>
                                        <td>{fila.ID_FILA}</td>
                                        <td>{fila.DT_MOVTO}</td>
                                        <td>{fila.QTDE_PESSOAS_FILA || 0}</td>
                                        <td>
                                            <label className="switch">
                                                <input
                                                    type="checkbox"
                                                    checked={fila.BLOCK}
                                                    onChange={() => handleToggleBlock(fila.ID_FILA, fila.BLOCK)}
                                                />
                                                <span className="slider round"></span>
                                            </label>
                                        </td>
                                        <td>
                                            <button
                                                className={`status-button ${fila.SITUACAO ? 'active' : 'inactive'}`}
                                                onClick={() => handleToggleStatus(fila.ID_FILA, fila.SITUACAO)}
                                            >
                                                {fila.SITUACAO ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <div className="pagination">
                        <span>Showing data 1 to {filas.length} of {filas.length} entries</span>
                        <div>
                            <button>&lt;</button>
                            <button className="active">1</button>
                            <button>2</button>
                            <button>3</button>
                            <button>4</button>
                            <button>...</button>
                            <button>40</button>
                            <button>&gt;</button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default FilasCadastradas;