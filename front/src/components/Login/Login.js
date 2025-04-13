import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import para redirecionamento
import './Login.css';
import axios from 'axios';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    senha: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Limpa qualquer erro anterior

    try {
      const response = await axios.post('http://localhost:3001/auth/login', formData);
      const { token } = response.data;

      // Salvar o token no localStorage ou sessionStorage
      localStorage.setItem('authToken', token);

      // Redirecionar para a página principal ou outra página protegida
      navigate('/Cadastro'); // Exemplo de rota após o login
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      if (error.response && error.response.data && error.response.data.message) {
        setError(error.response.data.message);
      } else {
        setError('Erro ao fazer login. Verifique suas credenciais e tente novamente.');
      }
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
        {error && <p className="error-message">{error}</p>}
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