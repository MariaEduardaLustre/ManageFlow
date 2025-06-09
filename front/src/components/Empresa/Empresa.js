import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './Empresa.css';

const Empresa = ({ idUsuario }) => {
  const [empresas, setEmpresas] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [novaEmpresa, setNovaEmpresa] = useState({
    nome: '',
    cnpj: '',
    email: '',
    ddi: '',
    ddd: '',
    telefone: '',
    endereco: '',
    numero: '',
    logo: ''
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchEmpresas() {
      try {
        const response = await api.get(`/empresas/empresas-do-usuario/${idUsuario}`);
        setEmpresas(response.data);
      } catch (error) {
        console.error('Erro ao buscar empresas', error);
      }
    }

    fetchEmpresas();
  }, [idUsuario]);

  const escolherEmpresa = (empresa) => {
    localStorage.setItem('empresaSelecionada', JSON.stringify(empresa));
    navigate('/home');
  };

  const criarEmpresa = async () => {
    const {
      nome,
      cnpj,
      email,
      ddi,
      ddd,
      telefone,
      endereco,
      numero,
      logo
    } = novaEmpresa;

    if (!nome || !cnpj || !email) {
      alert('Preencha os campos obrigatórios: nome, CNPJ e email.');
      return;
    }

    try {
        const idUsuario = Number(localStorage.getItem('idUsuario'));
      const response = await api.post('/empresas/criar-empresa', {
        nomeEmpresa: nome,
        cnpj,
        email,
        ddi,
        ddd,
        telefone,
        endereco,
        numero,
        logo,
        idUsuario
      });
      
      const idEmpresa = response.data.idEmpresa;

      const nova = {
        ID_EMPRESA: idEmpresa,
        NOME_EMPRESA: nome,
        NOME_PERFIL: 'Administrador',
        NIVEL: 1
      };

      escolherEmpresa(nova);
    } catch (error) {
      console.error('Erro ao criar empresa', error);
      alert('Erro ao criar empresa.');
    }
  };

  return (
    <div className="empresa-container">
      <h2>Escolha uma empresa</h2>

      {empresas.length === 0 ? (
        <p>Nenhuma empresa encontrada para este usuário.</p>
      ) : (
        <div className="empresa-lista">
          {empresas.map((empresa) => (
            <div key={empresa.ID_EMPRESA} className="empresa-item">
              <strong>{empresa.NOME_EMPRESA}</strong>
              <p>{empresa.NOME_PERFIL} (Nível {empresa.NIVEL})</p>
              <button onClick={() => escolherEmpresa(empresa)}>Entrar</button>
            </div>
          ))}
        </div>
      )}

      <div className="nova-empresa">
        <button onClick={() => setMostrarFormulario(!mostrarFormulario)}>
          {mostrarFormulario ? 'Cancelar' : 'Criar nova empresa'}
        </button>

        {mostrarFormulario && (
          <div className="formulario-criacao">
            <h3>Nova Empresa</h3>
            <input
              type="text"
              placeholder="Nome da empresa"
              value={novaEmpresa.nome}
              onChange={(e) => setNovaEmpresa({ ...novaEmpresa, nome: e.target.value })}
            />
            <input
              type="text"
              placeholder="CNPJ"
              value={novaEmpresa.cnpj}
              onChange={(e) => setNovaEmpresa({ ...novaEmpresa, cnpj: e.target.value })}
            />
            <input
              type="email"
              placeholder="Email da empresa"
              value={novaEmpresa.email}
              onChange={(e) => setNovaEmpresa({ ...novaEmpresa, email: e.target.value })}
            />
            <input
              type="text"
              placeholder="DDI"
              value={novaEmpresa.ddi}
              onChange={(e) => setNovaEmpresa({ ...novaEmpresa, ddi: e.target.value })}
            />
            <input
              type="text"
              placeholder="DDD"
              value={novaEmpresa.ddd}
              onChange={(e) => setNovaEmpresa({ ...novaEmpresa, ddd: e.target.value })}
            />
            <input
              type="text"
              placeholder="Telefone"
              value={novaEmpresa.telefone}
              onChange={(e) => setNovaEmpresa({ ...novaEmpresa, telefone: e.target.value })}
            />
            <input
              type="text"
              placeholder="Endereço"
              value={novaEmpresa.endereco}
              onChange={(e) => setNovaEmpresa({ ...novaEmpresa, endereco: e.target.value })}
            />
            <input
              type="text"
              placeholder="Número"
              value={novaEmpresa.numero}
              onChange={(e) => setNovaEmpresa({ ...novaEmpresa, numero: e.target.value })}
            />
            <input
              type="text"
              placeholder="Logo (URL)"
              value={novaEmpresa.logo}
              onChange={(e) => setNovaEmpresa({ ...novaEmpresa, logo: e.target.value })}
            />

            <button onClick={criarEmpresa}>Salvar e Entrar</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Empresa;
