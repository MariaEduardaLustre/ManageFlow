// src/components/Dashboard/Dashboard.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import Menu from "../Menu/Menu";
import api from "../../services/api";
import { socket } from "../../services/socket";
import CountUp from "react-countup";
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
} from "recharts";
import dayjs from "dayjs";
import "./Dashboard.css";

const StatCard = ({ title, value, suffix, subtitle }) => (
  <div className="stat-card">
    <div className="stat-title">{title}</div>
    <div className="stat-value">
      <CountUp end={Number(value || 0)} duration={0.6} separator="." />
      {suffix ? <span className="stat-suffix">{suffix}</span> : null}
    </div>
    {subtitle ? <div className="stat-sub">{subtitle}</div> : null}
  </div>
);

const StatusDot = ({ status }) => {
  const cls =
    status === "ATIVA"
      ? "dot green"
      : status === "BLOQUEADA"
      ? "dot orange"
      : "dot gray"; // INATIVA
  return <span className={cls} />;
};

// Converte flags em status legível
function resolveStatus({ blocked, effectiveActive }) {
  if (!effectiveActive) return "INATIVA";
  if (blocked) return "BLOQUEADA";
  return "ATIVA";
}

// Pequeno limitador de concorrência para fetch em lotes
async function inBatches(items, batchSize, worker) {
  const out = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    const results = await Promise.allSettled(slice.map(worker));
    results.forEach((r, idx) => {
      out.push(r.status === "fulfilled" ? r.value : null);
    });
  }
  return out;
}

