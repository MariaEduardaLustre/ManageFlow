// src/pages/AvaliacoesPage/AvaliacoesPage.jsx
import React, { useEffect, useState } from 'react';
import Menu from '../../components/Menu/Menu';
import DashboardAvaliacoes from '../../components/DashboardAvaliacoes/DashboardAvaliacoes';
import './AvaliacoesPage.css';
import { Button, Spinner } from 'react-bootstrap';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';

function normalizeImg(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return v.url || v.href || '';
  return '';
}

const defaultAvatar = '/imagens/avatar-default.png';

const AvaliacoesPage = ({ onLogout }) => {
  const { t } = useTranslation();
  const ns = "avaliacoes";

  const empresaSel = JSON.parse(localStorage.getItem('empresaSelecionada') || 'null');
  const idEmpresa = empresaSel?.ID_EMPRESA || null;

  const [mostrarGraficos, setMostrarGraficos] = useState(false);

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
        const url =
          normalizeImg(data.img_perfil) ||
          normalizeImg(data.img_perfil_url) ||
          normalizeImg(data.LOGO_URL) ||
          normalizeImg(data.LOGO) ||
          '';

        if (mounted) setLogoUrl(url);
      } catch (err) {
        if (mounted)
          setImgError(
            err?.response?.data?.error ||
            t(`${ns}.logoLoadFailFallback`)
          );
      } finally {
        if (mounted) setImgLoading(false);
      }
    }

    fetchLogo();
    return () => { mounted = false };
  }, [idEmpresa, t]);

  return (
    <div className="mf-dash">
      <Menu onLogout={onLogout} />

      <div className="mf-dash-content">

        {/* Cabeçalho */}
        <div className="mf-dash-header">
          <div className="mf-title-wrap">
            <h1>{t(`${ns}.title`)}</h1>

            {empresaSel?.NOME_EMPRESA ? (
              <p className="mf-subtitle">
                {t(`${ns}.subtitleWithCompany`, { companyName: empresaSel.NOME_EMPRESA })}
              </p>
            ) : (
              <p className="mf-subtitle">{t(`${ns}.subtitle`)}</p>
            )}
          </div>

          {/* ✅ Avatar removido */}
          <div className="mf-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              variant="outline-secondary"
              onClick={() => setMostrarGraficos(!mostrarGraficos)}
              className="mf-header-button"
            >
              {mostrarGraficos ? t(`${ns}.hideCharts`) : t(`${ns}.showCharts`)}
            </Button>
          </div>
        </div>

        {/* Mensagem de erro da imagem */}
        {imgError && (
          <div className="mf-card mf-mt">
            <div className="mf-card-body">
              <p className="mf-center-muted">
                {t(`${ns}.logoLoadFail`, { error: imgError })}
              </p>
            </div>
          </div>
        )}

        {/* Conteúdo */}
        <div className="mf-card mf-mt">
          <div className="mf-card-body">
            {idEmpresa ? (
              <DashboardAvaliacoes
                idEmpresa={idEmpresa}
                mostrarGraficos={mostrarGraficos}
              />
            ) : (
              <p className="mf-center-muted">{t(`${ns}.noCompanySelected`)}</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AvaliacoesPage;
