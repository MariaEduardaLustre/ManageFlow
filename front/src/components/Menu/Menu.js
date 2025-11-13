import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaCogs,
  FaClipboardList,
  FaChartBar,
  FaUsers,
  FaSignOutAlt,
  FaAngleLeft,
  FaAngleRight,
  FaUserCircle,
  FaBuilding,
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import LanguageSelector from '../LanguageSelector/LanguageSelector';
import ThemeToggleButton from '../ThemeToggleButton/ThemeToggleButton';
import { useTheme } from '../../context/ThemeContext'; // <<<<<< usa o ThemeContext
import './Menu.css';

function normalizeRoleFromNivel(nivel) {
  const n = Number(nivel);
  if (n === 1) return 'ADM';
  if (n === 2) return 'STAFF';
  if (n === 3) return 'ANALYST';
  return 'CUSTOMER';
}

function getCurrentContext() {
  try {
    const raw = localStorage.getItem('empresaSelecionada');
    const emp = raw ? JSON.parse(raw) : null;
    const role =
      (emp?.ROLE
        ? String(emp.ROLE).toUpperCase()
        : normalizeRoleFromNivel(emp?.NIVEL));
    const safeRole = role?.startsWith('STAF') ? 'STAFF' : role || 'CUSTOMER';
    const permissions = Array.isArray(emp?.PERMISSIONS) ? emp.PERMISSIONS : [];
    return { role: safeRole, permissions, nivel: emp?.NIVEL ?? null };
  } catch {
    return { role: null, permissions: [], nivel: null };
  }
}

const ROLE_ALLOW = {
  dashboard: ['ADM', 'STAFF', 'ANALYST'],
  analytics: ['ADM', 'STAFF', 'ANALYST'],
  usersRoles: ['ADM', 'STAFF'],
  queues: ['ADM', 'STAFF'],
  settings: ['ADM', 'STAFF'],
  company: ['ADM', 'STAFF'],
  profile: ['ADM', 'STAFF', 'ANALYST', 'CUSTOMER'],
};

const RBAC_ENFORCED_RESOURCES = new Set(['usersRoles', 'queues', 'settings', 'queueEntries']);

function canSee(resource, role, permissions) {
  const allowedRoles = ROLE_ALLOW[resource] || ['ADM', 'STAFF'];
  if (!allowedRoles.includes(role)) return false;
  if (RBAC_ENFORCED_RESOURCES.has(resource) && permissions?.length) {
    const needsView = `${resource}:view`;
    const hasView = permissions.some(p => String(p).toLowerCase() === needsView.toLowerCase());
    return hasView;
  }
  return true;
}

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE) ||
  (typeof window !== 'undefined' && window.location && window.location.hostname
    ? `http://${window.location.hostname}:3001/api`
    : 'http://localhost:3001/api');

function deriveApiOrigin(apiBase) {
  try {
    const url = new URL(apiBase, window.location.origin);
    const withoutApi = url.pathname.replace(/\/api\/?$/, '') || '/';
    url.pathname = withoutApi;
    return url.origin;
  } catch {
    return String(apiBase || '').replace(/\/api\/?$/, '');
  }
}
const API_ORIGIN = deriveApiOrigin(API_BASE);

