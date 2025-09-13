import React, { useState } from 'react';
import api from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Importe o hook de tradução

// Ícones
import { FaEnvelope, FaLock, FaApple } from 'react-icons/fa';
import { FcGoogle } from "react-icons/fc";
import { BsEyeFill, BsEyeSlashFill } from 'react-icons/bs';

// Estilos
import './Login.css';

// --- IMPORTAÇÕES DO REACT BOOTSTRAP ---
import { Modal, Button } from 'react-bootstrap';

const Login = () => {
    const { t } = useTranslation(); // Use o hook de tradução

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

    const fecharModalErro = () => setMostrarModalErro(false);

    const fecharModalSucesso = () => {
        setMostrarModalSucesso(false);
        const empresaSelecionada = localStorage.getItem('empresaSelecionada');
        navigate(empresaSelecionada ? '/home' : '/escolher-empresa');
    };

    return (
        <div className="login-page-container">
            <div className="login-image-panel">
                <img src="/imagens/cadastro.png" alt="Login decorativo" className="responsive-image-cad" />
            </div>

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
            </div>

            {/* --- SEÇÃO DE MODAIS ATUALIZADA COM REACT BOOTSTRAP --- */}

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
        </div>
    );
};

export default Login;