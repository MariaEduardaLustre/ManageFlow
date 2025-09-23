<<<<<<< HEAD
import React, { useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
=======
import React, { useState } from 'react';
import api from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Importe o hook de tradução
>>>>>>> origin/Notificação_EntradaFila

// Ícones
import { FaEnvelope, FaLock, FaApple } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { BsEyeFill, BsEyeSlashFill } from "react-icons/bs";

// Estilos
import "./Login.css";

// --- IMPORTAÇÕES DO REACT BOOTSTRAP ---
import { Modal, Button } from "react-bootstrap";

const Login = () => {
<<<<<<< HEAD
  // A lógica de state e as funções permanecem as mesmas
  const [formData, setFormData] = useState({ email: "", senha: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [mostrarModalErro, setMostrarModalErro] = useState(false);
  const [mensagemErroModal, setMensagemErroModal] = useState("");
  const [mostrarModalSucesso, setMostrarModalSucesso] = useState(false);
  const [mensagemSucessoModal, setMensagemSucessoModal] = useState("");
  const [loading, setLoading] = useState(false);
=======
    const { t } = useTranslation(); // Use o hook de tradução

    const [formData, setFormData] = useState({ email: '', senha: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [mostrarModalErro, setMostrarModalErro] = useState(false);
    const [mensagemErroModal, setMensagemErroModal] = useState('');
    const [mostrarModalSucesso, setMostrarModalSucesso] = useState(false);
    const [mensagemSucessoModal, setMensagemSucessoModal] = useState('');
    const [loading, setLoading] = useState(false);
>>>>>>> origin/Notificação_EntradaFila

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const response = await api.post("/login", formData);
      const { token, idUsuario, nome } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("idUsuario", idUsuario);
      localStorage.setItem("nomeUsuario", nome);

      // Busca empresas do usuário
      const empresasResponse = await api.get(
        `/empresas/empresas-do-usuario/${idUsuario}`
      );
      const empresas = Array.isArray(empresasResponse.data)
        ? empresasResponse.data
        : [];

      // Limpa seleção forçada para SEMPRE passar pela tela de escolha
      localStorage.removeItem("empresaSelecionada");

      // (Opcional) disponibiliza a lista para a tela de escolha usar imediatamente
      sessionStorage.setItem("empresasDoUsuario", JSON.stringify(empresas));

<<<<<<< HEAD
      setFormData({ email: "", senha: "" });
      setMensagemSucessoModal("Login realizado! Escolha sua empresa.");
      setMostrarModalSucesso(true);
    } catch (err) {
      const msg = err.response?.data || "E-mail ou senha inválidos.";
      setMensagemErroModal(msg);
      setMostrarModalErro(true);
    } finally {
      setLoading(false);
    }
  };

  const fecharModalErro = () => setMostrarModalErro(false);
=======
            if (empresas.length === 1) {
                localStorage.setItem('empresaSelecionada', JSON.stringify(empresas[0]));
                setMensagemSucessoModal(t('login.mensagens.sucesso.bodyEmpresaUnica'));
            } else {
                localStorage.removeItem('empresaSelecionada');
                setMensagemSucessoModal(t('login.mensagens.sucesso.bodyMaisEmpresas'));
            }
            setMostrarModalSucesso(true);

        } catch (err) {
            const msg = err.response?.data || t('login.mensagens.erro.generico');
            setMensagemErroModal(msg);
            setMostrarModalErro(true);
        } finally {
            setLoading(false);
        }
    };
>>>>>>> origin/Notificação_EntradaFila

  const fecharModalSucesso = () => {
    setMostrarModalSucesso(false);
    // Sempre vai para a tela de escolha de empresa
    navigate("/escolher-empresa");
  };

<<<<<<< HEAD
  return (
    <div className="login-page-container">
      <div className="login-image-panel">
        <img
          src="/imagens/cadastro.png"
          alt="Login decorativo"
          className="responsive-image-cad"
        />
      </div>
=======
    const fecharModalSucesso = () => {
        setMostrarModalSucesso(false);
        const empresaSelecionada = localStorage.getItem('empresaSelecionada');
        navigate(empresaSelecionada ? '/home' : '/escolher-empresa');
    };
>>>>>>> origin/Notificação_EntradaFila

      <div className="login-form-section">
        <div className="cadastro-form-wrapper">
          <h2 className="form-title">Login</h2>
          <form onSubmit={handleSubmit} noValidate>
            {/* Seus inputs e formulário continuam aqui... */}
            <div className="form-group">
              <FaEnvelope className="input-icon" />
              <input
                type="email"
                name="email"
                placeholder="E-mail"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

<<<<<<< HEAD
            <div className="form-group password-group">
              <FaLock className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                name="senha"
                placeholder="Senha"
                value={formData.senha}
                onChange={handleChange}
                required
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle-icon"
              >
                {showPassword ? <BsEyeFill /> : <BsEyeSlashFill />}
              </span>
=======
            <div className="login-form-section">
                <div className="cadastro-form-wrapper">
                    <h2 className="form-title">{t('login.titulo')}</h2>
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="form-group">
                            <FaEnvelope className="input-icon" />
                            <input
                                type="email"
                                name="email"
                                placeholder={t('login.placeholder.email')}
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group password-group">
                            <FaLock className="input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="senha"
                                placeholder={t('login.placeholder.senha')}
                                value={formData.senha}
                                onChange={handleChange}
                                required
                            />
                            <span
                                onClick={() => setShowPassword(!showPassword)}
                                className="password-toggle-icon">
                                {showPassword ? <BsEyeFill /> : <BsEyeSlashFill />}
                            </span>
                        </div>

                        <p className="login-link">
                            {t('login.links.esqueciSenha')} <Link to="/esqueci-senha">{t('login.links.cliqueAqui')}</Link>
                        </p>

                        <button
                            type="submit"
                            className="btn-submit-cadastro"
                            disabled={loading}>
                            {loading ? t('login.botoes.entrando') : t('login.botoes.entrar')}
                        </button>
                    </form>

                    <div className="social-login">
                        <button className="btn-google">
                            <FcGoogle className="social-icon" />
                            {t('login.botoes.google')}
                        </button>
                        <button className="btn-apple">
                            <FaApple className="social-icon" />
                            {t('login.botoes.apple')}
                        </button>
                    </div>

                    <p className="login-link">
                        {t('login.links.semConta')} <Link to="/cadastro">{t('login.links.cadastreSe')}</Link>
                    </p>
                </div>
>>>>>>> origin/Notificação_EntradaFila
            </div>
            <p className="login-link">
              Esqueceu sua senha? <a href="/esqueci-senha">Clique aqui!</a>
            </p>

            <button
              type="submit"
              className="btn-submit-cadastro"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

<<<<<<< HEAD
          <div className="social-login">
            <button className="btn-google">
              <FcGoogle className="social-icon" />
              Entrar com o Google
            </button>
            <button className="btn-apple">
              <FaApple className="social-icon" />
              Entrar com a Apple
            </button>
          </div>

          <p className="login-link">
            Ainda não possui uma conta? <a href="/cadastro">Cadastre-se</a>
          </p>
=======
            {/* Modal de Sucesso */}
            <Modal show={mostrarModalSucesso} onHide={fecharModalSucesso} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{t('login.mensagens.sucesso.titulo')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>{mensagemSucessoModal}</Modal.Body>
                <Modal.Footer>
                    <Button variant="success" onClick={fecharModalSucesso}>
                        {t('login.mensagens.modal.ok')}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal de Erro */}
            <Modal show={mostrarModalErro} onHide={fecharModalErro} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{t('login.mensagens.erro.titulo')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>{mensagemErroModal}</Modal.Body>
                <Modal.Footer>
                    <Button variant="danger" onClick={fecharModalErro}>
                        {t('login.mensagens.modal.fechar')}
                    </Button>
                </Modal.Footer>
            </Modal>
>>>>>>> origin/Notificação_EntradaFila
        </div>
      </div>

      {/* --- SEÇÃO DE MODAIS ATUALIZADA COM REACT BOOTSTRAP --- */}

      {/* Modal de Sucesso */}
      <Modal show={mostrarModalSucesso} onHide={fecharModalSucesso} centered>
        <Modal.Header closeButton>
          <Modal.Title>Login Realizado</Modal.Title>
        </Modal.Header>
        <Modal.Body>{mensagemSucessoModal}</Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={fecharModalSucesso}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Erro */}
      <Modal show={mostrarModalErro} onHide={fecharModalErro} centered>
        <Modal.Header closeButton>
          <Modal.Title>Erro no Login</Modal.Title>
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

export default Login;
