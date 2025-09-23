import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaCogs,
  FaTv,
  FaClipboardList,
  FaChartBar,
  FaUsers,
  FaSignOutAlt,
  FaAngleLeft,
  FaAngleRight,
  FaUserCircle
} from 'react-icons/fa';
import './Menu.css';

const Sidebar = () => {
  const logo = '/imagens/logo.png';
  const navigate = useNavigate();

  const [colapsado, setColapsado] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [cargoUsuario, setCargoUsuario] = useState('');
  const [nivelPermissao, setNivelPermissao] = useState(null);

  useEffect(() => {
    const nomeSalvo = localStorage.getItem('nomeUsuario') || 'Usuário';
    setNomeUsuario(nomeSalvo);

    const empresaInfo = JSON.parse(localStorage.getItem('empresaSelecionada'));
    const perfilSalvo = empresaInfo ? empresaInfo.NOME_PERFIL : 'Sem Perfil';
    const nivelSalvo  = empresaInfo ? empresaInfo.NIVEL : null;

    setCargoUsuario(perfilSalvo);
    setNivelPermissao(nivelSalvo);

    const handleResize = () => {
      if (window.innerWidth <= 768) setColapsado(true);
      else setColapsado(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    document.body.classList.add('has-sidebar');
    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.classList.remove('has-sidebar', 'sidebar-collapsed');
    };
  }, []);

  useEffect(() => {
    if (colapsado) document.body.classList.add('sidebar-collapsed');
    else document.body.classList.remove('sidebar-collapsed');
  }, [colapsado]);

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const toggleSidebar = () => setColapsado(prev => !prev);

  return (
    <aside className={`sidebar ${colapsado ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src={logo} alt="Logo" />
        </div>
        <button className="toggle-btn" onClick={toggleSidebar} aria-label="Alternar menu">
          {colapsado ? <FaAngleRight /> : <FaAngleLeft />}
        </button>
      </div>

      <nav className="sidebar-menu">
        <ul>
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <FaTachometerAlt />
            {!colapsado && <span>Dashboard</span>}
          </NavLink>

          <NavLink to="/filas-cadastradas" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <FaCogs />
            {!colapsado && <span>Configuração de fila</span>}
          </NavLink>

          {/* <NavLink to="/painel-tv" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <FaTv />
            {!colapsado && <span>Painel de TV</span>}
          </NavLink> */}

          <NavLink to="/filas" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <FaClipboardList />
            {!colapsado && <span>Gestão da Fila</span>}
          </NavLink>

          <NavLink to="/relatorio" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <FaChartBar />
            {!colapsado && <span>Relatórios</span>}
          </NavLink>

          <NavLink to="/home" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <FaUsers />
            {!colapsado && <span>Usuários</span>}
          </NavLink>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button onClick={logout} className="logout-btn">
          <FaSignOutAlt />
          {!colapsado && <span>Sair</span>}
        </button>

        {!colapsado && (
          <div className="user-info">
            <FaUserCircle className="avatar-icon" />
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
};

export default Sidebar;
