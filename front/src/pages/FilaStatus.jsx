// src/pages/FilaStatus/FilaStatus.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "./FilaStatus.css";

const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE_URL) ||
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_API_BASE) ||
  (typeof window !== "undefined" &&
  window.location &&
  window.location.hostname
    ? `http://${window.location.hostname}:3001/api`
    : "http://localhost:3001/api");

const LS_TICKET = "mf.queueEntry";

export default function FilaStatus() {
  const { token } = useParams();
  const navigate = useNavigate();

  // Visual (banner/logo)
  const [cfg, setCfg] = useState(null);

  // Status
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [empresa, setEmpresa] = useState(null);
  const [fila, setFila] = useState(null);
  const [posicao, setPosicao] = useState(null);
  const [tempoMedio, setTempoMedio] = useState(null);
  const [podeSair, setPodeSair] = useState(false);
  const [leftOk, setLeftOk] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const ticketRef = useRef(null);
  const socketRef = useRef(null);
  const pollRef = useRef(null);
  const joinedRoomRef = useRef(null);

  useEffect(() => {
    const raw = localStorage.getItem(LS_TICKET);
    if (raw) {
      try {
        const t = JSON.parse(raw);
        if (t?.tokenFila === token) ticketRef.current = t;
      } catch {}
    }
  }, [token]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const base = API_BASE.replace(/\/$/, "");
        const url = `${base}/configuracao/public/info/${token}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("Configuração pública não encontrada.");
        const data = await resp.json();
        if (!alive) return;
        setCfg(data);
      } catch (e) {
        console.warn("[FilaStatus] Falha ao carregar visual:", e);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const fetchStatus = async () => {
    try {
      setErro("");
      const base = API_BASE.replace(/\/$/, "");
      const url = new URL(`${base}/configuracao/public/status/${token}`);
      if (ticketRef.current?.clienteFilaId) {
        // ambos aceitos pelo back
        url.searchParams.set("idCliente", ticketRef.current.clienteFilaId);
      }
      const resp = await fetch(url.toString());
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || "Falha ao obter status.");

      setEmpresa(data.empresa || null);
      setFila(data.fila || null);
      setPosicao(Number.isFinite(data.posicaoCliente) ? data.posicaoCliente : null);
      setTempoMedio(Number.isFinite(data.mediaEsperaMin) ? data.mediaEsperaMin : null);
      setPodeSair(!!data.podeSair);
      setLastUpdate(new Date());

      const t = {
        tokenFila: token,
        idEmpresa: data.idEmpresa ?? ticketRef.current?.idEmpresa ?? null,
        idFila: data.idFila ?? ticketRef.current?.idFila ?? null,
        dtMovto: data.dtMovto ?? ticketRef.current?.dtMovto ?? null,
        clienteFilaId: ticketRef.current?.clienteFilaId ?? data.clienteFilaId ?? null
      };
      ticketRef.current = t;
      localStorage.setItem(LS_TICKET, JSON.stringify(t));

      // 👇 redireciona se estiver "chamado" (vindo do back)
      if (data.isChamado === true) {
        navigate(`/fila/${token}/chamado`);
        return;
      }

      if (socketRef.current && socketRef.current.connected && t.idEmpresa && joinedRoomRef.current !== t.idEmpresa) {
        socketRef.current.emit("dashboard:join", { sala: `empresa:${t.idEmpresa}` });
        joinedRoomRef.current = t.idEmpresa;
      }
    } catch (e) {
      setErro(e.message || "Não foi possível carregar o status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    const SOCKET_URL =
      (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_SOCKET_URL) ||
      (typeof process !== "undefined" &&
        process.env &&
        process.env.REACT_APP_SOCKET_URL) ||
      API_BASE.replace("/api", "");

    socketRef.current = io(SOCKET_URL, { transports: ["websocket"] });

    socketRef.current.on("connect", () => {
      const sala = ticketRef.current?.idEmpresa
        ? `empresa:${ticketRef.current.idEmpresa}`
        : null;
      if (sala) {
        socketRef.current.emit("dashboard:join", { sala });
        joinedRoomRef.current = ticketRef.current.idEmpresa;
      }
    });

    socketRef.current.on("cliente_atualizado", (p) => {
      const t = ticketRef.current;
      if (!t) return;

      const isSameClient = p?.clienteFilaId && t.clienteFilaId && p.clienteFilaId === t.clienteFilaId;
      const isSameQueue  = p?.idEmpresa === t.idEmpresa && p?.idFila === t.idFila;

      // 🔔 se eu fui chamado via socket => redireciona
      if (isSameClient && (p?.acao === "chamado" || p?.acao === "chamar")) {
        navigate(`/fila/${token}/chamado`);
        return;
      }

      if (isSameClient || isSameQueue) {
        fetchStatus();
      }
    });

    socketRef.current.on("dashboard:tick", () => fetchStatus());

    pollRef.current = setInterval(fetchStatus, 10000);

    const onFocus = () => fetchStatus();
    const onVis = () => { if (document.visibilityState === "visible") fetchStatus(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (socketRef.current) try { socketRef.current.disconnect(); } catch {}
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const sairDaFila = async () => {
    if (!ticketRef.current?.clienteFilaId) return;
    if (!window.confirm("Tem certeza que deseja sair da fila?")) return;
    try {
      const base = API_BASE.replace(/\/$/, "");
      const resp = await fetch(`${base}/configuracao/public/leave/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idCliente: ticketRef.current.clienteFilaId })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Falha ao sair da fila.");

      localStorage.removeItem(LS_TICKET);
      setLeftOk(true);
      setTimeout(() => navigate(`/entrar-fila/${token}`), 1000);
    } catch (e) {
      setErro(e.message || "Não foi possível remover você da fila.");
    }
  };

  const ring = useMemo(() => {
    const size = 220;
    const r = 90;
    const cx = size / 2;
    const cy = size / 2;

    const ticks = new Array(60).fill(0).map((_, i) => {
      const angle = (i / 60) * 2 * Math.PI;
      const x1 = cx + (r + 6) * Math.cos(angle);
      const y1 = cy + (r + 6) * Math.sin(angle);
      const x2 = cx + (r + (i % 2 === 0 ? 16 : 10)) * Math.cos(angle);
      const y2 = cy + (r + (i % 2 === 0 ? 16 : 10)) * Math.sin(angle);
      const on = i % 3 !== 0;
      return (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={on ? "#2f6bff" : "#E9ECF2"} strokeWidth="2" strokeLinecap="round" />
      );
    });

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g>{ticks}</g>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F7F8FA" strokeWidth="12" />
        <text x={cx} y={cy + 14} textAnchor="middle"
          fontFamily="Poppins, system-ui, -apple-system, Segoe UI, Roboto, Arial"
          fontSize="88" fontWeight="700" fill="#000">
          {Number.isFinite(posicao) ? posicao : "–"}
        </text>
      </svg>
    );
  }, [posicao]);

  const bannerUrl = cfg?.img_banner?.url || "";
  const logoUrl = (cfg?.empresa && cfg.empresa.logo_url) || "";
  const tituloTopo = cfg?.nome_fila || "Fila";
  const mensagemTopo = cfg?.mensagem || "";

  return (
    <div className="mf-status">
      <div
        className="mf-status__hero"
        style={{
          background: bannerUrl
            ? `url(${bannerUrl}) center/cover no-repeat`
            : "linear-gradient(135deg,#111827,#1f2937)"
        }}
      />
      <div className="mf-status__logoDock">
        <div className="mf-status__logoCircle">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" />
          ) : (
            <span>🏬</span>
          )}
        </div>
      </div>

      <h1 className="mf-status__heading">{tituloTopo}</h1>
      {mensagemTopo && <p className="mf-status__subtitle">{mensagemTopo}</p>}

      <div className="mf-status__wrap">
        <h2 className="mf-status__title">Sua posição é</h2>

        <div className="mf-status__ring">{ring}</div>

        <div className="mf-status__kpis">
          <div className="mf-status__kpi-title">Tempo médio de espera</div>
          <div className="mf-status__kpi-sub">
            {Number.isFinite(tempoMedio) ? `Estimado ${tempoMedio} min` : "—"}
          </div>
        </div>

        {erro && <div className="mf-status__alert">{erro}</div>}
        {leftOk && <div className="mf-status__ok">Você saiu da fila. Redirecionando…</div>}

        {podeSair && (
          <button
            className="mf-status__btn mf-status__btn--danger"
            onClick={sairDaFila}
            disabled={!ticketRef.current?.clienteFilaId}
          >
            Sair da Fila
          </button>
        )}

        <div className="mf-status__footer">
          <span className="mf-status__hint">
            {lastUpdate ? `Atualizado às ${lastUpdate.toLocaleTimeString()}` : "Carregando…"}
          </span>
          <Link className="mf-status__back" to={`/entrar-fila/${token}`}>Voltar</Link>
        </div>
      </div>

      {loading && <div className="mf-status__loading">Carregando…</div>}
    </div>
  );
}
