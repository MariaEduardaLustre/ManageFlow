import React, { useEffect, useMemo, useRef, useState } from "react";
import Menu from "../Menu/Menu";
import api from "../../services/api";
import { socket } from "../../services/socket";
import CountUp from "react-countup";
import dayjs from "dayjs";
import "./Dashboard.css";
import { useTranslation } from "react-i18next";

/** Recharts */
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    CartesianGrid,
    LineChart,
    Line,
} from "recharts";

/** Bootstrap */
import { Alert, Button, Form } from "react-bootstrap";

/* ===================== UI Helpers ===================== */
const StatCard = ({ title, value, suffix, subtitle }) => (
    <div className="mf-stat">
        <div className="mf-stat-title">{title}</div>
        <div className="mf-stat-value">
            <CountUp end={Number(value || 0)} duration={0.6} separator="." />
            {suffix ? <span className="mf-stat-suffix">{suffix}</span> : null}
        </div>
        {subtitle ? <div className="mf-stat-sub">{subtitle}</div> : null}
    </div>
);

const StatusDot = ({ status }) => {
    const cls =
        status === "ATIVA"
            ? "mf-dot mf--green"
            : status === "BLOQUEADA"
                ? "mf-dot mf--orange"
                : "mf-dot mf--gray"; // INATIVA
    return <span className={cls} />;
};

function resolveStatus({ blocked, effectiveActive }, t) {
    if (!effectiveActive) return t('dashboard.status.inativa');
    if (blocked) return t('dashboard.status.bloqueada');
    return t('dashboard.status.ativa');
}

async function inBatches(items, batchSize, worker) {
    const out = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const slice = items.slice(i, i + batchSize);
        const results = await Promise.allSettled(slice.map(worker));
        results.forEach((r) => {
            out.push(r.status === "fulfilled" ? r.value : null);
        });
    }
    return out;
}

/* ===================== Partes adicionadas da outra branch ===================== */
const CustomTooltip = ({ active, payload, label, t }) => {
    if (active && payload && payload.length) {
        const minutosTotais = payload[0].value;
        const minutos = Math.floor(minutosTotais);
        const segundos = Math.round((minutosTotais - minutos) * 60);

        return (
            <div
                className="mf-tooltip"
                style={{ backgroundColor: "#fff", padding: "10px", border: "1px solid #e5e7eb", borderRadius: 10 }}
            >
                <p className="mf-tooltip-label">{t('dashboard.graficos.hora')}: {label}h</p>
                <p className="mf-tooltip-intro" style={{ color: payload[0].color }}>
                    {t('dashboard.graficos.tempoEspera')}: {minutos} min {segundos} seg
                </p>
            </div>
        );
    }
    return null;
};

