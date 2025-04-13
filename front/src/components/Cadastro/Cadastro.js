import React, { useState } from 'react';
import './Cadastro.css';

const Cadastro = () => {
  const [formData, setFormData] = useState({
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

  const handleSubmit = (e) => {
    e.preventDefault();
    // Lógica de envio do formulário
    console.log('Dados enviados:', formData);
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
            <input
              type="email"
              name="email"
              placeholder='E-mail'
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <input
              type="text"
              name="cpfCnpj"
              placeholder='CPF/CNPJ'
              value={formData.cpfCnpj}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
          
            <input
              type="password"
              name="senha"
              placeholder='Senha'
              value={formData.senha}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
          
            <input
              type="password"
              name="confirmarSenha"
              placeholder='Confirmar Senha'
              value={formData.confirmarSenha}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
          
            <input
              type="text"
              name="cep"
              placeholder='CEP'
              value={formData.cep}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            
            <input
              type="text"
              name="numero"
              placeholder='Número'
              value={formData.numero}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
        
            <input
              type="text"
              name="endereco"
              placeholder='Endereço'
              value={formData.endereco}
              onChange={handleChange}
              required
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
