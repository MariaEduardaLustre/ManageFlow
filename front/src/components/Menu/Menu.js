
import './Menu.css';
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaCogs,
  FaTv,
  FaClipboardList,
  FaChartBar,
  FaUsers,
  FaSignOutAlt,
  FaAngleLeft,
  FaAngleRight
} from 'react-icons/fa';

const Sidebar = () => {
  const logo = '/imagens/logo.png';
  const avatar = '/imagens/avatar.png';
  const [colapsado, setColapsado] = useState(false);

  const toggleSidebar = () => {
    setColapsado(!colapsado);
  };
  useEffect(() => {
  const handleResize = () => {
    if (window.innerWidth <= 768) {
      setColapsado(true);
    } else {
      setColapsado(false);
    }
  };

  handleResize(); // executa na primeira renderização

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

  return (
    <div className={`sidebar ${colapsado ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src={logo} alt="Logo" />
        </div>
        <div className="toggle-btn" onClick={toggleSidebar}>
          {colapsado ? <FaAngleRight /> : <FaAngleLeft />}
        </div>
      </div>

      <nav className="sidebar-menu">
        <ul>
            <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <FaTachometerAlt />
                {!colapsado && <span>Dashboard</span>}
            </NavLink>
            <NavLink to="/configuracao" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <FaCogs />
                {!colapsado && <span>Configuração de fila</span>}
            </NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <FaTv />
                {!colapsado && <span>Painel de TV</span>}
            </NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <FaClipboardList />
                {!colapsado && <span>Gestão da Fila</span>}
            </NavLink>
            <NavLink to="/relatorio" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <FaChartBar />
                {!colapsado && <span>Relatórios</span>}
            </NavLink>
            <NavLink
                to="/home"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                <FaUsers />
                {!colapsado && <span>Usuários</span>}
            </NavLink>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn">
          <FaSignOutAlt />
          {!colapsado && <span>Sair</span>}
        </button>

        {!colapsado && (
          <div className="user-info">
            <img src={avatar} alt="Avatar" className="avatar" />
            <div>
              <div className="user-name">Evano</div>
              <div className="user-role">Project Manager</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
