import React, { useEffect, useState } from 'react';
import api from '../../services/api'; // Ajuste o caminho se necessário
import { FaStar } from 'react-icons/fa';
import { Alert, Button, ProgressBar } from 'react-bootstrap';
import StatCard from '../StatCard/StatCard'; // Importando o StatCard refatorado
import dayjs from "dayjs";

// Componente interno para mostrar estrelas (inalterado)
const StarRating = ({ nota }) => (
    <div className="mf-rating-stars">
        {[...Array(5)].map((_, index) => (
            <FaStar
                key={index}
                color={index < nota ? '#ffc107' : '#e4e5e9'}
                size={16}
            />
        ))}
    </div>
);

// Componente de Filtro (Novo)
const FiltroPills = ({ filtroAtivo, onFiltroChange }) => {
    const filtros = [
        { label: "Todas", valor: 0 },
        { label: "5 ★", valor: 5 },
        { label: "4 ★", valor: 4 },
        { label: "3 ★", valor: 3 },
        { label: "2 ★", valor: 2 },
        { label: "1 ★", valor: 1 },
    ];

    return (
        <div className="mf-avaliacoes-filtros">
            {filtros.map(f => (
                <button
                    key={f.valor}
                    className={`mf-pill ${filtroAtivo === f.valor ? "active" : ""}`}
                    onClick={() => onFiltroChange(f.valor)}
                >
                    {f.label}
                </button>
            ))}
        </div>
    );
};


const DashboardAvaliacoes = ({ idEmpresa }) => {
    // REMOVIDO: useTranslation()
    
    const [stats, setStats] = useState(null);
    const [comentarios, setComentarios] = useState([]);
    const [pagina, setPagina] = useState(1);
    const [infoPaginas, setInfoPaginas] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // NOVO: Estado para o filtro de estrelas (0 = todas)
    const [filtroEstrelas, setFiltroEstrelas] = useState(0);

    useEffect(() => {
        if (!idEmpresa) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            
            // Define os parâmetros de query com base no filtro
            const queryParams = {};
            if (filtroEstrelas > 0) {
                queryParams.nota = filtroEstrelas;
            }

            try {
                // 1. Buscar estatísticas (agora envia params)
                const { data: statsData } = await api.get(`/avaliacoes/stats/${idEmpresa}`, {
                    params: queryParams 
                });
                setStats(statsData);

                // 2. Buscar primeira página de comentários (agora envia params)
                queryParams.page = 1;
                queryParams.limit = 5;
                
                const { data: comentariosData } = await api.get(`/avaliacoes/comentarios/${idEmpresa}`, {
                    params: queryParams
                });
                
                setComentarios(comentariosData.comentarios);
                setInfoPaginas({ 
                    totalComentarios: comentariosData.totalComentarios, 
                    totalPaginas: comentariosData.totalPaginas 
                });
                setPagina(1); // Reseta a página para 1 a cada novo filtro
                
            } catch (err) {
                console.error("Erro ao buscar dados de avaliação:", err);
                setError("Erro ao carregar os dados de avaliação."); // Texto fixo
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    // ATUALIZADO: O useEffect agora re-executa quando o filtroEstrelas muda
    }, [idEmpresa, filtroEstrelas]);

    const carregarMais = async () => {
        if (!infoPaginas || pagina >= infoPaginas.totalPaginas) return;

        const proximaPagina = pagina + 1;
        
        // Parâmetros para carregar mais (incluindo o filtro)
        const params = { 
            page: proximaPagina, 
            limit: 5 
        };
        if (filtroEstrelas > 0) {
            params.nota = filtroEstrelas;
        }

        try {
            const { data } = await api.get(`/avaliacoes/comentarios/${idEmpresa}`, { params });
            setComentarios(prev => [...prev, ...data.comentarios]);
            setPagina(proximaPagina);
        } catch (err) {
            console.error("Erro ao carregar mais comentários:", err);
        }
    };

    if (loading && pagina === 1) { // Mostra loading principal só na primeira carga
        return <div className="mf-center-muted">Carregando...</div>;
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }
    
    if (!stats || stats.totalAvaliacoes === 0) {
        return <Alert variant="info">Nenhuma avaliação registrada para esta empresa ainda.</Alert>;
    }
    
    const totalDistribuicao = stats.totalAvaliacoes || 1; // Evitar divisão por zero

    // Texto do subtítulo do StatCard
    const subStat = (filtroEstrelas > 0)
        ? `${stats.totalFiltrado} de ${stats.totalAvaliacoes} avaliações`
        : `de ${stats.totalAvaliacoes} avaliações`;

    return (
        // NOVO: Layout em Grid (2 colunas)
        <div className="mf-avaliacoes-grid">
            
            {/* Coluna da Esquerda: Stats e Distribuição */}
            <div className="mf-avaliacoes-col-stats">
                <div className="mf-stats"> {/* Container para o StatCard */}
                    <StatCard 
                        title="Média Geral" // Texto fixo
                        value={stats.mediaGeral}
                        suffix="★"
                        subtitle={subStat} // Subtítulo dinâmico
                        precision={1} 
                    />
                </div>

                <div className="mf-avaliacoes-distribuicao">
                    <h4 className="mf-subsection-title">Distribuição Total</h4> {/* Texto fixo */}
                    {stats.distribuicao.map(item => (
                        <div className="mf-rating-bar-row" key={item.nota}>
                            <span>{item.nota} estrelas</span> {/* Texto fixo */}
                            <ProgressBar 
                                now={(item.contagem / totalDistribuicao) * 100} 
                                variant="warning"
                                className="mf-rating-bar"
                            />
                            <span>{item.contagem}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Coluna da Direita: Filtros e Comentários */}
            <div className="mf-avaliacoes-col-comentarios">
                <h4 className="mf-subsection-title">Comentários Recentes</h4> {/* Texto fixo */}

                <FiltroPills 
                    filtroAtivo={filtroEstrelas}
                    onFiltroChange={setFiltroEstrelas}
                />
                 
                 {loading && pagina > 1 && <div className="mf-center-muted">Carregando...</div>}

                 {!loading && comentarios.length === 0 && (
                    <p className="mf-center-muted">Nenhum comentário encontrado para este filtro.</p> // Texto fixo
                 )}
                 
                 <div className="mf-comentarios-list">
                    {comentarios.map((com, index) => (
                        <div className="mf-comentario-card" key={`${com.DT_CRIACAO}-${index}`}>
                            <div className="mf-comentario-header">
                                <StarRating nota={com.NOTA} />
                                <span className="mf-comentario-data">
                                    {dayjs(com.DT_CRIACAO).format('DD/MM/YYYY HH:mm')}
                                </span>
                            </div>
                            <p className="mf-comentario-texto">"{com.COMENTARIO}"</p>
                        </div>
                    ))}
                 </div>

                 {infoPaginas && pagina < infoPaginas.totalPaginas && !loading && (
                    <Button variant="outline-primary" onClick={carregarMais} className="mf-mt">
                        Carregar Mais {/* Texto fixo */}
                    </Button>
                 )}
            </div>
        </div>
    );
};

export default DashboardAvaliacoes;