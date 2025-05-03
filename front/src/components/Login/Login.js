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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/usuarios/login', formData);
      const { token } = response.data;
      localStorage.setItem('token', token);
      setMensagemSucessoModal('Login realizado com sucesso!');
      setMostrarModalSucesso(true);
      setFormData({ email: '', senha: '' }); // Limpa os campos após o login
      // navigate('/home'); // A navegação agora ocorrerá após fechar o modal de sucesso
    } catch (err) {
      setMensagemErroModal('E-mail ou senha inválidos.');
      setMostrarModalErro(true);
    }
  };

  const fecharModalErro = () => {
    setMostrarModalErro(false);
    setMensagemErroModal('');
  };

  const fecharModalSucesso = () => {
    setMostrarModalSucesso(false);
    setMensagemSucessoModal('');
    navigate('/home'); // Navega para a home após fechar o modal de sucesso
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

          <button className="btn-primary" type="submit">Entrar</button>
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