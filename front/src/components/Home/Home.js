import React, { useEffect, useState } from 'react';
import {  FaCog, FaTv, FaChartBar, FaClipboardList, FaUser, FaSignOutAlt, FaTrash, FaPlus } from 'react-icons/fa';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [novoUsuario, setNovoUsuario] = useState('');
  const navigate = useNavigate();

  const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
  const idEmpresa = empresaSelecionada?.ID_EMPRESA;
  const nivel = Number(empresaSelecionada?.NIVEL);


  useEffect(() => {
    async function fetchUsuarios() {
      try {
        if (!idEmpresa) return;
        const response = await api.get(`/empresa/${idEmpresa}`);
        setUsuarios(response.data);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
      }
    }

    fetchUsuarios();
  }, [idEmpresa]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('idUsuario');
    localStorage.removeItem('empresaSelecionada');
    navigate('/');
  };

  const adicionarUsuario = async () => {
    if (!novoUsuario) return;
    try {
      await api.post(`/empresa/${idEmpresa}/adicionar-usuario`, {
        cpfOuEmail: novoUsuario,
      });
      
      setNovoUsuario('');
      const response = await api.get(`/empresa/${idEmpresa}`);
      setUsuarios(response.data);
    } catch (error) {
      console.error('Erro ao adicionar usuário:', error);
    }
  };

  const removerUsuario = async (idUsuario) => {
    try {
      await api.delete(`/empresa/${idEmpresa}/remover-usuario/${idUsuario}`);

      setUsuarios((prev) => prev.filter((u) => u.ID !== idUsuario));
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
    }
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
        {/* <header>
          <h1>Olá 👋</h1>
        </header> */}

        <section className="usuarios-section">
          {/* <div className="usuarios-header">
            <h2>Usuários</h2>
            <input type="text" placeholder="Pesquisar" />
          </div> */}

          {nivel === 1 && (
            <div className="adicionar-usuario">
              <input
                type="text"
                placeholder="CPF ou E-mail do usuário"
                value={novoUsuario}
                onChange={(e) => setNovoUsuario(e.target.value)}
              />
              <button onClick={adicionarUsuario}><FaPlus /> Adicionar</button>
            </div>
          )}

          <table className="usuarios-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>CPF</th>
                <th>Endereço</th>
                <th>Número</th>
                {nivel === 1 && <th>Ações</th>}
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
                  {nivel === 1 && (
                    <td>
                      <button onClick={() => removerUsuario(user.ID)} className="btn-remover">
                        <FaTrash /> Remover
                      </button>
                    </td>
                  )}
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
