import React, { useState } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', senha: '' });
  const navigate = useNavigate();
  const [mostrarModalErro, setMostrarModalErro] = useState(false);
  const [mensagemErroModal, setMensagemErroModal] = useState('');
  const [mostrarModalSucesso, setMostrarModalSucesso] = useState(false);
  const [mensagemSucessoModal, setMensagemSucessoModal] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
  
    try {
      const response = await api.post('/usuarios/login', formData);
      const { token, idUsuario } = response.data;
  
      localStorage.setItem('token', token);
      localStorage.setItem('idUsuario', idUsuario);
  
      const empresasResponse = await api.get(`/empresas/empresas-do-usuario/${idUsuario}`);
      const empresas = empresasResponse.data;
  
      setFormData({ email: '', senha: '' });
  
      if (empresas.length === 1) {
        localStorage.setItem('empresaSelecionada', JSON.stringify(empresas[0]));
        setMensagemSucessoModal('Login realizado com sucesso!');
        setMostrarModalSucesso(true);
      } else {
        localStorage.removeItem('empresaSelecionada'); // <- ESSA LINHA NOVA É IMPORTANTE
        setMensagemSucessoModal('Login realizado! Escolha a empresa.');
        setMostrarModalSucesso(true);
      }
      
  
    } catch (err) {
      console.error(err);
      setMensagemErroModal('E-mail ou senha inválidos.');
      setMostrarModalErro(true);
    } finally {
      setLoading(false);
    }
  };
  
  const fecharModalErro = () => {
    setMostrarModalErro(false);
    setMensagemErroModal('');
  };

  const fecharModalSucesso = () => {
    setMostrarModalSucesso(false);
    setMensagemSucessoModal('');
    const empresaSelecionada = localStorage.getItem('empresaSelecionada');
    navigate(empresaSelecionada ? '/home' : '/escolher-empresa');

  };

  return (
    <div className="login-container">
      <div className="image-container-login">
        <img src="/imagens/cadastro.png" alt="Curva lateral" className="responsive-image-login" />
      </div>
      <div className="spacer"></div>
      <div className="form-container-login">
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">E-mail:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="senha">Senha:</label>
            <input
              type="password"
              name="senha"
              value={formData.senha}
              onChange={handleChange}
              required
            />
          </div>

          <button
            className="btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

        </form>

        <div className="social-login">
          <button className="btn-google">Entrar com o Google</button>
          <button className="btn-apple">Entrar com a Apple</button>
        </div>

        <p>
          Ainda não possui uma conta? <a href="/cadastro">Cadastre-se</a>
        </p>
        <p>
          Esqueceu sua senha? <a href="/esqueci-senha">Clique aqui!</a>
        </p>
      </div>

      {/* Modal de Erro */}
      {mostrarModalErro && mensagemErroModal && (
        <div className="modal-overlay">
          <div className="modal erro">
            <p className="mensagem-erro">{mensagemErroModal}</p>
            <button onClick={fecharModalErro} className="btn-fechar-modal">Fechar</button>
          </div>
        </div>
      )}

      {/* Modal de Sucesso */}
      {mostrarModalSucesso && mensagemSucessoModal && (
        <div className="modal-overlay">
          <div className="modal sucesso">
            <p className="mensagem-sucesso">{mensagemSucessoModal}</p>
            <button onClick={fecharModalSucesso} className="btn-fechar-modal">OK</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;