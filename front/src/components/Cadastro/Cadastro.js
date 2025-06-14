import React, { useState } from 'react';
import './Cadastro.css';
import api from '../../services/api';
import { paisesComDdi } from '../../utils/paisesComDdi';
// Importando ícones
import { FaUser, FaEnvelope, FaIdCard, FaLock, FaMapMarkerAlt, FaHome, FaBuilding, FaPhone, FaGlobe, FaMapPin } from 'react-icons/fa'; // Ícones gerais
import { BsEyeSlashFill, BsEyeFill } from 'react-icons/bs';
import { MdConfirmationNumber } from "react-icons/md";
// --- IMPORTAÇÕES DO REACT BOOTSTRAP ---
import { Modal, Button } from 'react-bootstrap';

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
    telefone: '',
    // REMOVIDO: nomePet: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
  const [emailValido, setEmailValido] = useState(true);
  const [nomeValido, setNomeValido] = useState(true);
  const [camposNumericosValidos, setCamposNumericosValidos] = useState({
    cpfCnpj: true,
    cep: true,
    numero: true,
    ddd: true,
    telefone: true
  });

  const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validarNome = (nome) => {
    const apenasLetras = /^[A-Za-zÀ-ÿ\s]+$/.test(nome);
    return apenasLetras && nome.trim().length >= 3;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'email') {
      setEmailValido(validarEmail(value));
    }

    if (name === 'nome') {
      const apenasLetras = value.replace(/[^A-Za-zÀ-ÿ\s]/g, '');
      setFormData({
        ...formData,
        [name]: apenasLetras,
      });
      setNomeValido(validarNome(apenasLetras));
      return;
    }

    // REMOVIDO: Adicionado tratamento para o nome do pet para permitir letras e espaços
    // if (name === 'nomePet') {
    //   const apenasLetrasEspacos = value.replace(/[^A-Za-zÀ-ÿ\s]/g, '');
    //   setFormData({
    //     ...formData,
    //     [name]: apenasLetrasEspacos,
    //   });
    //   return;
    // }

    if (['cpfCnpj', 'cep', 'numero', 'ddd', 'telefone'].includes(name)) {
      const apenasNumeros = value.replace(/\D/g, '');
      setFormData({
        ...formData,
        [name]: apenasNumeros,
      });
      return;
    }

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
      nome: '', email: '', cpfCnpj: '', senha: '', confirmarSenha: '',
      cep: '', endereco: '', numero: '', complemento: '',
      ddi: '', ddd: '', telefone: '',
      // REMOVIDO: limpando nome do pet
      // nomePet: ''
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
    if (!formData.email || !formData.cpfCnpj || !formData.senha || !formData.confirmarSenha || !formData.cep || !formData.endereco || !formData.numero) {
      setMensagemErroModal('Por favor, preencha todos os campos obrigatórios.');
      setMostrarModalErro(true);
      return;
    }
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
    try {
      // Importante: O objeto `formData` será enviado sem o campo `nomePet`
      const response = await api.post('/usuarios', formData);
      setMensagemSucessoModal(response.data);
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

  const alternarMostrarSenha = () => {
    setShowPassword(!showPassword); // Corrigido para setShowPassword
  };

  const alternarMostrarConfirmarSenha = () => {
    setShowConfirmPassword(!showConfirmPassword); // Corrigido para setShowConfirmPassword
  };

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
              <div className="wrapper-password">
                <FaUser className="input-icon" />
                <input name="nome" placeholder="Nome Completo" value={formData.nome} onChange={handleChange} required id="nome" maxLength={100}/>
              </div>
              {!nomeValido && formData.nome.length > 0 && (
                <p className="mensagem-alerta">Digite um nome válido com pelo menos 3 letras.</p>
              )}
            </div>

            {/* REMOVIDO: Bloco do campo Nome do Pet */}
            {/*
            <div className="form-group">
              <div className="wrapper-password">
                  <FaUser className="input-icon" />
                  <input
                      name="nomePet"
                      placeholder="Nome do Pet (Opcional)"
                      value={formData.nomePet}
                      onChange={handleChange}
                      id="nomePet"
                      maxLength={50}
                  />
              </div>
            </div>
            */}

            <div className="form-group">
              <div className="wrapper-password">
                <FaEnvelope className="input-icon" />
                <input type="email" name="email" placeholder="E-mail" value={formData.email} onChange={handleChange} required id="email" maxLength={100} />
              </div>
              {!emailValido && formData.email.length > 0 && (
                <p className="mensagem-alerta">Digite um e-mail válido.</p>
              )}
            </div>
            <div className="form-group">
              <div className="wrapper-password">
                <FaIdCard className="input-icon" />
                <input name="cpfCnpj" placeholder="CPF/CNPJ" maxLength={14} value={formData.cpfCnpj} onChange={handleChange} required id="cpfCnpj" onBlur={(e) => {
                  if (e.target.value && !validarCPF(e.target.value)) {
                    setMensagemErroModal('CPF ou CNPJ inválidos!');
                    setMostrarModalErro(true);
                  }
                }}
              />
              </div>

            {!cpfCnpjValido && formData.cpfCnpj.length > 0 && (
              <p className="mensagem-alerta">CPF ou CNPJ inválidos!</p>
            )}
            </div>
            <div className="form-group password-group">
              <div className="wrapper-password">
                <FaLock className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="senha"
                  placeholder="Senha"
                  maxLength={64}
                  value={formData.senha}
                  onChange={handleChange}
                  required
                  id="senha"
                />
                <span onClick={() => setShowPassword(!showPassword)} className="password-toggle-icon">
                  {showPassword ? <BsEyeFill /> : <BsEyeSlashFill />}
                </span>
              </div>
              {!senhaValida && formData.senha.length > 0 && (
                <p className="mensagem-alerta">
                  A senha deve conter no mínimo 8 caracteres, uma letra maiúscula e um caracter especial.
                </p>
              )}
            </div>

            <div className="form-group password-group">
                <div className="wrapper-password">
                  <FaLock className="input-icon" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmarSenha"
                  placeholder="Confirme sua senha"
                  maxLength={64}
                  value={formData.confirmarSenha}
                  onChange={handleChange}
                  required id="confirmarSenha"/>
                <span onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="password-toggle-icon">
                  {showConfirmPassword ? <BsEyeFill /> : <BsEyeSlashFill />}
                </span>
                </div>

              {!senhasCoincidem && formData.confirmarSenha.length > 0 && (
                <p className="mensagem-alerta">As senhas não coincidem!</p>
              )}
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
                    <option key={`${pais.ddi}-${pais.nome}`} value={pais.ddi}>
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
                  maxLength={3}
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
                  maxLength={10}
                  value={formData.telefone}
                  onChange={handleChange}
                  required
                  id="telefone"/>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <FaMapMarkerAlt className="input-icon" />
                <input name="cep" placeholder="CEP" maxLength={8} value={formData.cep} onChange={handleChange} onBlur={(e) => buscarEndereco(e.target.value)} required id="cep" />
              </div>
              <div className="form-group">
                <MdConfirmationNumber className="input-icon" />
                <input name="numero" placeholder="Número" maxLength={6} value={formData.numero} onChange={handleChange} required id="numero" />
              </div>
            </div>

            <div className="form-group">
              <FaHome className="input-icon" />
              <input name="endereco" placeholder="Endereço (Logradouro)" maxLength={80} value={formData.endereco} onChange={handleChange} required id="endereco" />
            </div>

            <div className="form-group">
              <FaBuilding className="input-icon" />
              <input name="complemento" maxLength={30} placeholder="Complemento (Opcional)" value={formData.complemento} onChange={handleChange} id="complemento" />
            </div>

            <button className='btn-submit-cadastro' type="submit">Cadastrar</button>
          </form>
          <p className="login-link">
            Já possui uma conta? <a href="/login">Faça o login</a>
          </p>
        </div>
      </div>

      {/* Modal de Confirmação */}
      <Modal show={mostrarConfirmacao} onHide={cancelarCadastro} centered backdrop="static" keyboard={false}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Cadastro</Modal.Title>
        </Modal.Header>
        <Modal.Body>Deseja realmente confirmar o cadastro com os dados informados?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelarCadastro}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={confirmarCadastro}>
            Sim, Cadastrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Sucesso */}
      <Modal show={mostrarModalSucesso} onHide={fecharModalSucesso} centered>
        <Modal.Header closeButton>
          <Modal.Title>Sucesso!</Modal.Title>
        </Modal.Header>
        <Modal.Body>{mensagemSucessoModal}</Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={fecharModalSucesso}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Erro */}
      <Modal show={mostrarModalErro} onHide={fecharModalErro} centered>
        <Modal.Header closeButton>
          <Modal.Title>Ocorreu um Erro</Modal.Title>
        </Modal.Header>
        <Modal.Body>{mensagemErroModal}</Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={fecharModalErro}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Cadastro;