function normalizePublicImageUrl(maybePath) {
  if (!maybePath) return '';
  const val = String(maybePath).trim();
  if (/^(https?:)?\/\//i.test(val) || /^data:image\//i.test(val)) return val;
  const rel = val.startsWith('/') ? val : `/${val}`;
  return `${API_ORIGIN}${rel}`;
}

function extractLogoFromEmpresa(emp) {
  const candidates = [
    emp?.IMG_LOGO_URL,
    emp?.IMG_LOGO,
    emp?.img_logo,
    emp?.logoUrl,
    emp?.logo,
    emp?.IMAGEM_LOGO,
  ].filter(Boolean);
  return candidates[0] || '';
}

const Sidebar = ({ onLogout }) => {
  const { t } = useTranslation();
  const { theme } = useTheme(); // <<<<<< pega o tema atual ("light" | "dark")

  // logos (ajuste os caminhos se precisar)
  const logoLight = '/imagens/logo.png';
  const logoDark  = '/imagens/logo-dark.png';

  // escolhe a logo pelo tema
  const logoSrc = theme === 'dark' ? logoDark : logoLight;

  const defaultCompanyLogo = '/imagens/company-default.png';

  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [empresaId, setEmpresaId] = useState(null);
  const [empresaNome, setEmpresaNome] = useState('');
  const [empresaLogo, setEmpresaLogo] = useState(defaultCompanyLogo);

  const { role, permissions, nivel } = useMemo(getCurrentContext, []);
  const MOBILE_BREAKPOINT = 768;

  const token = localStorage.getItem('token') || '';

  const api = useMemo(() => {
    const instance = axios.create({ baseURL: API_BASE });
    instance.interceptors.request.use(config => {
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return instance;
  }, [token]);

  const readEmpresaFromStorage = () => {
    try {
      const raw = localStorage.getItem('empresaSelecionada');
      const emp = raw ? JSON.parse(raw) : null;
      const id = emp?.ID_EMPRESA ?? emp?.idEmpresa ?? null;
      const nome = emp?.NOME_EMPRESA ?? emp?.nomeEmpresa ?? '';
      const logoCandidate = extractLogoFromEmpresa(emp);
      setEmpresaId(Number.isFinite(Number(id)) ? Number(id) : null);
      setEmpresaNome(nome || '');
      if (logoCandidate) setEmpresaLogo(normalizePublicImageUrl(logoCandidate));
      else setEmpresaLogo(defaultCompanyLogo);
    } catch {
      setEmpresaId(null);
      setEmpresaNome('');
      setEmpresaLogo(defaultCompanyLogo);
    }
  };

  useEffect(() => {
    readEmpresaFromStorage();
    const onStorage = (e) => {
      if (e.key === 'empresaSelecionada') readEmpresaFromStorage();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [location.key]);

  const ALL_ITEMS = useMemo(() => ([
    { to: '/dashboard',         icon: FaTachometerAlt, label: t('menu.dashboard'),            resource: 'dashboard', end: true },
    { to: '/filas-cadastradas', icon: FaCogs,          label: t('menu.configuracao'),         resource: 'queues',     end: true },
    { to: '/filas',             icon: FaClipboardList, label: t('menu.gestao'),               resource: 'queues',     end: true },
    { to: '/relatorio',         icon: FaChartBar,      label: t('menu.relatorios'),           resource: 'analytics',  end: true },
    { to: '/home',              icon: FaUsers,         label: t('menu.usuarios'),             resource: 'usersRoles', end: true },
    { to: '/empresa/editar/:id',icon: FaBuilding,      label: t('menu.empresa') || 'Empresa', resource: 'company',    dynamic: true, end: true },
    { to: '/perfil',            icon: FaUserCircle,    label: t('menu.perfil') || 'Perfil',   resource: 'profile',    end: true },
  ]), [t]);

  const NAV_ITEMS = useMemo(() => {
    if (!role) return [];
    return ALL_ITEMS.filter(item => canSee(item.resource, role, permissions));
  }, [ALL_ITEMS, role, permissions]);

  // classes de layout + estado mobile
  useEffect(() => {
    const syncLayout = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(mobile);

      document.body.classList.toggle('has-bottomnav', mobile);
      document.body.classList.toggle('has-sidebar', !mobile);
      document.body.classList.toggle('sidebar-collapsed', !mobile && collapsed);
    };
    syncLayout();
    window.addEventListener('resize', syncLayout);
    return () => {
      window.removeEventListener('resize', syncLayout);
      document.body.classList.remove('has-sidebar', 'sidebar-collapsed', 'has-bottomnav');
    };
  }, [collapsed]);

  // logo da empresa (fallback remoto)
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!empresaId) return;
      const hasDefault = !empresaLogo || empresaLogo === defaultCompanyLogo;
      if (!hasDefault) return;
      try {
        const { data } = await api.get(`/empresas/${empresaId}`);
        const candidate = extractLogoFromEmpresa(data || {});
        if (!cancel && candidate) setEmpresaLogo(normalizePublicImageUrl(candidate));
      } catch {}
    })();
    return () => { cancel = true; };
  }, [api, empresaId, empresaLogo]);

  const logout = () => { onLogout?.(); navigate('/login'); };

  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev;
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      document.body.classList.toggle('sidebar-collapsed', !mobile && next);
      return next;
    });
  };

  const goToCompany = (e) => {
    if (!empresaId) { e?.preventDefault?.(); alert('Selecione uma empresa primeiro.'); return; }
    navigate(`/empresa/editar/${empresaId}`);
  };

  const renderSidebar = () => (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} aria-label={t('menu.menuLateral')}>
      <div className="sidebar-header">
        <div className="sidebar-logo" role="img" aria-label="Logo">
          {/* troca automática da logo por tema */}
          <img
            src={logoSrc}
            srcSet={`${logoSrc} 1x, ${logoSrc} 2x`}
            alt="Logo"
          />
        </div>
        <button
          className="toggle-btn"
          onClick={toggleSidebar}
          aria-label={collapsed ? t('menu.expandir') : t('menu.recolher')}
          title={collapsed ? t('menu.expandir') : t('menu.recolher')}
        >
          {collapsed ? <FaAngleRight /> : <FaAngleLeft />}
        </button>
      </div>

      {!collapsed && (
        <div className="sidebar-underlogo">
          <ThemeToggleButton size="sm" />
          <LanguageSelector variant="inline" size="sm" />
        </div>
      )}

      <nav className="sidebar-menu">
        <ul>
          {NAV_ITEMS.map(({ to, icon: Icon, label, resource, dynamic, end }) => {
            if (resource === 'company' && dynamic) {
              const resolvedTo = empresaId ? `/empresa/editar/${empresaId}` : '#';
              return (
                <NavLink
                  key="company"
                  to={resolvedTo}
                  end
                  onClick={(e) => { if (!empresaId) { e.preventDefault(); alert('Selecione uma empresa primeiro.'); } }}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <Icon />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              );
            }

            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            );
          })}
        </ul>
      </nav>

      {!collapsed && (
        <div className="sidebar-footer">
          {/* Badge Empresa */}
          <button
            type="button"
            onClick={goToCompany}
            className="company-badge btn-as-link"
            aria-label={t('menu.irEmpresa') || 'Ir para Empresa'}
            title={t('menu.irEmpresa') || 'Ir para Empresa'}
          >
            <div className="company-logo-wrap">
              <img
                src={empresaLogo || defaultCompanyLogo}
                alt="Logo da empresa"
                className="company-logo-img"
                onError={(e) => { e.currentTarget.src = defaultCompanyLogo; }}
              />
            </div>
            <div className="company-meta">
              <div className="company-name" title={empresaNome || 'Empresa'}>
                <FaBuilding className="company-icon" />
                <span className="company-name-text">
                  {empresaNome || (t('menu.empresa') || 'Empresa')}
                </span>
              </div>
              {empresaId ? (
                <div className="company-id">ID: {empresaId}</div>
              ) : (
                <div className="company-id muted">{t('menu.selecioneEmpresa') || 'Selecione uma empresa'}</div>
              )}
            </div>
          </button>

          <button onClick={logout} className="logout-btn" aria-label={t('menu.sair')}>
            <FaSignOutAlt />
            <span>{t('menu.sair')}</span>
          </button>
        </div>
      )}
    </aside>
  );

  // Bottom nav — sem Perfil e sem Sair
  const renderBottomNav = () => (
    <nav className="bottom-nav" aria-label={t('menu.navegacaoInferior')}>
      {NAV_ITEMS.map(({ to, icon: Icon, label, resource, dynamic }) => {
        if (resource === 'profile') return null;

        if (resource === 'company' && dynamic) {
          const isActive = location.pathname.startsWith('/empresa/editar/');
          return (
            <button
              key="company-bottom"
              type="button"
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={goToCompany}
              aria-label={label}
              title={label}
            >
              <Icon className="bottom-nav-icon" />
              <span className="bottom-nav-label">{label}</span>
            </button>
          );
        }

        return (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            aria-label={label}
            title={label}
          >
            <Icon className="bottom-nav-icon" />
            <span className="bottom-nav-label">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <>
      {!isMobile && renderSidebar()}
      {isMobile && renderBottomNav()}
    </>
  );
};

export default Sidebar;
