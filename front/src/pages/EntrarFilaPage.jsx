// front/src/pages/EntrarFilaPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

// Descobre a base da API (CRA ou Vite)
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE) ||
  (typeof window !== 'undefined' && window.location && window.location.hostname
    ? `http://${window.location.hostname}:3001/api`
    : 'http://localhost:3001/api');

const LS_TICKET = 'mf.queueEntry';

/* Helpers CPF (front) */
function onlyDigits(v = '') {
  return String(v).replace(/\D+/g, '');
}
function formatCpf(digits = '') {
  const d = onlyDigits(digits).padEnd(11, ' ');
  // 000.000.000-00 (apenas exibição)
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`.replace(/[ .-] ?$/g,'');
}
function isValidCpf(cpf) {
  const s = onlyDigits(cpf);
  if (s.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(s)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum += parseInt(s.substring(i-1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(s.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(s.substring(i-1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(s.substring(10, 11))) return false;
  return true;
}

export default function EntrarFilaPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  // estado de carregamento/erro + cfg pública
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [cfg, setCfg] = useState(null);

  // estado do formulário
  const [form, setForm] = useState({
    nome: '',
    cpfDigits: '',   // <- sempre só dígitos
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

  // estado de localização (exibição opcional)
  const [locStatus, setLocStatus] = useState(null); // 'checking' | 'allowed' | 'denied' | 'out_of_radius' | null
  const [locInfo, setLocInfo] = useState(null); // {distanceText, maxKm} | null

  // carrega config pública pelo token (ROTA: /configuracao/public/info/:token)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErro('');
        setLocStatus(null);
        setLocInfo(null);

        const base = API_BASE.replace(/\/$/, '');
        const url = `${base}/configuracao/public/info/${token}`;

        const resp = await fetch(url);
        if (!resp.ok) {
          const txt = await resp.text();
          if (resp.status === 404) throw new Error('Configuração não encontrada.');
          throw new Error(txt || `Falha (HTTP ${resp.status}).`);
        }

        const data = await resp.json();
        if (!alive) return;

        const campos = Array.isArray(data.campos) ? data.campos : [];
        const qtdeMin = Number.isFinite(Number(data.qtde_min)) ? Number(data.qtde_min) : 1;
        const qtdeMax = Number.isFinite(Number(data.qtde_max)) ? Number(data.qtde_max) : 10;

        setCfg({ ...data, campos, qtde_min: qtdeMin, qtde_max: qtdeMax });
        setForm((prev) => ({ ...prev, nr_qtdpes: Math.min(Math.max(qtdeMin, 1), qtdeMax) }));
      } catch (e) {
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
    map.cpf = true; // obrigatório
    return map;
  }, [cfg]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
      // usuário digita livremente, mas guardamos apenas dígitos
      setForm((p) => ({ ...p, cpfDigits: onlyDigits(value).slice(0, 11) }));
      return;
    }
    setForm((p) => ({ ...p, [name]: value }));
  };

  const clampQtd = (v) => {
    const n = Number(v);
    const min = cfg?.qtde_min ?? 1;
    const max = cfg?.qtde_max ?? 10;
    if (!Number.isFinite(n)) return min;
    return Math.min(Math.max(n, min), max);
  };

  // helper: promisificar geolocalização
  const getCurrentPosition = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada no dispositivo.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

  // valida a posição do cliente no backend quando exigido
  const validateLocationIfNeeded = async () => {
    if (!cfg?.permitir_localizacao) return { allowed: true, coords: null, distanceText: null, maxKm: null };

    setLocStatus('checking');
    setLocInfo(null);

    try {
      const pos = await getCurrentPosition();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const base = API_BASE.replace(/\/$/, '');
      const validateUrl = `${base}/fila/${encodeURIComponent(token)}/validate-location?lat=${lat}&lng=${lng}`;
      const r = await fetch(validateUrl);
      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        setLocStatus('denied');
        return { allowed: false, coords: { lat, lng }, distanceText: null, maxKm: null };
      }

      if (j.allowed) {
        const maxKm = j.maxDistanceMeters ? Math.round(j.maxDistanceMeters / 1000) : null;
        setLocStatus('allowed');
        setLocInfo({ distanceText: j.distanceText || null, maxKm });
        return { allowed: true, coords: { lat, lng }, distanceText: j.distanceText || null, maxKm };
      } else {
        const maxKm = j.maxDistanceMeters ? Math.round(j.maxDistanceMeters / 1000) : null;
        setLocStatus('out_of_radius');
        setLocInfo({ distanceText: j.distanceText || null, maxKm });
        return { allowed: false, coords: { lat, lng }, distanceText: j.distanceText || null, maxKm };
      }
    } catch {
      setLocStatus('denied');
      return { allowed: false, coords: null, distanceText: null, maxKm: null };
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setOkMsg('');
    setPosicao(null);

    if (!form.nome || !form.cpfDigits) {
      alert('Informe Nome e CPF.');
      return;
    }
    if (form.cpfDigits.length !== 11 || !isValidCpf(form.cpfDigits)) {
      alert('CPF inválido.');
      return;
    }

    // 1) se exigir localização, valida antes de enviar o JOIN
    const loc = await validateLocationIfNeeded();
    if (cfg?.permitir_localizacao && !loc.allowed) {
      let msg = 'Não foi possível validar sua localização. ';
      if (locStatus === 'denied') msg = 'Permissão de localização negada. Ative a localização para entrar na fila.';
      if (locStatus === 'out_of_radius') {
        msg = `Você está fora do raio permitido${loc?.distanceText ? ` (distância: ${loc.distanceText})` : ''}${loc?.maxKm ? ` — máximo ${loc.maxKm} km` : ''}.`;
      }
      alert(msg);
      return;
    }

    const payload = {
      nome: form.nome,
      cpf: form.cpfDigits, // <- sempre só dígitos
      rg: form.rg || null,
      dddcel: form.dddcel || null,
      nr_cel: form.nr_cel || null,
      email: form.email || null,
      dt_nasc: form.dt_nasc || null,
      nr_qtdpes: clampQtd(form.nr_qtdpes),
      lat: loc?.coords?.lat ?? null,
      lng: loc?.coords?.lng ?? null
    };

    try {
      setSending(true);

      const base = API_BASE.replace(/\/$/, '');
      const url = `${base}/configuracao/public/join/${token}`;

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        if (resp.status === 404) throw new Error('Configuração não encontrada.');
        if (data?.erro === 'config_inactive') throw new Error('Fila inativa no momento.');
        if (data?.erro === 'config_out_of_range') throw new Error('Fora do período de vigência.');
        if (data?.erro === 'fila_blocked') throw new Error('Fila bloqueada no momento.');
        if (data?.erro === 'fila_inactive') throw new Error('Fila inativa no momento.');
        if (data?.erro === 'duplicate_today') throw new Error('Você já está nesta fila hoje.');
        throw new Error(data?.erro || `Falha ao entrar na fila (HTTP ${resp.status}).`);
      }

      const ticket = {
        tokenFila: token,
        idEmpresa: data.idEmpresa ?? data.ID_EMPRESA ?? null,
        idFila: data.idFila ?? data.ID_FILA ?? null,
        dtMovto: data.dtMovto ?? data.DT_MOVTO ?? null,
        clienteFilaId: data.id_cliente ?? data.clienteFilaId ?? data.ID_CLIENTE_FILA ?? null,
        idCliente:     data.id_cliente ?? null
      };
      localStorage.setItem(LS_TICKET, JSON.stringify(ticket));

      setOkMsg(`Entrada realizada! Você está na posição ${data.posicao ?? '—'}.`);
      setPosicao(data.posicao ?? null);
      navigate(`/entrar-fila/${token}/status`);
    } catch (err) {
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

  const bannerUrl = cfg.img_banner?.url || '';
  const logoUrl = (cfg.empresa && cfg.empresa.logo_url) || '';
  const cpfMask = formatCpf(form.cpfDigits);

  return (
    <div style={{ minHeight: '100vh', background: '#f6f7f9' }}>
      <div
        style={{
          height: 160,
          background: bannerUrl
            ? `url(${bannerUrl}) center/cover no-repeat`
            : 'linear-gradient(135deg,#111827,#1f2937)'
        }}
      />
      <div style={styles.wrapper}>
        <div style={{ ...styles.card, marginTop: -64 }}>
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

          <div style={styles.infoRow}>
            <InfoPill label="Pessoas por entrada" value={`${cfg.qtde_min}–${cfg.qtde_max}`} />
            {Number.isFinite(cfg.temp_tol) && <InfoPill label="Tolerância" value={`${cfg.temp_tol} min`} />}
            <InfoPill label="Status" value={cfg.situacao === 1 ? 'Ativa' : 'Inativa'} />
            {cfg?.permitir_localizacao ? (
              <InfoPill label="Localização" value={`Obrigatória${cfg?.raio_metros ? ` (≤ ${Math.round(cfg.raio_metros/1000)} km)` : ''}`} />
            ) : (
              <InfoPill label="Localização" value="Dispensada" />
            )}
          </div>

          {cfg?.permitir_localizacao && (
            <div style={{ marginTop: 8, textAlign: 'center' }}>
              {locStatus === 'checking' && <small style={{ color: '#2563eb' }}>Validando sua localização…</small>}
              {locStatus === 'allowed' && (
                <small style={{ color: '#10b981' }}>
                  Localização ok{locInfo?.distanceText ? ` (${locInfo.distanceText})` : ''}.
                </small>
              )}
              {locStatus === 'out_of_radius' && (
                <small style={{ color: '#ef4444' }}>
                  Fora do raio permitido{locInfo?.distanceText ? ` (${locInfo.distanceText})` : ''}{locInfo?.maxKm ? ` — máx ${locInfo.maxKm} km` : ''}.
                </small>
              )}
              {locStatus === 'denied' && (
                <small style={{ color: '#ef4444' }}>
                  Permissão de localização negada. Ative para entrar na fila.
                </small>
              )}
            </div>
          )}

          <form onSubmit={onSubmit} style={{ marginTop: 12 }}>
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

            <Field label="CPF" required>
              <input
                name="cpf"
                type="text"
                inputMode="numeric"
                value={cpfMask}
                onChange={handleChange}
                placeholder="000.000.000-00"
                style={styles.input}
                maxLength={14}
                required
              />
              <small style={{ opacity: 0.7 }}>
                Será validado e enviado só com dígitos.
              </small>
            </Field>

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

            {okMsg && (
              <div style={styles.okBox}>
                <strong>{okMsg}</strong>
              </div>
            )}

            <button
              type="submit"
              style={styles.button}
              disabled={sending || cfg.situacao !== 1}
              onClick={() => {
                if (cfg?.permitir_localizacao && locStatus == null) {
                  validateLocationIfNeeded().catch(() => {});
                }
              }}
            >
              {sending ? 'Enviando…' : 'Entrar na fila'}
            </button>
          </form>

          <div style={{ marginTop: 18, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button type="button" onClick={copiarLink} style={styles.ghostBtn}>Copiar link</button>
            <Link to="/" style={styles.link}>Voltar</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

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

const styles = {
  wrapper: { display: 'flex', justifyContent: 'center', padding: '24px 16px' },
  card: {
    width: '100%', maxWidth: 560, background: '#fff', borderRadius: 16,
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)', padding: 20
  },
  emoji: { fontSize: 42 },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1px solid #e2e8f0', outline: 'none'
  },
  button: {
    marginTop: 14, width: '100%', padding: '12px 14px', borderRadius: 12,
    border: 'none', background: '#111827', color: '#fff', cursor: 'pointer', fontWeight: 600
  },
  ghostBtn: { padding: '8px 12px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' },
  link: { textDecoration: 'none', color: '#2563eb', alignSelf: 'center' },
  infoRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, justifyContent: 'center' },
  okBox: {
    marginTop: 10, padding: '10px 12px', background: '#ecfdf5',
    color: '#065f46', border: '1px solid #a7f3d0', borderRadius: '10'
  }
};
