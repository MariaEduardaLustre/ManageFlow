import React from 'react';
import { useParams, Link } from 'react-router-dom';

export default function EntrarFilaPage() {
  const { token } = useParams();

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copiado!');
    } catch {
      alert('Não foi possível copiar o link.');
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.emoji}>✅</div>
        <h1 style={{ margin: '8px 0 0' }}>Página da Fila</h1>
        <p style={{ marginTop: 8, opacity: 0.8 }}>
          Se você está vendo isso, a rota funcionou! 🎉
        </p>

        <div style={styles.tokenBox}>
          <span style={{ fontWeight: 600 }}>Token:</span>
          <code style={styles.code}>{token}</code>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8, width: '100%' }}>
          <input
            type="text"
            readOnly
            value={window.location.href}
            style={styles.input}
            onFocus={(e) => e.target.select()}
          />
          <button type="button" onClick={copiarLink} style={styles.button}>
            Copiar link
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <Link to="/" style={styles.link}>← Voltar para a home</Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f6f7f9',
    padding: 16
  },
  card: {
    width: '100%',
    maxWidth: 520,
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
    padding: 24,
    textAlign: 'center'
  },
  emoji: { fontSize: 48 },
  tokenBox: {
    marginTop: 16,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  code: {
    background: '#f0f1f3',
    padding: '6px 10px',
    borderRadius: 8
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #e1e3e8',
    outline: 'none'
  },
  button: {
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: '#111827',
    color: '#fff',
    cursor: 'pointer'
  },
  link: { textDecoration: 'none', color: '#2563eb' }
};
