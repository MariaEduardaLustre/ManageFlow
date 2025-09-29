import axios from "axios";
import { useEffect, useState } from "react";
import Select from "react-select";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import Menu from "../Menu/Menu";
import "./Relatorio.css";

const Relatorio = () => {
  const [filas, setFilas] = useState([]);
  const [filaSelecionada, setFilaSelecionada] = useState(null);
  const [tempoEspera, setTempoEspera] = useState([]);
  const [desistencias, setDesistencias] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);

  // Filtros de data individuais
  const [tempoEsperaDataInicio, setTempoEsperaDataInicio] = useState("");
  const [tempoEsperaDataFim, setTempoEsperaDataFim] = useState("");
  const [desistenciasDataInicio, setDesistenciasDataInicio] = useState("");
  const [desistenciasDataFim, setDesistenciasDataFim] = useState("");
  const [avaliacoesDataInicio, setAvaliacoesDataInicio] = useState("");
  const [avaliacoesDataFim, setAvaliacoesDataFim] = useState("");

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [loadingFilas, setLoadingFilas] = useState(true);
  const [loadingRelatorios, setLoadingRelatorios] = useState(false);
  const [error, setError] = useState("");

  // Buscar filas
  useEffect(() => {
    if (!token) return;
    setLoadingFilas(true);
    axios
      .get("http://localhost:3001/api/relatorios/filas", { headers })
      .then((res) => setFilas(res.data || []))
      .catch((err) => setError("Não foi possível carregar as filas."))
      .finally(() => setLoadingFilas(false));
  }, [token]);

  // Buscar relatórios ao selecionar fila
  useEffect(() => {
    if (!filaSelecionada || !token) return;
    const filaId = filaSelecionada.value;

    setLoadingRelatorios(true);
    setError("");

    Promise.all([
      axios.get(`http://localhost:3001/api/relatorios/tempo-espera/${filaId}`, { headers }),
      axios.get(`http://localhost:3001/api/relatorios/desistencias/${filaId}`, { headers }),
      axios.get(`http://localhost:3001/api/relatorios/avaliacoes/${filaId}`, { headers }),
    ])
      .then(([esperaRes, desistRes, avalRes]) => {
        setTempoEspera(esperaRes.data || []);
        setDesistencias(desistRes.data || []);
        setAvaliacoes(avalRes.data || []);
      })
      .catch(() => setError("Não foi possível carregar os relatórios."))
      .finally(() => setLoadingRelatorios(false));
  }, [filaSelecionada, token]);

  // Filtrar por data
  const filtrarPorData = (dados, inicio, fim) => {
    return dados.filter((item) => {
      const dataItem = new Date(item.data);
      if (inicio && dataItem < new Date(inicio)) return false;
      if (fim && dataItem > new Date(fim)) return false;
      return true;
    });
  };

  const tempoEsperaFiltrado = filtrarPorData(tempoEspera, tempoEsperaDataInicio, tempoEsperaDataFim);
  const desistenciasFiltrado = filtrarPorData(desistencias, desistenciasDataInicio, desistenciasDataFim);
  const avaliacoesFiltrado = filtrarPorData(avaliacoes, avaliacoesDataInicio, avaliacoesDataFim);

  // Exportar Excel personalizado
  const exportToExcel = (dados, nomeArquivo, colunas = [], filaNome = "") => {
    if (!dados || dados.length === 0) return;

    const dadosFormatados = dados.map((item) => {
      const obj = {};
      colunas.forEach((c) => {
        obj[c.label] = item[c.key];
      });
      if (filaNome) obj["Fila"] = filaNome;
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(dadosFormatados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
  };

  return (
    <div className="relatorio-container">
      <Menu />
      <div className="relatorio-content">
        <h2>Relatórios por Fila</h2>

        {loadingFilas ? (
          <p>Carregando filas...</p>
        ) : filas.length === 0 ? (
          <p>Nenhuma fila encontrada.</p>
        ) : (
          <Select
            options={filas}
            value={filaSelecionada}
            onChange={setFilaSelecionada}
            placeholder="Selecione uma fila..."
            isSearchable
          />
        )}

        {error && <p className="error">{error}</p>}

        {filaSelecionada && (
          <div className="relatorio-cards">
            {loadingRelatorios ? (
              <p>Carregando relatórios...</p>
            ) : (
              <>
                {/* TEMPO DE ESPERA */}
                <div className="relatorio-card">
                  <h4>Tempo Médio de Espera (minutos)</h4>
                  <div className="filtro-data">
                    <label>
                      De:{" "}
                      <input type="date" value={tempoEsperaDataInicio} onChange={e => setTempoEsperaDataInicio(e.target.value)} />
                    </label>
                    <label>
                      Até:{" "}
                      <input type="date" value={tempoEsperaDataFim} onChange={e => setTempoEsperaDataFim(e.target.value)} />
                    </label>
                  </div>
                  {tempoEsperaFiltrado.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={tempoEsperaFiltrado}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="data" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="media" stroke="#1f77b4" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <p>Nenhum dado disponível</p>}
                  <button
                    disabled={tempoEsperaFiltrado.length === 0}
                    onClick={() =>
                      exportToExcel(
                        tempoEsperaFiltrado,
                        "tempo_espera",
                        [
                          { key: "data", label: "Data" },
                          { key: "media", label: "Tempo Médio (min)" },
                          { key: "totalAtendidos", label: "Total Atendidos" },
                          { key: "desistencias", label: "Total Desistências" }
                        ],
                        filaSelecionada.label
                      )
                    }
                  >
                    Exportar Excel
                  </button>
                </div>

                {/* DESISTÊNCIAS */}
                <div className="relatorio-card">
                  <h4>Desistências</h4>
                  <div className="filtro-data">
                    <label>
                      De:{" "}
                      <input type="date" value={desistenciasDataInicio} onChange={e => setDesistenciasDataInicio(e.target.value)} />
                    </label>
                    <label>
                      Até:{" "}
                      <input type="date" value={desistenciasDataFim} onChange={e => setDesistenciasDataFim(e.target.value)} />
                    </label>
                  </div>
                  {desistenciasFiltrado.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={desistenciasFiltrado}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="data" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="desistencias" stroke="#ff7f0e" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <p>Nenhum dado disponível</p>}
                  <button
                    disabled={desistenciasFiltrado.length === 0}
                    onClick={() =>
                      exportToExcel(
                        desistenciasFiltrado,
                        "desistencias",
                        [
                          { key: "data", label: "Data" },
                          { key: "desistencias", label: "Total Desistências" },
                          { key: "totalClientes", label: "Total Clientes" },
                          { key: "percentualDesistencia", label: "% Desistência" }
                        ],
                        filaSelecionada.label
                      )
                    }
                  >
                    Exportar Excel
                  </button>
                </div>

                {/* AVALIAÇÕES */}
                <div className="relatorio-card">
                  <h4>Avaliações</h4>
                  <div className="filtro-data">
                    <label>
                      De:{" "}
                      <input type="date" value={avaliacoesDataInicio} onChange={e => setAvaliacoesDataInicio(e.target.value)} />
                    </label>
                    <label>
                      Até:{" "}
                      <input type="date" value={avaliacoesDataFim} onChange={e => setAvaliacoesDataFim(e.target.value)} />
                    </label>
                  </div>
                  {avaliacoesFiltrado.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={avaliacoesFiltrado}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="data" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="media" stroke="#2ca02c" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <p>Nenhum dado disponível</p>}
                  <button
                    disabled={avaliacoesFiltrado.length === 0}
                    onClick={() =>
                      exportToExcel(
                        avaliacoesFiltrado,
                        "avaliacoes",
                        [
                          { key: "data", label: "Data" },
                          { key: "media", label: "Média" },
                          { key: "totalFeedbacks", label: "Total Feedbacks" }
                        ],
                        filaSelecionada.label
                      )
                    }
                  >
                    Exportar Excel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Relatorio;
