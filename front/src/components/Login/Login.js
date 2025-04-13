import React, { useState } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';



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
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>
      <input name="email" type="email" placeholder="E-mail" value={formData.email} onChange={handleChange} required />
      <input name="senha" type="password" placeholder="Senha" value={formData.senha} onChange={handleChange} required />
      <button type="submit">Entrar</button>
    </form>
  );
};

export default Login;
