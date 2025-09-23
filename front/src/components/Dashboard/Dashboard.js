<<<<<<< HEAD
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
=======
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Alert, Button, Form } from 'react-bootstrap';
import Menu from '../Menu/Menu';
import api from '../../services/api';
import './Dashboard.css';

// Componente para personalizar o tooltip do gráfico de tempo de espera
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const minutosTotais = payload[0].value;
        const minutos = Math.floor(minutosTotais);
        const segundos = Math.round((minutosTotais - minutos) * 60);

        return (
            <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc' }}>
                <p className="label">{`Hora: ${label}h`}</p>
                <p className="intro" style={{ color: payload[0].color }}>{`Tempo de Espera: ${minutos} min ${segundos} seg`}</p>
            </div>
        );
    }
    return null;
>>>>>>> origin/Notificação_EntradaFila
};


// Componente para exibir os gráficos de horários de pico
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
                console.error('Erro ao buscar dados de pico:', err);
                if (err.response && err.response.status === 404) {
                    setError('Não há dados de fila suficientes para esta empresa.');
                } else {
                    setError('Não foi possível carregar os dados. Tente novamente mais tarde.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchHorariosDePico();
    }, [idEmpresa, idFila]);

    const exportarCSV = () => {
        if (!dadosPico || !dadosPico.dadosPorHora || dadosPico.dadosPorHora.length === 0) return;
        const headers = ["Hora", "Total de Clientes"];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(";") + "\n" + dadosPico.dadosPorHora.map(e => `${e.hora};${e.total_clientes}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `horarios_de_pico_${idEmpresa}_${idFila}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportarJSON = () => {
        if (!dadosPico || !dadosPico.dadosPorHora || dadosPico.dadosPorHora.length === 0) return;
        const jsonContent = JSON.stringify(dadosPico.dadosPorHora, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `horarios_de_pico_${idEmpresa}_${idFila}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return <div className="text-center my-4">Carregando dados de pico...</div>;
    }
    if (error) {
        return <Alert variant="danger" className="mt-4">{error}</Alert>;
    }
    if (!dadosPico || dadosPico.dadosPorHora.length === 0) {
        return <Alert variant="info" className="mt-4">Nenhum dado de pico disponível para análise.</Alert>;
    }

    return (
        <div className="container-pico">
            <h3>Análise de Horários de Pico</h3>
            <div className="destaque-pico mt-3">
                <p><strong>{dadosPico.horarioDePico}</strong></p>
            </div>
            <div className="chart-container">
                <h4 className="mt-4">Movimento por Hora do Dia</h4>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dadosPico.dadosPorHora.sort((a, b) => a.hora - b.hora)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hora" label={{ value: "Hora do Dia", position: 'insideBottom', offset: -5 }} />
                        <YAxis label={{ value: "Nº de Clientes", angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Bar dataKey="total_clientes" fill="#8884d8" name="Clientes" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="botoes-exportacao mt-4">
                <Button onClick={exportarCSV} variant="success" className="me-2">Exportar para CSV</Button>
                <Button onClick={exportarJSON} variant="secondary">Exportar para JSON</Button>
            </div>
        </div>
    );
};


// Componente para exibir os gráficos de tempo de espera
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
                console.error('Erro ao buscar tempo de espera:', err);
                if (err.response && err.response.status === 404) {
                    setError('Nenhum dado de tempo de espera encontrado para esta empresa.');
                } else {
                    setError('Não foi possível carregar os dados. Tente novamente mais tarde.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchTemposEspera();
    }, [idEmpresa, idFila]);

    if (loading) {
        return <div className="text-center my-4">Carregando dados de tempo de espera...</div>;
    }
    if (error) {
        return <Alert variant="danger" className="mt-4">{error}</Alert>;
    }
    if (!dadosEspera || dadosEspera.length === 0) {
        return <Alert variant="info" className="mt-4">Nenhum dado de tempo de espera disponível para análise.</Alert>;
    }

    return (
        <div className="container-pico mt-4">
            <h3>Tempo Médio de Espera por Hora</h3>
            <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dadosEspera}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hora" label={{ value: "Hora do Dia", position: 'insideBottom', offset: -5 }} />
                        <YAxis label={{ value: "Minutos", angle: -90, position: 'insideLeft' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="media_espera_minutos" stroke="#82ca9d" name="Tempo de Espera" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};


const Dashboard = () => {
    const [idEmpresa, setIdEmpresa] = useState(null);
    const [filas, setFilas] = useState([]);
    const [selectedFila, setSelectedFila] = useState(null);

    useEffect(() => {
        const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
        if (empresaSelecionada && empresaSelecionada.ID_EMPRESA) {
            const id = empresaSelecionada.ID_EMPRESA;
            setIdEmpresa(id);
            fetchFilas(id);
        }
    }, []);

    const fetchFilas = async (id) => {
        try {
            const response = await api.get(`/empresas/filas/${id}`);
            if (response.data.length > 0) {
                setFilas(response.data);
                setSelectedFila(response.data[0]); // Seleciona a primeira fila por padrão
            }
        } catch (err) {
            console.error('Erro ao buscar filas para seleção:', err);
        }
    };

    const handleFilaChange = (e) => {
        const idFilaSelecionada = e.target.value;
        const fila = filas.find(f => f.ID_FILA.toString() === idFilaSelecionada);
        setSelectedFila(fila);
    };

    return (
        <div className="dashboard-container">
            <Menu />
            <div className="dashboard-content">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1>Dashboard</h1>
                    {filas.length > 0 && (
                        <Form.Group className="dashboard-select-group">
                            <Form.Label className="me-2">Selecionar Fila:</Form.Label>
                            <Form.Select value={selectedFila?.ID_FILA || ''} onChange={handleFilaChange}>
                                {filas.map(f => (
                                    <option key={f.ID_FILA} value={f.ID_FILA}>
                                        {f.NOME_FILA}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    )}
                </div>

                {/* Renderização condicional com base na seleção da fila */}
                {idEmpresa && selectedFila ? (
                    <>
                        <p>Análise de dados para a fila **{selectedFila.NOME_FILA}**</p>
                        <HorariosDePico idEmpresa={idEmpresa} idFila={selectedFila.ID_FILA} />
                        <TempoDeEspera idEmpresa={idEmpresa} idFila={selectedFila.ID_FILA} />
                    </>
                ) : (
                    <p className="text-center text-muted">Selecione uma empresa ou aguarde o carregamento das filas.</p>
                )}
            </div>
        </div>
    );
};

export default Dashboard;