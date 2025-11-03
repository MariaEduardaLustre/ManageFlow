import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import * as XLSX from "xlsx";
import Menu from "../Menu/Menu";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./Relatorio.css";

const apiBase = "http://localhost:3001/api/relatorios";

export default function Relatorio() {
  const [tempoEspera, setTempoEspera] = useState([]);
  const [desistencias, setDesistencias] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [tempoAtendimento, setTempoAtendimento] = useState([]);
  const [desempenhoFila, setDesempenhoFila] = useState([]);

  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroFila, setFiltroFila] = useState("Todas as filas");
  const [filasDisponiveis, setFilasDisponiveis] = useState(["Todas as filas"]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const [statusFilas, setStatusFilas] = useState([]);
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");

    Promise.all([
      axios.get(`${apiBase}/tempo-espera`, { headers }),
      axios.get(`${apiBase}/desistencias`, { headers }),
      axios.get(`${apiBase}/avaliacoes`, { headers }),
      axios.get(`${apiBase}/tempo-atendimento`, { headers }).catch(() => ({ data: [] })),
      axios.get(`${apiBase}/desempenho-fila`, { headers }).catch(() => ({ data: [] })),
      axios.get(`${apiBase}/filas`, { headers }).catch(() => ({ data: [] })),
    ])
      .then(([respTempo, respDesist, respAval, respAtend, respDesem, respFilas]) => {
        setTempoEspera(Array.isArray(respTempo.data) ? respTempo.data : []);
        setDesistencias(Array.isArray(respDesist.data) ? respDesist.data : []);
        setAvaliacoes(Array.isArray(respAval.data) ? respAval.data : []);
        setTempoAtendimento(Array.isArray(respAtend.data) ? respAtend.data : []);
        setDesempenhoFila(Array.isArray(respDesem.data) ? respDesem.data : []);

        if (Array.isArray(respFilas.data) && respFilas.data.length) {
          const nomes = ["Todas as filas", ...respFilas.data.map((f) => f.nome_fila)];
          setFilasDisponiveis(nomes);
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Não foi possível carregar os relatórios.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Filtro de dados
  const filtrar = (dados) => {
    return dados.filter((item) => {
      const d = new Date(item.data);
      if (filtroDataInicio && d < new Date(filtroDataInicio)) return false;
      if (filtroDataFim && d > new Date(filtroDataFim)) return false;
      if (filtroFila !== "Todas as filas" && item.nome_fila && item.nome_fila !== filtroFila) return false;
      return true;
    });
  };

  const tempoEsperaFiltrado = filtrar(tempoEspera);
  const desistenciasFiltrado = filtrar(desistencias);
  const avaliacoesFiltrado = filtrar(avaliacoes);
  const tempoAtendimentoFiltrado = filtrar(tempoAtendimento);
  const desempenhoFilaFiltrado = filtrar(desempenhoFila);

  // KPIs
  const kpis = useMemo(() => {
    const tempoMedioEspera =
      tempoEsperaFiltrado.length > 0
        ? Math.round(
            tempoEsperaFiltrado.reduce((acc, cur) => acc + Number(cur.media || 0), 0) /
              tempoEsperaFiltrado.length
          )
        : 0;

    const totalAtendidos = tempoEsperaFiltrado.reduce(
      (acc, cur) => acc + Number(cur.totalAtendidos || 0),
      0
    );

    let somaNotas = 0;
    let somaPesos = 0;
    avaliacoesFiltrado.forEach((a) => {
      const media = Number(a.media || 0);
      const peso = Number(a.totalFeedbacks || 1);
      somaNotas += media * peso;
      somaPesos += peso;
    });
    const avaliacaoMedia = somaPesos ? (somaNotas / somaPesos).toFixed(1) : "-";

    let somaPct = 0;
    let somaClientes = 0;
    desistenciasFiltrado.forEach((d) => {
      const pct = Number(d.percentualDesistencia || 0);
      const clientes = Number(d.totalClientes || 0) || 0;
      somaPct += pct * clientes;
      somaClientes += clientes;
    });
    const taxaDesistencia = somaClientes ? (somaPct / somaClientes).toFixed(1) : "-";

    const tempoMedioAtendimento =
      tempoAtendimentoFiltrado.length > 0
        ? Math.round(
            tempoAtendimentoFiltrado.reduce((acc, cur) => acc + Number(cur.media || 0), 0) /
              tempoAtendimentoFiltrado.length
          )
        : "-";

    return {
      tempoMedioEspera,
      totalAtendidos,
      avaliacaoMedia,
      taxaDesistencia,
      tempoMedioAtendimento,
    };
  }, [tempoEsperaFiltrado, desistenciasFiltrado, avaliacoesFiltrado, tempoAtendimentoFiltrado]);

  // Linhas (espera x atendimento)
  const linhasTempo = useMemo(() => {
    const map = {};
    const add = (arr, key) => {
      arr.forEach((r) => {
        const d = r.data;
        if (!map[d]) map[d] = { data: d, esperaSum: 0, esperaCount: 0, atendSum: 0, atendCount: 0 };
        if (key === "espera") {
          map[d].esperaSum += Number(r.media || 0);
          map[d].esperaCount += 1;
        } else {
          map[d].atendSum += Number(r.media || 0);
          map[d].atendCount += 1;
        }
      });
    };
    add(tempoEsperaFiltrado, "espera");
    add(tempoAtendimentoFiltrado, "atend");

    const arr = Object.values(map).map((v) => ({
      data: v.data,
      tempoEspera: v.esperaCount ? +(v.esperaSum / v.esperaCount).toFixed(1) : null,
      tempoAtendimento: v.atendCount ? +(v.atendSum / v.atendCount).toFixed(1) : null,
    }));
    arr.sort((a, b) => new Date(a.data) - new Date(b.data));
    return arr;
  }, [tempoEsperaFiltrado, tempoAtendimentoFiltrado]);

  // Distribuição de avaliações
  const distribuicaoAvaliacoes = useMemo(() => {
    const map = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    avaliacoesFiltrado.forEach((a) => {
      const notaArred = Math.max(1, Math.min(5, Math.round(Number(a.media || 0))));
      map[notaArred] += Number(a.totalFeedbacks || 1);
    });
    return [1, 2, 3, 4, 5].map((n) => ({ nota: String(n), quantidade: map[n] }));
  }, [avaliacoesFiltrado]);

  // Desempenho por fila
  const desempenhoPorFilaData = useMemo(() => {
    if (!desempenhoFilaFiltrado.length) return [];
    return desempenhoFilaFiltrado.map((r) => ({
      fila: r.fila,
      atendidos: r.atendidos,
      desistentes: r.desistentes,
      em_espera: r.em_espera,
    }));
  }, [desempenhoFilaFiltrado]);

  // Exportar Excel
  const exportarPainel = () => {
    const wb = XLSX.utils.book_new();
    const adicionaPlanilha = (dados, nome, colunas) => {
      const dadosFormatados = dados.map((item) => {
        const obj = {};
        colunas.forEach((c) => {
          obj[c.label] = item[c.key];
        });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(dadosFormatados);
      XLSX.utils.book_append_sheet(wb, ws, nome);
    };

    adicionaPlanilha(linhasTempo, "Tempo (diario)", [
      { key: "data", label: "Data" },
      { key: "tempoEspera", label: "Tempo Médio Espera (min)" },
      { key: "tempoAtendimento", label: "Tempo Médio Atendimento (min)" },
    ]);

    adicionaPlanilha(desempenhoPorFilaData, "Desempenho por Fila", [
      { key: "fila", label: "Fila" },
      { key: "atendidos", label: "Atendidos" },
      { key: "desistentes", label: "Desistentes" },
      { key: "em_espera", label: "Em Espera" },
    ]);

    adicionaPlanilha(distribuicaoAvaliacoes, "Distribuição Aval", [
      { key: "nota", label: "Nota" },
      { key: "quantidade", label: "Quantidade" },
    ]);

    XLSX.writeFile(wb, `Painel_Relatorios_Completo.xlsx`);
    Promise.all([
  axios.get(`${apiBase}/tempo-espera`, { headers }),
  axios.get(`${apiBase}/desistencias`, { headers }),
  axios.get(`${apiBase}/avaliacoes`, { headers }),
  axios.get(`${apiBase}/tempo-atendimento`, { headers }).catch(() => ({ data: [] })),
  axios.get(`${apiBase}/desempenho-fila`, { headers }).catch(() => ({ data: [] })),
  axios.get(`${apiBase}/filas`, { headers }).catch(() => ({ data: [] })),
  axios.get(`${apiBase}/filas-ativas`, { headers }).catch(() => ({ data: [] })), // 👈 novo
])
  .then(([respTempo, respDesist, respAval, respAtend, respDesem, respFilas, respAtivas]) => {
    setTempoEspera(Array.isArray(respTempo.data) ? respTempo.data : []);
    setDesistencias(Array.isArray(respDesist.data) ? respDesist.data : []);
    setAvaliacoes(Array.isArray(respAval.data) ? respAval.data : []);
    setTempoAtendimento(Array.isArray(respAtend.data) ? respAtend.data : []);
    setDesempenhoFila(Array.isArray(respDesem.data) ? respDesem.data : []);
    setStatusFilas(Array.isArray(respAtivas.data) ? respAtivas.data : []); // 👈 novo

    if (Array.isArray(respFilas.data) && respFilas.data.length) {
      const nomes = ["Todas as filas", ...respFilas.data.map((f) => f.nome_fila)];
      setFilasDisponiveis(nomes);
    }
  })

  };

  return (
    <div className="relatorio-page">
      <Menu />
      <div className="relatorio-content container">
        <div className="relatorio-header">
          <div>
            
            <p className="subtitle">Análise completa de desempenho e indicadores de atendimento</p>
          </div>

          <div className="filtros-area">
            <div className="filtro-datas">
              <input type="date" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)} />
              <span className="dash">—</span>
              <input type="date" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)} />
            </div>

            <select value={filtroFila} onChange={(e) => setFiltroFila(e.target.value)}>
              {filasDisponiveis.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>

            <button className="btn-export" onClick={exportarPainel}>
              <i className="bi bi-download"></i> Exportar Excel
            </button>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {/* KPIs */}
        <div className="kpi-cards">
          <div className="kpi-card">
            <div className="kpi-title">Tempo Médio de Espera</div>
            <div className="kpi-value">{kpis.tempoMedioEspera} <small>min</small></div>
            <div className="kpi-sub">Comparativo com período anterior</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">Clientes Atendidos</div>
            <div className="kpi-value">{kpis.totalAtendidos}</div>
            <div className="kpi-sub">vs. período anterior</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">Avaliação Média</div>
            <div className="kpi-value">{kpis.avaliacaoMedia}</div>
            <div className="kpi-sub">
              Base: {avaliacoesFiltrado.reduce((a, b) => a + Number(b.totalFeedbacks || 0), 0)} feedbacks
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">Taxa de Desistência</div>
            <div className="kpi-value">{kpis.taxaDesistencia}%</div>
            <div className="kpi-sub">Taxa média no período</div>
          </div>

          <div className="kpi-card wide-card">
            <div className="kpi-title">Tempo Médio de Atendimento</div>
            <div className="kpi-value">
              {kpis.tempoMedioAtendimento}
              {kpis.tempoMedioAtendimento !== "-" ? " min" : ""}
            </div>
          </div>
        </div>

        {/* Gráfico 1 */}
        <div className="card chart-card">
          <h3>Tempo Médio de Espera e Atendimento (minutos)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={linhasTempo} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="data" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="tempoEspera" name="Tempo de Espera" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="tempoAtendimento" name="Tempo de Atendimento" stroke="#13b887" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>    
        {/* Gráfico 2 */}
        <div className="card chart-card">
          <h3>Desempenho por Fila</h3>
          {desempenhoPorFilaData.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={desempenhoPorFilaData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="fila" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Legend />
                <Bar dataKey="atendidos" name="Atendidos" fill="#16A249" radius={[6, 6, 0, 0]} />
                <Bar dataKey="desistentes" name="Desistentes" fill="#EF4343" radius={[6, 6, 0, 0]} />
                <Bar dataKey="em_espera" name="Em Espera" fill="#F59F0A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="placeholder">
              Requer endpoint adicional para exibir Atendidos / Desistentes / Em Espera por fila.
            </div>
          )}
        </div>
        {/* Gráfico 3 */}
        <div className="card chart-card">
          <h3>Distribuição de Avaliações</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={distribuicaoAvaliacoes} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="nota" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Bar dataKey="quantidade" name="Quantidade" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        

        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}
   