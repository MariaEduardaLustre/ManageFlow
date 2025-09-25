import React from "react";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";


const CardRelatorio = ({ titulo, dados, chave }) => {
  // 🔹 Exportação Excel
  const exportarExcel = () => {
    if (!dados || dados.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `${titulo.replace(/\s+/g, "_")}.xlsx`);
  };

  return (
    <div className="card-relatorio">
      <h3>{titulo}</h3>
      {dados && dados.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dados}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={Object.keys(dados[0])[0]} />
            <YAxis />
            <Tooltip />
            <Bar
              dataKey={Object.keys(dados[0])[1]}
              fill="#8884d8"
              barSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p>Nenhum dado encontrado.</p>
      )}

      <button onClick={exportarExcel} className="btn-exportar">
        Exportar Excel
      </button>
    </div>
  );
};

export default CardRelatorio;
