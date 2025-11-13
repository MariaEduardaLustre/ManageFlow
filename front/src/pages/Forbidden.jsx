// src/pages/Forbidden.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function Forbidden() {
  return (
    <div style={{
      maxWidth: 720, margin: '80px auto', padding: 24,
      borderRadius: 12, background: '#fff', boxShadow: '0 10px 24px rgba(41,53,86,.08)'
    }}>
      <h1 style={{margin: 0}}>403 — Acesso negado</h1>
      <p style={{color: '#667085'}}>Você não tem permissão para acessar esta página.</p>
      <div style={{marginTop: 16}}>
        <Link to="/home">Voltar para a Home</Link>
      </div>
    </div>
  );
}
