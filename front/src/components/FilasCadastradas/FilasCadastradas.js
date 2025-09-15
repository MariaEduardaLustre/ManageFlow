// src/components/FilasCadastradas/FilasCadastradas.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaPlus, FaSearch } from 'react-icons/fa';
import Menu from '../Menu/Menu';
import api from '../../services/api';
import './FilasCadastradas.css';

const FilasCadastradas = () => {
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada') || 'null');
  const idEmpresa = empresaSelecionada?.ID_EMPRESA || null;

  useEffect(() => {
    if (!idEmpresa) {
      setError('Nenhuma empresa selecionada.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/configuracao/filas', { params: { idEmpresa } });
        setFilas(Array.isArray(data) ? data : []);
      } catch (err) {
        const msg = err.response?.data?.erro || err.message;
        setError(`Erro ao carregar: ${msg}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [idEmpresa]);

  const isLinkActive = (path) => location.pathname === path;
  const handleEditFila = (id_conf_fila) => navigate(`/configuracao/${id_conf_fila}`);

  return (
    <div className="dashboard-container">
      <Menu />

      <main className="main-content">
        <div className="content-wrapper">
          <div className="cards-section">
            <div className="card total-filas">
              <div className="card-text">
                <p>Total de filas</p>
                <h3>{filas.length}</h3>
              </div>
            </div>
            <div className="card add-fila" onClick={() => navigate('/configuracao')}>
              <FaPlus className="card-icon" />
              <div className="card-text"><p>Adicionar fila</p></div>
            </div>
          </div>

          <div className="page-content">
            <h2>Configurações de fila</h2>

            <div className="search-sort-section">
              <div className="search-bar">
                <FaSearch />
                <input type="text" placeholder="Search" />
              </div>
              <div className="sort-by">Short by: <select><option>Newest</option></select></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Nome da fila</th>
                  <th>ID Conf.</th>
                  <th>Link de entrada</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center' }}>Carregando…</td></tr>
                ) : error ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', color: 'red' }}>{error}</td></tr>
                ) : filas.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center' }}>Nenhuma configuração encontrada.</td></tr>
                ) : filas.map((f) => (
                  <tr key={f.id_conf_fila}>
                    <td onClick={() => handleEditFila(f.id_conf_fila)} style={{ cursor: 'pointer', color: '#007bff', textDecoration: 'underline' }}>
                      {f.nome_fila}
                    </td>
                    <td>{f.id_conf_fila}</td>
                    <td>
                      {f.join_url ? (
                        <>
                          <a href={f.join_url} target="_blank" rel="noreferrer">{f.join_url}</a>
                          <button
                            style={{ marginLeft: 8 }}
                            onClick={() => navigator.clipboard.writeText(f.join_url)}
                          >
                            Copiar
                          </button>
                        </>
                      ) : '—'}
                    </td>
                    <td>{f.situacao ? 'Ativa' : 'Inativa'}</td>
                    <td>
                      <button onClick={() => handleEditFila(f.id_conf_fila)}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <span>Mostrando {filas.length} itens</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FilasCadastradas;
