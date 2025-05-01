import React from 'react';
import { FaUsers, FaCog, FaTv, FaChartBar, FaClipboardList, FaUser } from 'react-icons/fa';
import './Home.css';

const Home = () => {
  const usuarios = [
    { nome: 'Jane Cooper', empresa: 'Microsoft', telefone: '(225) 555-0118', email: 'jane@microsoft.com', pais: 'United States', status: 'Active' },
    { nome: 'Floyd Miles', empresa: 'Yahoo', telefone: '(205) 555-0100', email: 'floyd@yahoo.com', pais: 'Kiribati', status: 'Inactive' },
    { nome: 'Ronald Richards', empresa: 'Adobe', telefone: '(302) 555-0107', email: 'ronald@adobe.com', pais: 'Israel', status: 'Inactive' },
    { nome: 'Marvin McKinney', empresa: 'Tesla', telefone: '(252) 555-0126', email: 'marvin@tesla.com', pais: 'Iran', status: 'Active' },
  ];

  return (
    <div className="home-container">
      
      {/* Sidebar */}
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
          </ul>
        </nav>
        <div className="user-info">
          <img src="https://i.pravatar.cc/40" alt="Evano" />
          <div>Evano<br /><small>Project Manager</small></div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header>
          <h1>Hello Evano 👋</h1>
          <div className="cards">
            <div className="card">
              <FaUsers size={24} />
              <div>
                <h3>10</h3>
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
          </div>
        </header>

        <section className="usuarios-section">
          <div className="usuarios-header">
            <h2>Usuários</h2>
            <input type="text" placeholder="Search" />
          </div>
          <table className="usuarios-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Company</th>
                <th>Phone Number</th>
                <th>Email</th>
                <th>Country</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((user, index) => (
                <tr key={index}>
                  <td>{user.nome}</td>
                  <td>{user.empresa}</td>
                  <td>{user.telefone}</td>
                  <td>{user.email}</td>
                  <td>{user.pais}</td>
                  <td>
                    <span className={user.status === 'Active' ? 'status-active' : 'status-inactive'}>
                      {user.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <button>{'<'}</button>
            <button className="active">1</button>
            <button>2</button>
            <button>3</button>
            <button>4</button>
            <button>...</button>
            <button>40</button>
            <button>{'>'}</button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
