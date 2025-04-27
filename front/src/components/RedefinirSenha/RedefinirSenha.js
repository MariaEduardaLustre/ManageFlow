import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './RedefinirSenha.css'; // Crie este arquivo CSS

const RedefinirSenha = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    // O token já está na URL, não precisamos fazer mais nada aqui por enquanto
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagem('');
    setErro('');

    if (novaSenha !== confirmarNovaSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    try {
      const response = await api.post('/usuarios/redefinir-senha', { token, novaSenha });
      setMensagem(response.data);
      // Redirecionar para a página de login após um tempo
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      if (error.response && error.response.data) {
        setErro(error.response.data);
      } else {
        setErro('Ocorreu um erro ao redefinir a senha.');
      }
    }
  };

  return (
    <div className="redefinir-senha-container">
      <h2>Redefinir Senha</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="novaSenha">Nova Senha:</label>
          <input
            type="password"
            id="novaSenha"
            name="novaSenha"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmarNovaSenha">Confirmar Nova Senha:</label>
          <input
            type="password"
            id="confirmarNovaSenha"
            name="confirmarNovaSenha"
            value={confirmarNovaSenha}
            onChange={(e) => setConfirmarNovaSenha(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary">Redefinir Senha</button>
      </form>
      {mensagem && <p className="mensagem-sucesso">{mensagem}</p>}
      {erro && <p className="mensagem-erro">{erro}</p>}
    </div>
  );
};

export default RedefinirSenha;