// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || '/api',
});

api.interceptors.request.use((config) => {
  let t = localStorage.getItem('token');

  // Normaliza: remove aspas e espaços
  if (t) {
    t = String(t).trim().replace(/^"|"$/g, '');
    // Se já vier com 'Bearer ', usa direto. Senão, prefixa.
    config.headers.Authorization = t.toLowerCase().startsWith('bearer ')
      ? t
      : `Bearer ${t}`;
  }

  const empresa = JSON.parse(localStorage.getItem('empresaSelecionada') || 'null');
  if (empresa?.ID_EMPRESA) config.headers['x-empresa-id'] = empresa.ID_EMPRESA;
  return config;
});

api.interceptors.response.use(
  (resp) => resp,
  (err) => {
    if (err?.response?.status === 401) {
      console.warn('[api] 401 recebido:', err.response.data);
      // opcional: forçar re-login
      // localStorage.removeItem('token');
      // window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
