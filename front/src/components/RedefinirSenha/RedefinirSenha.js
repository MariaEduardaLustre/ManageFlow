// Ficheiro: RedefinirSenha.js (Versão Completa)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './RedefinirSenha.css'; // O CSS que vamos atualizar

const RedefinirSenha = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  
  // --- Nossos estados ---
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false); // Para esconder o formulário

  // Validação
  const [senhaValida, setSenhaValida] = useState(true);
  const [senhasCoincidem, setSenhasCoincidem] = useState(true);

  const validarSenhaSegura = (senha) => {
    const temOitoCaracteres = senha.length >= 8;
    const temLetraMaiuscula = /[A-Z]/.test(senha);
    const temCaractereEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(senha);
    return temOitoCaracteres && temLetraMaiuscula && temCaractereEspecial;
  };

  const handleChangeNovaSenha = (e) => {
    const value = e.target.value;
    setNovaSenha(value);
    setSenhaValida(validarSenhaSegura(value));
    if (confirmarNovaSenha) {
      setSenhasCoincidem(value === confirmarNovaSenha);
    }
  };

  const handleChangeConfirmarNovaSenha = (e) => {
    const value = e.target.value;
    setConfirmarNovaSenha(value);
    setSenhasCoincidem(value === novaSenha);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagem('');
    setErro('');

    if (!validarSenhaSegura(novaSenha)) {
      setErro('A nova senha deve conter no mínimo 8 caracteres, uma letra maiúscula e um caractere especial.');
      return;
    }
    if (novaSenha !== confirmarNovaSenha) {
      setErro('As senhas não coincidem!');
      return;
    }

    setLoading(true); 

    try {
      const response = await api.post('/redefinir-senha', { token, novaSenha });
      
      if (response.data && response.data.message) {
        setMensagem(response.data.message);
      } else {
        setMensagem('Senha redefinida com sucesso!'); // Mensagem padrão
      }
      setSucesso(true); // <<< SUCESSO! Isto vai esconder o formulário

    } catch (error) {
      console.error('Erro ao redefinir a senha:', error);
      if (error.response && error.response.data) {
        const errorMessage = error.response.data.error || error.response.data.message || error.response.data;
        setErro(errorMessage);
      } else {
        setErro('Ocorreu um erro ao redefinir a senha.');
      }
    } finally {
      setLoading(false); // Re-ativa botões
    }
  };

  return (
    <div className="redefinir-senha-container">
      <h2>Redefinir Senha</h2>

      {sucesso ? (
        
        // --- TELA DE SUCESSO ---
        // AQUI ESTÁ A MUDANÇA: Adicionamos a className "mensagem-card"
        <div className="mensagem-card"> 
          <p className="mensagem-sucesso">{mensagem}</p>
          <button onClick={() => navigate('/login')} className="btn-primary">
            Ir para Login
          </button>
        </div>

      ) : (

        // --- TELA DO FORMULÁRIO ---
        <>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="novaSenha">Nova Senha:</label>
              <input
                type="password"
                id="novaSenha"
                value={novaSenha}
                onChange={handleChangeNovaSenha}
                required
                disabled={loading}
              />
              {!senhaValida && novaSenha.length > 0 && (
                <p className="mensagem-alerta">
                  A senha deve conter no mínimo 8 caracteres, uma letra maiúscula e um caractere especial.
                </p>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="confirmarNovaSenha">Confirmar Nova Senha:</label>
              <input
                type="password"
                id="confirmarNovaSenha"
                value={confirmarNovaSenha}
                onChange={handleChangeConfirmarNovaSenha}
                required
                disabled={loading}
              />
              {!senhasCoincidem && confirmarNovaSenha.length > 0 && (
                <p className="mensagem-alerta">As senhas não coincidem!</p>
              )}
            </div>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Redefinir Senha'}
            </button>
          </form>
          {erro && <p className="mensagem-erro">{erro}</p>}
        </>
      )}
    </div>
  );
};

export default RedefinirSenha;