const Dashboard = () => {
  const empresaSel = JSON.parse(localStorage.getItem("empresaSelecionada"));
  const idEmpresa = empresaSel?.ID_EMPRESA || null;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null); // original do back
  const [enriched, setEnriched] = useState(null); // enriquecido com status efetivo
  const [tableFilter, setTableFilter] = useState("ALL"); // ALL|ATIVA|BLOQUEADA|INATIVA

  const pollRef = useRef(null);

  // Busca o summary do back
  const loadSummary = async () => {
    if (!idEmpresa) return;
    try {
      const { data } = await api.get("/dashboard/summary", {
        params: { idEmpresa },
      });
      setSummary(data);
    } catch (e) {
      // fallback mínimo: pega configuração p/ montar algo
      try {
        const { data: filas } = await api.get("/configuracao", {
          params: { idEmpresa },
        });
        const totalQueues = filas.length;
        const activeQueues = filas.filter((f) => f.situacao === 1).length;
        setSummary({
          totals: {
            totalQueues,
            activeQueues,
            blockedQueues: 0,
            peopleToday: 0,
            avgWaitMinutes: 0,
          },
          perQueue: filas.map((f) => ({
            id_conf_fila: f.id_conf_fila,
            nome_fila: f.nome_fila,
            waiting: 0,
            // sem dados reais, marcamos como não bloqueada — será corrigido no enriquecimento
            blocked: 0,
            lastUpdateISO: null,
          })),
          joinsLastHours: [],
        });
      } catch {
        // se tudo falhar, mantemos como está
      }
    } finally {
      setLoading(false);
    }
  };

  // Enriquecimento de status por fila, usando /filas/status?idConfFila=...
  const enrichPerQueue = async (baseSummary) => {
    if (!baseSummary || !Array.isArray(baseSummary.perQueue)) {
      setEnriched(baseSummary);
      return;
    }

    const perQueue = baseSummary.perQueue;

    // Filas sem id_conf_fila não podem ser enriquecidas
    const items = perQueue.map((q) => ({
      id_conf_fila: q.id_conf_fila,
      original: q,
    }));

    const worker = async (item) => {
      const idConfFila = item.id_conf_fila;
      if (!idConfFila) return { ...item.original, status: "ATIVA" };

      try {
        const { data } = await api.get("/filas/status", {
          params: { idConfFila },
        });
        // data: { blocked:boolean, effectiveActive:boolean, ... }
        const blocked = Boolean(data?.blocked);
        const effectiveActive = Boolean(data?.effectiveActive);
        const status = resolveStatus({ blocked, effectiveActive });
        return {
          ...item.original,
          blocked: blocked ? 1 : 0,
          effectiveActive,
          status,
        };
      } catch {
        // se falhar, mantém original e tenta inferir
        const blockedFallback = Boolean(item.original.blocked);
        const effectiveActiveFallback = true; // sem info, assume ativa e ajusta via original.blocked
        const status = resolveStatus({
          blocked: blockedFallback,
          effectiveActive: effectiveActiveFallback,
        });
        return {
          ...item.original,
          blocked: blockedFallback ? 1 : 0,
          effectiveActive: effectiveActiveFallback,
          status,
        };
      }
    };

    // Processa em lotes de 5 para não sobrecarregar o back
    const results = await inBatches(items, 5, worker);
    const enrichedPerQueue = results.filter(Boolean);

    // Recalcula totals com base no status enriquecido
    const totalQueues = enrichedPerQueue.length;
    const blockedQueues = enrichedPerQueue.filter((q) => q.status === "BLOQUEADA").length;
    const inactiveQueues = enrichedPerQueue.filter((q) => q.status === "INATIVA").length;
    const activeQueues = enrichedPerQueue.filter((q) => q.status === "ATIVA").length;

    const merged = {
      ...baseSummary,
      totals: {
        // mantém peopleToday/avgWaitMinutes originais
        ...baseSummary.totals,
        totalQueues,
        activeQueues,
        blockedQueues,
        inactiveQueues, // novo campo (usado no pie)
      },
      perQueue: enrichedPerQueue,
    };

    setEnriched(merged);
  };

  // ciclo de vida: carrega summary e enriquece; atualiza por socket/poll
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

  // sempre que summary mudar, re-enriquecer
  useEffect(() => {
    if (!summary) return;
    enrichPerQueue(summary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

  // Dados do pie: Ativas / Bloqueadas / Inativas
  const pieData = useMemo(() => {
    const t = enriched?.totals || summary?.totals || {};
    const active = t.activeQueues || 0;
    const blocked = t.blockedQueues || 0;
    const inactive = t.inactiveQueues || 0; // novo
    return [
      { name: "Ativas", value: active },
      { name: "Bloqueadas", value: blocked },
      { name: "Inativas", value: inactive },
    ];
  }, [enriched, summary]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <Menu />
        <div className="dashboard-content">
          <div className="loading">Carregando dashboard…</div>
        </div>
      </div>
    );
  }

  const data = enriched || summary || {};
  const totals = data.totals || {};
  const perQueue = Array.isArray(data.perQueue) ? data.perQueue : [];
  const joinsLastHours = Array.isArray(data.joinsLastHours)
    ? data.joinsLastHours
    : [];

  // Aplica filtro da tabela
  const filteredQueues = perQueue.filter((q) => {
    if (tableFilter === "ALL") return true;
    return (q.status || resolveStatus({ blocked: !!q.blocked, effectiveActive: q.effectiveActive ?? true })) === tableFilter;
  });

  return (
    <div className="dashboard-container">
      <Menu />

      <div className="dashboard-content">
        <div className="dash-header">
          <div>
            <h1>Dashboard</h1>
            <p className="subtitle">
              Visão geral em tempo real das suas filas
              {empresaSel?.NOME_EMPRESA ? ` — ${empresaSel.NOME_EMPRESA}` : ""}.
            </p>
          </div>
          <div className="last-refresh">{dayjs().format("DD/MM/YYYY HH:mm:ss")}</div>
        </div>

        {/* KPIs */}
        <div className="stats-grid">
          <StatCard
            title="Total de Filas"
            value={totals.totalQueues}
            subtitle="Todas as filas cadastradas"
          />
          <StatCard
            title="Filas Ativas"
            value={totals.activeQueues}
            subtitle="Disponíveis para clientes"
          />
          <StatCard
            title="Filas Bloqueadas"
            value={totals.blockedQueues}
            subtitle="Indisponíveis no momento"
          />
          <StatCard
            title="Filas Inativas"
            value={totals.inactiveQueues}
            subtitle="Fora de vigência/Desativadas"
          />
          <StatCard
            title="Pessoas Hoje"
            value={totals.peopleToday}
            subtitle="Entradas nas filas (hoje)"
          />
          <StatCard
            title="Espera Média"
            value={Math.round(totals.avgWaitMinutes || 0)}
            suffix=" min"
            subtitle="Clientes aguardando"
          />
        </div>

        {/* Gráficos */}
        <div className="charts-grid">
          <div className="chart-card">
            <div className="chart-title">Entradas por hora (hoje)</div>
            <div className="chart-body">
              {joinsLastHours.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={joinsLastHours}>
                    <defs>
                      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tickMargin={8} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="var(--brand)"
                      fill="url(#g)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">Sem dados hoje.</div>
              )}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-title">Status das filas</div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    <Cell fill="#22c55e" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#9ca3af" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="legend">
                <div>
                  <span className="legend-dot green" />
                  Ativas
                </div>
                <div>
                  <span className="legend-dot orange" />
                  Bloqueadas
                </div>
                <div>
                  <span className="legend-dot gray" />
                  Inativas
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela por fila */}
        <div className="table-card">
          <div className="table-title">
            Filas (hoje)
            <div className="table-filters">
              <button
                className={`pill ${tableFilter === "ALL" ? "active" : ""}`}
                onClick={() => setTableFilter("ALL")}
              >
                Todas
              </button>
              <button
                className={`pill ${tableFilter === "ATIVA" ? "active" : ""}`}
                onClick={() => setTableFilter("ATIVA")}
              >
                Ativas
              </button>
              <button
                className={`pill ${tableFilter === "BLOQUEADA" ? "active" : ""}`}
                onClick={() => setTableFilter("BLOQUEADA")}
              >
                Bloqueadas
              </button>
              <button
                className={`pill ${tableFilter === "INATIVA" ? "active" : ""}`}
                onClick={() => setTableFilter("INATIVA")}
              >
                Inativas
              </button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="pretty-table">
              <thead>
                <tr>
                  <th>Fila</th>
                  <th style={{ textAlign: "right" }}>Aguardando</th>
                  <th>Status</th>
                  <th>Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueues.map((f) => {
                  const status =
                    f.status ||
                    resolveStatus({
                      blocked: !!f.blocked,
                      effectiveActive: f.effectiveActive ?? true,
                    });
                  return (
                    <tr key={f.id_conf_fila}>
                      <td>{f.nome_fila}</td>
                      <td className="cell-right">{f.waiting ?? 0}</td>
                      <td>
                        <StatusDot status={status} />
                        {status}
                      </td>
                      <td>
                        {f.lastUpdateISO
                          ? dayjs(f.lastUpdateISO).format("HH:mm:ss")
                          : "—"}
                      </td>
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

      </div>
    </div>
  );
};

export default Dashboard;
