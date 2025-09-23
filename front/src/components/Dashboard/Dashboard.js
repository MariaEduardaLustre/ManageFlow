import React, { useEffect, useMemo, useRef, useState } from "react";
import Menu from "../Menu/Menu";
import api from "../../services/api";
import { socket } from "../../services/socket";
import CountUp from "react-countup";
import dayjs from "dayjs";
import "./Dashboard.css";

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

function resolveStatus({ blocked, effectiveActive }) {
  if (!effectiveActive) return "INATIVA";
  if (blocked) return "BLOQUEADA";
  return "ATIVA";
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
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const minutosTotais = payload[0].value;
    const minutos = Math.floor(minutosTotais);
    const segundos = Math.round((minutosTotais - minutos) * 60);

    return (
      <div
        className="mf-tooltip"
        style={{ backgroundColor: "#fff", padding: "10px", border: "1px solid #e5e7eb", borderRadius: 10 }}
      >
        <p className="mf-tooltip-label">{`Hora: ${label}h`}</p>
        <p className="mf-tooltip-intro" style={{ color: payload[0].color }}>
          {`Tempo de Espera: ${minutos} min ${segundos} seg`}
        </p>
      </div>
    );
  }
  return null;
};

const HorariosDePico = ({ idEmpresa, idFila }) => {
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
          setError("Não há dados de fila suficientes para esta empresa.");
        } else {
          setError("Não foi possível carregar os dados. Tente novamente mais tarde.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchHorariosDePico();
  }, [idEmpresa, idFila]);

  const exportarCSV = () => {
    if (!dadosPico?.dadosPorHora?.length) return;
    const headers = ["Hora", "Total de Clientes"];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      headers.join(";") +
      "\n" +
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

  if (loading) return <div className="mf-center-muted">Carregando dados de pico...</div>;
  if (error) return <Alert variant="danger" className="mt-4">{error}</Alert>;
  if (!dadosPico || dadosPico.dadosPorHora.length === 0)
    return <Alert variant="info" className="mt-4">Nenhum dado de pico disponível para análise.</Alert>;

  return (
    <div className="mf-pico-container">
      <h3 className="mf-section-title">Análise de Horários de Pico</h3>
      <div className="mf-pico-highlight">
        <p><strong>{dadosPico.horarioDePico}</strong></p>
      </div>
      <div className="mf-chart-container">
        <h4 className="mf-subsection-title">Movimento por Hora do Dia</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={[...dadosPico.dadosPorHora].sort((a, b) => a.hora - b.hora)}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hora" label={{ value: "Hora do Dia", position: "insideBottom", offset: -5 }} />
            <YAxis label={{ value: "Nº de Clientes", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Bar dataKey="total_clientes" fill="#8884d8" name="Clientes" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mf-export-actions">
        <Button onClick={exportarCSV} variant="success" className="me-2">Exportar para CSV</Button>
        <Button onClick={exportarJSON} variant="secondary">Exportar para JSON</Button>
      </div>
    </div>
  );
};

const TempoDeEspera = ({ idEmpresa, idFila }) => {
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
          setError("Nenhum dado de tempo de espera encontrado para esta empresa.");
        } else {
          setError("Não foi possível carregar os dados. Tente novamente mais tarde.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchTemposEspera();
  }, [idEmpresa, idFila]);

  if (loading) return <div className="mf-center-muted">Carregando dados de tempo de espera...</div>;
  if (error) return <Alert variant="danger" className="mt-4">{error}</Alert>;
  if (!dadosEspera || dadosEspera.length === 0)
    return <Alert variant="info" className="mt-4">Nenhum dado de tempo de espera disponível para análise.</Alert>;

  return (
    <div className="mf-pico-container mf-mt">
      <h3 className="mf-section-title">Tempo Médio de Espera por Hora</h3>
      <div className="mf-chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dadosEspera}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hora" label={{ value: "Hora do Dia", position: "insideBottom", offset: -5 }} />
            <YAxis label={{ value: "Minutos", angle: -90, position: "insideLeft" }} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="media_espera_minutos" stroke="#82ca9d" name="Tempo de Espera" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
/* ===================== /Partes adicionadas ===================== */

const Dashboard = () => {
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
          totals: {
            totalQueues,
            activeQueues,
            blockedQueues: 0,
            peopleToday: 0,
            avgWaitMinutes: 0,
          },
          perQueue: filasCfg.map((f) => ({
            id_conf_fila: f.id_conf_fila,
            nome_fila: f.nome_fila,
            waiting: 0,
            blocked: 0,
            lastUpdateISO: null,
          })),
          joinsLastHours: [],
        });
      } catch {
        // noop
      }
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
      if (!idConfFila) return { ...item.original, status: "ATIVA" };

      try {
        const { data } = await api.get("/filas/status", { params: { idConfFila } });
        const blocked = Boolean(data?.blocked);
        const effectiveActive = Boolean(data?.effectiveActive);
        const status = resolveStatus({ blocked, effectiveActive });
        return { ...item.original, blocked: blocked ? 1 : 0, effectiveActive, status };
      } catch {
        const blockedFallback = Boolean(item.original.blocked);
        const effectiveActiveFallback = true;
        const status = resolveStatus({ blocked: blockedFallback, effectiveActive: effectiveActiveFallback });
        return { ...item.original, blocked: blockedFallback ? 1 : 0, effectiveActive: effectiveActiveFallback, status };
      }
    };

    const results = await inBatches(items, 5, worker);
    const enrichedPerQueue = results.filter(Boolean);

    const totalQueues = enrichedPerQueue.length;
    const blockedQueues = enrichedPerQueue.filter((q) => q.status === "BLOQUEADA").length;
    const inactiveQueues = enrichedPerQueue.filter((q) => q.status === "INATIVA").length;
    const activeQueues = enrichedPerQueue.filter((q) => q.status === "ATIVA").length;

    const merged = {
      ...baseSummary,
      totals: {
        ...baseSummary.totals,
        totalQueues,
        activeQueues,
        blockedQueues,
        inactiveQueues,
      },
      perQueue: enrichedPerQueue,
    };

    setEnriched(merged);
  };

  useEffect(() => {
    setLoading(true);
    loadSummary();

    const onConnect = () => {
      if (idEmpresa) socket.emit("dashboard:join", idEmpresa);
    };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idEmpresa]);

  useEffect(() => {
    if (!summary) return;
    enrichPerQueue(summary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

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
    const t = enriched?.totals || summary?.totals || {};
    const active = t.activeQueues || 0;
    const blocked = t.blockedQueues || 0;
    const inactive = t.inactiveQueues || 0;
    return [
      { name: "Ativas", value: active },
      { name: "Bloqueadas", value: blocked },
      { name: "Inativas", value: inactive },
    ];
  }, [enriched, summary]);

  if (loading) {
    return (
      <div className="mf-dash">
        <Menu />
        <div className="mf-dash-content">
          <div className="mf-loading">Carregando dashboard…</div>
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
    return (q.status || resolveStatus({ blocked: !!q.blocked, effectiveActive: q.effectiveActive ?? true })) === tableFilter;
  });

  // NOVO: soma para o card combinado
  const totalInactiveBlocked = (totals.blockedQueues || 0) + (totals.inactiveQueues || 0);

  return (
    <div className="mf-dash">
      <Menu />

      <div className="mf-dash-content">
        <div className="mf-dash-header">
          <div>
            <h1>Dashboard</h1>
            <p className="mf-subtitle">
              Visão geral em tempo real das suas filas
              {empresaSel?.NOME_EMPRESA ? ` — ${empresaSel.NOME_EMPRESA}` : ""}.
            </p>
          </div>
          <div className="mf-last-refresh">{dayjs().format("DD/MM/YYYY HH:mm:ss")}</div>
        </div>

        {/* KPIs (ajustado: card único Inativas/Bloqueadas) */}
        <div className="mf-stats">
          <StatCard title="Total de Filas" value={totals.totalQueues} subtitle="Todas as filas cadastradas" />
          <StatCard title="Filas Ativas" value={totals.activeQueues} subtitle="Disponíveis para clientes" />
          <StatCard
            title="Filas Inativas/Bloqueadas"
            value={totalInactiveBlocked}
            subtitle="Indisponíveis agora"
          />
          <StatCard title="Pessoas Hoje" value={totals.peopleToday} subtitle="Entradas nas filas (hoje)" />
          <StatCard
            title="Espera Média"
            value={Math.round(totals.avgWaitMinutes || 0)}
            suffix=" min"
            subtitle="Clientes aguardando"
          />
        </div>

        {/* Gráficos principais */}
        <div className="mf-charts">
          <div className="mf-card">
            <div className="mf-card-title">Entradas por hora (hoje)</div>
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
              ) : (
                <div className="mf-chart-empty">Sem dados hoje.</div>
              )}
            </div>
          </div>

          <div className="mf-card">
            <div className="mf-card-title">Status das filas</div>
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
                <div>
                  <span className="mf-legend-dot mf--green" />
                  Ativas
                </div>
                <div>
                  <span className="mf-legend-dot mf--orange" />
                  Bloqueadas
                </div>
                <div>
                  <span className="mf-legend-dot mf--gray" />
                  Inativas
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela por fila */}
        <div className="mf-table-card">
          <div className="mf-table-title">
            Filas (hoje)
            <div className="mf-table-filters">
              <button className={`mf-pill ${tableFilter === "ALL" ? "active" : ""}`} onClick={() => setTableFilter("ALL")}>
                Todas
              </button>
              <button className={`mf-pill ${tableFilter === "ATIVA" ? "active" : ""}`} onClick={() => setTableFilter("ATIVA")}>
                Ativas
              </button>
              <button className={`mf-pill ${tableFilter === "BLOQUEADA" ? "active" : ""}`} onClick={() => setTableFilter("BLOQUEADA")}>
                Bloqueadas
              </button>
              <button className={`mf-pill ${tableFilter === "INATIVA" ? "active" : ""}`} onClick={() => setTableFilter("INATIVA")}>
                Inativas
              </button>
            </div>
          </div>
          <div className="mf-table-wrap">
            <table className="mf-table">
              <thead>
                <tr>
                  <th>Fila</th>
                  <th style={{ textAlign: "right" }}>Aguardando</th>
                  <th>Status</th>
                  <th>Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {perQueue.length > 0 &&
                  filteredQueues.map((f) => {
                    const status =
                      f.status ||
                      resolveStatus({
                        blocked: !!f.blocked,
                        effectiveActive: f.effectiveActive ?? true,
                      });
                    return (
                      <tr key={f.id_conf_fila}>
                        <td>{f.nome_fila}</td>
                        <td className="mf-cell-right">{f.waiting ?? 0}</td>
                        <td>
                          <StatusDot status={status} />
                          {status}
                        </td>
                        <td>{f.lastUpdateISO ? dayjs(f.lastUpdateISO).format("HH:mm:ss") : "—"}</td>
                      </tr>
                    );
                  })}
                {filteredQueues.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", opacity: 0.7 }}>
                      Nenhuma fila no filtro selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {filas.length > 0 && (
          <div className="d-flex justify-content-end align-items-center mb-3">
            <Form.Group className="mf-select-group">
              <Form.Label className="me-2">Selecionar Fila:</Form.Label>
              <Form.Select value={selectedFila?.ID_FILA || ""} onChange={handleFilaChange}>
                {filas.map((f) => (
                  <option key={f.ID_FILA} value={f.ID_FILA}>
                    {f.NOME_FILA}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </div>
        )}
        {idEmpresa && selectedFila ? (
          <>
            <p className="mf-note">
              Análise de dados para a fila <strong>{selectedFila.NOME_FILA}</strong>
            </p>
            <HorariosDePico idEmpresa={idEmpresa} idFila={selectedFila.ID_FILA} />
            <TempoDeEspera idEmpresa={idEmpresa} idFila={selectedFila.ID_FILA} />
          </>
        ) : (
          <p className="mf-center-muted mf-mt">
            {filas.length === 0
              ? "Nenhuma fila disponível para análise detalhada."
              : "Selecione uma empresa ou aguarde o carregamento das filas."}
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
