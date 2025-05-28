import React, { useState } from 'react';
import './Cadastro.css';
import api from '../../services/api';
import { AiFillEye, AiFillEyeInvisible } from 'react-icons/ai';

const Cadastro = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpfCnpj: '',
    senha: '',
    confirmarSenha: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: ''
  });
  const [mostrarModalErro, setMostrarModalErro] = useState(false);
  const [mensagemErroModal, setMensagemErroModal] = useState('');
  const [mostrarModalSucesso, setMostrarModalSucesso] = useState(false);
  const [mensagemSucessoModal, setMensagemSucessoModal] = useState('');
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [senhaValida, setSenhaValida] = useState(true);
  const [senhasCoincidem, setSenhasCoincidem] = useState(true);
  const [cpfCnpjValido, setCpfCnpjValido] = useState(true);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === 'senha') {
      setSenhaValida(validarSenhaSegura(value));
      if (formData.confirmarSenha) {
        setSenhasCoincidem(value === formData.confirmarSenha);
      }
    } else if (name === 'confirmarSenha') {
      setSenhasCoincidem(value === formData.senha);
    } else if (name === 'cpfCnpj') {
      setCpfCnpjValido(value ? validarCPF(value) : true);
    }
  };

  const limparCampos = () => {
    setFormData({
      nome: '',
      email: '',
      cpfCnpj: '',
      senha: '',
      confirmarSenha: '',
      cep: '',
      endereco: '',
      numero: '',
      complemento: '',
    });
  };

  const validarCPF = (cpf) => {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || Array.from(cpf).every(char => char === cpf[0])) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
    let resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.charAt(10))) return false;
    return true;
  };

  const validarSenhaSegura = (senha) => {
    const temOitoCaracteres = senha.length >= 8;
    const temLetraMaiuscula = /[A-Z]/.test(senha);
    const temCaractereEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(senha);
    return temOitoCaracteres && temLetraMaiuscula && temCaractereEspecial;
  };

  const buscarEndereco = async (cep) => {
    cep = cep.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setFormData({ ...formData, endereco: data.logradouro || '' });
      } else {
        setMensagemErroModal('CEP não encontrado.');
        setMostrarModalErro(true);
        setFormData({ ...formData, endereco: '' });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      setMensagemErroModal('Erro ao buscar CEP.');
      setMostrarModalErro(true);
      setFormData({ ...formData, endereco: '' });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validarSenhaSegura(formData.senha)) {
      setMensagemErroModal('A senha deve conter no mínimo 8 caracteres, uma letra maiúscula e um caractere especial.');
      setMostrarModalErro(true);
      return;
    }

    if (formData.senha !== formData.confirmarSenha) {
      setMensagemErroModal('As senhas não coincidem!');
      setMostrarModalErro(true);
      return;
    }

    if (formData.cpfCnpj && !validarCPF(formData.cpfCnpj)) {
      setMensagemErroModal('CPF inválido!');
      setMostrarModalErro(true);
      return;
    }

    setMostrarConfirmacao(true);
  };

  const confirmarCadastro = async () => {
    setMostrarConfirmacao(false);
    setMostrarModalErro(false);
    setMensagemErroModal('');
    setMostrarModalSucesso(false);
    setMensagemSucessoModal('');

    try {
      const response = await api.post('/usuarios', formData);
      setMensagemSucessoModal(response.data);
      setMostrarModalSucesso(true);
      limparCampos();
    } catch (error) {
      console.error('Erro no cadastro:', error);
      if (error.response && error.response.data) {
        setMensagemErroModal(error.response.data);
      } else {
        setMensagemErroModal('Ocorreu um erro ao cadastrar o usuário.');
      }
      setMostrarModalErro(true);
    }
  };

  const cancelarCadastro = () => {
    setMostrarConfirmacao(false);
  };

  const fecharModalSucesso = () => {
    setMostrarModalSucesso(false);
  };

  const fecharModalErro = () => {
    setMostrarModalErro(false);
  };

  const alternarMostrarSenha = () => {
    setMostrarSenha(!mostrarSenha);
  };

  const alternarMostrarConfirmarSenha = () => {
    setMostrarConfirmarSenha(!mostrarConfirmarSenha);
  };

  return (
    <div className="cadastro-container">
      <div className="image-container-cad">
        <img src="/imagens/cadastro.png" alt="Curva lateral" className="responsive-image-cad" />
      </div>
      <div className="spacer"></div>
      <div className="form-container">
        <h2>Cadastro</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nome">Nome Completo:</label>
            <input type="text" name="nome" value={formData.nome} onChange={handleChange} required id="nome" />
          </div>
          <div className="form-group">
            <label htmlFor="email">E-mail:</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required id="email" />
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
              onBlur={(e) => {
                if (e.target.value && !validarCPF(e.target.value)) {
                  setMensagemErroModal('CPF ou CNPJ inválidos!');
                  setMostrarModalErro(true);
                }
              }}
            />
            {!cpfCnpjValido && formData.cpfCnpj.length > 0 && (
              <p className="mensagem-alerta">CPF ou CNPJ inválidos!</p>
            )}
          </div>
          <div className="form-group senha-container">
          <label htmlFor="senha">Senha:</label>
          <input
            type={mostrarSenha ? 'text' : 'password'}
            name="senha"
            value={formData.senha}
            onChange={handleChange}
            required
            id="senha"
          />
          <button
            type="button"
            className="mostrar-senha-btn"
            onClick={alternarMostrarSenha}
            tabIndex={-1}
          >
            {mostrarSenha ? <AiFillEyeInvisible /> : <AiFillEye />}
          </button>
          {!senhaValida && formData.senha.length > 0 && (
            <p className="mensagem-alerta">
              A senha deve conter no mínimo 8 caracteres, uma letra maiúscula e um caracter especial.
            </p>
          )}
        </div>

        <div className="form-group senha-container">
          <label htmlFor="confirmarSenha">Confirmar Senha:</label>
          <input
            type={mostrarConfirmarSenha ? 'text' : 'password'}
            name="confirmarSenha"
            value={formData.confirmarSenha}
            onChange={handleChange}
            required
            id="confirmarSenha"
          />
          <button
            type="button"
            className="mostrar-senha-btn"
            onClick={alternarMostrarConfirmarSenha}
            tabIndex={-1}
          >
            {mostrarConfirmarSenha ? <AiFillEyeInvisible /> : <AiFillEye />}
          </button>
          {!senhasCoincidem && formData.confirmarSenha.length > 0 && (
            <p className="mensagem-alerta">As senhas não coincidem!</p>
          )}
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
              onBlur={(e) => buscarEndereco(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="endereco">Logradouro:</label>
            <input
              type="text"
              name="endereco"
              value={formData.endereco}
              onChange={handleChange}
              required
              id="endereco"
            />
          </div>
          <div className="form-group">
            <label htmlFor="numero">Número:</label>
            <input type="text" name="numero" value={formData.numero} onChange={handleChange} required id="numero" />
          </div>
          <div className="form-group">
            <label htmlFor="complemento">Complemento:</label>
            <input
              type="text"
              name="complemento"
              value={formData.complemento}
              onChange={handleChange}
              id="complemento"
            />
          </div>

          <button className="botao" type="submit">Cadastrar</button>
        </form>
        <p className="link-login">
          Já possui uma conta? <a href="/login">Faça Login Aqui!</a>
        </p>
      </div>

      {mostrarConfirmacao && (
        <div className="modal-overlay">
          <div className="modal confirmacao">
            <p className="mensagem-confirmacao">Deseja confirmar o cadastro?</p>
            <div className="botoes-confirmacao">
              <button onClick={confirmarCadastro} className="btn-confirmar">Sim, Cadastrar</button>
              <button onClick={cancelarCadastro} className="btn-cancelar">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {mostrarModalSucesso && mensagemSucessoModal && (
        <div className="modal-overlay">
          <div className="modal sucesso">
            <p className="mensagem-sucesso">{mensagemSucessoModal}</p>
            <button onClick={fecharModalSucesso} className="btn-fechar-modal">Fechar</button>
          </div>
        </div>
      )}

      {mostrarModalErro && mensagemErroModal && (
        <div className="modal-overlay">
          <div className="modal erro">
            <p className="mensagem-erro">{mensagemErroModal}</p>
            <button onClick={fecharModalErro} className="btn-fechar-modal">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cadastro;