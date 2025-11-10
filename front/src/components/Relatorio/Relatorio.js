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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // <-- importante: importar a função
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
  const [avaliacoesDetalhadas, setAvaliacoesDetalhadas] = useState([]);
  const [distribuicaoNotas, setDistribuicaoNotas] = useState([]);


  // Estados de Filtro (Controlados)
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroFila, setFiltroFila] = useState("Todas as filas");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Efeito principal: busca dados quando filtros ou token mudam
  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError("");

    const paramsData = {};
    if (filtroDataInicio && filtroDataFim) {
      paramsData.inicio = filtroDataInicio;
      paramsData.fim = filtroDataFim;
    }

    const paramsCompletos = { ...paramsData };
    if (filtroFila && filtroFila !== "Todas as filas") {
      paramsCompletos.fila = filtroFila;
    }

    Promise.all([
      axios.get(`${apiBase}/tempo-espera`, { headers, params: paramsCompletos }).catch(() => ({ data: [] })),
      axios.get(`${apiBase}/desistencias`, { headers, params: paramsCompletos }).catch(() => ({ data: [] })),
      axios.get(`${apiBase}/tempo-atendimento`, { headers, params: paramsCompletos }).catch(() => ({ data: [] })),
      axios.get(`${apiBase}/desempenho-fila`, { headers, params: paramsData }).catch(() => ({ data: [] })),
      axios.get(`${apiBase}/avaliacoes`, { headers, params: paramsData }).catch(() => ({ data: [] })),
      axios.get(`${apiBase}/avaliacoes-detalhadas`, { headers, params: paramsData }).catch(() => ({ data: [] })),
      axios.get(`${apiBase}/distribuicao-notas`, { headers, params: paramsData }).catch(() => ({ data: [] })),
      axios.get(`${apiBase}/filas`, { headers }).catch(() => ({ data: [] })),
     
    ])
      .then(([
        respTempo, respDesist, respAtend, respDesem,
        respAval, respAvalDetalhadas, respDistNotas,
        respFilas, respAtivas
      ]) => {
        setTempoEspera(Array.isArray(respTempo.data) ? respTempo.data : []);
        setDesistencias(Array.isArray(respDesist.data) ? respDesist.data : []);
        setTempoAtendimento(Array.isArray(respAtend.data) ? respAtend.data : []);
        setDesempenhoFila(Array.isArray(respDesem.data) ? respDesem.data : []);
        setAvaliacoes(Array.isArray(respAval.data) ? respAval.data : []);
        setAvaliacoesDetalhadas(Array.isArray(respAvalDetalhadas.data) ? respAvalDetalhadas.data : []);
        setDistribuicaoNotas(Array.isArray(respDistNotas.data) ? respDistNotas.data : []);
       

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
  }, [token, filtroDataInicio, filtroDataFim, filtroFila]);

  // KPIs
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
    avaliacoes.forEach((a) => {
      const media = Number(a.media || 0);
      const peso = Number(a.totalFeedbacks || 1);
      somaNotas += media * peso;
      somaPesos += peso;
    });
    const avaliacaoMedia = somaPesos ? (somaNotas / somaPesos).toFixed(1) : "-";

    let somaPct = 0;
    let somaClientes = 0;
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
  }, [tempoEspera, desistencias, avaliacoes, tempoAtendimento]);

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
    add(tempoEspera, "espera");
    add(tempoAtendimento, "atend");

    const arr = Object.values(map).map((v) => ({
      data: v.data,
      tempoEspera: v.esperaCount ? +(v.esperaSum / v.esperaCount).toFixed(1) : null,
      tempoAtendimento: v.atendCount ? +(v.atendSum / v.atendCount).toFixed(1) : null,
    }));
    arr.sort((a, b) => new Date(a.data) - new Date(b.data));
    return arr;
  }, [tempoEspera, tempoAtendimento]);

  // Desempenho por fila (para gráfico)
  const desempenhoPorFilaData = useMemo(() => {
    if (!desempenhoFila.length) return [];
    return desempenhoFila.map((r) => ({
      fila: r.fila,
      atendidos: r.atendidos,
      desistentes: r.desistentes,
      em_espera: r.em_espera,
    }));
  }, [desempenhoFila]);

  // Exportar Excel (mantive sua lógica)
  const exportarPainel = () => {
    const wb = XLSX.utils.book_new();

    const adicionaPlanilha = (dados, nomePlanilha, colunas) => {
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

    adicionaPlanilha(tempoEspera, "Tempo de Espera", [
      { key: "data", label: "Data" },
      { key: "nome_fila", label: "Fila" },
      { key: "media", label: "Tempo Médio Espera (min)" },
      { key: "totalAtendidos", label: "Total Atendidos" },
      { key: "desistencias", label: "Desistências" },
    ]);

    adicionaPlanilha(tempoAtendimento, "Tempo de Atendimento", [
      { key: "data", label: "Data" },
      { key: "nome_fila", label: "Fila" },
      { key: "media", label: "Tempo Médio Atendimento (min)" },
      { key: "totalAtendidos", label: "Total Atendidos" },
    ]);

    adicionaPlanilha(desempenhoFila, "Desempenho por Fila", [
      { key: "fila", label: "Fila" },
      { key: "atendidos", label: "Atendidos" },
      { key: "desistentes", label: "Desistentes" },
      { key: "em_espera", label: "Em Espera" },
      { key: "media_espera_atendidos", label: "Média Espera Atendidos (min)" },
      { key: "media_espera_desistentes", label: "Média Espera Desistentes (min)" },
    ]);

    adicionaPlanilha(distribuicaoNotas, "Distr. Avaliações (Notas)", [
      { key: "nota", label: "Nota" },
      { key: "quantidade", label: "Quantidade" },
      
    ]);

    adicionaPlanilha(avaliacoesDetalhadas, "Avaliações Detalhadas", [
      { key: "data", label: "Data Avaliação" },
      { key: "nota", label: "Nota" },
      { key: "comentario", label: "Comentário" },
    ]);

    const dataFiltro = filtroDataInicio || "inicio";
    XLSX.writeFile(wb, `Relatorios_Atendimento_${dataFiltro}.xlsx`);
  };

  // Gerar PDF - usa autoTable(doc, ...)
  const gerarPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    const dataGeracao = new Date().toLocaleString("pt-BR");

    // Cabeçalho
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Relatório de Atendimento", 14, 20);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Período: ${filtroDataInicio && filtroDataFim ? `${filtroDataInicio} a ${filtroDataFim}` : "Todos os registros"}`,
      14,
      28
    );
    doc.text(`Fila: ${filtroFila}`, 14, 34);
    doc.text(`Gerado em: ${dataGeracao}`, 14, 40);

    let y = 46;

    // Indicadores Principais
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Indicadores Principais", 14, y);
    y += 4;

    autoTable(doc, {
      startY: y + 2,
      head: [["Indicador", "Valor"]],
      body: [
        ["Tempo Médio de Espera", `${kpis.tempoMedioEspera} min`],
        ["Clientes Atendidos", kpis.totalAtendidos],
        ["Avaliação Média", kpis.avaliacaoMedia],
        ["Taxa de Desistência", `${kpis.taxaDesistencia}%`],
        ["Tempo Médio de Atendimento", `${kpis.tempoMedioAtendimento} min`],
      ],
      theme: "striped",
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    });

    y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : y + 30;

    // Função auxiliar para adicionar tabelas grandes e ajustar paginação
    const adicionaTabela = ({ titulo, head, body }) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(titulo, 14, y);
      autoTable(doc, {
        startY: y + 4,
        head,
        body,
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [99, 102, 241], textColor: 255 },
        willDrawCell: function (data) {
          // nada por enquanto — hook disponível se precisar ajustar largura
        },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : y + 60;
    };

    // Tempo de Espera - Detalhado
    adicionaTabela({
      titulo: "Tempo de Espera - Detalhado",
      head: [["Data", "Fila", "Tempo Médio (min)", "Atendidos", "Desistências"]],
      body: tempoEspera.map((r) => [r.data, r.nome_fila, r.media, r.totalAtendidos, r.desistencias]),
    });

    // Tempo de Atendimento - Detalhado
    adicionaTabela({
      titulo: "Tempo de Atendimento - Detalhado",
      head: [["Data", "Fila", "Tempo Médio (min)", "Total Atendidos"]],
      body: tempoAtendimento.map((r) => [r.data, r.nome_fila, r.media, r.totalAtendidos]),
    });

    // Desempenho por Fila
    adicionaTabela({
      titulo: "Desempenho por Fila",
      head: [["Fila", "Atendidos", "Desistentes", "Em Espera", "Média Espera Atend. (min)", "Média Espera Desist. (min)"]],
      body: desempenhoFila.map((r) => [
        r.fila,
        r.atendidos,
        r.desistentes,
        r.em_espera,
        r.media_espera_atendidos,
        r.media_espera_desistentes,
      ]),
    });

    // Distribuição de Avaliações
    adicionaTabela({
      titulo: "Distribuição de Avaliações",
      head: [["Nota", "Quantidade"]],
      body: distribuicaoNotas.map((n) => [n.nota, n.quantidade]),
    });

    // Avaliações Detalhadas (últimas 20)
    adicionaTabela({
      titulo: "Avaliações Detalhadas (Últimas 20)",
      head: [["Data", "Nota", "Comentário"]],
      body: avaliacoesDetalhadas.slice(0, 20).map((a) => [a.data, a.nota, a.comentario || "—"]),
    });

    // Rodapé com paginação
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${totalPages}`, 200 - 14, 287, { align: "right" });
    }

    doc.save(`Relatorio_Atendimento_${new Date().toISOString().slice(0, 10)}.pdf`);
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

            <button className="btn-export" style={{ backgroundColor: "#10b981" }} onClick={gerarPDF}>
              <i className="bi bi-printer"></i> Imprimir PDF
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
            <div className="placeholder">Nenhum dado disponível para o filtro selecionado.</div>
          )}
        </div>

        {/* Gráfico 3 */}
        <div className="card chart-card">
          <h3>Distribuição de Avaliações</h3>
          <ResponsiveContainer width="100%" height={260}>
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
