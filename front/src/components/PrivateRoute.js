// src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

function normalizeRoleFromNivel(nivel) {
  const n = Number(nivel);
  if (n === 1) return 'ADM';
  if (n === 2) return 'STAFF';
  if (n === 3) return 'ANALYST';
  return 'CUSTOMER';
}

function getCurrentRole() {
  try {
    const raw = localStorage.getItem('empresaSelecionada');
    const emp = raw ? JSON.parse(raw) : null;

    // 1) Se tiver NIVEL, PRIORIZE NIVEL (evita ROLE antigo "STAF")
    if (emp && typeof emp.NIVEL !== 'undefined' && emp.NIVEL !== null) {
      return normalizeRoleFromNivel(emp.NIVEL);
    }

    // 2) Caso contrário, tenta ROLE e normaliza "STAF" -> "STAFF"
    let role = (emp?.ROLE || '').toUpperCase();
    if (role.startsWith('STAF')) role = 'STAFF'; // corrige "STAF" legado
    if (!role) role = 'CUSTOMER';
    return role;
  } catch {
    return null;
  }
}

/**
 * Por padrão, só ADM/STAFF.
 * Liberamos ANALYST apenas para:
 *  - 'dashboard'
 *  - 'analytics' (relatórios)
 */
const DEFAULT_ALLOWED_BY_RESOURCE = {
  dashboard: ['ADM', 'STAFF', 'ANALYST'],
  analytics: ['ADM', 'STAFF', 'ANALYST'],
  // todo o resto cai no default ['ADM','STAFF']
};

export default function PrivateRoute({
  children,
  resource,       // ex.: 'dashboard', 'settings', 'queues', 'queueEntries', 'usersRoles', 'analytics'
  action,         // mantido p/ compat (não usado no front)
  allowedRoles,   // opcional: sobrescreve lista padrão
}) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;

  const role = getCurrentRole();
  if (!role) return <Navigate to="/escolher-empresa" replace />;

  const key = String(resource || '').toLowerCase();
  const allowed =
    (allowedRoles && allowedRoles.map((r) => r.toUpperCase())) ||
    DEFAULT_ALLOWED_BY_RESOURCE[key] ||
    ['ADM', 'STAFF'];

  if (!allowed.includes(role)) return <Navigate to="/403" replace />;
  return children;
}
