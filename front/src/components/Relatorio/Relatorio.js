import axios from "axios";
import { useEffect, useState } from "react";
import Select from "react-select";
import {
  CartesianGrid,
  Line,
  LineChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import * as XLSX from "xlsx";
import Menu from "../Menu/Menu";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./Relatorio.css";

const Relatorio = () => {
  const [filas, setFilas] = useState([]);
  const [filaSelecionada, setFilaSelecionada] = useState(null);
  const [tempoEspera, setTempoEspera] = useState([]);
  const [desistencias, setDesistencias] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);

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
      .catch(() => setError("Não foi possível carregar as filas."))
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

  // Exportar Excel
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
        {/* === SELEÇÃO DE FILA === */}
        <div className="relatorio-header-card">
          <div className="relatorio-header-info">
            <h2>Selecionar Fila</h2>
            <p>Escolha a fila para gerar relatórios</p>
          </div>
          <div className="relatorio-select-wrapper">
            <Select
              options={filas}
              value={filaSelecionada}
              onChange={setFilaSelecionada}
              placeholder="Selecione uma fila..."
              isSearchable
            />
          </div>
        </div>

        {!filaSelecionada && !loadingRelatorios && (
          <div className="relatorio-placeholder">
            <img src="/images/placeholder-relatorio.png" alt="Placeholder" />
            <p>Selecione uma fila acima para visualizar os relatórios</p>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        {/* === RELATÓRIOS === */}
        {filaSelecionada && (
          <div className="relatorio-cards">
            {loadingRelatorios ? (
              <p>Carregando relatórios...</p>
            ) : (
              <>
                {/* === TEMPO DE ESPERA === */}
                <div className="relatorio-card">
                  <div className="relatorio-card-header">
                    <h4>Tempo de Espera</h4>
                    <button
                      className="btn-export"
                      disabled={tempoEsperaFiltrado.length === 0}
                      onClick={() =>
                        exportToExcel(
                          tempoEsperaFiltrado,
                          "tempo_espera",
                          [
                            { key: "data", label: "Data" },
                            { key: "media", label: "Tempo Médio (min)" },
                            { key: "totalAtendidos", label: "Total Atendidos" },
                            { key: "desistencias", label: "Total Desistências" },
                          ],
                          filaSelecionada.label
                        )
                      }
                    >
                      <i className="bi bi-file-earmark-excel"></i> Exportar Excel
                    </button>
                  </div>

                  <div className="filtro-data">
                    <label>
                      <i className="bi bi-calendar3"></i> De:
                      <input
                        type="date"
                        value={tempoEsperaDataInicio}
                        onChange={(e) => setTempoEsperaDataInicio(e.target.value)}
                      />
                    </label>
                    <label>
                      Até:
                      <input
                        type="date"
                        value={tempoEsperaDataFim}
                        onChange={(e) => setTempoEsperaDataFim(e.target.value)}
                      />
                    </label>
                  </div>

                  {tempoEsperaFiltrado.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={tempoEsperaFiltrado}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="data" />
                        <YAxis label={{ value: "Minutos", angle: -90, position: "insideLeft" }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="media" stroke="#3b82f6" dot />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p>Nenhum dado disponível</p>
                  )}
                </div>

                {/* === DESISTÊNCIAS === */}
                <div className="relatorio-card">
                  <div className="relatorio-card-header">
                    <h4>Desistência</h4>
                    <button
                      className="btn-export"
                      disabled={desistenciasFiltrado.length === 0}
                      onClick={() =>
                        exportToExcel(
                          desistenciasFiltrado,
                          "desistencias",
                          [
                            { key: "data", label: "Data" },
                            { key: "desistencias", label: "Total Desistências" },
                            { key: "totalClientes", label: "Total Clientes" },
                            { key: "percentualDesistencia", label: "% Desistência" },
                          ],
                          filaSelecionada.label
                        )
                      }
                    >
                      <i className="bi bi-file-earmark-excel"></i> Exportar Excel
                    </button>
                  </div>

                  <div className="filtro-data">
                    <label>
                      <i className="bi bi-calendar3"></i> De:
                      <input
                        type="date"
                        value={desistenciasDataInicio}
                        onChange={(e) => setDesistenciasDataInicio(e.target.value)}
                      />
                    </label>
                    <label>
                      Até:
                      <input
                        type="date"
                        value={desistenciasDataFim}
                        onChange={(e) => setDesistenciasDataFim(e.target.value)}
                      />
                    </label>
                  </div>

                  {desistenciasFiltrado.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={desistenciasFiltrado}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="data" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="totalClientes" fill="#22c55e" name="Atendimentos" />
                        <Bar dataKey="desistencias" fill="#ef4444" name="Desistências" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p>Nenhum dado disponível</p>
                  )}
                </div>

                {/* === AVALIAÇÕES === */}
                <div className="relatorio-card">
                  <div className="relatorio-card-header">
                    <h4>Avaliações</h4>
                    <button
                      className="btn-export"
                      disabled={avaliacoesFiltrado.length === 0}
                      onClick={() =>
                        exportToExcel(
                          avaliacoesFiltrado,
                          "avaliacoes",
                          [
                            { key: "data", label: "Data" },
                            { key: "media", label: "Média" },
                            { key: "totalFeedbacks", label: "Total Feedbacks" },
                          ],
                          filaSelecionada.label
                        )
                      }
                    >
                      <i className="bi bi-file-earmark-excel"></i> Exportar Excel
                    </button>
                  </div>

                  <div className="filtro-data">
                    <label>
                      <i className="bi bi-calendar3"></i> De:
                      <input
                        type="date"
                        value={avaliacoesDataInicio}
                        onChange={(e) => setAvaliacoesDataInicio(e.target.value)}
                      />
                    </label>
                    <label>
                      Até:
                      <input
                        type="date"
                        value={avaliacoesDataFim}
                        onChange={(e) => setAvaliacoesDataFim(e.target.value)}
                      />
                    </label>
                  </div>

                  {avaliacoesFiltrado.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={avaliacoesFiltrado}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="data" />
                        <YAxis label={{ value: "Avaliações", angle: -90, position: "insideLeft" }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="totalFeedbacks" fill="#22c55e" name="Quantidade de Avaliações" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p>Nenhum dado disponível</p>
                  )}
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
