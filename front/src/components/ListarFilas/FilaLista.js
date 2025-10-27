import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import Menu from '../Menu/Menu';
import './FilaLista.css';
import { useTranslation } from 'react-i18next'; // <-- 1. Importação continua a mesma

/* Datas */
// <-- 2. A função 'formatarDataParaExibicao' foi REMOVIDA.
//    Ela será substituída por uma lógica dentro do componente.

// A função formatarDataParaURL continua, pois é necessária para a navegação.
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

const FilaLista = ({ onLogout }) => {
    // <-- 3. ALTERADO: Pedimos o 'i18n' ao hook useTranslation
    const { t, i18n } = useTranslation(); 
    
    // <-- 4. ADICIONADO: Obtemos o idioma atual (ex: 'pt', 'en')
    const idiomaAtual = i18n.language;

    // <-- 5. ADICIONADO: Definimos as opções de formatação da data
    //    Queremos apenas dia, mês e ano, sem a hora.
    const opcoesDeFormatacao = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    };

    // <-- 6. ADICIONADO: Criamos o formatador de data internacional
    const formatadorDeData = new Intl.DateTimeFormat(idiomaAtual, opcoesDeFormatacao);

    // <-- 7. ADICIONADO: Uma nova função de formatação que usa o formatador
    //    Esta substitui a 'formatarDataParaExibicao' que removemos.
    const formatarData = (val) => {
        if (val === null || val === undefined || val === '') return 'N/A';
        const d = new Date(val);
        
        // Verifica se a data é válida
        if (isNaN(d.getTime())) {
            // Se não for, tenta lidar com o formato 'yyyymmdd' que a função antiga tratava
            const s = String(val);
            if (/^\d{8}$/.test(s)) {
                const yy = s.slice(0, 4), mm = s.slice(4, 6), dd = s.slice(6, 8);
                // Cria a data a partir das partes
                const dataManual = new Date(`${yy}-${mm}-${dd}T00:00:00`); // Adiciona T00:00:00 para evitar problemas de fuso
                if (isNaN(dataManual.getTime())) return s; // Se ainda for inválida, retorna a string
                return formatadorDeData.format(dataManual);
            }
            return s; // Retorna a string original se não for uma data
        }
        
        // Se a data for válida, formata-a
        return formatadorDeData.format(d);
    };

    // O resto do seu código permanece igual
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
                                            {/* <-- 8. ALTERADO: Usamos a nova função 'formatarData' */}
                                            <td>{formatarData(fila.DT_INI)}</td>
                                            {/* <-- 8. ALTERADO: Usamos a nova função 'formatarData' */}
                                            <td>{formatarData(fila.FIM_VIG)}</td>
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