import React, { useState } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

// Ícones
import { FaEnvelope, FaLock, FaApple } from 'react-icons/fa';
import { FcGoogle } from "react-icons/fc";
import { BsEyeFill, BsEyeSlashFill } from 'react-icons/bs';

// Estilos
import './Login.css';

// --- IMPORTAÇÕES DO REACT BOOTSTRAP ---
import { Modal, Button } from 'react-bootstrap';

const Login = () => {
    // A lógica de state e as funções permanecem as mesmas
    const [formData, setFormData] = useState({ email: '', senha: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [mostrarModalErro, setMostrarModalErro] = useState(false);
    const [mensagemErroModal, setMensagemErroModal] = useState('');
    const [mostrarModalSucesso, setMostrarModalSucesso] = useState(false);
    const [mensagemSucessoModal, setMensagemSucessoModal] = useState('');
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
            const response = await api.post('/login', formData);
            const { token, idUsuario, nome } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('idUsuario', idUsuario);
            localStorage.setItem('nomeUsuario', nome);


            const empresasResponse = await api.get(`/empresas/empresas-do-usuario/${idUsuario}`);
            const empresas = empresasResponse.data;

            setFormData({ email: '', senha: '' });

            if (empresas.length === 1) {
                localStorage.setItem('empresaSelecionada', JSON.stringify(empresas[0]));
                setMensagemSucessoModal('Login realizado com sucesso! Redirecionando...');
            } else {
                localStorage.removeItem('empresaSelecionada');
                setMensagemSucessoModal('Login realizado! Agora, escolha sua empresa.');
            }
            setMostrarModalSucesso(true);

        } catch (err) {
            const msg = err.response?.data || 'E-mail ou senha inválidos.';
            setMensagemErroModal(msg);
            setMostrarModalErro(true);
        } finally {
            setLoading(false);
        }
    };

    const fecharModalErro = () => setMostrarModalErro(false);

    const fecharModalSucesso = () => {
        setMostrarModalSucesso(false);
        const empresaSelecionada = localStorage.getItem('empresaSelecionada');
        // A navegação acontece após fechar o modal
        navigate(empresaSelecionada ? '/home' : '/escolher-empresa');
    };

    return (
        <div className="login-page-container">
            <div className="login-image-panel">
                <img src="/imagens/cadastro.png" alt="Login decorativo" className="responsive-image-cad" />
            </div>

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

                        <div className="form-group password-group">
                            <FaLock className="input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="senha"
                                placeholder="Senha"
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
                            Esqueceu sua senha? <a href="/esqueci-senha">Clique aqui!</a>
                        </p>

                        <button
                            type="submit"
                            className="btn-submit-cadastro"
                            disabled={loading}>
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>

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