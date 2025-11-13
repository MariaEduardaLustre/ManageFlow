import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaPlus,
  FaSearch,
  FaDownload,
  FaTimes,
  FaCopy,
  FaQrcode,
  FaEdit,
  FaLink,
  FaTrash
} from "react-icons/fa";
import Menu from "../Menu/Menu";
import api from "../../services/api";
import "./FilasCadastradas.css";
import { useTranslation } from "react-i18next";

// ALTERADO: A página agora recebe 'onLogout' como uma propriedade
const FilasCadastradas = ({ onLogout }) => {
  const { t } = useTranslation();
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState(null);
  const [qrToken, setQrToken] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState(null);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const empresaSelecionada = JSON.parse(
    localStorage.getItem("empresaSelecionada") || "null"
  );
  const idEmpresa = empresaSelecionada?.ID_EMPRESA || null;

  useEffect(() => {
    if (!idEmpresa) {
      setError(t('filasCadastradas.erros.nenhumaEmpresa'));
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/configuracao/filas", {
          params: { idEmpresa },
        });
        setFilas(Array.isArray(data) ? data : []);
      } catch (err) {
        const msg = err.response?.data?.erro || err.message;
        setError(t('filasCadastradas.erros.carregar', { message: msg }));
      } finally {
        setLoading(false);
      }
    })();
  }, [idEmpresa, t]);

  const handleEditFila = (id_conf_fila) =>
    navigate(`/configuracao/${id_conf_fila}`);

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("execCommand failed");
      }
      alert(t('filasCadastradas.feedback.linkCopiado'));
    } catch (e) {
      console.error("Falha ao copiar", e);
      window.prompt(t('filasCadastradas.feedback.copieOlink'), text);
    }
  };
  
  const openQrModal = (f) => {
    const tokenFila = f.token_fila || (f.join_url ? String(f.join_url).split("/").pop() : null);
    if (qrUrl) URL.revokeObjectURL(qrUrl);
    setQrUrl(null);
    setQrError(null);
    setQrLoading(false);
    setQrToken(null);
    if (!tokenFila) {
      setQrError(t('filasCadastradas.erros.tokenNaoEncontrado'));
      setQrOpen(true);
      return;
    }
    setQrToken(tokenFila);
    setQrOpen(true);
    generateQr(tokenFila);
  };

  const generateQr = async (token) => {
    setQrError(null);
    setQrLoading(true);
    try {
      const apiBase = String(api.defaults.baseURL || "").replace(/\/$/, "");
      const url = `${apiBase}/configuracao/qr/${token}`;
      const jwt = localStorage.getItem("token");
      const resp = await fetch(url, {
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      if (qrUrl) URL.revokeObjectURL(qrUrl);
      const href = URL.createObjectURL(blob);
      setQrUrl(href);
    } catch (e) {
      console.error("Erro ao gerar QR:", e);
      setQrError(t('filasCadastradas.erros.gerarQr'));
    } finally {
      setQrLoading(false);
    }
  };

  const handleCloseQr = () => {
    setQrOpen(false);
    if (qrUrl) URL.revokeObjectURL(qrUrl);
    setQrUrl(null);
    setQrToken(null);
    setQrError(null);
    setQrLoading(false);
  };

  const handleDownloadQrFromModal = () => {
    if (!qrUrl || !qrToken) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `qr-fila-${qrToken}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  
  const askDeleteFila = (f) => {
    setConfirmTarget(f);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;
    const id = confirmTarget.id_conf_fila;
    try {
      setDeletingId(id);
      await api.delete(`/configuracao/${id}`, { params: { idEmpresa } });
      setFilas((prev) => prev.filter((x) => x.id_conf_fila !== id));
      setConfirmOpen(false);
      setConfirmTarget(null);
    } catch (err) {
      const msg = err.response?.data?.erro || err.response?.data?.message || err.message;
      alert(t('filasCadastradas.erros.excluir', { message: msg }));
      console.error("Excluir configuração erro:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmOpen(false);
    setConfirmTarget(null);
  };

  const filteredFilas = useMemo(() => {
    const txt = (search || "").trim().toLowerCase();
    if (!txt) return filas;
    return filas.filter(
      (f) =>
        String(f.nome_fila || "").toLowerCase().includes(txt) ||
        String(f.join_url || "").toLowerCase().includes(txt) ||
        String(f.id_conf_fila || "").toLowerCase().includes(txt)
    );
  }, [filas, search]);

  return (
    <div className="mf-queues dashboard-container">
      {/* ALTERADO: A propriedade 'onLogout' é passada para o componente Menu */}
      <Menu onLogout={onLogout} />

      <main className="main-content">
        <div className="content-wrapper">
          <div className="cards-section">
            <div className="card total-filas">
              <div className="card-text">
                <p>{t('filasCadastradas.cards.total')}</p>
                <h3>{filas.length}</h3>
              </div>
            </div>
            <div className="card add-fila" onClick={() => navigate("/configuracao")}>
              <FaPlus className="card-icon" />
              <div className="card-text">
                <p>{t('filasCadastradas.cards.adicionar')}</p>
              </div>
            </div>
          </div>

          <div className="page-content">
            <h2>{t('filasCadastradas.titulo')}</h2>

            <div className="search-sort-section">
              <div className="search-bar">
                <FaSearch />
                <input
                  type="text"
                  placeholder={t('filasCadastradas.buscaPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="sort-by">
                {t('filasCadastradas.ordenarPor')}
                <select defaultValue="Newest">
                  <option>{t('filasCadastradas.recente')}</option>
                </select>
              </div>
            </div>

            {error && <div className="qr-error" style={{ marginBottom: 12 }}>{error}</div>}

            <div className="table-wrap">
              <table className="tbl-queues">
                <thead>
                  <tr>
                    <th>{t('filasCadastradas.tabela.nome')}</th>
                    <th>{t('filasCadastradas.tabela.id')}</th>
                    <th>{t('filasCadastradas.tabela.link')}</th>
                    <th>{t('filasCadastradas.tabela.qrCode')}</th>
                    <th>{t('filasCadastradas.tabela.status')}</th>
                    <th className="th-actions">{t('filasCadastradas.tabela.acoes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && filteredFilas.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "#6a7184" }}>
                        {t('filasCadastradas.tabela.nenhumItem')}
                      </td>
                    </tr>
                  )}

                  {filteredFilas.map((f) => {
                    const joinUrl = f.join_url || "";
                    const canQr = Boolean(f.token_fila || f.join_url);
                    return (
                      <tr key={f.id_conf_fila}>
                        <td data-label={t('filasCadastradas.tabela.nome')} onClick={() => handleEditFila(f.id_conf_fila)} className="link-cell" title={t('filasCadastradas.acoes.editar')}>
                          {f.nome_fila}
                        </td>
                        <td data-label={t('filasCadastradas.tabela.id')}>{f.id_conf_fila}</td>
                        <td data-label={t('filasCadastradas.tabela.link')}>
                          {joinUrl ? (
                            <div className="link-group">
                              <a className="link" href={joinUrl} target="_blank" rel="noreferrer">
                                <FaLink style={{ marginRight: 6 }} />
                                {joinUrl}
                              </a>
                              <button className="btn btn-outline btn-sm" onClick={() => copyToClipboard(joinUrl)}>
                                <FaCopy /> <span>{t('filasCadastradas.botoes.copiar')}</span>
                              </button>
                            </div>
                          ) : ("—")}
                        </td>
                        <td data-label={t('filasCadastradas.tabela.qrCode')}>
                          {canQr ? (
                            <button className="btn btn-secondary btn-sm" onClick={() => openQrModal(f)} title={t('filasCadastradas.acoes.abrirQr')}>
                              <FaQrcode /> <span>{t('filasCadastradas.botoes.qrCode')}</span>
                            </button>
                          ) : ("—")}
                        </td>
                        <td data-label={t('filasCadastradas.tabela.status')}>
                          <span className={`badge ${f.situacao ? "badge-success" : "badge-danger"}`}>
                            {f.situacao ? t('filasCadastradas.status.ativa') : t('filasCadastradas.status.inativa')}
                          </span>
                        </td>
                        <td data-label={t('filasCadastradas.tabela.acoes')} className="cell-actions">
                          <button className="btn btn-primary btn-sm btn-icon" onClick={() => handleEditFila(f.id_conf_fila)} title={t('filasCadastradas.acoes.editar')} aria-label={t('filasCadastradas.acoes.editarLabel', { nome: f.nome_fila })}>
                            <FaEdit />
                          </button>
                          <button className={`btn btn-danger btn-sm btn-icon ${deletingId === f.id_conf_fila ? "is-loading" : ""}`} title={t('filasCadastradas.acoes.excluir')} aria-label={t('filasCadastradas.acoes.excluirLabel', { nome: f.nome_fila })} onClick={() => askDeleteFila(f)} disabled={deletingId === f.id_conf_fila}>
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>{loading ? t('geral.carregando') : t('filasCadastradas.mostrandoItens', { count: filteredFilas.length })}</span>
            </div>
          </div>
        </div>
      </main>

      {qrOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="qr-title">
          <div className="modal">
            <div className="modal-header">
              <h3 id="qr-title">{t('filasCadastradas.modalQr.titulo', { token: qrToken || "" })}</h3>
              <button className="icon-btn" onClick={handleCloseQr} aria-label={t('geral.fechar')}><FaTimes /></button>
            </div>
            <div className="modal-body">
              {qrLoading && <div className="qr-loading">{t('filasCadastradas.modalQr.gerando')}</div>}
              {qrError && <div className="qr-error">{qrError}</div>}
              {!qrLoading && !qrError && qrUrl && (
                <div className="qr-wrap">
                  <img src={qrUrl} alt={t('filasCadastradas.modalQr.alt')} className="qr-image" />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <div className="spacer" />
              <button className="btn btn-primary" onClick={handleDownloadQrFromModal} disabled={!qrUrl}>
                <FaDownload /> <span>{t('filasCadastradas.botoes.baixar')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && confirmTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="modal modal-confirm">
            <div className="modal-header">
              <h3 id="confirm-title">{t('filasCadastradas.modalExcluir.titulo')}</h3>
              <button className="icon-btn" onClick={handleCancelDelete} aria-label={t('geral.fechar')}><FaTimes /></button>
            </div>
            <div className="modal-body">
              <div className="confirm-text">
                {t('filasCadastradas.modalExcluir.confirmacao', { nome: confirmTarget.nome_fila, id: confirmTarget.id_conf_fila })}
                <div className="confirm-sub">{t('filasCadastradas.modalExcluir.subtexto')}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={handleCancelDelete} disabled={deletingId === confirmTarget.id_conf_fila}>
                {t('geral.cancelar')}
              </button>
              <button className={`btn btn-danger ${deletingId === confirmTarget.id_conf_fila ? "is-loading" : ""}`} onClick={handleConfirmDelete} disabled={deletingId === confirmTarget.id_conf_fila}>
                {t('filasCadastradas.botoes.excluirDefinitivamente')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilasCadastradas;