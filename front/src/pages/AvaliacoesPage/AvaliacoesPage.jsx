// src/pages/AvaliacoesPage/AvaliacoesPage.jsx
import React, { useEffect, useState } from 'react';
import Menu from '../../components/Menu/Menu';
import DashboardAvaliacoes from '../../components/DashboardAvaliacoes/DashboardAvaliacoes';
import './AvaliacoesPage.css';
import { Button, Spinner } from 'react-bootstrap';
import api from '../../services/api';

// aceita string ou objeto { url, href }
function normalizeImg(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return v.url || v.href || '';
  return '';
}

const defaultAvatar = '/imagens/avatar-default.png';

// Página precisa receber 'onLogout'
const AvaliacoesPage = ({ onLogout }) => {
  const empresaSel = JSON.parse(localStorage.getItem('empresaSelecionada') || 'null');
  const idEmpresa = empresaSel?.ID_EMPRESA || null;

  // controla exibição de gráficos
  const [mostrarGraficos, setMostrarGraficos] = useState(false);

  // imagem de perfil (logo) da empresa
  const [logoUrl, setLogoUrl] = useState('');
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function fetchLogo() {
      if (!idEmpresa) {
        setLogoUrl('');
        return;
      }
      setImgLoading(true);
      setImgError('');
      try {
        const { data } = await api.get(`/empresas/detalhes/${idEmpresa}`);
        // back já normaliza com makePublicImageUrl
        const url =
          normalizeImg(data.img_perfil) ||
          normalizeImg(data.img_perfil_url) ||
          normalizeImg(data.LOGO_URL) ||
          normalizeImg(data.LOGO) ||
          '';
        if (mounted) setLogoUrl(url);
      } catch (err) {
        if (mounted) setImgError(err?.response?.data?.error || 'Falha ao carregar a imagem.');
      } finally {
        if (mounted) setImgLoading(false);
      }
    }
    fetchLogo();
    return () => { mounted = false; };
  }, [idEmpresa]);

  return (
    <div className="mf-dash">
      <Menu onLogout={onLogout} />
      <div className="mf-dash-content">
        {/* Cabeçalho */}
        <div className="mf-dash-header">
          <div className="mf-title-wrap">
            <h1>Painel de Avaliações</h1>
            <p className="mf-subtitle">
              Veja a média geral, distribuição e comentários da sua empresa
              {empresaSel?.NOME_EMPRESA ? ` — ${empresaSel.NOME_EMPRESA}` : ''}.
            </p>
          </div>

          {/* avatar + botão */}
          <div className="mf-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Avatar da empresa */}
            <div
              className="mf-company-avatar"
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8fafc'
              }}
              title={empresaSel?.NOME_EMPRESA || 'Empresa'}
            >
              {imgLoading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <img
                  src={logoUrl || defaultAvatar}
                  alt="Logo da empresa"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.src = defaultAvatar; }}
                />
              )}
            </div>

            <Button
              variant="outline-secondary"
              onClick={() => setMostrarGraficos(!mostrarGraficos)}
              className="mf-header-button"
            >
              {mostrarGraficos ? 'Ocultar Gráficos' : 'Exibir Gráficos'}
            </Button>
          </div>
        </div>

        {imgError && (
          <div className="mf-card mf-mt">
            <div className="mf-card-body">
              <p className="mf-center-muted">Não foi possível carregar a imagem de perfil. ({imgError})</p>
            </div>
          </div>
        )}

        {/* Card principal com o dashboard */}
        <div className="mf-card mf-mt">
          <div className="mf-card-body">
            {idEmpresa ? (
              <DashboardAvaliacoes
                idEmpresa={idEmpresa}
                mostrarGraficos={mostrarGraficos}
              />
            ) : (
              <p className="mf-center-muted">Empresa não selecionada.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvaliacoesPage;
