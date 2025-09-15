import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Menu from '../Menu/Menu';
import GraficosFila from './GraficosFila';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();

    const [filas, setFilas] = useState([]);
    const [loadingFilas, setLoadingFilas] = useState(true);
    const [filaSelecionada, setFilaSelecionada] = useState(null);
    const [dadosFila, setDadosFila] = useState(null);
    const [loadingDadosFila, setLoadingDadosFila] = useState(false);

    const [mostrarModalEmpresa, setMostrarModalEmpresa] = useState(false);
    const [detalhesEmpresa, setDetalhesEmpresa] = useState(null);
    const [loadingEmpresa, setLoadingEmpresa] = useState(false);

    const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
    const idEmpresa = empresaSelecionada?.ID_EMPRESA;
    const nomeEmpresa = empresaSelecionada?.NOME_EMPRESA;

    // --- Buscar filas da empresa ---
    useEffect(() => {
        if (!idEmpresa) {
            navigate('/escolher-empresa');
            return;
        }

        const fetchFilas = async () => {
            setLoadingFilas(true);
            try {
                const response = await api.get('/filas', { params: { idEmpresa } });
                setFilas(response.data);
            } catch (err) {
                console.error('Erro ao buscar filas:', err);
            } finally {
                setLoadingFilas(false);
            }
        };

        fetchFilas();
    }, [idEmpresa, navigate]);

    // --- Buscar dados da fila selecionada ---
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
                console.error('Erro ao buscar dados da fila:', err);
                setDadosFila(null);
            } finally {
                setLoadingDadosFila(false);
            }
        };

        fetchDadosFila();
    }, [filaSelecionada]);

    // --- Modal de detalhes da empresa ---
    const exibirDetalhesEmpresa = async () => {
        if (!idEmpresa) return;
        setLoadingEmpresa(true);
        try {
            const response = await api.get(`/empresas/detalhes/${idEmpresa}`);
            setDetalhesEmpresa(response.data);
            setMostrarModalEmpresa(true);
        } catch (err) {
            console.error('Erro ao buscar detalhes da empresa:', err);
            alert('Erro ao carregar detalhes da empresa.');
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
                        {loadingEmpresa ? 'Carregando...' : nomeEmpresa || 'Empresa não selecionada'}
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
                            {filas.map(f => (
                                <option key={f.ID_FILA} value={f.ID_FILA}>
                                    {f.NOME_FILA}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <section className="filas-section">
                    {loadingDadosFila && <p>Carregando dados...</p>}
                    {!loadingDadosFila && dadosFila && filaSelecionada && (
                        <GraficosFila dados={dadosFila} nomeFila={filaSelecionada.NOME_FILA} />
                    )}
                </section>
            </main>

            {/* Modal Empresa */}
            {mostrarModalEmpresa && detalhesEmpresa && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Detalhes da Empresa</h2>
                            <button onClick={fecharModalEmpresa}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p><strong>Nome:</strong> {detalhesEmpresa.NOME_EMPRESA}</p>
                            <p><strong>CNPJ:</strong> {detalhesEmpresa.CNPJ}</p>
                            <p><strong>Email:</strong> {detalhesEmpresa.EMAIL}</p>
                        </div>
                        <div className="modal-footer">
                            <button onClick={fecharModalEmpresa}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
