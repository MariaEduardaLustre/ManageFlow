import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api'; // Ajuste o caminho se necessário
import { FaStar } from 'react-icons/fa';
import { Alert, Button, ProgressBar } from 'react-bootstrap';
import StatCard from '../StatCard/StatCard'; // Importando o StatCard refatorado
import dayjs from "dayjs";
// Imports do Recharts
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid
} from "recharts";

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

// Componente de Filtro (Inalterado)
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

// Tooltip (Inalterado - A lógica do 'payload' está correta)
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        
        const dataOriginal = payload[0].payload.data;

        return (
            <div className="mf-tooltip" style={{ backgroundColor: "#fff", padding: "10px", border: "1px solid #e5e7eb", borderRadius: 10 }}>
                <p className="mf-tooltip-label"><strong>Data: {dayjs(dataOriginal).format('DD/MM/YYYY')}</strong></p>
                
                {payload.map((p, i) => (
                     <p key={i} style={{ color: p.color, margin: 0 }}>
                        {p.name}: {p.value} {p.name === 'Média' ? '★' : ''}
                     </p>
                ))}
            </div>
        );
    }
    return null;
};


// Componente dos Gráficos (COM A CORREÇÃO NO TOOLTIP)
const TendenciaGraficos = ({ idEmpresa }) => {
    const [dados, setDados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!idEmpresa) return;
        
        const fetchTendencia = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data } = await api.get(`/avaliacoes/tendencia/${idEmpresa}`);
                setDados(data); 
            } catch (err) {
                console.error("Erro ao buscar tendência:", err);
                setError("Não foi possível carregar os gráficos de tendência.");
            } finally {
                setLoading(false);
            }
        };
        
        fetchTendencia();
    }, [idEmpresa]);
    
    // Formatador do Eixo X (Inalterado)
    const formatarEixoX = (dataSql) => {
        return dayjs(dataSql).format('DD/MM');
    };

    if (loading) return <div className="mf-center-muted mf-mt">Carregando gráficos...</div>;
    if (error) return <Alert variant="danger" className="mf-mt">{error}</Alert>;
    if (dados.length === 0) {
        return <Alert variant="info" className="mf-mt">Não há dados suficientes para exibir a tendência dos últimos 30 dias.</Alert>;
    }

    return (
        <div className="mf-avaliacoes-graficos-container">
            <h3 className="mf-section-title">Tendência dos Últimos 30 Dias</h3>
            
            <div className="mf-avaliacoes-graficos-grid">
                {/* Gráfico 1: Volume de Avaliações */}
                <div className="mf-grafico-item">
                    <h4 className="mf-subsection-title">Volume de Avaliações (por dia)</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={dados} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            
                            <XAxis 
                                dataKey="data" 
                                fontSize={12} 
                                tickFormatter={formatarEixoX}
                                type="category" 
                            />
                            
                            <YAxis allowDecimals={false} />

                            {/* ================================== */}
                            {/* === CORREÇÃO APLICADA AQUI === */}
                            {/* ================================== */}
                            <Tooltip content={(props) => <CustomTooltip {...props} key={props.label} />} />

                            <Bar dataKey="contagem" fill="#3A5AFE" name="Avaliações" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Gráfico 2: Média de Nota */}
                <div className="mf-grafico-item">
                    <h4 className="mf-subsection-title">Média da Nota (por dia)</h4>
                    <ResponsiveContainer width="100%" height={250}>
                         <LineChart data={dados} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />

                            <XAxis 
                                dataKey="data" 
                                fontSize={12} 
                                tickFormatter={formatarEixoX} 
                                type="category"
                            />

                            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} />
                            
                            {/* ================================== */}
                            {/* === CORREÇÃO APLICADA AQUI === */}
                            {/* ================================== */}
                            <Tooltip content={(props) => <CustomTooltip {...props} key={props.label} />} />
                            
                            <Line type="monotone" dataKey="mediaNota" stroke="#f59e0b" strokeWidth={2} name="Média" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};


// (O restante do DashboardAvaliacoes.jsx permanece exatamente igual)

