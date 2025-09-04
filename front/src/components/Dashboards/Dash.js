import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { FaCog, FaTv, FaChartBar, FaClipboardList, FaUser, FaSignOutAlt } from 'react-icons/fa';
import './Dash.css';
import Menu from '../Menu/Menu';
import GraficosFila from './GraficosFila';

const Dash = () => {
    const [filas, setFilas] = useState([]);
    const [loadingFilas, setLoadingFilas] = useState(true);
    const [errorFilas, setErrorFilas] = useState(null);
    const [filaSelecionada, setFilaSelecionada] = useState(null);
    const [dadosFila, setDadosFila] = useState(null);
    const [loadingDadosFila, setLoadingDadosFila] = useState(false);
    const [mostrarModalEmpresa, setMostrarModalEmpresa] = useState(false);
    const [detalhesEmpresa, setDetalhesEmpresa] = useState(null);
    const [loadingEmpresa, setLoadingEmpresa] = useState(false);

    const navigate = useNavigate();
    const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
    const idEmpresa = empresaSelecionada?.ID_EMPRESA;
    const nomeEmpresa = empresaSelecionada?.NOME_EMPRESA;

    // Buscar filas ao montar componente
    useEffect(() => {
        if (!idEmpresa) {
            navigate('/escolher-empresa');
            return;
        }

        const fetchFilas = async () => {
            setLoadingFilas(true);
            setErrorFilas(null);
            try {
                const response = await api.get('/filas', { params: { idEmpresa } });
                setFilas(response.data);
            } catch (err) {
                setErrorFilas('Erro ao carregar filas');
                console.error(err);
            } finally {
                setLoadingFilas(false);
            }
        };

        fetchFilas();
    }, [idEmpresa, navigate]);

    // Buscar dados da fila selecionada
    useEffect(() => {
        if (!filaSelecionada) {
            setDadosFila(null);
            return;
        }

        const fetchDadosFila = async () => {
            setLoadingDadosFila(true);
            try {
                const response = await api.get(`/dashboard/dados-graficos/${filaSelecionada.ID_FILA}`);
                setDadosFila(response.data);
            } catch (err) {
                console.error(err);
                setDadosFila(null);
            } finally {
                setLoadingDadosFila(false);
            }
        };

        fetchDadosFila();
    }, [filaSelecionada]);

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
                <div
                    className="empresa-titulo-container"
                    onClick={exibirDetalhesEmpresa}
                    style={{ cursor: 'pointer' }}
                >
                    <span className="empresa-nome">
                        {loadingEmpresa ? 'Carregando detalhes...' : `${nomeEmpresa || 'Carregando...'}`}
                    </span>
                </div>

                <div className="empresa-dropdown-container">
                    <label>Fila: </label>
                    {loadingFilas ? (
                        <span>Carregando filas...</span>
                    ) : (
                        <select
                            value={filaSelecionada?.ID_FILA || ''}
                            onChange={(e) => {
                                const fila = filas.find(f => f.ID_FILA === parseInt(e.target.value));
                                setFilaSelecionada(fila || null);
                            }}
                        >
                            <option value="">Selecione uma fila</option>
                            {filas.map((fila) => (
                                <option key={fila.ID_FILA} value={fila.ID_FILA}>
                                    {fila.NOME_FILA} (ID: {fila.ID_FILA})
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <section className="filas-section">
                    {loadingDadosFila && <p>Carregando dados da fila...</p>}
                    {!loadingDadosFila && dadosFila && (
                        <div className="graficos-container">
                            <GraficosFila dados={dadosFila} nomeFila={filaSelecionada?.NOME_FILA} />
                        </div>
                    )}
                </section>
            </main>

            {/* Modal de Detalhes da Empresa */}
            {mostrarModalEmpresa && detalhesEmpresa && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Detalhes da Empresa</h2>
                            <button className="modal-close-button" onClick={fecharModalEmpresa}>
                                &times;
                            </button>
                        </div>
                        <div className="modal-body">
                            <p><strong>Nome:</strong> {detalhesEmpresa.NOME_EMPRESA}</p>
                            <p><strong>CNPJ:</strong> {detalhesEmpresa.CNPJ}</p>
                        </div>
                        <div className="modal-footer">
                            <button className="modal-close-button-footer" onClick={fecharModalEmpresa}>
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dash;
