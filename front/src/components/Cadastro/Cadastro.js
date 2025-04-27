import React, { useState } from 'react';
import './Cadastro.css';
import api from '../../services/api'; // adicione esse import no topo

const Cadastro = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpfCnpj: '',
    senha: '',
    confirmarSenha: '',
    cep: '',
    numero: '',
    endereco: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const limparCampos = () => {
    setFormData({
      nome: '',
      email: '',
      cpfCnpj: '',
      senha: '',
      confirmarSenha: '',
      cep: '',
      numero: '',
      endereco: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.senha !== formData.confirmarSenha) {
      alert('As senhas não coincidem!');
      return;
    }

    try {
      const response = await api.post('/usuarios', formData);
      alert(response.data); // "Usuário cadastrado com sucesso!"
      limparCampos(); // Limpa o formulário após o cadastro bem-sucedido
      // Você pode também redirecionar aqui, se desejar
      // navigate('/alguma-outra-pagina');
    } catch (err) {
      console.error(err);
      alert('Erro ao cadastrar usuário.');
    }
  };

  return (
    <div className="cadastro-container">
      <div className="image-container-cad">
        <img src="/imagens/cadastro.png" alt="Curva lateral" className="responsive-image-cad" />
      </div>

      <div className="form-container">
        <h2>Cadastro</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nome">Nome:</label>
            <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              required
              id="nome"
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">E-mail:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              id="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="cpfCnpj">CPF/CNPJ:</label>
            <input
              type="text"
              name="cpfCnpj"
              value={formData.cpfCnpj}
              onChange={handleChange}
              required
              id="cpfCnpj"
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
              id="senha"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmarSenha">Confirmar Senha:</label>
            <input
              type="password"
              name="confirmarSenha"
              value={formData.confirmarSenha}
              onChange={handleChange}
              required
              id="confirmarSenha"
            />
          </div>

          <div className="form-group">
            <label htmlFor="cep">CEP:</label>
            <input
              type="text"
              name="cep"
              value={formData.cep}
              onChange={handleChange}
              required
              id="cep"
            />
          </div>

          <div className="form-group">
            <label htmlFor="numero">Número:</label>
            <input
              type="text"
              name="numero"
              value={formData.numero}
              onChange={handleChange}
              required
              id="numero"
            />
          </div>

          <div className="form-group">
            <label htmlFor="endereco">Endereço:</label>
            <input
              type="text"
              name="endereco"
              value={formData.endereco}
              onChange={handleChange}
              required
              id="endereco"
            />
          </div>

          <button className='botao' type="submit">Cadastrar</button>
        </form>
        <p className="link-login">
          Já possui uma conta? <a href="/login">Faça Login Aqui!</a>
        </p>
      </div>

    </div>
  );
};

export default Cadastro;