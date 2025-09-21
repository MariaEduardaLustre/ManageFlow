import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import * as XLSX from 'xlsx';
import Menu from '../Menu/Menu';
import './Relatorio.css';

const Relatorio = () => {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);

  const id_empresa = 23; // Ajuste para vir da sessão/login

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/configuracao-fila/filas/${id_empresa}`);
        const data = await response.json();

        const formatados = data.map(item => ({
  nome_fila: item.NOME_FILA,
  contagem: item.contagem,
  data_configuracao: item.data_configuracao
    ? new Date(item.data_configuracao).toLocaleDateString('pt-BR')
    : '-',
  data_atualizacao: item.data_atualizacao
    ? new Date(item.data_atualizacao).toLocaleDateString('pt-BR')
    : '-',
}));


        setDados(formatados);
      } catch (error) {
        console.error('Erro ao carregar relatório:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id_empresa]);

  const exportarExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatorio Filas');
    XLSX.writeFile(workbook, 'relatorio_filas.xlsx');
  };

  return (
    <div className="relatorio-container">
      <Menu />

      <div className="relatorio-content">
        <h2 className="relatorio-titulo">📊 Relatório de Filas Configuradas</h2>

        {loading ? (
          <p>Carregando dados...</p>
        ) : (
          <>
            <div className="grafico-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dados} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome_fila" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="contagem" fill="#4e73df" name="Pessoas na Fila" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="tabela-container">
              <table className="relatorio-tabela">
                <thead>
                  <tr>
                    <th>Nome da Fila</th>
                    <th>Data de Configuração</th>
                    <th>Última Atualização</th>
                    <th>Pessoas na Fila</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map((item, index) => (
                    <tr key={index}>
                      <td>{item.nome_fila}</td>
                      <td>{item.data_configuracao}</td>
                      <td>{item.data_atualizacao}</td>
                      <td>{item.contagem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button className="btn-exportar" onClick={exportarExcel}>
              📥 Exportar para Excel
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Relatorio;
