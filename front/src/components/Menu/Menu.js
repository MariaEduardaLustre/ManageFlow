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
  FaUserCircle
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import LanguageSelector from '../LanguageSelector/LanguageSelector';
import ThemeToggleButton from '../ThemeToggleButton/ThemeToggleButton';
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
  profile: ['ADM', 'STAFF', 'ANALYST', 'CUSTOMER'], // <— novo: qualquer logado
};

const RBAC_ENFORCED_RESOURCES = new Set(['usersRoles', 'queues', 'settings', 'queueEntries']);

function canSee(resource, role, permissions) {
  const key = String(resource || '').toLowerCase();
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


// ALTERADO: O componente agora recebe a propriedade 'onLogout'
const Sidebar = ({ onLogout }) => {
  const { t } = useTranslation();
  const logo = '/imagens/logo.png';
  const defaultAvatar = '/imagens/avatar-default.png';

  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [nomeUsuario, setNomeUsuario] = useState('');
  const [cargoUsuario, setCargoUsuario] = useState('');
  const [nivelPermissao, setNivelPermissao] = useState(null);

  const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
  const [loadingAvatar, setLoadingAvatar] = useState(true);

  const { role, permissions, nivel } = useMemo(getCurrentContext, []);
  const MOBILE_BREAKPOINT = 768;
  const activePath = useMemo(() => location.pathname, [location.pathname]);

  const token = localStorage.getItem('token') || '';
  const idUsuario = Number(localStorage.getItem('idUsuario') || 0);

  const api = useMemo(() => {
    const instance = axios.create({ baseURL: API_BASE });
    instance.interceptors.request.use(config => {
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return instance;
  }, [token]);

  // Itens do menu (inclui o Perfil)
  const ALL_ITEMS = useMemo(() => ([
    { to: '/dashboard',         icon: FaTachometerAlt, label: t('menu.dashboard'),    resource: 'dashboard' },
    { to: '/filas-cadastradas', icon: FaCogs,          label: t('menu.configuracao'), resource: 'queues'     },
    { to: '/filas',             icon: FaClipboardList, label: t('menu.gestao'),       resource: 'queues'     },
    { to: '/relatorio',         icon: FaChartBar,      label: t('menu.relatorios'),   resource: 'analytics'  },
    { to: '/home',              icon: FaUsers,         label: t('menu.usuarios'),     resource: 'usersRoles' },
    { to: '/perfil',            icon: FaUserCircle,    label: t('menu.perfil') || 'Perfil', resource: 'profile' },
  ]), [t]);

  const NAV_ITEMS = useMemo(() => {
    if (!role) return [];
    return ALL_ITEMS.filter(item => canSee(item.resource, role, permissions));
  }, [ALL_ITEMS, role, permissions]);

  useEffect(() => {
    const nomeSalvo = localStorage.getItem('nomeUsuario') || t('menu.usuarioPadrao');
    setNomeUsuario(nomeSalvo);

    try {
      const empresaInfo = JSON.parse(localStorage.getItem('empresaSelecionada') || 'null');
      const perfilSalvo = empresaInfo ? empresaInfo.NOME_PERFIL : t('menu.semPerfil');
      const nivelSalvo  = typeof nivel === 'number' ? nivel : (empresaInfo ? empresaInfo.NIVEL : null);
      setCargoUsuario(perfilSalvo);
      setNivelPermissao(nivelSalvo ?? null);
    } catch {
      setCargoUsuario(t('menu.semPerfil'));
      setNivelPermissao(null);
    }

    const handleResize = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      setCollapsed(mobile);
      if (mobile) {
        document.body.classList.remove('has-sidebar', 'sidebar-collapsed');
        document.body.classList.add('has-bottomnav');
      } else {
        document.body.classList.remove('has-bottomnav');
        document.body.classList.add('has-sidebar');
        if (collapsed) document.body.classList.add('sidebar-collapsed');
        else document.body.classList.remove('sidebar-collapsed');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    if (!isMobile) {
      document.body.classList.add('has-sidebar');
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.classList.remove('has-sidebar', 'sidebar-collapsed', 'has-bottomnav');
    };
  }, [t, collapsed, isMobile, nivel]);

  useEffect(() => {
    if (!isMobile) {
      if (collapsed) document.body.classList.add('sidebar-collapsed');
      else document.body.classList.remove('sidebar-collapsed');
    }
  }, [collapsed, isMobile]);

  // Avatar
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingAvatar(true);
      try {
        if (!idUsuario) {
          setAvatarUrl(defaultAvatar);
          return;
        }
        const { data } = await api.get(`/usuarios/${idUsuario}`);
        const url = data?.img_perfil || defaultAvatar;
        if (alive) setAvatarUrl(url);
      } catch {
        if (alive) setAvatarUrl(defaultAvatar);
      } finally {
        if (alive) setLoadingAvatar(false);
      }
    })();
    return () => { alive = false; };
  }, [api, idUsuario]);

  const logout = () => {
    // 1. Chama a função do App.js para limpar o localStorage e atualizar o estado
    onLogout();
    
    // 2. Navega para a página de login
    navigate('/login');
  };

  const toggleSidebar = () => {
    if (!isMobile) setCollapsed(prev => !prev);
  };

  const goToProfile = () => navigate('/perfil');

  const renderSidebar = () => (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} aria-label={t('menu.menuLateral')}>
      <div className="sidebar-header">
        <div className="sidebar-logo" role="img" aria-label="Logo">
          <img src={logo} alt="Logo" />
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

      <nav className="sidebar-menu">
        <ul>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </ul>
      </nav>

      {!collapsed && (
        <div className="sidebar-footer">
          <div className="sidebar-controls">
            <ThemeToggleButton />
            <LanguageSelector variant="inline" />
          </div>

          {/* Avatar -> Perfil */}
          <button
            type="button"
            onClick={goToProfile}
            className="user-info btn-as-link"
            aria-label={t('menu.irPerfil')}
            title={t('menu.irPerfil')}
          >
            <div className="avatar-wrap">
              <img
                src={loadingAvatar ? defaultAvatar : avatarUrl}
                alt="Foto do usuário"
                className="avatar-img"
                onError={(e) => { e.currentTarget.src = defaultAvatar; }}
              />
            </div>
            <div className="user-meta">
              <div className="user-name">{nomeUsuario}</div>
              <div className="user-role">
                {cargoUsuario}{nivelPermissao ? ` — ${nivelPermissao}` : ''}
              </div>
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

  const renderBottomNav = () => (
    <nav className="bottom-nav" aria-label={t('menu.navegacaoInferior')}>
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
        const isActive = activePath.startsWith(to);
        return (
          <NavLink
            key={to}
            to={to}
            className={({ isActive: linkActive }) =>
              `bottom-nav-item ${linkActive || isActive ? 'active' : ''}`
            }
            aria-label={label}
            title={label}
          >
            <Icon className="bottom-nav-icon" />
            <span className="bottom-nav-label">{label}</span>
          </NavLink>
        );
      })}

      {/* Atalho para perfil */}
      <button
        type="button"
        className="bottom-nav-item profile"
        onClick={goToProfile}
        aria-label={t('menu.irPerfil')}
        title={t('menu.irPerfil')}
      >
        <img
          src={loadingAvatar ? defaultAvatar : avatarUrl}
          alt="Foto do usuário"
          className="bottom-nav-avatar"
          onError={(e) => { e.currentTarget.src = defaultAvatar; }}
        />
        <span className="bottom-nav-label">{t('menu.perfil') || 'Perfil'}</span>
      </button>

      <button
        type="button"
        className="bottom-nav-item logout"
        onClick={logout}
        aria-label={t('menu.sair')}
        title={t('menu.sair')}
      >
        <FaSignOutAlt className="bottom-nav-icon" />
        <span className="bottom-nav-label">{t('menu.sair')}</span>
      </button>
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