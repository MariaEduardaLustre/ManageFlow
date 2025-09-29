// src/services/api.js
import axios from 'axios';

function resolveBaseURL() {
  // Use só a env do CRA
  const envUrl = process.env.REACT_APP_API_BASE || '';

  // Se não tiver env, deixa "/api" (usa proxy do CRA, se configurado)
  if (!envUrl) return '/api';

  try {
    const url = new URL(envUrl, window.location.origin);

    // Se a env aponta pra localhost mas a página NÃO está em localhost,
    // reescreve para usar o host atual (ex.: 192.168.x.x:3001)
    const isEnvLocalhost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    const isPageLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

    if (isEnvLocalhost && !isPageLocalhost) {
      const port = url.port || '3001';
      return `${window.location.protocol}//${window.location.hostname}:${port}${url.pathname}`;
    }

    return url.toString();
  } catch {
    // Se REACT_APP_API_BASE for algo tipo "/api", apenas retorna
    return envUrl;
  }
}

const api = axios.create({
  baseURL: resolveBaseURL(),
});

api.interceptors.request.use((config) => {
  const t = localStorage.getItem('token');
  if (t) config.headers.Authorization = `Bearer ${t}`;

  const empresa = JSON.parse(localStorage.getItem('empresaSelecionada') || 'null');
  if (empresa?.ID_EMPRESA) config.headers['x-empresa-id'] = empresa.ID_EMPRESA;

  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;

    if (status === 401) {
      console.warn('[api] 401 recebido:', err?.response?.data);
      if (window.location.pathname !== '/login') window.location.replace('/login');
    }

    if (status === 403) {
      console.warn('[api] 403 recebido:', err?.response?.data);
      if (window.location.pathname !== '/403') window.location.replace('/403');
    }

    return Promise.reject(err);
  }
);

export default api;