const DashboardAvaliacoes = ({ idEmpresa, mostrarGraficos }) => {
    // Estados principais
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Estados dos comentários
    const [comentarios, setComentarios] = useState([]);
    const [loadingComentarios, setLoadingComentarios] = useState(false); 
    const [filtroEstrelas, setFiltroEstrelas] = useState(0);
    const [totalComentarios, setTotalComentarios] = useState(0);
    const [mostrarTodos, setMostrarTodos] = useState(false);

    // Hook 1: Busca Stats (inalterado)
    useEffect(() => {
        if (!idEmpresa) {
            setLoading(false); 
            return;
        }
        const fetchStats = async () => {
            setLoading(true); 
            setError(null);
            
            const queryParams = {};
            if (filtroEstrelas > 0) {
                queryParams.nota = filtroEstrelas;
            }
            try {
                const { data: statsData } = await api.get(`/avaliacoes/stats/${idEmpresa}`, {
                    params: queryParams 
                });
                setStats(statsData);
            } catch (err) {
                console.error("Erro ao buscar dados de avaliação:", err);
                setError("Erro ao carregar os dados de avaliação.");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [idEmpresa, filtroEstrelas]);

    // Hook 2: Busca Comentários (inalterado)
    useEffect(() => {
        if (!idEmpresa) return; 

        const fetchComentarios = async () => {
            setLoadingComentarios(true);
            const params = { page: 1 };
            
            if (filtroEstrelas > 0) {
                params.nota = filtroEstrelas;
            }
            if (mostrarTodos) {
                params.limit = 1000;
            } else {
                params.limit = 5;
            }
            
            try {
                const { data } = await api.get(`/avaliacoes/comentarios/${idEmpresa}`, { params });
                setComentarios(data.comentarios);
                setTotalComentarios(data.totalComentarios);
            } catch (err) { 
                console.error("Erro ao buscar comentários:", err);
            } finally {
                setLoadingComentarios(false);
            }
        };

        fetchComentarios();
    }, [idEmpresa, filtroEstrelas, mostrarTodos]);


    // Renderização principal (loading, erro, etc. - Inalterado)
    if (loading) {
        return <div className="mf-center-muted">Carregando...</div>;
    }
    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }
    if (!stats || stats.totalAvaliacoes === 0) {
        return <Alert variant="info">Nenhuma avaliação registrada para esta empresa ainda.</Alert>;
    }
    
    const totalDistribuicao = stats.totalAvaliacoes || 1;
    const subStat = (filtroEstrelas > 0)
        ? `${stats.totalFiltrado} de ${stats.totalAvaliacoes} avaliações`
        : `de ${stats.totalAvaliacoes} avaliações`;

    return (
        <>
            <div className="mf-avaliacoes-grid">
                
                {/* Coluna da Esquerda (inalterada) */}
                <div className="mf-avaliacoes-col-stats">
                    <div className="mf-stats">
                        <StatCard 
                            title="Média Geral"
                            value={stats.mediaGeral}
                            suffix="★"
                            subtitle={subStat}
                            precision={1} 
                        />
                    </div>
                    <div className="mf-avaliacoes-distribuicao">
                        <h4 className="mf-subsection-title">Distribuição Total</h4>
                        {stats.distribuicao.map(item => (
                            <div className="mf-rating-bar-row" key={item.nota}>
                                <span>{item.nota} estrelas</span>
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

                {/* Coluna da Direita (inalterada) */}
                <div className="mf-avaliacoes-col-comentarios">
                    <h4 className="mf-subsection-title">Comentários Recentes</h4>
                    <FiltroPills 
                        filtroAtivo={filtroEstrelas}
                        onFiltroChange={setFiltroEstrelas}
                    />
                     
                     {loadingComentarios && <div className="mf-center-muted">Carregando...</div>}
                     
                     {!loadingComentarios && totalComentarios === 0 && (
                        <p className="mf-center-muted">Nenhum comentário encontrado para este filtro.</p>
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

                     <div className="mf-comentarios-botoes">
                        {!loadingComentarios && !mostrarTodos && totalComentarios > 5 && (
                            <Button variant="outline-primary" onClick={() => setMostrarTodos(true)}>
                                Carregar Todos ({totalComentarios})
                            </Button>
                        )}
                        {!loadingComentarios && mostrarTodos && totalComentarios > 5 && (
                            <Button variant="outline-secondary" onClick={() => setMostrarTodos(false)}>
                                Mostrar Menos
                            </Button>
                        )}
                     </div>
                </div>
            </div>

            {/* Renderização condicional (inalterada) */}
            {mostrarGraficos && (
                <TendenciaGraficos idEmpresa={idEmpresa} />
            )}
        </>
    );
};

export default DashboardAvaliacoes;