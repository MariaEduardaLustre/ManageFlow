import React, { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import axios from 'axios';
import ClienteStatus from './ClienteStatus';

function Dashboard() {
  const [empresaId, setEmpresaId] = useState(1); // ajuste conforme sua lógica
  const [filaSelecionada, setFilaSelecionada] = useState(null);
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [dashboardData, setDashboardData] = useState({
    filas: [],
    clientes: [],
    espera: []
  });

  // Função para buscar todos os dados do dashboard
  const fetchDashboard = () => {
    let url = `http://localhost:3001/api/dashboardRoutes/${empresaId}`;
    if (filaSelecionada) url += `/${filaSelecionada}`;
    if (dataSelecionada) url += `/${dataSelecionada}`;

    axios.get(url)
      .then(res => setDashboardData(res.data))
      .catch(err => console.error('Erro ao buscar dashboard:', err));
  };

  // Atualiza filas e tempo de espera ao montar o componente
  useEffect(() => {
    fetchDashboard();
  }, [empresaId]);

  // Atualiza clientes quando fila ou data mudar
  useEffect(() => {
    if (filaSelecionada && dataSelecionada) {
      fetchDashboard();
    }
  }, [filaSelecionada, dataSelecionada]);

  const { filas, clientes, espera } = dashboardData;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Dashboard ManageFlow</h1>

      {/* Dashboard 1: Filas */}
      <section style={{ marginBottom: '40px' }}>
        <h2>Filas da Empresa</h2>
        {filas.length > 0 ? (
          <Chart
            options={{ chart: { id: 'filas' }, xaxis: { categories: filas.map(f => f.NOME_FILA) } }}
            series={[{ name: 'Clientes', data: filas.map(f => f.total_clientes) }]}
            type="bar"
            height={350}
          />
        ) : (
          <p>Nenhuma fila encontrada.</p>
        )}
      </section>

      {/* Filtros para clientes */}
      <section style={{ marginBottom: '20px' }}>
        <h2>Clientes por Fila e Data</h2>
        <label>
          Fila: 
          <select
            value={filaSelecionada || ''}
            onChange={e => setFilaSelecionada(Number(e.target.value))}
          >
            <option value="">Selecione</option>
            {filas.map(f => <option key={f.ID_FILA} value={f.ID_FILA}>{f.NOME_FILA}</option>)}
          </select>
        </label>
        <label style={{ marginLeft: '20px' }}>
          Data: 
          <input type="date" value={dataSelecionada} onChange={e => setDataSelecionada(e.target.value)} />
        </label>
      </section>

      {/* Dashboard 2 & 3: Clientes e status */}
      {clientes.length > 0 ? (
        <section style={{ marginBottom: '40px' }}>
          <h2>Lista de Clientes</h2>
          <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(c => (
                <tr key={c.ID_CLIENTE}>
                  <td>{c.NOME_CLIENTE}</td>
                  <td>
                    <ClienteStatus cliente={c} fetchDashboard={fetchDashboard} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        filaSelecionada && dataSelecionada && <p>Nenhum cliente encontrado para essa fila e data.</p>
      )}

      {/* Dashboard 4: Tempo médio de espera */}
      <section>
        <h2>Tempo Médio de Espera por Fila</h2>
        {espera.length > 0 ? (
          <Chart
            options={{ chart: { id: 'espera' }, xaxis: { categories: espera.map(e => e.NOME_FILA) } }}
            series={[{ name: 'Tempo médio (min)', data: espera.map(e => e.tempo_medio) }]}
            type="line"
            height={350}
          />
        ) : (
          <p>Não há dados de tempo de espera.</p>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
