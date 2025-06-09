// src/pages/Dashboard.js

import React from 'react';
import Menu from '../Menu/Menu'; // ajuste o caminho conforme seu projeto
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <Menu />

      <div className="dashboard-content">
        <h1>Dashboard</h1>
        <p>Bem-vindo ao seu painel. Aqui você poderá ver gráficos, métricas e outras informações.</p>
      </div>
    </div>
  );
};

export default Dashboard;
