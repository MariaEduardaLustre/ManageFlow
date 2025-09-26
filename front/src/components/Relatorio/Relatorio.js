import React, { useState, useEffect } from "react";
import Menu from "../Menu/Menu";
import Select from "react-select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import * as XLSX from "xlsx";
import axios from "axios";
import "./Relatorio.css";

const Relatorio = () => {
  const [filas, setFilas] = useState([]);
  const [filaSelecionada, setFilaSelecionada] = useState(null);
  const [tempoEspera, setTempoEspera] = useState([]);
  const [desistencias, setDesistencias] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const token = localStorage.getItem("token");

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  // Buscar filas
  useEffect(() => {
    axios
      .get("http://localhost:3001/api/relatorios/filas", { headers })
      .then((res) => setFilas(res.data || []))
      .catch((err) => console.error("Erro ao carregar filas:", err));
  }, []);

  // Buscar relatórios ao selecionar fila
  useEffect(() => {
    if (!filaSelecionada) return;
    const filaId = filaSelecionada.value;

    axios
      .get(`http://localhost:3001/api/relatorios/tempo-espera/${filaId}`, { headers })
      .then((res) => setTempoEspera(res.data || []))
      .catch((err) => console.error("Erro tempo de espera:", err));

    axios
      .get(`http://localhost:3001/api/relatorios/desistencias/${filaId}`, { headers })
      .then((res) => setDesistencias(res.data || []))
      .catch((err) => console.error("Erro desistências:", err));

    axios
      .get(`http://localhost:3001/api/relatorios/avaliacoes/${filaId}`, { headers })
      .then((res) => setAvaliacoes(res.data || []))
      .catch((err) => console.error("Erro avaliações:", err));
  }, [filaSelecionada]);

  // Filtrar dados por data
  const filtrarPorData = (dados) => {
    return dados.filter((item) => {
      const dataItem = new Date(item.data);
      if (dataInicio && dataItem < new Date(dataInicio)) return false;
      if (dataFim && dataItem > new Date(dataFim)) return false;
      return true;
    });
  };

  const tempoEsperaFiltrado = filtrarPorData(tempoEspera);
  const desistenciasFiltrado = filtrarPorData(desistencias);
  const avaliacoesFiltrado = filtrarPorData(avaliacoes);

  const exportToExcel = (dados, nomeArquivo) => {
    if (!dados || dados.length === 0) {
      alert("Não há dados para exportar!");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
  };

  return (
    <div className="relatorio-container">
      <Menu />
      <div className="relatorio-content">
        <h2>Relatórios por Fila</h2>

        <Select
          options={filas}
          value={filaSelecionada}
          onChange={setFilaSelecionada}
          placeholder="Selecione uma fila..."
          isSearchable
        />

        {filaSelecionada && (
          <div className="relatorio-cards">
            {/* Filtro de data */}
            <div className="filtro-data">
              <label>
                De:{" "}
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </label>
              <label>
                Até:{" "}
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </label>
            </div>

            {/* Tempo de Espera */}
            <div className="relatorio-card">
              <h4>Tempo Médio de Espera (minutos)</h4>
              {tempoEsperaFiltrado.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={tempoEsperaFiltrado}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="media" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p>Nenhum dado disponível</p>
              )}
              <button onClick={() => exportToExcel(tempoEsperaFiltrado, "tempo_espera")}>
                Exportar Excel
              </button>
            </div>

            {/* Desistências */}
            <div className="relatorio-card">
              <h4>Desistências</h4>
              {desistenciasFiltrado.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={desistenciasFiltrado}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="desistencias" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p>Nenhum dado disponível</p>
              )}
              <button onClick={() => exportToExcel(desistenciasFiltrado, "desistencias")}>
                Exportar Excel
              </button>
            </div>

            {/* Avaliações */}
            <div className="relatorio-card">
              <h4>Avaliações</h4>
              {avaliacoesFiltrado.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={avaliacoesFiltrado}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="media" stroke="#ffc658" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p>Nenhum dado disponível</p>
              )}
              <button onClick={() => exportToExcel(avaliacoesFiltrado, "avaliacoes")}>
                Exportar Excel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Relatorio;
