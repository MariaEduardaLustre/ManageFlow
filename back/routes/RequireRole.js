// src/routes/RequireRole.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

/**
 * Lê o papel atual do localStorage (empresaSelecionada).
 */
function useRole() {
  try {
    const raw = localStorage.getItem("empresaSelecionada");
    const parsed = raw ? JSON.parse(raw) : null;
    // ROLE pode vir do /me/permissions; caso não, inferimos por NIVEL
    const nivel = Number(parsed?.NIVEL);
    const role = (parsed?.ROLE || (nivel === 1 ? "ADM" : nivel === 2 ? "STAFF" : nivel === 3 ? "ANALYST" : "CUSTOMER")).toUpperCase();
    return role;
  } catch {
    return null;
  }
}

/**
 * Componente de proteção de rota por papéis.
 * Uso: <RequireRole allowed={['ADM','STAFF']}><Home/></RequireRole>
 */
export default function RequireRole({ allowed = [], children }) {
  const role = useRole();
  const location = useLocation();

  // sem empresa/role -> volta ao login
  if (!role) return <Navigate to="/login" replace state={{ from: location }} />;

  if (allowed.map((r) => r.toUpperCase()).includes(role)) {
    return children;
  }
  // proibido
  return <Navigate to="/403" replace />;
}
