// src/pages/FilaLista/FilaLista.js

import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { FaCog, FaTv, FaChartBar, FaClipboardList, FaUser, FaSignOutAlt } from 'react-icons/fa';
import './FilaLista.css';

const FilaLista = () => {
    const [filas, setFilas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // REINTRODUZINDO: Estados para controlar o modal da empresa
    const [mostrarModalEmpresa, setMostrarModalEmpresa] = useState(false);
    const [detalhesEmpresa, setDetalhesEmpresa] = useState(null);

    const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
    const idEmpresa = empresaSelecionada?.ID_EMPRESA;
    const nomeEmpresa = empresaSelecionada?.NOME_EMPRESA; // Necessário para exibir o nome

    const nomeUsuario = "Usuário";
    const cargoUsuario = "Gerente de Projeto";

    useEffect(() => {
        if (!idEmpresa) {
            navigate('/empresas');
            return;
        }

        async function fetchFilas() {
            setLoading(true);
            setError(null);
            try {
                const response = await api.get(`/empresas/filas/${idEmpresa}`);
                setFilas(response.data);
            } catch (err) {
                if (err.response && err.response.status === 404) {
                    console.log('Nenhuma fila encontrada para esta empresa.');
                    setFilas([]);
                } else {
                    console.error('Erro ao buscar filas:', err);
                    setError('Não foi possível carregar as filas. Tente novamente mais tarde.');
                }
            } finally {
                setLoading(false);
            }
        }

        fetchFilas();
    }, [idEmpresa, navigate]);

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

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('idUsuario');
        localStorage.removeItem('empresaSelecionada');
        navigate('/');
    };

    // REINTRODUZINDO: Função para exibir os detalhes da empresa no modal
    const exibirDetalhesEmpresa = async () => {
        try {
            const response = await api.get(`/empresas/detalhes/${idEmpresa}`);
            setDetalhesEmpresa(response.data);
            setMostrarModalEmpresa(true);
        } catch (error) {
            console.error('Erro ao buscar detalhes da empresa:', error);
            alert('Erro ao carregar os detalhes da empresa.');
        }
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
                {/* REINTRODUZINDO: Título da Empresa com funcionalidade de modal */}
                <h1 className="main-content-empresa-titulo" onClick={exibirDetalhesEmpresa}>
                    {nomeEmpresa || 'Empresa Carregando...'}
                </h1>

                <section className="filas-section">
                    <h2 className="section-title">Filas</h2> {/* Este é o subtítulo da seção de filas */}

                    {loading && <p>Carregando filas...</p>}
                    {error && <p className="fila-lista-error">{error}</p>}

                    {!loading && filas.length === 0 && !error && (
                        <p>Nenhuma fila disponível para esta empresa.</p>
                    )}

                    {!loading && filas.length > 0 && (
                        <table className="filas-table">
                            <thead>
                                <tr>
                                    <th>Nome da Fila</th>
                                    <th>Bloqueada</th>
                                    <th>Situação</th>
                                    <th>Mensagem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filas.map((fila) => (
                                    <tr key={fila.ID_FILA}>
                                        <td>{fila.NOME_FILA}</td>
                                        <td>{fila.BLOCK === 1 ? 'Sim' : 'Não'}</td>
                                        <td>{fila.SITUACAO}</td>
                                        <td>{fila.MENSAGEM}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            </main>

            {/* REINTRODUZINDO: O Modal de Detalhes da Empresa */}
            {mostrarModalEmpresa && detalhesEmpresa && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Detalhes da Empresa</h2>
                        <p><strong>Nome:</strong> {detalhesEmpresa.NOME_EMPRESA}</p>
                        <p><strong>CNPJ:</strong> {detalhesEmpresa.CNPJ}</p>
                        <p><strong>Email:</strong> {detalhesEmpresa.EMAIL}</p>
                        <p><strong>Telefone:</strong> ({detalhesEmpresa.DDI}) {detalhesEmpresa.DDD} {detalhesEmpresa.TELEFONE}</p>
                        <p><strong>Endereço:</strong> {detalhesEmpresa.ENDERECO}, {detalhesEmpresa.NUMERO}</p>
                        {detalhesEmpresa.LOGO && <p><img src={detalhesEmpresa.LOGO} alt="Logo da Empresa" style={{ maxWidth: '100px', maxHeight: '100px' }} /></p>}
                        <button onClick={() => setMostrarModalEmpresa(false)}>Fechar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilaLista;