import React, { useEffect, useState } from "react";
import CardRelatorio from "./CardRelatorio";
import api from "../../services/api";

const DashboardRelatorios = () => {
  const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
  const empresaId = empresaSelecionada?.ID_EMPRESA;

  const [filas, setFilas] = useState([]);
  const [filaSelecionada, setFilaSelecionada] = useState(null);

  const [tempoHora, setTempoHora] = useState([]);
  const [tempoSemana, setTempoSemana] = useState([]);
  const [desistencia, setDesistencia] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);

  const [dataInicio, setDataInicio] = useState("2025-09-01");
  const [dataFim, setDataFim] = useState("2025-09-23");

  // Buscar filas da empresa logada
  useEffect(() => {
    if (!empresaId) return;
    const fetchFilas = async () => {
      try {
        const response = await api.get(`/filas/empresa?idEmpresa=${empresaId}`);
        setFilas(response.data);
        if (response.data.length > 0) setFilaSelecionada(response.data[0]);
      } catch (err) {
        console.error("Erro ao buscar filas da empresa:", err);
      }
    };
    fetchFilas();
  }, [empresaId]);

  // Buscar relatórios ao selecionar fila
  useEffect(() => {
    if (!filaSelecionada || !empresaId) return;

    const fetchRelatorios = async () => {
      try {
        const filaId = filaSelecionada.ID_FILA;
        const base = `/relatorios`;

        const respTempoHora = await api.get(`${base}/tempo-espera-hora/${empresaId}/${filaId}?dataInicio=${dataInicio}&dataFim=${dataFim}`);
        setTempoHora(respTempoHora.data.resultados || []);

        const respTempoSemana = await api.get(`${base}/tempo-espera-semana/${empresaId}/${filaId}?dataInicio=${dataInicio}&dataFim=${dataFim}`);
        setTempoSemana(respTempoSemana.data.resultados || []);

        const respDesistencia = await api.get(`${base}/desistencia/${empresaId}/${filaId}?dataInicio=${dataInicio}&dataFim=${dataFim}`);
        setDesistencia([respDesistencia.data]);

        const respAvaliacoes = await api.get(`${base}/avaliacoes/${empresaId}/${filaId}?dataInicio=${dataInicio}&dataFim=${dataFim}`);
        setAvaliacoes(respAvaliacoes.data.comentarios || []);
      } catch (err) {
        console.error("Erro ao buscar relatórios:", err);
      }
    };

    fetchRelatorios();
  }, [filaSelecionada, empresaId, dataInicio, dataFim]);

  return (
    <div className="p-6">
      {/* Selecionar fila */}
      <div className="mb-4">
        <label className="mr-2 font-bold">Selecione a Fila:</label>
        <select
          value={filaSelecionada?.ID_FILA || ""}
          onChange={e => {
            const fila = filas.find(f => f.ID_FILA === parseInt(e.target.value));
            setFilaSelecionada(fila);
          }}
          className="border px-2 py-1 rounded"
        >
          {filas.map(f => (
            <option key={f.ID_FILA} value={f.ID_FILA}>{f.NOME_FILA}</option>
          ))}
        </select>
      </div>

      {/* Relatórios */}
      <CardRelatorio titulo="Tempo Médio de Espera por Hora" dados={tempoHora} colunas={["hora", "media_espera_minutos"]} />
      <CardRelatorio titulo="Tempo Médio de Espera por Dia da Semana" dados={tempoSemana} colunas={["dia_semana", "media_espera_minutos"]} />
      <CardRelatorio titulo="Desistências" dados={desistencia} colunas={["total_clientes", "total_desistencias", "percentual_desistencia"]} />
      <CardRelatorio titulo="Avaliações" dados={avaliacoes} colunas={["CLIENTE_NOME", "NOTA", "COMENTARIO"]} />
    </div>
  );
};

export default DashboardRelatorios;
