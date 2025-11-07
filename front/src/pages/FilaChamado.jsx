// src/pages/FilaChamado/FilaChamado.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { io } from "socket.io-client";
import "./FilaChamado.css";

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

function makeAvaliacaoToken(idEmpresa) {
  return `AV-${idEmpresa}-TOKEN`;
}

function toISODate(date) {
  // retorna YYYY-MM-DD no fuso do navegador
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  return `${y}-${m}-${dd}`;
}

export default function FilaChamado() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [cfg, setCfg] = useState(null);
  const [erro, setErro] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const ticketRef = useRef(null);
  const socketRef = useRef(null);

  // carrega ticket salvo
  useEffect(() => {
    const raw = localStorage.getItem(LS_TICKET);
    if (!raw) {
      navigate(`/entrar-fila/${token}`);
      return;
    }
    try {
      const t = JSON.parse(raw);
      if (!t?.clienteFilaId || t?.tokenFila !== token) {
        navigate(`/entrar-fila/${token}`);
        return;
      }
      ticketRef.current = t;
    } catch {
      navigate(`/entrar-fila/${token}`);
    }
  }, [token, navigate]);

  // carrega visual (banner/logo + textos)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const base = API_BASE.replace(/\/$/, "");
        const resp = await fetch(`${base}/configuracao/public/info/${token}`);
        if (!resp.ok) throw new Error("Configuração não encontrada.");
        const data = await resp.json();
        if (!alive) return;
        setCfg(data);
      } catch (e) {
        setErro(e.message || "Falha ao carregar visual.");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  // monta URL de avaliação com token + querystring do cliente (se disponível)
  const buildAvaliacaoUrl = () => {
    const t = ticketRef.current || {};
    const idEmpresa = t.idEmpresa || t.ID_EMPRESA;
    const idCliente = t.clienteFilaId || t.ID_CLIENTE;
    const idFila = t.idFila || t.filaId || t.ID_FILA;
    const dtMovto =
      t.dtMovto || t.dataMovimento || t.DT_MOVTO || toISODate(new Date());

    if (!idEmpresa) {
      // fallback: só vai sem QS (a página ainda funciona, só não saúda o cliente)
      return `/avaliar/${makeAvaliacaoToken(0)}`;
    }

    const tokenAvaliacao = makeAvaliacaoToken(idEmpresa);

    // monta QS apenas se tivermos todos os campos (para puxar info do cliente)
    const haveQS = idCliente && idFila && dtMovto;
    const qs = haveQS
      ? `?dt=${encodeURIComponent(dtMovto)}&idFila=${encodeURIComponent(
          idFila
        )}&idCliente=${encodeURIComponent(idCliente)}`
      : "";

    return `/avaliar/${tokenAvaliacao}${qs}`;
  };

  // socket — se virar “atendido”, redireciona para avaliação; removido volta pra entrada
  useEffect(() => {
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
      if (sala) socketRef.current.emit("dashboard:join", { sala });
    });

    socketRef.current.on("cliente_atualizado", (p) => {
      const t = ticketRef.current;
      if (!t) return;
      const sameClient =
        p?.clienteFilaId && t.clienteFilaId && p.clienteFilaId === t.clienteFilaId;

      if (!sameClient) return;

      // Se o staff marcou como 'atendido' (apresentado), abre a avaliação
      if (p?.acao === "atendido") {
        const url = buildAvaliacaoUrl();
        // limpa o ticket (se esse for o fluxo desejado)
        localStorage.removeItem(LS_TICKET);
        navigate(url);
        return;
      }

      // Se removido/não compareceu/desistiu → volta pra entrada
      if (["removido", "nao_compareceu", "desistiu"].includes(p?.acao)) {
        localStorage.removeItem(LS_TICKET);
        navigate(`/entrar-fila/${token}`);
      }
    });

    return () => {
      if (socketRef.current)
        try {
          socketRef.current.disconnect();
        } catch {}
    };
  }, [token, navigate]);

  const confirmarPresenca = async () => {
    if (!ticketRef.current?.clienteFilaId) return;
    try {
      setErro("");
      setOkMsg("");
      const base = API_BASE.replace(/\/$/, "");
      const resp = await fetch(`${base}/configuracao/public/confirm/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idCliente: ticketRef.current.clienteFilaId }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Falha ao confirmar presença.");
      setOkMsg("Presença confirmada! Aguarde no local indicado 👌");
    } catch (e) {
      setErro(e.message || "Não foi possível confirmar presença.");
    }
  };

  const sairDaFila = async () => {
    if (!ticketRef.current?.clienteFilaId) return;
    if (!window.confirm("Tem certeza que deseja sair da fila?")) return;
    try {
      setErro("");
      setOkMsg("");
      const base = API_BASE.replace(/\/$/, "");
      const resp = await fetch(`${base}/configuracao/public/leave/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idCliente: ticketRef.current.clienteFilaId }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Falha ao sair da fila.");
      localStorage.removeItem(LS_TICKET);
      navigate(`/entrar-fila/${token}?left=1`);
    } catch (e) {
      setErro(e.message || "Não foi possível remover você da fila.");
    }
  };

  const irAvaliar = () => {
    const url = buildAvaliacaoUrl();
    navigate(url);
  };

  const bannerUrl = cfg?.img_banner?.url || "";
  const logoUrl = (cfg?.empresa && cfg.empresa.logo_url) || "";
  const tituloTopo = cfg?.nome_fila || "Fila";
  const mensagemTopo = cfg?.mensagem || "";

  return (
    <div className="mf-called">
      <div
        className="mf-called__hero"
        style={{
          background: bannerUrl
            ? `url(${bannerUrl}) center/cover no-repeat`
            : "linear-gradient(135deg,#111827,#1f2937)"
        }}
      />
      <div className="mf-called__logoDock">
        <div className="mf-called__logoCircle">
          {logoUrl ? <img src={logoUrl} alt="logo" /> : <span>🏬</span>}
        </div>
      </div>

      <h1 className="mf-called__heading">{tituloTopo}</h1>
      {mensagemTopo && <p className="mf-called__subtitle">{mensagemTopo}</p>}

      <div className="mf-called__wrap">
        <div className="mf-called__card">
          <div className="mf-called__icon">🔔</div>
          <h2 className="mf-called__title">Você foi chamado!</h2>
          <p className="mf-called__text">
            Dirija-se ao local indicado no painel ou aguarde instruções da equipe.
          </p>

          {erro && <div className="mf-called__alert">{erro}</div>}
          {okMsg && <div className="mf-called__ok">{okMsg}</div>}

          <div className="mf-called__actions">
            <button className="mf-called__btn" onClick={confirmarPresenca}>
              Já estou no local
            </button>

            {/* TROCA: "Ver minha posição" -> "Avaliar atendimento" */}
            <button className="mf-called__ghost" onClick={irAvaliar}>
              Avaliar atendimento
            </button>
          </div>

          <button
            className="mf-called__btn mf-called__btn--danger"
            onClick={sairDaFila}
          >
            Sair da fila
          </button>
        </div>
      </div>

      {loading && <div className="mf-called__loading">Carregando…</div>}
    </div>
  );
}
