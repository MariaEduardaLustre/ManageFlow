import React, { useState } from 'react';
import './Login.css'; // Certifique-se de que o arquivo CSS ainda está importado

function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErro('');

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Login realizado com sucesso!', data);
        localStorage.setItem('accessToken', data.accessToken);
        window.location.href = '/cadastro'; // Ajuste a rota conforme necessário
      } else {
        console.error('Erro ao fazer login:', data.message);
        setErro(data.message || 'Erro ao fazer login. Verifique suas credenciais.');
      }
    } catch (error) {
      console.error('Erro de conexão:', error);
      setErro('Erro ao conectar com o servidor.');
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
        {erro && <p className="error-message">{erro}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              id="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              id="senha"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary">Entrar</button>
        </form>
        <div className="social-login">
          <button className="btn-google">
            Entrar com o Google
          </button>
          <button className="btn-apple">
            Entrar com a Apple
          </button>
        </div>
        <p className="signup-link">
          Ainda não possui uma conta? <a href="/cadastro">Cadastre-se</a>
        </p>
      </div>
    </div>
  );
}

export default Login;