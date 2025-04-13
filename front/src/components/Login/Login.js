import React, { useState } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', senha: '' });
  const navigate = useNavigate();
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/usuarios/login', formData);
      const { token } = response.data;
      localStorage.setItem('token', token);
      alert('Login realizado com sucesso!');
      navigate('/home');
    } catch (err) {
      alert('E-mail ou senha inválidos.');
    }
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
            <input
              type="email"
              name="email"
              placeholder="E-mail"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              name="senha"
              placeholder="Senha"
              value={formData.senha}
              onChange={handleChange}
              required
            />
          </div>

          <button className="btn-primary" type="submit">Entrar</button>
        </form>

        <div className="social-login">
          <button className="btn-google">Entrar com o Google</button>
          <button className="btn-apple">Entrar com a Apple</button>
        </div>

        <p>
          Ainda não possui uma conta? <a href="/cadastro">Cadastre-se</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
