import React, { useState } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaApple } from 'react-icons/fa';
import { FcGoogle } from "react-icons/fc";
import { BsEyeFill, BsEyeSlashFill } from 'react-icons/bs';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', senha: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [mostrarModalErro, setMostrarModalErro] = useState(false);
  const [mensagemErroModal, setMensagemErroModal] = useState('');
  const [mostrarModalSucesso, setMostrarModalSucesso] = useState(false);
  const [mensagemSucessoModal, setMensagemSucessoModal] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const response = await api.post('/login', formData);
      const { token, idUsuario } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('idUsuario', idUsuario);

      const empresasResponse = await api.get(`/empresas/empresas-do-usuario/${idUsuario}`);
      const empresas = empresasResponse.data;

      setFormData({ email: '', senha: '' });

      if (empresas.length === 1) {
        localStorage.setItem('empresaSelecionada', JSON.stringify(empresas[0]));
        setMensagemSucessoModal('Login realizado com sucesso!');
      } else {
        localStorage.removeItem('empresaSelecionada');
        setMensagemSucessoModal('Login realizado! Escolha a empresa.');
      }
      setMostrarModalSucesso(true);

    } catch (err) {
      setMensagemErroModal('E-mail ou senha inválidos.');
      setMostrarModalErro(true);
    } finally {
      setLoading(false);
    }
  };

  const fecharModalErro = () => setMostrarModalErro(false);

  const fecharModalSucesso = () => {
    setMostrarModalSucesso(false);
    const empresaSelecionada = localStorage.getItem('empresaSelecionada');
    navigate(empresaSelecionada ? '/home' : '/escolher-empresa');
  };

  return (
    <div className="login-page-container">
      <div className="login-image-panel">
        <img src="/imagens/cadastro.png" alt="Login decorativo" className="responsive-image-cad" />
      </div>

      <div className="login-form-section">
        <div className="cadastro-form-wrapper">
          <h2 className="form-title">Login</h2>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <FaEnvelope className="input-icon" />
              <input
                type="email"
                name="email"
                placeholder="E-mail"
                value={formData.email}
                onChange={handleChange}
                required/>
            </div>

            <div className="form-group password-group">
              <FaLock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="senha"
                placeholder="Senha"
                value={formData.senha}
                onChange={handleChange}/>
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle-icon">
                {showPassword ? <BsEyeFill /> : <BsEyeSlashFill />}
              </span>
            </div>
            <p className="login-link">
              Esqueceu sua senha? <a href="/esqueci-senha">Clique aqui!</a>
            </p>

            <button
              type="submit"
              className="btn-submit-cadastro"
              disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="social-login">
            <button className="btn-google">
              <FcGoogle className="social-icon" />
              Entrar com o Google
            </button>
            <button className="btn-apple">
              <FaApple className="social-icon" />
              Entrar com a Apple
            </button>
          </div>

          <p className="login-link">
            Ainda não possui uma conta? <a href="/cadastro">Cadastre-se</a>
          </p>
        </div>
      </div>

      {mostrarModalErro && mensagemErroModal && (
        <div className="modal-overlay">
          <div className="modal erro">
            <p className="mensagem-erro">{mensagemErroModal}</p>
            <button onClick={fecharModalErro} className="btn-fechar-modal">Fechar</button>
          </div>
        </div>
      )}
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
