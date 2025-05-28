import React, { useState } from 'react';
import './Cadastro.css';
import api from '../../services/api';
import { paisesComDdi } from '../../utils/paisesComDdi';
// Importando ícones
import { FaUser, FaEnvelope, FaIdCard, FaLock, FaMapMarkerAlt, FaHome, FaBuilding, FaPhone, FaGlobe, FaMapPin } from 'react-icons/fa'; // Ícones gerais
import { BsEyeSlashFill, BsEyeFill } from 'react-icons/bs'; 
import { MdConfirmationNumber } from "react-icons/md"; 

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
    complemento: '',
    ddi: '',
    ddd: '',
    telefone: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      nome: '', email: '', cpfCnpj: '', senha: '', confirmarSenha: '',
      cep: '', endereco: '', numero: '', complemento: '',
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
    return senha.length >= 8;
  };

  const buscarEndereco = async (cep) => {
    cep = cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      setFormData(prev => ({ ...prev, endereco: '', numero: '', complemento: '' }));
      return;
    }
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro || '',
        }));
      } else {
        setMensagemErroModal('CEP não encontrado.');
        setMostrarModalErro(true);
        setFormData(prev => ({ ...prev, endereco: '', numero: '', complemento: '' }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      setMensagemErroModal('Erro ao buscar CEP.');
      setMostrarModalErro(true);
      setFormData(prev => ({ ...prev, endereco: '', numero: '', complemento: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.email || !formData.cpfCnpj || !formData.senha || !formData.confirmarSenha || !formData.cep || !formData.endereco || !formData.numero) {
      setMensagemErroModal('Por favor, preencha todos os campos obrigatórios.');
      setMostrarModalErro(true);
      return;
    }
    if (!validarSenhaSegura(formData.senha)) {
      setMensagemErroModal('A senha deve conter no mínimo 8 caracteres.');
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
    try {
      const response = await api.post('/usuarios', formData);
      setMensagemSucessoModal(response.data.message || "Cadastro realizado com sucesso!");
      setMostrarModalSucesso(true);
      limparCampos();
    } catch (error) {
      console.error('Erro no cadastro:', error);
      if (error.response && error.response.data) {
        setMensagemErroModal(error.response.data.message || error.response.data);
      } else {
        setMensagemErroModal('Ocorreu um erro ao cadastrar o usuário.');
      }
      setMostrarModalErro(true);
    }
  };

  const cancelarCadastro = () => setMostrarConfirmacao(false);
  const fecharModalSucesso = () => setMostrarModalSucesso(false);
  const fecharModalErro = () => setMostrarModalErro(false);


  return (
    <div className="cadastro-page-container">
      <div className="cadastro-image-panel">
        <img src="/imagens/cadastro.png" alt="Decoração cadastro" className="responsive-image-cad"/>
      </div>
      <div className="cadastro-form-section">
        <div className="cadastro-form-wrapper">
          <h2 className="form-title">Cadastre-se</h2>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <FaUser className="input-icon" />
              <input name="nome" placeholder="Nome Completo" value={formData.nome} onChange={handleChange} required id="nome" />
            </div>
            <div className="form-group">
              <FaEnvelope className="input-icon" />
              <input type="email" name="email" placeholder="E-mail" value={formData.email} onChange={handleChange} required id="email" />
            </div>
            <div className="form-group">
              <FaIdCard className="input-icon" />
              <input name="cpfCnpj" placeholder="CPF/CNPJ" value={formData.cpfCnpj} onChange={handleChange} required id="cpfCnpj" />
            </div>
            <div className="form-group password-group">
              <FaLock className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                name="senha"
                placeholder="Senha"
                value={formData.senha}
                onChange={handleChange}
                required id="senha"/>
              <span onClick={() => setShowPassword(!showPassword)} className="password-toggle-icon">
                {showPassword ? <BsEyeFill /> : <BsEyeSlashFill />}
              </span>
            </div>
            <div className="form-group password-group">
              <FaLock className="input-icon" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmarSenha"
                placeholder="Confirme sua senha"
                value={formData.confirmarSenha}
                onChange={handleChange}
                required id="confirmarSenha"/>
              <span onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="password-toggle-icon">
                {showConfirmPassword ? <BsEyeFill /> : <BsEyeSlashFill />}
              </span>
            </div>

            <div className="form-row">
              <div className="form-group form-ddi">
                <FaGlobe className="input-icon" />
                <select
                  name="ddi"
                  value={formData.ddi}
                  onChange={handleChange}
                  required
                  id="ddi">
                  <option value="">Selecione o país</option>
                  {paisesComDdi.map((pais) => (
                    <option key={pais.ddi} value={pais.ddi}>
                      {pais.nome} ({pais.ddi})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group form-ddd">
                <FaMapPin className="input-icon" />
                <input
                  name="ddd"
                  placeholder="DDD"
                  value={formData.ddd}
                  onChange={handleChange}
                  required
                  id="ddd"/>
              </div>
              <div className="form-group form-telefone">
                <FaPhone className="input-icon" />
                <input
                  name="telefone"
                  placeholder="Telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  required
                  id="telefone"/>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <FaMapMarkerAlt className="input-icon" />
                <input name="cep" placeholder="CEP" value={formData.cep} onChange={handleChange} onBlur={(e) => buscarEndereco(e.target.value)} required id="cep" />
              </div>
              <div className="form-group">
                <MdConfirmationNumber className="input-icon" />
                <input name="numero" placeholder="Número" value={formData.numero} onChange={handleChange} required id="numero" />
              </div>
            </div>

            <div className="form-group">
              <FaHome className="input-icon" />
              <input name="endereco" placeholder="Endereço (Logradouro)" value={formData.endereco} onChange={handleChange} required id="endereco" />
            </div>

            <div className="form-group">
              <FaBuilding className="input-icon" />
              <input name="complemento" placeholder="Complemento (Opcional)" value={formData.complemento} onChange={handleChange} id="complemento" />
            </div> 

            <button className='btn-submit-cadastro' type="submit">Cadastrar</button>
          </form>
          <p className="login-link">
            Já possui uma conta? <a href="/login">Faça o login</a>
          </p>
        </div>
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