import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import Menu from '../Menu/Menu';
import './FilaLista.css';
import { useTranslation } from 'react-i18next';
import { socket } from '../../services/socket';

const REFRESH_MS = 10000;

/* Utils de data */
const pad2 = (n) => String(n).padStart(2, '0');

const yyyymmdd = (val) => {
  if (val === null || val === undefined || val === '') return '';
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const yy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    return `${yy}${mm}${dd}`;
  }
  const s = String(val);
  if (/^\d{8}$/.test(s)) return s;
  return '';
};

const hojeYmd = () => {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yy}${mm}${dd}`;
};

const isAtivo = (valor) => {
  if (valor === true) return true;
  const n = Number(valor);
  return n === 1;
};

const FilaLista = ({ onLogout }) => {
  const { t, i18n } = useTranslation();

  // Locale atual para formatação de datas
  const idiomaAtual = i18n.language || 'pt-BR';
  const formatadorData = useMemo(
    () =>
      new Intl.DateTimeFormat(
        idiomaAtual.startsWith('en') ? 'en-US' : 'pt-BR',
        { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' }
      ),
    [idiomaAtual]
  );

  // Substitui a antiga formatarDataParaExibicao usando Intl + fallback yyyymmdd
  const formatarDataExibicao = (val) => {
    if (val === null || val === undefined || val === '') return 'N/A';
    const d = new Date(val);
    if (!isNaN(d.getTime())) return formatadorData.format(d);
    const s = String(val);
    if (/^\d{8}$/.test(s)) {
      const yy = s.slice(0, 4), mm = s.slice(4, 6), dd = s.slice(6, 8);
      const manual = new Date(`${yy}-${mm}-${dd}T00:00:00Z`);
      return isNaN(manual.getTime()) ? s : formatadorData.format(manual);
    }
    return s;
  };

  const [filasRaw, setFilasRaw] = useState([]);
  const [contagens, setContagens] = useState({}); // { [ID_FILA]: { aguardando?: number, chamadas?: number } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const navigate = useNavigate();

  const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada') || 'null');
  const idEmpresa = empresaSelecionada?.ID_EMPRESA;

  const hoje = useMemo(() => hojeYmd(), []);
  const abortRef = useRef(null);
  const fetchingRef = useRef(false);
  const intervalRef = useRef(null);
  const joinedRoomRef = useRef(false);

  const refetch = async () => {
    if (!idEmpresa) return;
    if (fetchingRef.current) return; // evita overlap
    fetchingRef.current = true;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    try {
      // ✅ Front-end envia requisição sem parâmetros para que o Back-end envie TODAS as filas da empresa.
      const { data } = await api.get(`/empresas/filas/${idEmpresa}`, {
        params: { /* NENHUM PARÂMETRO */ }, 
        signal: controller.signal,
      });
      setFilasRaw(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch (err) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        console.error('Erro ao buscar filas:', err);
        setError(t('filaLista.mensagens.erroCarregar'));
      }
    } finally {
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (!idEmpresa) {
      navigate('/escolher-empresa');
      return;
    }
    setLoading(true);
    refetch().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idEmpresa, navigate]);

  /**
   * 🚨 FILTRO DESATIVADO: Exibe TODAS as filas retornadas (ativas, inativas, bloqueadas).
   */
  const filasHojeAtivas = useMemo(() => {
    return (filasRaw || []).filter((f) => {
      // Apenas retorna TRUE para que todas as filas passem pelo filtro.
      return true; 
    });
  }, [filasRaw, hoje]);

  // Buscar contagens (fallback) caso a API não traga
  useEffect(() => {
    // Este useEffect continua buscando contagens para todas as filas na lista (ativas e inativas)
    const ids = filasHojeAtivas.map((f) => f.ID_FILA);
    if (ids.length === 0) return;

    let cancelled = false;

    const fetchCount = async (idFila, status, key) => {
      try {
        const { data } = await api.get(`/filas/${idFila}/count`, {
          params: { status, data: hoje },
        });
        if (!cancelled) {
          const count = Number(data?.count ?? 0);
          setContagens((prev) => ({
            ...prev,
            [idFila]: { ...(prev[idFila] || {}), [key]: count },
          }));
        }
      } catch {
        if (!cancelled) {
          setContagens((prev) => ({
            ...prev,
            [idFila]: { ...(prev[idFila] || {}), [key]: 0 },
          }));
        }
      }
    };

    (async () => {
      await Promise.all(
        ids.map(async (idFila) => {
          const f = filasHojeAtivas.find((x) => x.ID_FILA === idFila);
          // Aguardando (SIT = 0)
          if (f.QTDE_AGUARDANDO === undefined || f.QTDE_AGUARDANDO === null) {
            await fetchCount(idFila, 'aguardando', 'aguardando');
          }
          // Chamadas não apresentadas (SIT = 3)
          if (f.QTDE_CHAMADAS === undefined || f.QTDE_CHAMADAS === null) {
            await fetchCount(idFila, 'chamadas', 'chamadas');
          }
        })
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [filasHojeAtivas, hoje]);

  // Socket.io + Interval fallback
  useEffect(() => {
    if (!idEmpresa) return;

    if (!socket.connected) {
      try {
        socket.connect();
      } catch {}
    }

    if (!joinedRoomRef.current) {
      socket.emit('dashboard:join', { idEmpresa });
      joinedRoomRef.current = true;
    }

    const onTick = () => refetch();
    const onClienteAtualizado = (payload) => {
      if (!payload || Number(payload.idEmpresa) !== Number(idEmpresa)) return;
      refetch();
    };
    const onReconnect = () => {
      socket.emit('dashboard:join', { idEmpresa });
      refetch();
    };

    socket.on('dashboard:tick', onTick);
    socket.on('cliente_atualizado', onClienteAtualizado);
    socket.io.on('reconnect', onReconnect);

    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        refetch();
      }, REFRESH_MS);
    }

    return () => {
      socket.off('dashboard:tick', onTick);
      socket.off('cliente_atualizado', onClienteAtualizado);
      socket.io.off('reconnect', onReconnect);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      socket.emit('dashboard:leave', { idEmpresa });
      joinedRoomRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idEmpresa]);

  return (
    <div className="home-container">
      <Menu onLogout={onLogout} />

      <main className="filas-list-page main-content">
        <section className="fila-header-card">
          <div className="fila-header-row">
            <h2 className="fila-header-title">{t('filaLista.titulo')}</h2>

            <div className="fila-header-meta">
              {lastUpdated ? (
                <span className="mf-last-updated">
                  {(t('geral.atualizadoEm') || 'Atualizado às')}{' '}
                  {new Date(lastUpdated).toLocaleTimeString(
                    idiomaAtual.startsWith('en') ? 'en-US' : 'pt-BR'
                  )}
                </span>
              ) : null}
            </div>
          </div>
        </section>
        <section className="filas-section">

          {loading && <p>{t('filaLista.mensagens.carregando')}</p>}
          {error && <p className="fila-lista-error">{error}</p>}

          {!loading && filasHojeAtivas.length === 0 && !error && (
            <p>{t('filaLista.mensagens.nenhumaFila') || 'Nenhuma fila para hoje.'}</p>
          )}

          {!loading && filasHojeAtivas.length > 0 && (
            <table className="filas-table">
              <thead>
                <tr>
                  <th>{t('filaLista.tabela.nomeFila')}</th>
                  <th>{t('filaLista.tabela.dataInicio')}</th>
                  <th>{t('filaLista.tabela.aguardando')}</th>
                  <th>{t('filaLista.tabela.chamadas') || 'Chamados'}</th>
                  <th>{t('filaLista.tabela.bloqueada')}</th>
                  <th>{t('filaLista.tabela.situacao') || 'Situação'}</th> 
                </tr>
              </thead>
              <tbody>
                {filasHojeAtivas.map((fila) => {
                  const dtMovto = yyyymmdd(fila.DT_MOVTO) || hoje;

                  const aguardando =
                    fila.QTDE_AGUARDANDO !== undefined && fila.QTDE_AGUARDANDO !== null
                      ? Number(fila.QTDE_AGUARDANDO) || 0
                      : (contagens[fila.ID_FILA]?.aguardando ?? 0);

                  const chamadas =
                    fila.QTDE_CHAMADAS !== undefined && fila.QTDE_CHAMADAS !== null
                      ? Number(fila.QTDE_CHAMADAS) || 0
                      : (contagens[fila.ID_FILA]?.chamadas ?? 0);
                  
                  // Adicionando flags de status para estilização e exibição
                  const isBlocked = isAtivo(fila.BLOCK);
                  const isActive = isAtivo(fila.SITUACAO);
                  
                  const rowStyle = {
                      cursor: 'pointer',
                      // Destaca inativas (incluindo as bloqueadas que ficam inativas)
                      backgroundColor: isActive ? 'inherit' : '#f0f0f0',
                      color: isActive ? 'inherit' : '#999',
                  };

                  return (
                    <tr
                      key={`${fila.ID_FILA}-${dtMovto}`}
                      onClick={() =>
                        navigate(`/gestao-fila/${fila.ID_EMPRESA}/${dtMovto}/${fila.ID_FILA}`)
                      }
                      style={rowStyle}
                    >
                      <td>{fila.NOME_FILA}</td>
                      <td>{formatarDataExibicao(fila.DT_INI)}</td>
                      <td>{aguardando}</td>
                      <td>{chamadas}</td>
                      <td>{isBlocked ? t('geral.sim') : t('geral.nao')}</td>
                      <td>{isActive ? t('geral.ativa') || 'Ativa' : t('geral.inativa') || 'Inativa'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
};

export default FilaLista;