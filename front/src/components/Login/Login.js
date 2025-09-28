import React, { useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";

// Ícones
import { FaEnvelope, FaLock, FaApple } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { BsEyeFill, BsEyeSlashFill } from "react-icons/bs";

// Componentes de Tema e Idioma
import ThemeToggleButton from "../ThemeToggleButton/ThemeToggleButton";
import LanguageSelector from "../LanguageSelector/LanguageSelector";

// Estilos (isolado)
import "./Login.css";

// React Bootstrap
import { Modal, Button } from "react-bootstrap";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", senha: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [mostrarModalErro, setMostrarModalErro] = useState(false);
  const [mensagemErroModal, setMensagemErroModal] = useState("");
  const [mostrarModalSucesso, setMostrarModalSucesso] = useState(false);
  const [mensagemSucessoModal, setMensagemSucessoModal] = useState("");
  const [loading, setLoading] = useState(false);

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

      const empresasResponse = await api.get(`/empresas/empresas-do-usuario/${idUsuario}`);
      const empresas = Array.isArray(empresasResponse.data) ? empresasResponse.data : [];

      localStorage.removeItem("empresaSelecionada");
      sessionStorage.setItem("empresasDoUsuario", JSON.stringify(empresas));

      setFormData({ email: "", senha: "" });
      setMensagemSucessoModal("Login realizado! Escolha a sua empresa.");
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

  const fecharModalSucesso = () => {
    setMostrarModalSucesso(false);
    navigate("/escolher-empresa");
  };

  return (
    <div className="mf-login">
      <div className="mf-login__image">
        <img
          src="/imagens/cadastro.png"
          alt="Login decorativo"
          className="mf-login__hero"
        />
      </div>

      <div className="mf-login__form-section">
        {/* ✨ CONTÊINER ATUALIZADO PARA OS BOTÕES NO CANTO SUPERIOR DIREITO ✨ */}
        <div className="mf-login__top-controls">
          <ThemeToggleButton />
          <LanguageSelector />
        </div>

        <div className="mf-login__wrapper">
          <h2 className="mf-login__title">Login</h2>

          <form className="mf-login__form" onSubmit={handleSubmit} noValidate>
            <div className="mf-login__group">
              <FaEnvelope className="mf-login__icon" />
              <input
                type="email"
                name="email"
                placeholder="E-mail"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mf-login__group mf-login__group--password">
              <FaLock className="mf-login__icon" />
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
                className="mf-login__pass-toggle"
                aria-label="Mostrar/ocultar senha"
              >
                {showPassword ? <BsEyeFill /> : <BsEyeSlashFill />}
              </span>
            </div>

            <p className="mf-login__link">
              Esqueceu a sua senha? <a href="/esqueci-senha">Clique aqui!</a>
            </p>

            <button
              type="submit"
              className="mf-login__submit"
              disabled={loading}
            >
              {loading ? "A entrar..." : "Entrar"}
            </button>
          </form>

          <div className="mf-login__social">
            <button type="button" className="mf-login__btn-google">
              <FcGoogle className="mf-login__social-icon" />
              Entrar com o Google
            </button>
            <button type="button" className="mf-login__btn-apple">
              <FaApple className="mf-login__social-icon" />
              Entrar com a Apple
            </button>
          </div>

          <p className="mf-login__link">
            Ainda não possui uma conta? <a href="/cadastro">Registe-se</a>
          </p>
        </div>
      </div>

      {/* Modais */}
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