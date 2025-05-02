import React, { useEffect, useState } from 'react';
import { FaUsers, FaCog, FaTv, FaChartBar, FaClipboardList, FaUser, FaSignOutAlt } from 'react-icons/fa';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const [usuarios, setUsuarios] = useState([]);
  const navigate = useNavigate();

  const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));

  useEffect(() => {
    async function fetchUsuarios() {
      try {
        const idEmpresa = empresaSelecionada?.ID_EMPRESA;
        if (!idEmpresa) return;

        const response = await api.get(`/usuarios/empresa/${idEmpresa}`);
        setUsuarios(response.data);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
      }
    }

    fetchUsuarios();
  }, [empresaSelecionada]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('idUsuario');
    localStorage.removeItem('empresaSelecionada');
    navigate('/');
  };

  return (
    <div className="home-container">
      <aside className="sidebar">
        <div className="logo">ManageFlow</div>
        <nav>
          <ul>
            <li><FaTv /> Dashboard</li>
            <li><FaCog /> Configuração de fila</li>
            <li><FaTv /> Painel de TV</li>
            <li><FaClipboardList /> Gestão da Fila</li>
            <li><FaChartBar /> Relatórios</li>
            <li className="active"><FaUser /> Usuários</li>
            <li onClick={logout} style={{ cursor: 'pointer', color: 'red', marginTop: '20px' }}><FaSignOutAlt /> Sair</li>
          </ul>
        </nav>
        <div className="user-info">
          <img src="https://i.pravatar.cc/40" alt="Evano" />
          <div>Evano<br /><small>Project Manager</small></div>
        </div>
      </aside>

      <main className="main-content">
        <header>
          <h1>Olá 👋</h1>
          {/* <div className="cards">
            <div className="card">
              <FaUsers size={24} />
              <div>
                <h3>{usuarios.length}</h3>
                <p>Total Membros</p>
              </div>
            </div>
            <div className="card">
              <FaUser size={24} />
              <div>
                <h3>Adicionar membro</h3>
              </div>
            </div>
            <div className="card">
              <FaCog size={24} />
              <div>
                <h3>Configurar perfil</h3>
              </div>
            </div>
          </div> */}
        </header>

        <section className="usuarios-section">
          <div className="usuarios-header">
            <h2>Usuários</h2>
            <input type="text" placeholder="Pesquisar" />
          </div>
          <table className="usuarios-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>CPF</th>
                <th>Endereço</th>
                <th>Número</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((user, index) => (
                <tr key={index}>
                  <td>{user.NOME}</td>
                  <td>{user.EMAIL}</td>
                  <td>{user.CPF}</td>
                  <td>{user.ENDERECO}</td>
                  <td>{user.NUMERO}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
};

export default Home;