const HorariosDePico = ({ idEmpresa, idFila, t }) => {
    const [dadosPico, setDadosPico] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHorariosDePico = async () => {
            if (!idEmpresa || !idFila) {
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const response = await api.get(`/empresas/horarios-de-pico/${idEmpresa}/${idFila}`);
                setDadosPico(response.data);
            } catch (err) {
                console.error("Erro ao buscar dados de pico:", err);
                if (err.response && err.response.status === 404) {
                    setError(t('dashboard.erros.dadosInsuficientes'));
                } else {
                    setError(t('dashboard.erros.carregarDados'));
                }
            } finally {
                setLoading(false);
            }
        };
        fetchHorariosDePico();
    }, [idEmpresa, idFila, t]);

    const exportarCSV = () => {
        if (!dadosPico?.dadosPorHora?.length) return;
        const headers = [t('dashboard.horariosPico.hora'), t('dashboard.horariosPico.totalClientes')];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(";") + "\n" +
            dadosPico.dadosPorHora.map((e) => `${e.hora};${e.total_clientes}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `horarios_de_pico_${idEmpresa}_${idFila}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportarJSON = () => {
        if (!dadosPico?.dadosPorHora?.length) return;
        const jsonContent = JSON.stringify(dadosPico.dadosPorHora, null, 2);
        const blob = new Blob([jsonContent], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `horarios_de_pico_${idEmpresa}_${idFila}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (loading) return <div className="mf-center-muted">{t('dashboard.horariosPico.carregando')}</div>;
    if (error) return <Alert variant="danger" className="mt-4">{error}</Alert>;
    if (!dadosPico || dadosPico.dadosPorHora.length === 0)
        return <Alert variant="info" className="mt-4">{t('dashboard.horariosPico.nenhumDado')}</Alert>;

    return (
        <div className="mf-pico-container">
            <h3 className="mf-section-title">{t('dashboard.horariosPico.titulo')}</h3>
            <div className="mf-pico-highlight">
                <p><strong>{dadosPico.horarioDePico}</strong></p>
            </div>
            <div className="mf-chart-container">
                <h4 className="mf-subsection-title">{t('dashboard.horariosPico.subtitulo')}</h4>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[...dadosPico.dadosPorHora].sort((a, b) => a.hora - b.hora)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hora" label={{ value: t('dashboard.graficos.horaDoDia'), position: "insideBottom", offset: -5 }} />
                        <YAxis label={{ value: t('dashboard.graficos.numClientes'), angle: -90, position: "insideLeft" }} />
                        <Tooltip />
                        <Bar dataKey="total_clientes" fill="#8884d8" name={t('dashboard.graficos.clientes')} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="mf-export-actions">
                <Button onClick={exportarCSV} variant="success" className="me-2">{t('dashboard.botoes.exportarCsv')}</Button>
                <Button onClick={exportarJSON} variant="secondary">{t('dashboard.botoes.exportarJson')}</Button>
            </div>
        </div>
    );
};

const TempoDeEspera = ({ idEmpresa, idFila, t }) => {
    const [dadosEspera, setDadosEspera] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTemposEspera = async () => {
            if (!idEmpresa || !idFila) {
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const response = await api.get(`/empresas/tempo-espera/${idEmpresa}/${idFila}`);
                setDadosEspera(response.data);
            } catch (err) {
                console.error("Erro ao buscar tempo de espera:", err);
                if (err.response && err.response.status === 404) {
                    setError(t('dashboard.erros.nenhumDadoEspera'));
                } else {
                    setError(t('dashboard.erros.carregarDados'));
                }
            } finally {
                setLoading(false);
            }
        };
        fetchTemposEspera();
    }, [idEmpresa, idFila, t]);

    if (loading) return <div className="mf-center-muted">{t('dashboard.tempoEspera.carregando')}</div>;
    if (error) return <Alert variant="danger" className="mt-4">{error}</Alert>;
    if (!dadosEspera || dadosEspera.length === 0)
        return <Alert variant="info" className="mt-4">{t('dashboard.tempoEspera.nenhumDado')}</Alert>;

    return (
        <div className="mf-pico-container mf-mt">
            <h3 className="mf-section-title">{t('dashboard.tempoEspera.titulo')}</h3>
            <div className="mf-chart-container">
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dadosEspera}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hora" label={{ value: t('dashboard.graficos.horaDoDia'), position: "insideBottom", offset: -5 }} />
                        <YAxis label={{ value: t('dashboard.graficos.minutos'), angle: -90, position: "insideLeft" }} />
                        <Tooltip content={<CustomTooltip t={t} />} />
                        <Line type="monotone" dataKey="media_espera_minutos" stroke="#82ca9d" name={t('dashboard.graficos.tempoDeEspera')} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
/* ===================== /Partes adicionadas ===================== */

// ALTERADO: A página agora recebe 'onLogout' como uma propriedade
const Dashboard = ({ onLogout }) => {
    const { t } = useTranslation();
    const empresaSel = JSON.parse(localStorage.getItem("empresaSelecionada"));
    const idEmpresa = empresaSel?.ID_EMPRESA || null;

    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [enriched, setEnriched] = useState(null);
    const [tableFilter, setTableFilter] = useState("ALL");
    const [filas, setFilas] = useState([]);
    const [selectedFila, setSelectedFila] = useState(null);
    const pollRef = useRef(null);

    const loadSummary = async () => {
        if (!idEmpresa) return;
        try {
            const { data } = await api.get("/dashboard/summary", { params: { idEmpresa } });
            setSummary(data);
        } catch (e) {
            try {
                const { data: filasCfg } = await api.get("/configuracao", { params: { idEmpresa } });
                const totalQueues = filasCfg.length;
                const activeQueues = filasCfg.filter((f) => f.situacao === 1).length;
                setSummary({
                    totals: { totalQueues, activeQueues, blockedQueues: 0, peopleToday: 0, avgWaitMinutes: 0 },
                    perQueue: filasCfg.map((f) => ({ id_conf_fila: f.id_conf_fila, nome_fila: f.nome_fila, waiting: 0, blocked: 0, lastUpdateISO: null })),
                    joinsLastHours: [],
                });
            } catch { /* noop */ }
        } finally {
            setLoading(false);
        }
    };

    const enrichPerQueue = async (baseSummary) => {
        if (!baseSummary || !Array.isArray(baseSummary.perQueue)) {
            setEnriched(baseSummary);
            return;
        }
        const perQueue = baseSummary.perQueue;
        const items = perQueue.map((q) => ({ id_conf_fila: q.id_conf_fila, original: q }));

        const worker = async (item) => {
            const idConfFila = item.id_conf_fila;
            if (!idConfFila) return { ...item.original, status: t('dashboard.status.ativa') };
            try {
                const { data } = await api.get("/filas/status", { params: { idConfFila } });
                const blocked = Boolean(data?.blocked);
                const effectiveActive = Boolean(data?.effectiveActive);
                const status = resolveStatus({ blocked, effectiveActive }, t);
                return { ...item.original, blocked: blocked ? 1 : 0, effectiveActive, status };
            } catch {
                const blockedFallback = Boolean(item.original.blocked);
                const effectiveActiveFallback = true;
                const status = resolveStatus({ blocked: blockedFallback, effectiveActive: effectiveActiveFallback }, t);
                return { ...item.original, blocked: blockedFallback ? 1 : 0, effectiveActive: effectiveActiveFallback, status };
            }
        };

        const results = await inBatches(items, 5, worker);
        const enrichedPerQueue = results.filter(Boolean);
        const totalQueues = enrichedPerQueue.length;
        const blockedQueues = enrichedPerQueue.filter((q) => q.status === t('dashboard.status.bloqueada')).length;
        const inactiveQueues = enrichedPerQueue.filter((q) => q.status === t('dashboard.status.inativa')).length;
        const activeQueues = enrichedPerQueue.filter((q) => q.status === t('dashboard.status.ativa')).length;

        const merged = { ...baseSummary, totals: { ...baseSummary.totals, totalQueues, activeQueues, blockedQueues, inactiveQueues }, perQueue: enrichedPerQueue };
        setEnriched(merged);
    };

    useEffect(() => {
        setLoading(true);
        loadSummary();
        const onConnect = () => { if (idEmpresa) socket.emit("dashboard:join", idEmpresa); };
        const onChanged = () => loadSummary();
        const onTick = () => loadSummary();
        socket.on("connect", onConnect);
        socket.on("dashboard:changed", onChanged);
        socket.on("dashboard:tick", onTick);
        pollRef.current = setInterval(loadSummary, 10000);
        return () => {
            socket.off("connect", onConnect);
            socket.off("dashboard:changed", onChanged);
            socket.off("dashboard:tick", onTick);
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [idEmpresa]);

    useEffect(() => {
        if (!summary) return;
        enrichPerQueue(summary);
    }, [summary, t]);

    useEffect(() => {
        const fetchFilas = async () => {
            if (!idEmpresa) return;
            try {
                const { data } = await api.get(`/empresas/filas/${idEmpresa}`);
                if (Array.isArray(data) && data.length > 0) {
                    setFilas(data);
                    setSelectedFila((prev) => prev || data[0]);
                } else {
                    setFilas([]);
                    setSelectedFila(null);
                }
            } catch (err) {
                console.error("Erro ao buscar filas para seleção:", err);
                setFilas([]);
                setSelectedFila(null);
            }
        };
        fetchFilas();
    }, [idEmpresa]);

    const handleFilaChange = (e) => {
        const idFilaSelecionada = e.target.value;
        const fila = filas.find((f) => String(f.ID_FILA) === String(idFilaSelecionada));
        setSelectedFila(fila || null);
    };

    const pieData = useMemo(() => {
        const t_totals = enriched?.totals || summary?.totals || {};
        const active = t_totals.activeQueues || 0;
        const blocked = t_totals.blockedQueues || 0;
        const inactive = t_totals.inactiveQueues || 0;
        return [
            { name: t('dashboard.status.ativa'), value: active },
            { name: t('dashboard.status.bloqueada'), value: blocked },
            { name: t('dashboard.status.inativa'), value: inactive },
        ];
    }, [enriched, summary, t]);

    if (loading) {
        return (
            <div className="mf-dash">
                <Menu onLogout={onLogout} />
                <div className="mf-dash-content">
                    <div className="mf-loading">{t('geral.carregando')}</div>
                </div>
            </div>
        );
    }

    const data = enriched || summary || {};
    const totals = data.totals || {};
    const perQueue = Array.isArray(data.perQueue) ? data.perQueue : [];
    const joinsLastHours = Array.isArray(data.joinsLastHours) ? data.joinsLastHours : [];
    const filteredQueues = perQueue.filter((q) => {
        if (tableFilter === "ALL") return true;
        return (q.status || resolveStatus({ blocked: !!q.blocked, effectiveActive: q.effectiveActive ?? true }, t)) === tableFilter;
    });
    const totalInactiveBlocked = (totals.blockedQueues || 0) + (totals.inactiveQueues || 0);

    return (
        <div className="mf-dash">
            <Menu onLogout={onLogout} />
            <div className="mf-dash-content">
                <div className="mf-dash-header">
                    <div>
                        <h1>{t('dashboard.titulo')}</h1>
                        <p className="mf-subtitle">{t('dashboard.subtitulo')} {empresaSel?.NOME_EMPRESA ? ` — ${empresaSel.NOME_EMPRESA}` : ""}.</p>
                    </div>
                    <div className="mf-last-refresh">{dayjs().format("DD/MM/YYYY HH:mm:ss")}</div>
                </div>

                <div className="mf-stats">
                    <StatCard title={t('dashboard.cards.total')} value={totals.totalQueues} subtitle={t('dashboard.cards.totalSub')} />
                    <StatCard title={t('dashboard.cards.ativas')} value={totals.activeQueues} subtitle={t('dashboard.cards.ativasSub')} />
                    <StatCard title={t('dashboard.cards.inativasBloqueadas')} value={totalInactiveBlocked} subtitle={t('dashboard.cards.inativasBloqueadasSub')} />
                    <StatCard title={t('dashboard.cards.pessoasHoje')} value={totals.peopleToday} subtitle={t('dashboard.cards.pessoasHojeSub')} />
                    <StatCard title={t('dashboard.cards.esperaMedia')} value={Math.round(totals.avgWaitMinutes || 0)} suffix=" min" subtitle={t('dashboard.cards.esperaMediaSub')} />
                </div>

                <div className="mf-charts">
                    <div className="mf-card">
                        <div className="mf-card-title">{t('dashboard.graficos.entradasHoje')}</div>
                        <div className="mf-card-body">
                            {joinsLastHours.length ? (
                                <ResponsiveContainer width="100%" height={240}>
                                    <AreaChart data={joinsLastHours}>
                                        <defs>
                                            <linearGradient id="mf-g" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="var(--mf-brand)" stopOpacity={0.5} />
                                                <stop offset="100%" stopColor="var(--mf-brand)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="label" tickMargin={8} />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="count" stroke="var(--mf-brand)" fill="url(#mf-g)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : <div className="mf-chart-empty">{t('dashboard.graficos.semDadosHoje')}</div>}
                        </div>
                    </div>

                    <div className="mf-card">
                        <div className="mf-card-title">{t('dashboard.graficos.statusFilas')}</div>
                        <div className="mf-card-body">
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                                        <Cell fill="#22c55e" />
                                        <Cell fill="#f59e0b" />
                                        <Cell fill="#9ca3af" />
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="mf-legend">
                                <div><span className="mf-legend-dot mf--green" />{t('dashboard.status.ativa')}</div>
                                <div><span className="mf-legend-dot mf--orange" />{t('dashboard.status.bloqueada')}</div>
                                <div><span className="mf-legend-dot mf--gray" />{t('dashboard.status.inativa')}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mf-table-card">
                    <div className="mf-table-title">
                        {t('dashboard.tabela.titulo')}
                        <div className="mf-table-filters">
                            <button className={`mf-pill ${tableFilter === "ALL" ? "active" : ""}`} onClick={() => setTableFilter("ALL")}>{t('dashboard.filtros.todas')}</button>
                            <button className={`mf-pill ${tableFilter === t('dashboard.status.ativa') ? "active" : ""}`} onClick={() => setTableFilter(t('dashboard.status.ativa'))}>{t('dashboard.filtros.ativas')}</button>
                            <button className={`mf-pill ${tableFilter === t('dashboard.status.bloqueada') ? "active" : ""}`} onClick={() => setTableFilter(t('dashboard.status.bloqueada'))}>{t('dashboard.filtros.bloqueadas')}</button>
                            <button className={`mf-pill ${tableFilter === t('dashboard.status.inativa') ? "active" : ""}`} onClick={() => setTableFilter(t('dashboard.status.inativa'))}>{t('dashboard.filtros.inativas')}</button>
                        </div>
                    </div>
                    <div className="mf-table-wrap">
                        <table className="mf-table">
                            <thead>
                                <tr>
                                    <th>{t('dashboard.tabela.fila')}</th>
                                    <th style={{ textAlign: "right" }}>{t('dashboard.tabela.aguardando')}</th>
                                    <th>{t('dashboard.tabela.status')}</th>
                                    <th>{t('dashboard.tabela.atualizado')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {perQueue.length > 0 && filteredQueues.map((f) => {
                                    const status = f.status || resolveStatus({ blocked: !!f.blocked, effectiveActive: f.effectiveActive ?? true }, t);
                                    return (
                                        <tr key={f.id_conf_fila}>
                                            <td>{f.nome_fila}</td>
                                            <td className="mf-cell-right">{f.waiting ?? 0}</td>
                                            <td><StatusDot status={status.toUpperCase()} />{status}</td>
                                            <td>{f.lastUpdateISO ? dayjs(f.lastUpdateISO).format("HH:mm:ss") : "—"}</td>
                                        </tr>
                                    );
                                })}
                                {filteredQueues.length === 0 && (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: "center", opacity: 0.7 }}>{t('dashboard.tabela.nenhumaFilaFiltro')}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {filas.length > 0 && (
                    <div className="d-flex justify-content-end align-items-center mb-3">
                        <Form.Group className="mf-select-group">
                            <Form.Label className="me-2">{t('dashboard.selecionarFila')}:</Form.Label>
                            <Form.Select value={selectedFila?.ID_FILA || ""} onChange={handleFilaChange}>
                                {filas.map((f) => (<option key={f.ID_FILA} value={f.ID_FILA}>{f.NOME_FILA}</option>))}
                            </Form.Select>
                        </Form.Group>
                    </div>
                )}
                {idEmpresa && selectedFila ? (
                    <>
                        <p className="mf-note">{t('dashboard.analiseFila', { nomeFila: selectedFila.NOME_FILA })}</p>
                        <HorariosDePico idEmpresa={idEmpresa} idFila={selectedFila.ID_FILA} t={t} />
                        <TempoDeEspera idEmpresa={idEmpresa} idFila={selectedFila.ID_FILA} t={t} />
                    </>
                ) : (
                    <p className="mf-center-muted mf-mt">
                        {filas.length === 0 ? t('dashboard.erros.nenhumaFilaAnalise') : t('dashboard.erros.selecioneEmpresa')}
                    </p>
                )}
            </div>
        </div>
    );
};

export default Dashboard;