import React, { useState } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './Cadastro.css';

const Cadastro = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpfCnpj: '',
    senha: '',
    confirmarSenha: '',
    cep: '',
    numero: '',
    endereco: '',
    complemento: ''
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const maskCpfCnpj = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
  };

  const maskCep = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/^(\d{5})(\d{1,3})$/, '$1-$2');
  };

  const validateField = (name, value) => {
    let error = '';

    switch (name) {
      case 'nome':
        if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(value)) {
          error = 'O nome não pode conter números ou símbolos.';
        } else if (value.length < 3) {
          error = 'O nome deve ter pelo menos 3 caracteres.';
        }
        break;

      case 'email':
        if (!/\S+@\S+\.\S+/.test(value)) {
          error = 'E-mail inválido.';
        }
        break;

      case 'cpfCnpj':
        if (value.replace(/\D/g, '').length < 11) {
          error = 'CPF/CNPJ incompleto.';
        }
        break;

      case 'senha':
        if (value.length < 6) {
          error = 'A senha deve ter pelo menos 6 caracteres.';
        }
        break;

      case 'confirmarSenha':
        if (value !== formData.senha) {
          error = 'As senhas não coincidem.';
        }
        break;

      case 'cep':
        if (value.replace(/\D/g, '').length !== 8) {
          error = 'CEP inválido.';
        }
        break;

      case 'endereco':
        if (value.length < 5) {
          error = 'Endereço muito curto.';
        }
        break;

      default:
        break;
    }

    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    let updatedValue = value;

    if (name === 'nome') {
      updatedValue = value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, '');
    }

    if (name === 'cpfCnpj') {
      updatedValue = maskCpfCnpj(value);
    }

    if (name === 'cep') {
      updatedValue = maskCep(value);
    }

    if (name === 'numero') {
      updatedValue = value.replace(/\D/g, '');
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: updatedValue
    }));

    if (touched[name]) {
      const error = validateField(name, updatedValue);
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: error
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;

    setTouched((prevTouched) => ({
      ...prevTouched,
      [name]: true
    }));

    const error = validateField(name, value);
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: error
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) {
        newErrors[key] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const response = await api.post('/usuarios', formData);
      alert(response.data);
      navigate('/login');
    } catch (err) {
      console.error(err);
      alert('Erro ao cadastrar usuário.');
    }
  };

  return (
    <div className="cadastro-container">
      <div className="image-container-cadastro">
        <img src="/imagens/teste.png" alt="Curva lateral" className="responsive-image-cadastro" />
      </div>

      <div className="spacer-cadastro"></div>

      <div className="form-container-cadastro">
        <h2>Cadastro</h2>
        <form onSubmit={handleSubmit}>
          {[
            { label: 'Nome', name: 'nome', type: 'text' },
            { label: 'E-mail', name: 'email', type: 'email' },
            { label: 'CPF/CNPJ', name: 'cpfCnpj', type: 'text' },
            { label: 'Senha', name: 'senha', type: 'password' },
            { label: 'Confirmar Senha', name: 'confirmarSenha', type: 'password' },
            { label: 'CEP', name: 'cep', type: 'text' },
            { label: 'Número', name: 'numero', type: 'text' },
            { label: 'Complemento', name: 'complemento', type: 'text' },
            { label: 'Endereço', name: 'endereco', type: 'text' }
          ].map(({ label, name, type }) => (
            <div className="form-group" key={name}>
              <label htmlFor={name}>{label}:</label>
              <input
                type={type}
                id={name}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
              {errors[name] && touched[name] && (
                <div className="error-message">{errors[name]}</div>
              )}
            </div>
          ))}

          <button className="btn-primary" type="submit">Cadastrar</button>
        </form>

        <p>
          Já possui uma conta? <a href="/login">Faça Login Aqui!</a>
        </p>
      </div>
    </div>
  );
};

export default Cadastro;
