import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import Menu from '../Menu/Menu';
import './FilaLista.css';
import { useTranslation } from 'react-i18next';

/* Datas */
const formatarDataParaExibicao = (val) => {
    if (val === null || val === undefined || val === '') return 'N/A';
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = d.getFullYear();
        return `${dd}/${mm}/${yy}`;
    }
    const s = String(val);
    if (/^\d{8}$/.test(s)) {
        const yy = s.slice(0, 4), mm = s.slice(4, 6), dd = s.slice(6, 8);
        return `${dd}/${mm}/${yy}`;
    }
    return s;
};
const formatarDataParaURL = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yy}${mm}${dd}`;
    }
    const s = String(val);
    if (/^\d{8}$/.test(s)) return s;
    return '';
};

// ALTERADO: A página agora recebe 'onLogout' como uma propriedade
const FilaLista = ({ onLogout }) => {
    const { t } = useTranslation();
    const [filas, setFilas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada') || 'null');
    const idEmpresa = empresaSelecionada?.ID_EMPRESA;

    useEffect(() => {
        if (!idEmpresa) {
            navigate('/escolher-empresa');
            return;
        }

        const fetchFilas = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data } = await api.get(`/empresas/filas/${idEmpresa}`);
                setFilas(Array.isArray(data) ? data : []);
            } catch (err) {
                if (err.response?.status === 404) {
                    setFilas([]);
                } else {
                    console.error('Erro ao buscar filas:', err);
                    setError(t('filaLista.mensagens.erroCarregar'));
                }
            } finally {
                setLoading(false);
            }
        };

        fetchFilas();
    }, [idEmpresa, navigate, t]);

    return (
        <div className="home-container">
            {/* ALTERADO: A propriedade 'onLogout' é passada para o componente Menu */}
            <Menu onLogout={onLogout} />

            <main className="main-content">
                <section className="filas-section">
                    <h2 className="section-title">{t('filaLista.titulo')}</h2>

                    {loading && <p>{t('filaLista.mensagens.carregando')}</p>}
                    {error && <p className="fila-lista-error">{error}</p>}

                    {!loading && filas.length === 0 && !error && (
                        <p>{t('filaLista.mensagens.nenhumaFila')}</p>
                    )}

                    {!loading && filas.length > 0 && (
                        <table className="filas-table">
                            <thead>
                                <tr>
                                    <th>{t('filaLista.tabela.nomeFila')}</th>
                                    <th>{t('filaLista.tabela.dataInicio')}</th>
                                    <th>{t('filaLista.tabela.dataFim')}</th>
                                    <th>{t('filaLista.tabela.aguardando')}</th>
                                    <th>{t('filaLista.tabela.bloqueada')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filas.map((fila) => {
                                    const dtMovto = formatarDataParaURL(fila.DT_MOVTO);

                                    return (
                                        <tr
                                            key={`${fila.ID_FILA}-${fila.DT_MOVTO}`}
                                            onClick={() =>
                                                navigate(`/gestao-fila/${fila.ID_EMPRESA}/${dtMovto}/${fila.ID_FILA}`)
                                            }
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td>{fila.NOME_FILA}</td>
                                            <td>{formatarDataParaExibicao(fila.DT_INI)}</td>
                                            <td>{formatarDataParaExibicao(fila.FIM_VIG)}</td>
                                            <td>{Number(fila.QTDE_AGUARDANDO) || 0}</td>
                                            <td>{fila.BLOCK ? t('geral.sim') : t('geral.nao')}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </section>
            </main>
        </div>
    );
};

export default FilaLista;