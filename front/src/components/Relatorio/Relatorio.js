// Relatorio.js
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
  // Estados de Dados
  const [tempoEspera, setTempoEspera] = useState([]);
  const [desistencias, setDesistencias] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [tempoAtendimento, setTempoAtendimento] = useState([]);
  const [desempenhoFila, setDesempenhoFila] = useState([]);
  const [filasDisponiveis, setFilasDisponiveis] = useState(["Todas as filas"]);
  // ✨ NOVO ESTADO: Para o relatório detalhado de avaliações
  const [avaliacoesDetalhadas, setAvaliacoesDetalhadas] = useState([]);
  const [distribuicaoNotas, setDistribuicaoNotas] = useState([]);
  const [statusFilas, setStatusFilas] = useState([]); // Você tinha isso no código

  // Estados de Filtro (Controlados)
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroFila, setFiltroFila] = useState("Todas as filas");

  // ✨ NOVO ESTADO: Aciona a busca quando alterado
  const [filtroParams, setFiltroParams] = useState(null); // Inicia como null

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // ✨ REFATORADO: useEffect agora depende de 'filtroParams' e 'token'
  // ✨ SUBSTITUA O SEU useEffect PRINCIPAL POR ESTE

  useEffect(() => {
    // Só busca se o token existir.
    if (!token) return;

    setLoading(true);
    setError("");

    // --- Montagem dos Parâmetros ---

    // Parâmetros de Data (usados pela maioria dos endpoints)
    const paramsData = {};
    if (filtroDataInicio && filtroDataFim) {
      paramsData.inicio = filtroDataInicio;
      paramsData.fim = filtroDataFim;
    }

    // Parâmetros Completos (Data + Fila)
    // (Usados pelos endpoints 1, 2, 3)
    const paramsCompletos = { ...paramsData };
    if (filtroFila && filtroFila !== "Todas as filas") {
      paramsCompletos.fila = filtroFila;
    }

    // --- Chamadas API ---
    Promise.all([
      // Endpoints que filtram por Data e Fila (1, 2, 3)
      axios.get(`${apiBase}/tempo-espera`, { headers, params: paramsCompletos }),
      axios.get(`${apiBase}/desistencias`, { headers, params: paramsCompletos }),
      axios.get(`${apiBase}/tempo-atendimento`, { headers, params: paramsCompletos }),

      // Endpoints que filtram SÓ por Data (4, 5, 6, 8)
      axios.get(`${apiBase}/desempenho-fila`, { headers, params: paramsData }),
      axios.get(`${apiBase}/avaliacoes`, { headers, params: paramsData }),
      axios.get(`${apiBase}/avaliacoes-detalhadas`, { headers, params: paramsData }).catch(() => ({ data: [] })),
      axios.get(`${apiBase}/distribuicao-notas`, { headers, params: paramsData }).catch(() => ({ data: [] })),

      // Endpoints sem filtro (7, e o 'filas-ativas')
      axios.get(`${apiBase}/filas`, { headers }).catch(() => ({ data: [] })),
      axios.get(`${apiBase}/filas-ativas`, { headers }).catch(() => ({ data: [] })),
    ])
      .then(([respTempo, respDesist, respAtend, respDesem, respAval, respAvalDetalhadas, respDistNotas, respFilas, respAtivas]) => {
        // Atualiza os estados com os dados filtrados
        setTempoEspera(Array.isArray(respTempo.data) ? respTempo.data : []);
        setDesistencias(Array.isArray(respDesist.data) ? respDesist.data : []);
        setTempoAtendimento(Array.isArray(respAtend.data) ? respAtend.data : []);
        
        setDesempenhoFila(Array.isArray(respDesem.data) ? respDesem.data : []);
        setAvaliacoes(Array.isArray(respAval.data) ? respAval.data : []);
        setAvaliacoesDetalhadas(Array.isArray(respAvalDetalhadas.data) ? respAvalDetalhadas.data : []);
        setDistribuicaoNotas(Array.isArray(respDistNotas.data) ? respDistNotas.data : []);
        
        setStatusFilas(Array.isArray(respAtivas.data) ? respAtivas.data : []);

        // Atualiza a lista de filas (caso ela mude)
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
  }, [token, filtroDataInicio, filtroDataFim, filtroFila]); // ✨ Lista de dependência ATUALIZADA // Aciona a busca quando 'filtroParams' mudar

 

  // ✨ REMOVIDO: A função 'filtrar(...)' e as variáveis '...Filtrado'
  // const filtrar = (dados) => { ... };
  // const tempoEsperaFiltrado = filtrar(tempoEspera);
  // ... etc ...
  // Agora, usamos os estados (tempoEspera, desistencias, etc.) DIRETAMENTE,
  // pois eles já vêm filtrados do backend.

  // KPIs
  // ✨ ATUALIZADO: Usando 'tempoEspera' direto, em vez de 'tempoEsperaFiltrado'
  const kpis = useMemo(() => {
    const tempoMedioEspera =
      tempoEspera.length > 0
        ? Math.round(
            tempoEspera.reduce((acc, cur) => acc + Number(cur.media || 0), 0) /
              tempoEspera.length
          )
        : 0;

    const totalAtendidos = tempoEspera.reduce(
      (acc, cur) => acc + Number(cur.totalAtendidos || 0),
      0
    );

    let somaNotas = 0;
    let somaPesos = 0;
    // Lógica restaurada aqui:
    avaliacoes.forEach((a) => {
      const media = Number(a.media || 0);
      const peso = Number(a.totalFeedbacks || 1);
      somaNotas += media * peso;
      somaPesos += peso;
    });
    const avaliacaoMedia = somaPesos ? (somaNotas / somaPesos).toFixed(1) : "-";

    let somaPct = 0;
    let somaClientes = 0;
    // Lógica restaurada aqui:
    desistencias.forEach((d) => {
      const pct = Number(d.percentualDesistencia || 0);
      const clientes = Number(d.totalClientes || 0) || 0;
      somaPct += pct * clientes;
      somaClientes += clientes;
    });
    const taxaDesistencia = somaClientes ? (somaPct / somaClientes).toFixed(1) : "-";

    const tempoMedioAtendimento =
      tempoAtendimento.length > 0
        ? Math.round(
            tempoAtendimento.reduce((acc, cur) => acc + Number(cur.media || 0), 0) /
              tempoAtendimento.length
          )
        : "-";

    return {
      tempoMedioEspera,
      totalAtendidos,
      avaliacaoMedia,
      taxaDesistencia,
      tempoMedioAtendimento,
    };
  }, [tempoEspera, desistencias, avaliacoes, tempoAtendimento]); // Dependências atualizadas

  // Linhas (espera x atendimento)
  // ✨ CORRIGIDO: Restaurada a lógica de 'map', 'add' e 'arr'
  const linhasTempo = useMemo(() => {
    // Lógica restaurada aqui:
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
    
    // Usando os dados filtrados pelo backend
    add(tempoEspera, "espera");
    add(tempoAtendimento, "atend");

    // Lógica restaurada aqui:
    const arr = Object.values(map).map((v) => ({
      data: v.data,
      tempoEspera: v.esperaCount ? +(v.esperaSum / v.esperaCount).toFixed(1) : null,
      tempoAtendimento: v.atendCount ? +(v.atendSum / v.atendCount).toFixed(1) : null,
    }));
    arr.sort((a, b) => new Date(a.data) - new Date(b.data));
    return arr;
  }, [tempoEspera, tempoAtendimento]); // Dependências atualizadas


  // Desempenho por fila
  // ✨ ATUALIZADO: Usando 'desempenhoFila' direto
  const desempenhoPorFilaData = useMemo(() => {
    if (!desempenhoFila.length) return [];
    return desempenhoFila.map((r) => ({
      fila: r.fila,
      atendidos: r.atendidos,
      desistentes: r.desistentes,
      em_espera: r.em_espera,
      // ✨ NOTA: Os novos campos (media_espera_atendidos)
      // estão em 'desempenhoFila', mas não são usados neste gráfico.
      // Vamos usá-los na exportação do Excel.
    }));
  }, [desempenhoFila]);

  // 📤 Exportar Excel
  const exportarPainel = () => {
    const wb = XLSX.utils.book_new();

    // Função auxiliar para criar planilhas
    const adicionaPlanilha = (dados, nomePlanilha, colunas) => {
      // Mapeia os dados para os nomes de coluna desejados (Label)
      const dadosFormatados = dados.map((item) => {
        const obj = {};
        colunas.forEach((c) => {
          obj[c.label] = item[c.key];
        });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(dadosFormatados);
      XLSX.utils.book_append_sheet(wb, ws, nomePlanilha);
    };

    // --- Relatório 1: Tempo de Espera (Detalhado) ---
    // Pedido: nome da fila, quantidade
    adicionaPlanilha(tempoEspera, "Tempo de Espera", [
      { key: "data", label: "Data" },
      { key: "nome_fila", label: "Fila" },
      { key: "media", label: "Tempo Médio Espera (min)" },
      { key: "totalAtendidos", label: "Total Atendidos" },
      { key: "desistencias", label: "Desistências" },
    ]);

    // --- Relatório 2: Tempo de Atendimento (Detalhado) ---
    // Pedido: (Semelhante ao de Espera)
    adicionaPlanilha(tempoAtendimento, "Tempo de Atendimento", [
      { key: "data", label: "Data" },
      { key: "nome_fila", label: "Fila" },
      { key: "media", label: "Tempo Médio Atendimento (min)" },
      { key: "totalAtendidos", label: "Total Atendidos" },
    ]);
    
    // --- Relatório 3: Desempenho por Fila (Detalhado) ---
    // Pedido: tempo que aguardou (médias)
    adicionaPlanilha(desempenhoFila, "Desempenho por Fila", [
      { key: "fila", label: "Fila" },
      { key: "atendidos", label: "Atendidos" },
      { key: "desistentes", label: "Desistentes" },
      { key: "em_espera", label: "Em Espera" },
      { key: "media_espera_atendidos", label: "Média Espera Atendidos (min)" },
      { key: "media_espera_desistentes", label: "Média Espera Desistentes (min)" },
    ]);

    // --- Relatório 4: Distribuição das Avaliações (Agrupado) ---
    // (Mantido como estava, pois é um gráfico útil)
    adicionaPlanilha(distribuicaoNotas, "Distr. Avaliações (Notas)", [
  { key: "nota", label: "Nota" },
  { key: "quantidade", label: "Quantidade" },
    ]);

    // --- Relatório 5: Avaliações Detalhadas ---
    // Pedido: data e comentário
    adicionaPlanilha(avaliacoesDetalhadas, "Avaliações Detalhadas", [
      { key: "data", label: "Data Avaliação" },
      { key: "nota", label: "Nota" },
      { key: "comentario", label: "Comentário" },
    ]);

    // Gera o arquivo
    const dataFiltro = filtroDataInicio || "inicio";
    XLSX.writeFile(wb, `Relatorios_Atendimento_${dataFiltro}.xlsx`);
  };

  return (
    <div className="relatorio-page">
      <Menu />
      <div className="relatorio-content container">
        <div className="relatorio-header">
          <div>
            <p className="subtitle">
              Análise completa de desempenho e indicadores de atendimento
            </p>
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
            <div className="kpi-value">
              {kpis.tempoMedioEspera} <small>min</small>
            </div>
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
              Base: {avaliacoes.reduce((a, b) => a + Number(b.totalFeedbacks || 0), 0)} feedbacks
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
              <Line
                type="monotone"
                dataKey="tempoEspera"
                name="Tempo de Espera"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="tempoAtendimento"
                name="Tempo de Atendimento"
                stroke="#13b887"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
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
              Nenhum dado disponível para o filtro selecionado.
            </div>
          )}
        </div>

        {/* Gráfico 3 */}
        <div className="card chart-card">
          <h3>Distribuição de Avaliações</h3>
          <ResponsiveContainer width="100%" height={260}>
            {/* ✨ ATUALIZADO: Usando 'distribuicaoNotas' */}
            <BarChart data={distribuicaoNotas} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="nota" stroke="#9ca3af" />
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
