import React, { useState } from 'react';
import api from '../../services/api';
import './EsqueciSenha.css'; // Crie este arquivo CSS

const EsqueciSenha = () => {
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagem('');
    setErro('');
    setMostrarModal(false);

    try {
      const response = await api.post('/esqueci-senha', { email });
      
      // ===== CORREÇÃO APLICADA AQUI =====
      // Agora ele extrai a mensagem do objeto JSON
      if (response.data && response.data.message) {
        setMensagem(response.data.message);
      } else {
        // Fallback para o caso da resposta ser um texto simples
        setMensagem(response.data);
      }
      // ===================================

      setMostrarModal(true);
    } catch (error) {
      if (error.response && error.response.data) {
        // Se o erro também vier como objeto, extraia a mensagem
        const errorMessage = error.response.data.message || error.response.data;
        setErro(errorMessage);
      } else {
        setErro('Ocorreu um erro ao solicitar a redefinição de senha.');
      }
      setMostrarModal(false);
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