// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || '/api',
});

api.interceptors.request.use((config) => {
  const t = localStorage.getItem('token');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  const empresa = JSON.parse(localStorage.getItem('empresaSelecionada') || 'null');
  if (empresa?.ID_EMPRESA) config.headers['x-empresa-id'] = empresa.ID_EMPRESA;
  return config;
});

export default api;
