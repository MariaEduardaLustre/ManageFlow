import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FaStar } from 'react-icons/fa';
import './AvaliacaoEmpresaPage.css';

/**
 * Resolve a mesma base usada em EmpresaPublicaPorToken
 */
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE) ||
  (typeof window !== 'undefined' && window.location && window.location.hostname
    ? `http://${window.location.hostname}:3001/api`
    : 'http://localhost:3001/api');

/** Lê querystring (?dt=...&idFila=...&idCliente=...) */
function useQS(search) {
  return useMemo(() => {
    const sp = new URLSearchParams(search);
    return {
      dtMovto: sp.get('dt') || '',
      idFila: sp.get('idFila') || '',
      idCliente: sp.get('idCliente') || '',
    };
  }, [search]);
}

export default function AvaliacaoEmpresaPage() {
  const { token } = useParams();
  const location = useLocation();
  const { dtMovto, idFila, idCliente } = useQS(location.search);

  const api = useMemo(() => axios.create({ baseURL: API_BASE }), []);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const [empresa, setEmpresa] = useState(null); // { id, nome, logo }
  const [clienteNome, setClienteNome] = useState('');

  const [nota, setNota] = useState(0);
  const [hoverNota, setHoverNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const defaultAvatar = '/imagens/avatar-default.png';

  /**
   * Busca os dados da empresa pelo token — EXATAMENTE como a outra página faz:
   * GET /public/empresa/by-token/:token -> { empresa: { id, nome, logo }, resumo, avaliacoes }
   */
  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        setCarregando(true);
        setErro(null);

        const { data } = await api.get(`/public/empresa/by-token/${encodeURIComponent(token)}`);
        // A estrutura usada na página pública:
        // const { empresa, resumo, avaliacoes } = data;
        // Aqui precisamos só da empresa (id/nome/logo)
        if (!data || !data.empresa) {
          throw new Error('Empresa não encontrada para este token.');
        }

        // Garante chaves padronizadas
        const emp = data.empresa;
        setEmpresa({
          id: emp.id || emp.ID || emp.idEmpresa || emp.ID_EMPRESA || null,
          nome: emp.nome || emp.NOME || emp.nomeEmpresa || emp.NOME_EMPRESA || 'Empresa',
          logo: emp.logo || emp.LOGO || emp.LOGO_URL || emp.img_perfil || '',
        });

        // (Opcional) Buscar nome do cliente se vieram parâmetros
        if (dtMovto && idFila && idCliente) {
          try {
            const { data: cli } = await api.get('/avaliacoes/info-cliente', {
              params: { token, dtMovto, idFila, idCliente },
            });
            if (cli?.clienteNome) setClienteNome(cli.clienteNome);
          } catch {
            // silencioso — segue sem nome
          }
        }
      } catch (e) {
        setErro(e?.response?.data?.detail || e?.response?.data?.error || e.message);
      } finally {
        setCarregando(false);
      }
    }
    load();
  }, [api, token, dtMovto, idFila, idCliente]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (nota === 0) {
      alert('Por favor, selecione uma nota de 1 a 5 estrelas.');
      return;
    }
    try {
      setSubmitting(true);
      setErro(null);
      await api.post('/avaliacoes', {
        token,
        nota,
        comentario,
        clienteNome: clienteNome || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setErro(err?.response?.data?.detail || err?.response?.data?.error || 'Ocorreu um erro ao enviar sua avaliação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (carregando) return <div className="avaliacao-container"><p>Carregando...</p></div>;
  if (erro) return <div className="avaliacao-container"><div className="avaliacao-card error">Erro: {erro}</div></div>;

  if (success) {
    return (
      <div className="avaliacao-container" key="success-view">
        <div className="avaliacao-card">
          <div className="logo-circle">
            {empresa?.logo ? (
              <img
                src={empresa.logo}
                alt={empresa?.nome || 'Empresa'}
                onError={(e) => { e.currentTarget.src = defaultAvatar; }}
              />
            ) : '⭐'}
          </div>
          <h1>Obrigado!</h1>
          <p>Sua avaliação sobre a <strong>{empresa?.nome}</strong> foi registrada com sucesso.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="avaliacao-container" key="form-view">
      <div className="avaliacao-card">
        <div className="logo-circle">
          {empresa?.logo ? (
            <img
              src={empresa.logo}
              alt={empresa?.nome || 'Empresa'}
              onError={(e) => { e.currentTarget.src = defaultAvatar; }}
            />
          ) : '🏢'}
        </div>

        <h1>
          {clienteNome ? <>Olá, {clienteNome}! </> : null}
          Avalie {empresa?.nome}
        </h1>
        <p>Sua opinião é muito importante para nós!</p>

        <form onSubmit={handleSubmit}>
          <div className="estrelas-container">
            {[...Array(5)].map((_, index) => {
              const notaEstrela = index + 1;
              return (
                <FaStar
                  key={notaEstrela}
                  className="estrela"
                  color={notaEstrela <= (hoverNota || nota) ? '#ffc107' : '#e4e5e9'}
                  size={40}
                  onClick={() => setNota(notaEstrela)}
                  onMouseEnter={() => setHoverNota(notaEstrela)}
                  onMouseLeave={() => setHoverNota(0)}
                />
              );
            })}
          </div>

          <textarea
            className="comentario-textarea"
            placeholder="Deixe um comentário (opcional)..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />

          <button type="submit" className="submit-button" disabled={submitting}>
            {submitting ? 'Enviando...' : 'Enviar Avaliação'}
          </button>
        </form>
      </div>
    </div>
  );
}
