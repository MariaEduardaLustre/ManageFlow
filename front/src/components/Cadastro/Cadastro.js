import React, { useState } from 'react';
import './Cadastro.css';
import api from '../../services/api';

const Cadastro = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpfCnpj: '',
    senha: '',
    confirmarSenha: '',
    cep: '',
    logradouro: '', // Renomeado de endereco
    numero: '',
    // endereco: '' - Removido
  });
  const [mostrarModalErro, setMostrarModalErro] = useState(false);
  const [mensagemErroModal, setMensagemErroModal] = useState('');
  const [mostrarModalSucesso, setMostrarModalSucesso] = useState(false);
  const [mensagemSucessoModal, setMensagemSucessoModal] = useState('');
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);

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
      logradouro: '',
      numero: '',
      // endereco: '' - Removido
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
    const temMaiuscula = /[A-Z]/.test(senha);
    const temEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(senha);
    return temMaiuscula && temEspecial;
  };

  const buscarEndereco = async (cep) => {
    cep = cep.replace(/\D/g, ''); // Remove caracteres não numéricos do CEP
    if (cep.length !== 8) {
      return; // CEP inválido, não faz a busca
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setFormData({
          ...formData,
          logradouro: data.logradouro || '',
          // bairro: data.bairro || '', // Você pode adicionar outros campos se precisar
          // cidade: data.localidade || '',
          // uf: data.uf || '',
        });
      } else {
        setMensagemErroModal('CEP não encontrado.');
        setMostrarModalErro(true);
        setFormData({ ...formData, logradouro: '' }); // Limpa o campo de logradouro
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      setMensagemErroModal('Erro ao buscar CEP.');
      setMostrarModalErro(true);
      setFormData({ ...formData, logradouro: '' }); // Limpa o campo de logradouro
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validarSenhaSegura(formData.senha)) {
      setMensagemErroModal('A senha deve conter pelo menos uma letra maiúscula e um caractere especial.');
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

  return (
    <div className="cadastro-container">
      <div className="image-container-cad">
        <img src="/imagens/cadastro.png" alt="Curva lateral" className="responsive-image-cad" />
      </div>

      <div className="form-container">
        <h2>Cadastro</h2>
        <form onSubmit={handleSubmit}>
          {/* Campos do formulário */}
          <div className="form-group">
            <label htmlFor="nome">Nome:</label>
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
                  setMensagemErroModal('CPF inválido!');
                  setMostrarModalErro(true);
                }
              }}
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
            <label className="senha-requisitos">
              A senha deve conter pelo menos uma letra maiúscula e um caractere especial.
            </label>
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
              onBlur={(e) => buscarEndereco(e.target.value)} // Chama a função ao perder o foco
            />
          </div>
          <div className="form-group">
            <label htmlFor="logradouro">Logradouro:</label> {/* Campo de Logradouro */}
            <input
              type="text"
              name="logradouro"
              value={formData.logradouro}
              onChange={handleChange}
              required
              id="logradouro"
            />
          </div>
          <div className="form-group">
            <label htmlFor="numero">Número:</label>
            <input type="text" name="numero" value={formData.numero} onChange={handleChange} required id="numero" />
          </div>
          {/* <div className="form-group">
            <label htmlFor="endereco">Endereço:</label>
            <input type="text" name="endereco" value={formData.endereco} onChange={handleChange} required id="endereco" />
          </div> */} {/* Campo de endereço removido */}

          <button className='botao' type="submit">Cadastrar</button>
        </form>
        <p className="link-login">
          Já possui uma conta? <a href="/login">Faça Login Aqui!</a>
        </p>
      </div>

      {/* Janela de Confirmação */}
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

      {/* Modal de Sucesso */}
      {mostrarModalSucesso && mensagemSucessoModal && (
        <div className="modal-overlay">
          <div className="modal sucesso">
            <p className="mensagem-sucesso">{mensagemSucessoModal}</p>
            <button onClick={fecharModalSucesso} className="btn-fechar-modal">Fechar</button>
          </div>
        </div>
      )}

      {/* Modal de Erro */}
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