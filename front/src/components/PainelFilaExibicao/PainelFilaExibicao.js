// Arquivo: components/Relatorio.js (Versão com correção no Frontend)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
//import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
//import * as XLSX from 'xlsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Relatorio = () => {
     const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
  const idEmpresaLogada = empresaSelecionada?.ID_EMPRESA;

  const [filas, setFilas] = useState([]);
  const [filaSelecionada, setFilaSelecionada] = useState('');

  useEffect(() => {
    if (!idEmpresaLogada) return;

    const fetchFilas = async () => {
      try {
        const response = await axios.get(`http://localhost:3001/api/empresas/filas/${idEmpresaLogada}`);
        setFilas(response.data);
        if (response.data.length > 0) setFilaSelecionada(response.data[0].ID_FILA);
      } catch (err) {
        console.error('Erro ao buscar filas:', err.message);
      }
    };

    fetchFilas();
  }, [idEmpresaLogada]);

  return (
    <div style={{ marginBottom: '30px' }}>
      <label htmlFor="fila-select">Selecione a Fila: </label>
      <select
        id="fila-select"
        value={filaSelecionada}
        onChange={(e) => setFilaSelecionada(e.target.value)}
        disabled={filas.length === 0}
      >
        {filas.map((fila) => (
          <option key={fila.ID_FILA} value={fila.ID_FILA}>
            {fila.NOME_FILA}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Relatorio;