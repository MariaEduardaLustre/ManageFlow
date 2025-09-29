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
import LanguageSelector from '../LanguageSelector/LanguageSelector';
import ThemeToggleButton from '../ThemeToggleButton/ThemeToggleButton';
import './Menu.css';

const Sidebar = () => {
  const { t } = useTranslation();

  const NAV_ITEMS = [
    { to: '/dashboard', icon: FaTachometerAlt, label: t('menu.dashboard') },
    { to: '/filas-cadastradas', icon: FaCogs, label: t('menu.configuracao') },
    { to: '/filas', icon: FaClipboardList, label: t('menu.gestao') },
    { to: '/relatorio', icon: FaChartBar, label: t('menu.relatorios') },
    { to: '/home', icon: FaUsers, label: t('menu.usuarios') }
  ];

  const logo = '/imagens/logo.png';
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [nomeUsuario, setNomeUsuario] = useState('');
  const [cargoUsuario, setCargoUsuario] = useState('');
  const [nivelPermissao, setNivelPermissao] = useState(null);

  const MOBILE_BREAKPOINT = 768;
  const activePath = useMemo(() => location.pathname, [location.pathname]);

  useEffect(() => {
    const nomeSalvo = localStorage.getItem('nomeUsuario') || t('menu.usuarioPadrao');
    setNomeUsuario(nomeSalvo);

    const empresaInfo = JSON.parse(localStorage.getItem('empresaSelecionada'));
    const perfilSalvo = empresaInfo ? empresaInfo.NOME_PERFIL : t('menu.semPerfil');
    const nivelSalvo  = empresaInfo ? empresaInfo.NIVEL : null;

    setCargoUsuario(perfilSalvo);
    setNivelPermissao(nivelSalvo);

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
  }, [t, collapsed, isMobile]);

  useEffect(() => {
    if (!isMobile) {
      if (collapsed) document.body.classList.add('sidebar-collapsed');
      else document.body.classList.remove('sidebar-collapsed');
    }
  }, [collapsed, isMobile]);

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const toggleSidebar = () => {
    if (!isMobile) setCollapsed(prev => !prev);
  };

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
          {/* ✨ ORDEM DOS BOTÕES INVERTIDA AQUI ✨ */}
          <div className="sidebar-controls">
            <ThemeToggleButton />
            <LanguageSelector variant="inline" />
          </div>
          
          <div className="user-info">
            <FaUserCircle className="avatar-icon" aria-hidden="true" />
            <div>
              <div className="user-name">{nomeUsuario}</div>
              <div className="user-role">
                {cargoUsuario}{nivelPermissao ? ` — ${nivelPermissao}` : ''}
              </div>
            </div>
          </div>

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