// src/pages/AvaliacaoEmpresaPage/AvaliacaoEmpresaPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { FaStar } from 'react-icons/fa';
import './AvaliacaoEmpresaPage.css';

const AvaliacaoEmpresaPage = () => {
  const { token } = useParams();
  const location = useLocation();

  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [nota, setNota] = useState(0);
  const [hoverNota, setHoverNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // NOVO: dados do cliente (opcionais)
  const [clienteNome, setClienteNome] = useState('');

  // Lê querystring: ?dt=YYYY-MM-DD&idFila=...&idCliente=...
  function getQS() {
    const sp = new URLSearchParams(location.search);
    const dtMovto = sp.get('dt') || '';
    const idFila = sp.get('idFila') || '';
    const idCliente = sp.get('idCliente') || '';
    return { dtMovto, idFila, idCliente };
  }

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError('');

        // 1) Info da empresa pelo token
        const { data: emp } = await api.get(`/avaliacoes/info-empresa/${token}`);
        // compat: emp pode vir {nomeEmpresa, logo} ou {NOME_EMPRESA, LOGO}
        const empresaNormalizada = {
          idEmpresa: emp.idEmpresa || emp.ID_EMPRESA,
          nomeEmpresa: emp.nomeEmpresa || emp.NOME_EMPRESA,
          logo: emp.logo || emp.LOGO,
        };
        setEmpresa(empresaNormalizada);

        // 2) Se vieram dados do cliente na URL, buscar nome para saudar e enviar junto
        const { dtMovto, idFila, idCliente } = getQS();
        if (dtMovto && idFila && idCliente) {
          try {
            const { data: cli } = await api.get('/avaliacoes/info-cliente', {
              params: { token, dtMovto, idFila, idCliente }
            });
            if (cli?.clienteNome) setClienteNome(cli.clienteNome);
          } catch (e) {
            // Se não achar, segue sem nome
            console.warn('Cliente não encontrado para os parâmetros informados.', e?.response?.data || e.message);
          }
        }
      } catch (err) {
        setError('Link de avaliação inválido ou a empresa não foi encontrada.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [token, location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (nota === 0) {
      alert('Por favor, selecione uma nota de 1 a 5 estrelas.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/avaliacoes', {
        token,
        nota,
        comentario,
        // envia o clienteNome quando tivermos
        clienteNome: clienteNome || undefined
      });
      setSuccess(true);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Ocorreu um erro ao enviar sua avaliação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="avaliacao-container"><p>Carregando...</p></div>;
  if (error) return <div className="avaliacao-container"><div className="avaliacao-card error">{error}</div></div>;

  if (success) {
    return (
      <div className="avaliacao-container" key="success-view">
        <div className="avaliacao-card">
          <div className="logo-circle">
            {empresa?.logo ? <img src={empresa.logo} alt={empresa.nomeEmpresa} /> : '⭐'}
          </div>
          <h1>Obrigado!</h1>
          <p>Sua avaliação sobre a <strong>{empresa?.nomeEmpresa}</strong> foi registrada com sucesso.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="avaliacao-container" key="form-view">
      <div className="avaliacao-card">
        <div className="logo-circle">
          {empresa?.logo ? <img src={empresa.logo} alt={empresa.nomeEmpresa} /> : '🏢'}
        </div>

        <h1>
          {clienteNome ? <>Olá, {clienteNome}! </> : null}
          Avalie {empresa?.nomeEmpresa}
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
};

export default AvaliacaoEmpresaPage;
