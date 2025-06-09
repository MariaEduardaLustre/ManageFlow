import React, { useState } from 'react';
import api from '../../services/api';
import './EsqueciSenha.css'; // Crie este arquivo CSS

const EsqueciSenha = () => {
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false); // Novo estado para controlar a visibilidade do modal

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagem('');
    setErro('');
    setMostrarModal(false); // Esconde o modal em caso de novas tentativas

    try {
      const response = await api.post('/esqueci-senha', { email });
      setMensagem(response.data);
      setMostrarModal(true); // Mostra o modal após o sucesso
    } catch (error) {
      if (error.response && error.response.data) {
        setErro(error.response.data);
      } else {
        setErro('Ocorreu um erro ao solicitar a redefinição de senha.');
      }
      setMostrarModal(false); // Garante que o modal não apareça em caso de erro
    }
  };

  const fecharModal = () => {
    setMostrarModal(false);
  };

  return (
    <div className="esqueci-senha-container">
      <h2>Esqueci minha senha</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">E-mail:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary">Enviar link de recuperação</button>
      </form>
      {erro && <p className="mensagem-erro">{erro}</p>}

      {/* Renderização condicional do modal */}
      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal">
            <p className="mensagem-sucesso">{mensagem}</p>
            <button onClick={fecharModal} className="btn-fechar-modal">Fechar</button>
          </div>
        </div>
      )}

      <p>Lembrou a senha? <a href="/login">Fazer login</a></p>
    </div>
  );
};

export default EsqueciSenha;