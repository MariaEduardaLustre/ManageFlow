import React, { useEffect, useState } from 'react';
import Menu from '../Menu/Menu';
import {  FaCog, FaTv, FaChartBar, FaClipboardList, FaUser, FaSignOutAlt, FaTrash, FaPlus } from 'react-icons/fa';
import api from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';
 
const Home = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [novoUsuario, setNovoUsuario] = useState('');
  const [mostrarModalEmpresa, setMostrarModalEmpresa] = useState(false);
  const [detalhesEmpresa, setDetalhesEmpresa] = useState(null);
  const navigate = useNavigate();


  const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
  const idEmpresa = empresaSelecionada?.ID_EMPRESA;
  const nomeEmpresa = empresaSelecionada?.NOME_EMPRESA;
  const nivel = Number(empresaSelecionada?.NIVEL);


  useEffect(() => {
    async function fetchUsuarios() {
      try {
        if (!idEmpresa) {
          navigate('/empresas');
          return;
        }
        const response = await api.get(`/empresa/${idEmpresa}`);
        setUsuarios(response.data);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        alert('Não foi possível carregar os usuários. Tente novamente mais tarde.');
      }
    }


    fetchUsuarios();
  }, [idEmpresa, navigate]);


  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('idUsuario');
    localStorage.removeItem('empresaSelecionada');
    navigate('/');
  };


  const adicionarUsuario = async () => {
    if (!novoUsuario) {
      alert('Por favor, insira o CPF ou E-mail do usuário.');
      return;
    }
    try {
      await api.post(`/empresa/${idEmpresa}/adicionar-usuario`, {
        cpfOuEmail: novoUsuario,
      });
      setNovoUsuario('');
      const response = await api.get(`/empresa/${idEmpresa}`);
      setUsuarios(response.data);
      alert('Usuário adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar usuário:', error);
      alert('Erro ao adicionar usuário. Verifique se o CPF/E-mail está correto ou se o usuário já faz parte da empresa.');
    }
  };


  const removerUsuario = async (idUsuarioRemover) => {
    if (!window.confirm('Tem certeza que deseja remover este usuário da empresa?')) {
      return;
    }
    try {
      await api.delete(`/empresa/${idEmpresa}/remover-usuario/${idUsuarioRemover}`);
      setUsuarios((prev) => prev.filter((u) => u.ID !== idUsuarioRemover));
      alert('Usuário removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      alert('Erro ao remover usuário.');
    }
  };


  const exibirDetalhesEmpresa = async () => {
    try {
      const response = await api.get(`/empresas/detalhes/${idEmpresa}`);
      setDetalhesEmpresa(response.data);
      setMostrarModalEmpresa(true);
    } catch (error) {
      console.error('Erro ao buscar detalhes da empresa:', error);
      alert('Erro ao carregar os detalhes da empresa.');
    }
  };


  return (
    <div className="home-container">
      <aside className="sidebar">
        <div className="logo"><img src="/imagens/logoManageflow.png" alt="Curva lateral" className="responsive-image" /></div>
        <nav>
          <ul>
            
            <li><FaTv />Dashboard</li>
            <li>
              <Link to="/configuracao" style={{ textDecoration: 'none', color: 'inherit' }}>
                <FaCog /> Configuração de fila
              </Link>
            </li>
            <li><FaTv /> Painel de TV</li>
            <li>
              <Link to="/filas" style={{ textDecoration: 'none', color: 'inherit' }}>
                <FaCog /> Gestão da fila
              </Link>
            </li>
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
       <Menu />


      <main className="main-content">
        {/* INÍCIO: O nome da empresa agora está aqui no main-content */}
        <h1 className="main-content-empresa-titulo" onClick={exibirDetalhesEmpresa}>
            {nomeEmpresa || 'Empresa Carregando...'}
        </h1>
        {/* FIM: O nome da empresa agora está aqui no main-content */}


        <section className="usuarios-section">
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
                <th>Complemento</th>
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
                  <td>{user.COMPLEMENTO}</td>
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


      {mostrarModalEmpresa && detalhesEmpresa && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Detalhes da Empresa</h2>
            <p><strong>Nome:</strong> {detalhesEmpresa.NOME_EMPRESA}</p>
            <p><strong>CNPJ:</strong> {detalhesEmpresa.CNPJ}</p>
            <p><strong>Email:</strong> {detalhesEmpresa.EMAIL}</p>
            <p><strong>Telefone:</strong> ({detalhesEmpresa.DDI}) {detalhesEmpresa.DDD} {detalhesEmpresa.TELEFONE}</p>
            <p><strong>Endereço:</strong> {detalhesEmpresa.ENDERECO}, {detalhesEmpresa.NUMERO}</p>
            {detalhesEmpresa.LOGO && <p><img src={detalhesEmpresa.LOGO} alt="Logo da Empresa" style={{ maxWidth: '100px', maxHeight: '100px' }} /></p>}
            <button onClick={() => setMostrarModalEmpresa(false)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};


export default Home;
