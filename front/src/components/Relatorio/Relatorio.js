import React, { useState } from 'react';
import Menu from '../Menu/Menu';
import './Relatorio.css';

const Relatorio = () => {
  return (
    <div className="relatorio-container">
      <Menu />

      <div className="relatorio-content">
        <h1>Relatorio</h1>
        <p>Bem-vindo ao seu painel. Aqui você poderá ver gráficos, métricas e outras informações.</p>
      </div>
    </div>
  );
};

export default Relatorio;