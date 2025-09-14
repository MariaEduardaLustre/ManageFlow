// src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Usa o snapshot salvo em localStorage. Ex:
 * empresaSelecionada = {
 *   ID_EMPRESA, ROLE, PERMISSIONS: { queues: ['view','create',...], ... }
 * }
 */
function hasPermission(perms, resource, actions) {
  if (!resource) return true; // só checar login/empresa
  const allowed = new Set(perms?.[resource] || []);
  const list = Array.isArray(actions) ? actions : [actions];
  // true se o usuário tiver QUALQUER uma das ações pedidas
  return list.some(a => allowed.has(a));
}

export default function PrivateRoute({ children, resource, action }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  const empresa = JSON.parse(localStorage.getItem('empresaSelecionada') || 'null');
  if (!empresa?.ID_EMPRESA) return <Navigate to="/escolher-empresa" replace />;

  // checagem RBAC opcional (só se resource/action foram passados)
  if (resource && action && !hasPermission(empresa.PERMISSIONS, resource, action)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}
