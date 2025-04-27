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
  const [mostrarModal, setMostrarModal] = useState(false); // Novo estado para o modal de sucesso

  useEffect(() => {
    // O token já está na URL
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagem('');
    setErro('');
    setMostrarModal(false); // Esconde o modal em caso de novas tentativas

    if (novaSenha !== confirmarNovaSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    try {
      const response = await api.post('/usuarios/redefinir-senha', { token, novaSenha });
      setMensagem(response.data);
      setMostrarModal(true); // Mostra o modal de sucesso
    } catch (error) {
      if (error.response && error.response.data) {
        setErro(error.response.data);
      } else {
        setErro('Ocorreu um erro ao redefinir a senha.');
      }
      setMostrarModal(false); // Garante que o modal não apareça em caso de erro
    }
  };

  const fecharModal = () => {
    setMostrarModal(false);
    navigate('/login'); // Redireciona para a tela de login ao fechar o modal
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
      {erro && <p className="mensagem-erro">{erro}</p>}

      {/* Renderização condicional do modal de sucesso */}
      {mostrarModal && mensagem && (
        <div className="modal-overlay">
          <div className="modal">
            <p className="mensagem-sucesso">{mensagem}</p>
            <button onClick={fecharModal} className="btn-fechar-modal">Ir para Login</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedefinirSenha;