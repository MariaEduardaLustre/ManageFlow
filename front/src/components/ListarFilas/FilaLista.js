import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import Menu from '../Menu/Menu';
import './FilaLista.css';

/* Datas */
const formatarDataParaExibicao = (val) => {
  if (val === null || val === undefined || val === '') return 'N/A';
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  const s = String(val);
  if (/^\d{8}$/.test(s)) {
    const yy = s.slice(0, 4), mm = s.slice(4, 6), dd = s.slice(6, 8);
    return `${dd}/${mm}/${yy}`;
  }
  return s;
};
const formatarDataParaURL = (val) => {
  if (val === null || val === undefined || val === '') return '';
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  }
  const s = String(val);
  if (/^\d{8}$/.test(s)) return s;
  return '';
};

const FilaLista = () => {
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada') || 'null');
  const idEmpresa = empresaSelecionada?.ID_EMPRESA;

  useEffect(() => {
    if (!idEmpresa) {
      navigate('/escolher-empresa');
      return;
    }

    const fetchFilas = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(`/empresas/filas/${idEmpresa}`);
        setFilas(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.response?.status === 404) {
          setFilas([]);
        } else {
          console.error('Erro ao buscar filas:', err);
          setError('Não foi possível carregar as filas. Tente novamente mais tarde.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFilas();
  }, [idEmpresa, navigate]);

  return (
    <div className="home-container">
      <Menu />

      <main className="main-content">
        <section className="filas-section">
          <h2 className="section-title">Filas</h2>

          {loading && <p>Carregando filas...</p>}
          {error && <p className="fila-lista-error">{error}</p>}

          {!loading && filas.length === 0 && !error && (
            <p>Nenhuma fila disponível para esta empresa.</p>
          )}

          {!loading && filas.length > 0 && (
            <table className="filas-table">
              <thead>
                <tr>
                  <th>NOME DA FILA</th>
                  <th>DATA INÍCIO FILA</th>
                  <th>DATA FIM FILA</th>
                  <th>AGUARDANDO</th>
                  <th>BLOQUEADA</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => {
                  const dtMovto = formatarDataParaURL(fila.DT_MOVTO);

                  return (
                    <tr
                      key={`${fila.ID_FILA}-${fila.DT_MOVTO}`}
                      onClick={() =>
                        navigate(`/gestao-fila/${fila.ID_EMPRESA}/${dtMovto}/${fila.ID_FILA}`)
                      }
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{fila.NOME_FILA}</td>
                      <td>{formatarDataParaExibicao(fila.DT_INI)}</td>
                      <td>{formatarDataParaExibicao(fila.FIM_VIG)}</td>
                      <td>{Number(fila.QTDE_AGUARDANDO) || 0}</td>
                      <td>{fila.BLOCK ? 'Sim' : 'Não'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
};

export default FilaLista;
