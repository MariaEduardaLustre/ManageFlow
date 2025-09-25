import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

// Descobre a base da API (CRA ou Vite)
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE) ||
  (typeof window !== 'undefined' && window.location && window.location.hostname
    ? `http://${window.location.hostname}:3001/api`
    : 'http://localhost:3001/api');

export default function EntrarFilaPage() {
  const { token } = useParams();

  // estado de carregamento/erro + cfg pública
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [cfg, setCfg] = useState(null);

  // estado do formulário
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    rg: '',
    dddcel: '',
    nr_cel: '',
    email: '',
    dt_nasc: '',
    nr_qtdpes: 1
  });

  // feedback ao enviar
  const [sending, setSending] = useState(false);
  const [okMsg, setOkMsg] = useState('');
  const [posicao, setPosicao] = useState(null);

  // carrega config pública pelo token (ROTA CORRETA: /public/info/:token)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErro('');

        const base = API_BASE.replace(/\/$/, '');
        const url = `${base}/configuracao/public/info/${token}`;
        console.log('[EntrarFila] GET info URL =', url, 'API_BASE =', API_BASE);

        const resp = await fetch(url);
        if (!resp.ok) {
          const txt = await resp.text();
          console.warn('[EntrarFila] GET info falhou:', resp.status, txt);
          if (resp.status === 404) throw new Error('Configuração não encontrada.');
          throw new Error(txt || `Falha (HTTP ${resp.status}).`);
        }

        const data = await resp.json();
        if (!alive) return;

        // normaliza campos (array [{campo, tipo}])
        const campos = Array.isArray(data.campos) ? data.campos : [];
        const qtdeMin = Number.isFinite(Number(data.qtde_min)) ? Number(data.qtde_min) : 1;
        const qtdeMax = Number.isFinite(Number(data.qtde_max)) ? Number(data.qtde_max) : 10;

        setCfg({
          ...data,
          campos,
          qtde_min: qtdeMin,
          qtde_max: qtdeMax
        });

        setForm((prev) => ({ ...prev, nr_qtdpes: Math.min(Math.max(qtdeMin, 1), qtdeMax) }));
      } catch (e) {
        console.error('Erro ao carregar config pública:', e);
        setErro(e.message || 'Configuração não encontrada ou indisponível.');
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  // mapeia campos ativados -> quais inputs exibir
  const camposAtivos = useMemo(() => {
    if (!cfg?.campos) return {};
    const map = {};
    for (const c of cfg.campos) {
      const nome = String(c.campo || '').toLowerCase();
      if (nome.includes('cpf')) map.cpf = true;
      if (nome.includes('rg')) map.rg = true;
      if (nome.includes('telefone') || nome.includes('cel')) map.telefone = true;
      if (nome.includes('email')) map.email = true;
      if (nome.includes('nascimento') || nome === 'data') map.dt_nasc = true;
      if (nome.includes('endereço') || nome.includes('endereco')) map.endereco = true;
      if (nome.includes('qtde') || nome.includes('pessoas')) map.nr_qtdpes = true;
    }
    // CPF é obrigatório no fluxo; Nome também
    map.cpf = true;
    return map;
  }, [cfg]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const clampQtd = (v) => {
    const n = Number(v);
    const min = cfg?.qtde_min ?? 1;
    const max = cfg?.qtde_max ?? 10;
    if (!Number.isFinite(n)) return min;
    return Math.min(Math.max(n, min), max);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setOkMsg('');
    setPosicao(null);

    if (!form.nome || !form.cpf) {
      alert('Informe Nome e CPF.');
      return;
    }

    const payload = {
      nome: form.nome,
      cpf: form.cpf,
      rg: form.rg || null,
      dddcel: form.dddcel || null,
      nr_cel: form.nr_cel || null,
      email: form.email || null,
      dt_nasc: form.dt_nasc || null,
      nr_qtdpes: clampQtd(form.nr_qtdpes)
    };

    try {
      setSending(true);

      // ROTA CORRETA: /public/join/:token
      const base = API_BASE.replace(/\/$/, '');
      const url = `${base}/configuracao/public/join/${token}`;
      console.log('[EntrarFila] POST join URL =', url, 'payload =', payload);

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await resp.json().catch(() => ({}));
      console.log('[EntrarFila] POST join resp:', resp.status, data);

      if (!resp.ok) {
        if (resp.status === 404) throw new Error('Configuração não encontrada.');
        // mensagens amigáveis — mapeia erros do controller
        if (data?.erro === 'config_inactive') throw new Error('Fila inativa no momento.');
        if (data?.erro === 'config_out_of_range') throw new Error('Fora do período de vigência.');
        if (data?.erro === 'fila_blocked') throw new Error('Fila bloqueada no momento.');
        if (data?.erro === 'fila_inactive') throw new Error('Fila inativa no momento.');
        if (data?.erro === 'duplicate_today') throw new Error('Você já está nesta fila hoje.');
        throw new Error(data?.erro || `Falha ao entrar na fila (HTTP ${resp.status}).`);
      }

      setOkMsg(`Entrada realizada! Você está na posição ${data.posicao}.`);
      setPosicao(data.posicao ?? null);
    } catch (err) {
      console.error('Falha ao entrar na fila:', err);
      alert(err.message || 'Falha ao entrar na fila.');
    } finally {
      setSending(false);
    }
  };

  const copiarLink = async () => {
    const text = window.location.href;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      alert('Link copiado!');
    } catch {
      window.prompt('Copie o link:', text);
    }
  };

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.card}><p>Carregando…</p></div>
      </div>
    );
  }

  if (erro || !cfg) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.card}>
          <div style={styles.emoji}>⚠️</div>
          <h2>Configuração indisponível</h2>
          <p style={{ opacity: 0.8 }}>{erro || 'Tente novamente mais tarde.'}</p>
          <div style={{ marginTop: 16 }}>
            <Link to="/" style={styles.link}>← Voltar</Link>
          </div>
        </div>
      </div>
    );
  }

  // imagens
  const bannerUrl = cfg.img_banner?.url || '';
  // <- no controller novo vem como empresa: { logo_url }
  const logoUrl = (cfg.empresa && cfg.empresa.logo_url) || '';

  return (
    <div style={{ minHeight: '100vh', background: '#f6f7f9' }}>
      {/* topo com banner */}
      <div
        style={{
          height: 160,
          background: bannerUrl
            ? `url(${bannerUrl}) center/cover no-repeat`
            : 'linear-gradient(135deg,#111827,#1f2937)'
        }}
      />
      {/* cartão central */}
      <div style={styles.wrapper}>
        <div style={{ ...styles.card, marginTop: -64 }}>
          {/* logo sobreposto */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: -80 }}>
            <div style={{
              width: 96, height: 96, borderRadius: 9999,
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(0,0,0,0.12)', overflow: 'hidden'
            }}>
              {logoUrl ? (
                <img src={logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 28 }}>🏬</span>
              )}
            </div>
          </div>

          <h1 style={{ margin: '12px 0 0', textAlign: 'center' }}>{cfg.nome_fila || 'Fila'}</h1>
          {cfg.mensagem && (
            <p style={{ marginTop: 8, opacity: 0.8, textAlign: 'center' }}>{cfg.mensagem}</p>
          )}

          {/* infos padrão */}
          <div style={styles.infoRow}>
            <InfoPill label="Pessoas por entrada" value={`${cfg.qtde_min}–${cfg.qtde_max}`} />
            {Number.isFinite(cfg.temp_tol) && <InfoPill label="Tolerância" value={`${cfg.temp_tol} min`} />}
            <InfoPill label="Status" value={cfg.situacao === 1 ? 'Ativa' : 'Inativa'} />
          </div>

          {/* formulário */}
          <form onSubmit={onSubmit} style={{ marginTop: 12 }}>
            {/* Nome (sempre) */}
            <Field label="Nome completo" required>
              <input
                name="nome"
                type="text"
                value={form.nome}
                onChange={handleChange}
                placeholder="Seu nome"
                style={styles.input}
                required
              />
            </Field>

            {/* CPF (sempre) */}
            <Field label="CPF" required>
              <input
                name="cpf"
                type="text"
                inputMode="numeric"
                value={form.cpf}
                onChange={handleChange}
                placeholder="000.000.000-00"
                style={styles.input}
                required
              />
            </Field>

            {/* RG */}
            {camposAtivos.rg && (
              <Field label="RG">
                <input
                  name="rg"
                  type="text"
                  value={form.rg}
                  onChange={handleChange}
                  placeholder="Seu RG"
                  style={styles.input}
                />
              </Field>
            )}

            {/* Telefone (DDD + número) */}
            {camposAtivos.telefone && (
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12 }}>
                <Field label="DDD">
                  <input
                    name="dddcel"
                    type="text"
                    inputMode="numeric"
                    value={form.dddcel}
                    onChange={handleChange}
                    placeholder="11"
                    style={styles.input}
                    maxLength={3}
                  />
                </Field>
                <Field label="Celular">
                  <input
                    name="nr_cel"
                    type="text"
                    inputMode="numeric"
                    value={form.nr_cel}
                    onChange={handleChange}
                    placeholder="99999-9999"
                    style={styles.input}
                  />
                </Field>
              </div>
            )}

            {/* Email */}
            {camposAtivos.email && (
              <Field label="E-mail">
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="voce@exemplo.com"
                  style={styles.input}
                />
              </Field>
            )}

            {/* Data de nascimento */}
            {camposAtivos.dt_nasc && (
              <Field label="Data de nascimento">
                <input
                  name="dt_nasc"
                  type="date"
                  value={form.dt_nasc}
                  onChange={handleChange}
                  style={styles.input}
                />
              </Field>
            )}

            {/* Quantidade de pessoas */}
            <Field label="Quantidade de pessoas">
              <input
                name="nr_qtdpes"
                type="number"
                min={cfg.qtde_min}
                max={cfg.qtde_max}
                value={form.nr_qtdpes}
                onChange={(e) => setForm((p) => ({ ...p, nr_qtdpes: clampQtd(e.target.value) }))}
                style={styles.input}
              />
              <small style={{ opacity: 0.7 }}>
                Mín: {cfg.qtde_min} &nbsp;—&nbsp; Máx: {cfg.qtde_max}
              </small>
            </Field>

            {/* feedback de sucesso */}
            {okMsg && (
              <div style={styles.okBox}>
                <strong>{okMsg}</strong>
              </div>
            )}

            <button type="submit" style={styles.button} disabled={sending || cfg.situacao !== 1}>
              {sending ? 'Enviando…' : 'Entrar na fila'}
            </button>
          </form>

          {/* utilidades */}
          <div style={{ marginTop: 18, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button type="button" onClick={copiarLink} style={styles.ghostBtn}>Copiar link</button>
            <Link to="/" style={styles.link}>Voltar</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------ componentes utilitários ------ */
function Field({ label, required, children }) {
  return (
    <div style={{ marginTop: 12 }}>
      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
        {label} {required ? <span style={{ color: '#ef4444' }}>*</span> : null}
      </label>
      {children}
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div style={{
      padding: '6px 10px',
      borderRadius: 999,
      background: '#f1f5f9',
      border: '1px solid #e2e8f0',
      fontSize: 13
    }}>
      <strong>{label}:</strong> <span style={{ opacity: 0.9 }}>{value}</span>
    </div>
  );
}

/* ------ estilos ------ */
const styles = {
  wrapper: {
    display: 'flex',
    justifyContent: 'center',
    padding: '24px 16px'
  },
  card: {
    width: '100%',
    maxWidth: 560,
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
    padding: 20
  },
  emoji: { fontSize: 42 },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    outline: 'none'
  },
  button: {
    marginTop: 14,
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: 'none',
    background: '#111827',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600
  },
  ghostBtn: {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    background: '#fff',
    cursor: 'pointer'
  },
  link: { textDecoration: 'none', color: '#2563eb', alignSelf: 'center' },
  infoRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 8,
    justifyContent: 'center'
  },
  okBox: {
    marginTop: 10,
    padding: '10px 12px',
    background: '#ecfdf5',
    color: '#065f46',
    border: '1px solid #a7f3d0',
    borderRadius: 10
  }
};
