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
import './Menu.css';

const NAV_ITEMS = [
  { to: '/dashboard', icon: FaTachometerAlt, label: 'Dashboard' },
  { to: '/filas-cadastradas', icon: FaCogs, label: 'Configuração' },
  { to: '/filas', icon: FaClipboardList, label: 'Gestão da Fila' },
  { to: '/relatorio', icon: FaChartBar, label: 'Relatórios' },
  { to: '/home', icon: FaUsers, label: 'Usuários' }
];

const Sidebar = () => {
  const logo = '/imagens/logo.png';
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [nomeUsuario, setNomeUsuario] = useState('');
  const [cargoUsuario, setCargoUsuario] = useState('');
  const [nivelPermissao, setNivelPermissao] = useState(null);

  // define breakpoint
  const MOBILE_BREAKPOINT = 768;

  // checa rota ativa p/ bottom bar
  const activePath = useMemo(() => location.pathname, [location.pathname]);

  useEffect(() => {
    const nomeSalvo = localStorage.getItem('nomeUsuario') || 'Usuário';
    setNomeUsuario(nomeSalvo);

    const empresaInfo = JSON.parse(localStorage.getItem('empresaSelecionada'));
    const perfilSalvo = empresaInfo ? empresaInfo.NOME_PERFIL : 'Sem Perfil';
    const nivelSalvo  = empresaInfo ? empresaInfo.NIVEL : null;

    setCargoUsuario(perfilSalvo);
    setNivelPermissao(nivelSalvo);

    const handleResize = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      setCollapsed(mobile); // celular começa colapsado
      // ajusta padding do body conforme tipo de navegação
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

    // setup inicial (se abrir direto em desktop)
    if (!isMobile) {
      document.body.classList.add('has-sidebar');
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.classList.remove('has-sidebar', 'sidebar-collapsed', 'has-bottomnav');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // quando colapsar/expandir no desktop
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

  // RENDER SIDEBAR (desktop/tablet)
  const renderSidebar = () => (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} aria-label="Menu lateral">
      <div className="sidebar-header">
        <div className="sidebar-logo" role="img" aria-label="Logo">
          <img src={logo} alt="Logo" />
        </div>
        <button
          className="toggle-btn"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
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

      <div className="sidebar-footer">
        <button onClick={logout} className="logout-btn" aria-label="Sair">
          <FaSignOutAlt />
          {!collapsed && <span>Sair</span>}
        </button>

        {!collapsed && (
          <div className="user-info">
            <FaUserCircle className="avatar-icon" aria-hidden="true" />
            <div>
              <div className="user-name">{nomeUsuario}</div>
              <div className="user-role">
                {cargoUsuario}{nivelPermissao ? ` — ${nivelPermissao}` : ''}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );

  // RENDER BOTTOM NAV (mobile)
  const renderBottomNav = () => (
    <nav className="bottom-nav" aria-label="Navegação inferior">
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
        aria-label="Sair"
        title="Sair"
      >
        <FaSignOutAlt className="bottom-nav-icon" />
        <span className="bottom-nav-label">Sair</span>
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
