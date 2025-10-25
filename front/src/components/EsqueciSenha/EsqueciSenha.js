// Ficheiro: EsqueciSenha.js (Versão Completa)
import React, { useState } from 'react';
import api from '../../services/api';
import './EsqueciSenha.css'; // O CSS que vamos atualizar

const EsqueciSenha = () => {
  const [email, setEmail] = useState('');
  
  // --- Nossos estados ---
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false); 
  const [sucesso, setSucesso] = useState(false);  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagem('');
    setErro('');
    setLoading(true); 

    try {
      const response = await api.post('/esqueci-senha', { email });
      
      if (response.data && response.data.message) {
        setMensagem(response.data.message);
      } else {
        setMensagem('Link enviado com sucesso!'); // Mensagem padrão
      }
      setSucesso(true); // <<< SUCESSO! Isto vai esconder o formulário

    } catch (error) {
      if (error.response && error.response.data) {
        const errorMessage = error.response.data.message || error.response.data;
        setErro(errorMessage);
      } else {
        setErro('Ocorreu um erro ao solicitar a redefinição de senha.');
      }
    } finally {
      setLoading(false); // Re-ativa o botão
    }
  };

  return (
    <div className="esqueci-senha-container">
      <h2>Esqueci minha senha</h2>

      {sucesso ? (
        
        // --- TELA DE SUCESSO ---
        // AQUI ESTÁ A MUDANÇA: Adicionamos a className "mensagem-card"
        <div className="mensagem-card"> 
          <p className="mensagem-sucesso">{mensagem}</p>
          <p>
            <a href="/login">Voltar para o Login</a>
          </p>
        </div>

      ) : (

        // --- TELA DO FORMULÁRIO ---
        <>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">E-mail:</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu e-mail" // Adicionando placeholder
                required
                disabled={loading} // Desativa input
              />
            </div>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading} // Desativa botão
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>
        
          {/* Mostra o erro aqui em baixo */}
          {erro && <p className="mensagem-erro">{erro}</p>}

          <p>Lembrou a senha? <a href="/login">Fazer login</a></p>
        </>
      )}
    </div>
  );
};

export default EsqueciSenha;