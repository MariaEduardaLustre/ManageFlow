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
import autoTable from "jspdf-autotable";
import Menu from "../Menu/Menu";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./Relatorio.css";
import { useTranslation } from "react-i18next";

const apiBase = "http://localhost:3001/api/relatorios";

export default function Relatorio() {
  const { t, i18n } = useTranslation();

  // Estados de Dados
  const [tempoEspera, setTempoEspera] = useState([]);
  const [desistencias, setDesistencias] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [tempoAtendimento, setTempoAtendimento] = useState([]);
  const [desempenhoFila, setDesempenhoFila] = useState([]);
  const [filasDisponiveis, setFilasDisponiveis] = useState([t("relatorios.filtros.todasFilas")]);
  const [avaliacoesDetalhadas, setAvaliacoesDetalhadas] = useState([]);
  const [distribuicaoNotas, setDistribuicaoNotas] = useState([]);
  const [statusFilas, setStatusFilas] = useState([]);

  // Estados de Filtro (Controlados)
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroFila, setFiltroFila] = useState(t("relatorios.filtros.todasFilas"));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Efeito principal: busca dados quando filtros, idioma ou token mudam
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
    if (filtroFila && filtroFila !== t("relatorios.filtros.todasFilas")) {
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
      axios.get(`${apiBase}/filas-ativas`, { headers }).catch(() => ({ data: [] })),
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
        setStatusFilas(Array.isArray(respAtivas.data) ? respAtivas.data : []);

        if (Array.isArray(respFilas.data) && respFilas.data.length) {
          const nomes = [t("relatorios.filtros.todasFilas"), ...respFilas.data.map((f) => f.nome_fila)];
          setFilasDisponiveis(nomes);
          if (!nomes.includes(filtroFila)) setFiltroFila(t("relatorios.filtros.todasFilas"));
        }
      })
      .catch((err) => {
        console.error(err);
        setError(t("relatorios.erros.carregar"));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filtroDataInicio, filtroDataFim, filtroFila, i18n.language]);

  // KPIs
  const kpis = useMemo(() => {
    const tempoMedioEspera =
      tempoEspera.length > 0
        ? Math.round(
            tempoEspera.reduce((acc, cur) => acc + Number(cur.media || 0), 0) / tempoEspera.length
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
            tempoAtendimento.reduce((acc, cur) => acc + Number(cur.media || 0), 0) / tempoAtendimento.length
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

  // Locale
  const currentLocale = i18n.language?.startsWith("en") ? "en-US" : "pt-BR";

  // Exportar Excel
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

    adicionaPlanilha(tempoEspera, t("relatorios.excel.abaEspera"), [
      { key: "data", label: t("relatorios.excel.colEspera.data") },
      { key: "nome_fila", label: t("relatorios.excel.colEspera.fila") },
      { key: "media", label: t("relatorios.excel.colEspera.media") },
      { key: "totalAtendidos", label: t("relatorios.excel.colEspera.totalAtendidos") },
      { key: "desistencias", label: t("relatorios.excel.colEspera.desistencias") },
    ]);

    adicionaPlanilha(tempoAtendimento, t("relatorios.excel.abaAtendimento"), [
      { key: "data", label: t("relatorios.excel.colAtendimento.data") },
      { key: "nome_fila", label: t("relatorios.excel.colAtendimento.fila") },
      { key: "media", label: t("relatorios.excel.colAtendimento.media") },
      { key: "totalAtendidos", label: t("relatorios.excel.colAtendimento.totalAtendidos") },
    ]);

    adicionaPlanilha(desempenhoFila, t("relatorios.excel.abaDesempenho"), [
      { key: "fila", label: t("relatorios.excel.colDesempenho.fila") },
      { key: "atendidos", label: t("relatorios.excel.colDesempenho.atendidos") },
      { key: "desistentes", label: t("relatorios.excel.colDesempenho.desistentes") },
      { key: "em_espera", label: t("relatorios.excel.colDesempenho.em_espera") },
      { key: "media_espera_atendidos", label: t("relatorios.excel.colDesempenho.media_espera_atendidos") },
      { key: "media_espera_desistentes", label: t("relatorios.excel.colDesempenho.media_espera_desistentes") },
    ]);

    adicionaPlanilha(distribuicaoNotas, t("relatorios.excel.abaDistNotas"), [
      { key: "nota", label: t("relatorios.excel.colDistNotas.nota") },
      { key: "quantidade", label: t("relatorios.excel.colDistNotas.quantidade") },
    ]);

    adicionaPlanilha(avaliacoesDetalhadas, t("relatorios.excel.abaAvalDetalhadas"), [
      { key: "data", label: t("relatorios.excel.colAvalDetalhadas.data") },
      { key: "nota", label: t("relatorios.excel.colAvalDetalhadas.nota") },
      { key: "comentario", label: t("relatorios.excel.colAvalDetalhadas.comentario") },
    ]);

    const dataFiltro = filtroDataInicio || "inicio";
    XLSX.writeFile(wb, t("relatorios.excel.arquivo", { inicio: dataFiltro }));
  };

  // Gerar PDF
  const gerarPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    const dataGeracao = new Date().toLocaleString(currentLocale);

    // Cabeçalho
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(t("relatorios.pdf.titulo"), 14, 20);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${t("relatorios.pdf.periodo")}: ${
        filtroDataInicio && filtroDataFim ? `${filtroDataInicio} - ${filtroDataFim}` : t("relatorios.pdf.todosRegistros")
      }`,
      14,
      28
    );
    doc.text(`${t("relatorios.pdf.fila")}: ${filtroFila}`, 14, 34);
    doc.text(`${t("relatorios.pdf.geradoEm")}: ${dataGeracao}`, 14, 40);

    let y = 46;

    // Indicadores Principais
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(t("relatorios.pdf.indicadoresPrincipais"), 14, y);
    y += 4;

    autoTable(doc, {
      startY: y + 2,
      head: [[t("relatorios.pdf.indicador"), t("relatorios.pdf.valor")]],
      body: [
        [t("relatorios.pdf.kpiEspera"), `${kpis.tempoMedioEspera} min`],
        [t("relatorios.pdf.kpiAtendidos"), kpis.totalAtendidos],
        [t("relatorios.pdf.kpiAvaliacao"), kpis.avaliacaoMedia],
        [t("relatorios.pdf.kpiDesistencia"), `${kpis.taxaDesistencia}%`],
        [t("relatorios.pdf.kpiAtendimento"), `${kpis.tempoMedioAtendimento} min`],
      ],
      theme: "striped",
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      margin: { left: 14, right: 14 },
    });

    y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : y + 30;

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
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : y + 60;
    };

    // Tempo de Espera - Detalhado
    adicionaTabela({
      titulo: t("relatorios.pdf.detEspera"),
      head: [[
        t("relatorios.pdf.thData"),
        t("relatorios.pdf.thFila"),
        t("relatorios.pdf.thMediaMin"),
        t("relatorios.pdf.thTotalAtendidos"),
        t("relatorios.pdf.thDesistencias")
      ]],
      body: tempoEspera.map((r) => [r.data, r.nome_fila, r.media, r.totalAtendidos, r.desistencias]),
    });

    // Tempo de Atendimento - Detalhado
    adicionaTabela({
      titulo: t("relatorios.pdf.detAtendimento"),
      head: [[
        t("relatorios.pdf.thData"),
        t("relatorios.pdf.thFila"),
        t("relatorios.pdf.thMediaMin"),
        t("relatorios.pdf.thTotalAtendidos")
      ]],
      body: tempoAtendimento.map((r) => [r.data, r.nome_fila, r.media, r.totalAtendidos]),
    });

    // Desempenho por Fila
    adicionaTabela({
      titulo: t("relatorios.pdf.detDesempenho"),
      head: [[
        t("relatorios.pdf.thFila"),
        t("relatorios.pdf.thTotalAtendidos"),
        t("relatorios.pdf.thDesistencias"),
        t("relatorios.pdf.thEmEspera"),
        t("relatorios.pdf.thMediaEsperaAtend"),
        t("relatorios.pdf.thMediaEsperaDesist")
      ]],
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
      titulo: t("relatorios.pdf.detDist"),
      head: [[t("relatorios.pdf.thNota"), t("relatorios.pdf.valor")]],
      body: distribucaoNotasToBody(distribuicaoNotas),
    });

    // Avaliações Detalhadas (últimas 20)
    adicionaTabela({
      titulo: t("relatorios.pdf.detAval20"),
      head: [[t("relatorios.pdf.thData"), t("relatorios.pdf.thNota"), t("relatorios.pdf.thComentario")]],
      body: avaliacoesDetalhadas.slice(0, 20).map((a) => [a.data, a.nota, a.comentario || "—"]),
    });

    // Rodapé com paginação
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(150);
      const txt =
        i18n.language?.startsWith("en")
          ? `Page ${i} of ${totalPages}`
          : t("relatorios.pdf.paginaXdeY", { x: i, y: totalPages });
      doc.text(txt, 200 - 14, 287, { align: "right" });
    }

    const iso = new Date().toISOString().slice(0, 10);
    const nomeArquivo = i18n.language?.startsWith("en") ? `Report_${iso}.pdf` : `Relatorio_${iso}.pdf`;
    doc.save(nomeArquivo);
  };

  const distribucaoNotasToBody = (arr) => arr.map((n) => [n.nota, n.quantidade]);

  return (
    <div className="relatorio-page">
      <Menu />
      <div className="relatorio-content container">
        <div className="relatorio-header">
          <div>
            <p className="subtitle">{t("relatorios.subtitulo")}</p>
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
              <i className="bi bi-download"></i> {t("relatorios.filtros.exportarExcel")}
            </button>

            <button className="btn-export" style={{ backgroundColor: "#10b981" }} onClick={gerarPDF}>
              <i className="bi bi-printer"></i> {t("relatorios.filtros.imprimirPdf")}
            </button>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {/* KPIs */}
        <div className="kpi-cards">
          <div className="kpi-card">
            <div className="kpi-title">{t("relatorios.kpis.tempoMedioEspera")}</div>
            <div className="kpi-value">
              {kpis.tempoMedioEspera} <small>min</small>
            </div>
            <div className="kpi-sub">{t("relatorios.kpis.comparativoPeriodo")}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">{t("relatorios.kpis.clientesAtendidos")}</div>
            <div className="kpi-value">{kpis.totalAtendidos}</div>
            <div className="kpi-sub">{t("relatorios.kpis.vsPeriodoAnterior")}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">{t("relatorios.kpis.avaliacaoMedia")}</div>
            <div className="kpi-value">{kpis.avaliacaoMedia}</div>
            <div className="kpi-sub">
              {t("relatorios.kpis.baseFeedbacks", {
                qtd: avaliacoes.reduce((a, b) => a + Number(b.totalFeedbacks || 0), 0),
              })}
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">{t("relatorios.kpis.taxaDesistencia")}</div>
            <div className="kpi-value">{kpis.taxaDesistencia}%</div>
            <div className="kpi-sub">{t("relatorios.kpis.taxaMediaPeriodo")}</div>
          </div>

          <div className="kpi-card wide-card">
            <div className="kpi-title">{t("relatorios.kpis.tempoMedioAtendimento")}</div>
            <div className="kpi-value">
              {kpis.tempoMedioAtendimento}
              {kpis.tempoMedioAtendimento !== "-" ? " min" : ""}
            </div>
          </div>
        </div>

        {/* Gráfico 1 */}
        <div className="card chart-card">
          <h3>{t("relatorios.graficos.linhaTitulo")}</h3>
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
                name={t("relatorios.graficos.espera")}
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="tempoAtendimento"
                name={t("relatorios.graficos.atendimento")}
                stroke="#13b887"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 2 */}
        <div className="card chart-card">
          <h3>{t("relatorios.graficos.desempenhoPorFila")}</h3>
          {desempenhoPorFilaData.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={desempenhoPorFilaData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="fila" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Legend />
                <Bar dataKey="atendidos" name={t("relatorios.graficos.atendidos")} fill="#16A249" radius={[6, 6, 0, 0]} />
                <Bar dataKey="desistentes" name={t("relatorios.graficos.desistentes")} fill="#EF4343" radius={[6, 6, 0, 0]} />
                <Bar dataKey="em_espera" name={t("relatorios.graficos.emEspera")} fill="#F59F0A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="placeholder">{t("relatorios.graficos.nenhumDado")}</div>
          )}
        </div>

        {/* Gráfico 3 */}
        <div className="card chart-card">
          <h3>{t("relatorios.graficos.distAvaliacoes")}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={distribuicaoNotas} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="nota" stroke="#9ca3af" />
              <Tooltip />
              <Bar dataKey="quantidade" name={t("relatorios.graficos.quantidade")} fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}
