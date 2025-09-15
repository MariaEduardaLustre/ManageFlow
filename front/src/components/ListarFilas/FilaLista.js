import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { FaCog, FaTv, FaChartBar, FaClipboardList, FaUser, FaSignOutAlt } from 'react-icons/fa';
import './FilaLista.css'; // O CSS do modal será adicionado aqui
import Menu from '../Menu/Menu';

const FilaLista = () => {
    const [filas, setFilas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Estados para o Modal da Empresa
    const [mostrarModalEmpresa, setMostrarModalEmpresa] = useState(false);
    const [detalhesEmpresa, setDetalhesEmpresa] = useState(null);
    const [loadingEmpresa, setLoadingEmpresa] = useState(false);

    const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
    const idEmpresa = empresaSelecionada?.ID_EMPRESA;
    const nomeEmpresa = empresaSelecionada?.NOME_EMPRESA;

    // Função para formatar a data para a URL (YYYYMMDD)
    const formatarDataParaURL = (dataSQL) => {
        if (!dataSQL) return '';

        // Tenta criar um objeto Date
        const date = new Date(dataSQL);

        // Se a data for inválida, e for uma string numérica de 8 dígitos, usa-a diretamente
        // Isso cobre o caso de DT_MOVTO já vir como DECIMAL(8,0) (ex: 20240530)
        if (isNaN(date.getTime())) {
            const dataStr = String(dataSQL);
            if (dataStr.length === 8 && /^\d+$/.test(dataStr)) {
                return dataStr; // Já está no formato YYYYMMDD
            }
            console.warn("Data inválida ou em formato inesperado para URL:", dataSQL);
            return ''; // Retorna vazio para evitar URL quebrada
        }

        // Caso seja um objeto Date válido (ex: de 'YYYY-MM-DDTHH:MM:SS.sssZ' ou 'YYYY-MM-DD')
        const ano = date.getFullYear();
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const dia = String(date.getDate()).padStart(2, '0');
        return `${ano}${mes}${dia}`; // Retorna YYYYMMDD
    };

    useEffect(() => {
        if (!idEmpresa) {
            navigate('/escolher-empresa');
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

    // Função para formatar a data para exibição na tabela (DD/MM/YYYY)
    const formatarDataParaExibicao = (dataSQL) => {
        if (!dataSQL) return 'N/A';
        const date = new Date(dataSQL);
        if (isNaN(date.getTime())) {
            const dataStr = String(dataSQL);
            if (dataStr.length === 8 && /^\d+$/.test(dataStr)) {
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

    // Função para buscar e exibir os detalhes da empresa
    const exibirDetalhesEmpresa = async () => {
        if (!idEmpresa) {
            alert('ID da empresa não disponível.');
            return;
        }
        setLoadingEmpresa(true);
        try {
            const response = await api.get(`/empresas/detalhes/${idEmpresa}`);
            setDetalhesEmpresa(response.data);
            setMostrarModalEmpresa(true);
        } catch (error) {
            console.error('Erro ao buscar detalhes da empresa:', error);
            alert('Erro ao carregar os detalhes da empresa.');
        } finally {
            setLoadingEmpresa(false);
        }
    };

    const fecharModalEmpresa = () => {
        setMostrarModalEmpresa(false);
        setDetalhesEmpresa(null);
    };

    return (
        <div className="home-container">
            <Menu />

            <main className="main-content">
               {/*  <div className="empresa-titulo-container" onClick={exibirDetalhesEmpresa} style={{ cursor: 'pointer' }}>
                    <span className="empresa-nome">
                        {loadingEmpresa ? 'Carregando detalhes...' : `${nomeEmpresa || 'Carregando...'}`}
                    </span>
                </div>*/}

                <section className="filas-section">
                    <h2 className="section-title">Filas</h2>

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
                                    <th>Data Início Fila</th>
                                    <th>Data Fim Fila</th>
                                    <th>Mensagem</th>
                                    <th>Bloqueada</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filas.map((fila) => (
                                    <tr key={`${fila.ID_FILA}-${fila.DT_MOVTO}`}
                                        onClick={() => navigate(`/gestao-fila/${fila.ID_EMPRESA}/${formatarDataParaURL(fila.DT_MOVTO)}/${fila.ID_FILA}`)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>{fila.NOME_FILA}</td>
                                        <td>{formatarDataParaExibicao(fila.DT_INI)}</td>
                                        <td>{formatarDataParaExibicao(fila.DT_FIM)}</td>
                                        <td>{fila.MENSAGEM}</td>
                                        <td>{fila.BLOCK === 1 ? 'Sim' : 'Não'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            </main>

            {/* Modal de Detalhes da Empresa - Integrado diretamente */}
            {mostrarModalEmpresa && detalhesEmpresa && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Detalhes da Empresa</h2>
                            <button className="modal-close-button" onClick={fecharModalEmpresa}>&times;</button>
                        </div>
                        <div className="modal-body">
                            {/* Apenas nome e CNPJ serão exibidos conforme solicitado */}
                            <p><strong>Nome:</strong> {detalhesEmpresa.NOME_EMPRESA}</p>
                            <p><strong>CNPJ:</strong> {detalhesEmpresa.CNPJ}</p>
                        </div>
                        <div className="modal-footer">
                            <button className="modal-close-button-footer" onClick={fecharModalEmpresa}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilaLista;