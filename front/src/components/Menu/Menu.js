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
  
  // << NOVO STATE PARA O NÍVEL DE PERMISSÃO >>
  const [nivelPermissao, setNivelPermissao] = useState(null);

  useEffect(() => {
    // Busca o nome do usuário salvo no login
    const nomeSalvo = localStorage.getItem('nomeUsuario') || 'Usuário';
    setNomeUsuario(nomeSalvo);

    // Busca as informações da empresa selecionada
    const empresaInfo = JSON.parse(localStorage.getItem('empresaSelecionada'));
    const perfilSalvo = empresaInfo ? empresaInfo.NOME_PERFIL : 'Sem Perfil';
    
    // << BUSCA O NÍVEL DE PERMISSÃO JUNTO COM O CARGO >>
    const nivelSalvo = empresaInfo ? empresaInfo.NIVEL : null;
    
    setCargoUsuario(perfilSalvo);
    setNivelPermissao(nivelSalvo); // Armazena o nível no state

    // Lógica para colapsar a sidebar em telas menores
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setColapsado(true);
      } else {
        setColapsado(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const logout = () => {
    localStorage.clear(); // Limpa todo o localStorage para garantir uma saída completa
    navigate('/login');
  };

  const toggleSidebar = () => {
    setColapsado(!colapsado);
  };

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
        {/* Links do menu... */}
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
        <button onClick={logout} className="logout-btn">
          <FaSignOutAlt />
          {!colapsado && <span>Sair</span>}
        </button>

        {!colapsado && (
          <div className="user-info">
            <FaUserCircle className="avatar-icon" />
            <div>
              <div className="user-name">{nomeUsuario}</div>
              {/* << EXIBIÇÃO DO NÍVEL DE PERMISSÃO >> */}
              <div className="user-role">
                {cargoUsuario}
                {nivelPermissao}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;