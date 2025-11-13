// front/src/pages/EmpresaPublicaPorToken/EmpresaPublicaPorToken.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
// Reaproveita o mesmo CSS da página por ID para manter visual idêntico
import '../EmpresaPublica/EmpresaPublicaPorToken.css';

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE) ||
  (typeof window !== 'undefined' && window.location && window.location.hostname
    ? `http://${window.location.hostname}:3001/api`
    : 'http://localhost:3001/api');

function Stars({ value = 0 }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const items = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= full) items.push('full');
    else if (i === full + 1 && half) items.push('half');
    else items.push('empty');
  }
  return (
    <div className="mf-stars" aria-label={`${value} de 5`}>
      {items.map((t, idx) => (
        <span key={idx} className={`mf-star ${t}`} />
      ))}
      <span className="mf-stars-label">{Number(value).toFixed(1)}</span>
    </div>
  );
}

export default function EmpresaPublicaPorToken() {
  const { token } = useParams(); // rota /perfil/:token (ex.: PV-123-TOKEN)
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const api = useMemo(() => axios.create({ baseURL: API_BASE }), []);

  async function fetchPerfil(p = 1) {
    try {
      setCarregando(true);
      setErro(null);
      const { data } = await api.get(`/public/empresa/by-token/${encodeURIComponent(token)}`, {
        params: { page: p, pageSize }
      });
      setPerfil(data);
    } catch (e) {
      setErro(e?.response?.data?.detail || e?.response?.data?.error || e.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (token) fetchPerfil(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function proximaPagina() {
    const next = page + 1;
    setPage(next);
    fetchPerfil(next);
  }
  function paginaAnterior() {
    const prev = Math.max(1, page - 1);
    setPage(prev);
    fetchPerfil(prev);
  }

  if (carregando) return <div className="mf-pub loading">Carregando…</div>;
  if (erro) return <div className="mf-pub error">Erro: {erro}</div>;
  if (!perfil) return null;

  const { empresa, resumo, avaliacoes } = perfil;

  return (
    <div className="mf-pub">
      <header className="mf-pub-header">
        {empresa.logo && <img src={empresa.logo} alt={empresa.nome} className="mf-pub-logo" />}
        <div className="mf-pub-headinfo">
          <h1 className="mf-pub-title">{empresa.nome}</h1>
          <Stars value={Number(resumo?.media || 0)} />
          <div className="mf-pub-sub">
            <span>{resumo?.total || 0} avaliações</span>
          </div>
        </div>
      </header>

      <section className="mf-pub-dist">
        <h2>Distribuição</h2>
        <ul>
          {[5,4,3,2,1].map((k) => {
            const qtd = resumo?.dist?.[String(k)] || 0;
            const total = resumo?.total || 0;
            const pct = total > 0 ? Math.round((qtd / total) * 100) : 0;
            return (
              <li key={k} className="mf-pub-dist-item">
                <span className="label">{k}★</span>
                <div className="bar">
                  <div className="fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="qtd">{qtd}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mf-pub-list">
        <h2>Últimas avaliações</h2>
        {avaliacoes.length === 0 && <div className="mf-empty">Ainda não há avaliações.</div>}
        {avaliacoes.map((a) => (
          <article key={a.id} className="mf-av-item">
            <div className="top">
              <Stars value={Number(a.nota)} />
              <time className="date">
                {new Date(a.criadoEm || a.data).toLocaleDateString()}
              </time>
            </div>
            {a.comentario && <p className="comment">{a.comentario}</p>}
          </article>
        ))}

        <div className="mf-pagination">
          <button onClick={paginaAnterior} disabled={page === 1}>Anterior</button>
          <span>Página {page}</span>
          <button onClick={proximaPagina} disabled={(avaliacoes || []).length < pageSize}>Próxima</button>
        </div>
      </section>
    </div>
  );
}
