import React, { useState } from 'react';
import api from '../../services/api';
import './EsqueciSenha.css'; // Crie este arquivo CSS

const EsqueciSenha = () => {
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagem('');
    setErro('');

    try {
      const response = await api.post('/usuarios/esqueci-senha', { email });
      setMensagem(response.data);
    } catch (error) {
      if (error.response && error.response.data) {
        setErro(error.response.data);
      } else {
        setErro('Ocorreu um erro ao solicitar a redefinição de senha.');
      }
    }
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
      {mensagem && <p className="mensagem-sucesso">{mensagem}</p>}
      {erro && <p className="mensagem-erro">{erro}</p>}
      <p>Lembrou a senha? <a href="/login">Fazer login</a></p>
    </div>
  );
};

export default EsqueciSenha;