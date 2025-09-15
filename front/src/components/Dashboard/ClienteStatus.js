import React, { useState } from 'react';
import axios from 'axios';

function ClienteStatus({ cliente, fetchDashboard }) {
  const [status, setStatus] = useState(cliente.STATUS);

  const handleChange = async (e) => {
    const novoStatus = e.target.value;
    setStatus(novoStatus);
    await axios.put(`http://localhost:3000/api/clientes/${cliente.ID_CLIENTE}/status`, { status: novoStatus });
    if (fetchDashboard) fetchDashboard(); // Atualiza o dashboard
  };

  return (
    <select value={status} onChange={handleChange}>
      <option value="aguardando">Aguardando</option>
      <option value="atendendo">Atendendo</option>
      <option value="finalizado">Finalizado</option>
    </select>
  );
}

export default ClienteStatus;
