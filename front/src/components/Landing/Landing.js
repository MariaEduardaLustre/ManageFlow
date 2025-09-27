import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaSun, FaMoon } from 'react-icons/fa'; // 1. IMPORTAR ÍCONES
import { useTheme } from '../../context/ThemeContext'; // 2. IMPORTAR NOSSO HOOK DE TEMA
import LanguageSelector from '../LanguageSelector/LanguageSelector';
import './Landing.css';

const LandingPage = () => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme(); // 3. USAR O HOOK PARA PEGAR O TEMA E A FUNÇÃO

  const fila = '/imagens/fila.png';
  const reserva = '/imagens/reserva.png';
  const avaliacao = '/imagens/avaliacao.png';
  const tv = '/imagens/painel.png';
  const logo = '/imagens/logo.png';
  const landing = '/imagens/landing.png';
  const logobranca = '/imagens/logobranca.png';
  const avatar = '/imagens/avatar.png'

  return (
    <div className="landing-page-flow">
      {/* Adiciona uma classe ao body APENAS quando esta página estiver visível */}
      <style>{`body { padding-top: 70px; background-color: var(--flow-page-bg, #fff); }`}</style>
      
      <nav className="navbar navbar-expand-lg navbar-light fixed-top flow-header shadow-sm">
        <div className="container">
          <a className="navbar-brand" href="#home">
              <img src={logo} alt="Manage Flow Logo" className="flow-logo" />
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav mx-auto flow-nav-links">
              <li className="nav-item">
                <a className="nav-link" href="#home">{t('landing.nav.home')}</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#servicos">{t('landing.nav.servicos')}</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#sobre">{t('landing.nav.sobre')}</a>
              </li>
            </ul>
            <div className="d-flex align-items-center">
              <div className="flow-auth-buttons ms-lg-auto">
                <a href="/login" className="btn flow-btn-login me-2">{t('landing.nav.entrar')}</a>
                <a href="/cadastro" className="btn flow-btn-signup">{t('landing.nav.cadastrar')}</a>
              </div>
              
              {/* 4. ADICIONADO O BOTÃO DE TEMA AQUI */}
              <button onClick={toggleTheme} className="btn landing-theme-toggle ms-3" title="Alterar tema">
                {theme === 'light' ? <FaMoon /> : <FaSun />}
              </button>

              <div className="ms-2">
                <LanguageSelector />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <section id="home" className="flow-hero pt-5 pb-0"> 
        <div className="container hero-container py-5">
          <div className="row align-items-center">
            <div className="col-lg-6 hero-content text-center text-lg-start">
              <h1 className="mb-3">{t('landing.hero.titulo')}</h1>
              <p className="lead mb-4">
                {t('landing.hero.descricao')}
              </p>
              <a href="/cadastro" className="btn flow-btn-primary btn-lg">{t('landing.hero.comeceAgora')}</a>
            </div>
            <div className="col-lg-6 hero-image-container mt-4 mt-lg-0">
              <img src={landing} alt="Plataforma Flow em dispositivos" className="img-fluid hero-image" />
            </div>
          </div>
        </div>
      </section>

      <section id="servicos" className="flow-services py-5">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold">{t('landing.servicos.titulo')}</h2>
            <p className="lead text-muted services-subtitle mx-auto">
              {t('landing.servicos.subtitulo')}
            </p>
          </div>
          <div className="row g-4">
            {[
              {IconSrc: fila, title: t('landing.servicos.fila.titulo'), desc: t('landing.servicos.fila.descricao') },
              {IconSrc: reserva, title: t('landing.servicos.reserva.titulo'), desc: t('landing.servicos.reserva.descricao') },
              {IconSrc: tv, title: t('landing.servicos.painel.titulo'), desc: t('landing.servicos.painel.descricao') },
              {IconSrc: avaliacao, title: t('landing.servicos.avaliacoes.titulo'), desc: t('landing.servicos.avaliacoes.descricao') },
            ].map((service, index) => (
              <div className="col-md-6 col-lg-3 d-flex align-items-stretch" key={index}>
                <div className="card service-card-flow h-100 text-start">
                  <div className="card-body">
                    <img src={service.IconSrc} alt={service.title} className="service-icon mb-3" />
                    <h3 className="card-title h5 fw-bold">{service.title}</h3>
                    <p className="card-text small text-muted">{service.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id='sobre' className="flow-testimonials py-5">
        <div className="container">
          <h2 className="text-center mb-5 fw-bold">{t('landing.sobre.titulo')}</h2>
          <div className="testimonial-card-wrapper mx-auto">
            <button className="arrow-btn prev-btn d-none d-md-flex">&larr;</button>
            <div className="testimonial-card-flow">
              <div className="d-flex flex-column flex-md-row align-items-center text-center text-md-start">
                <img src={avatar} alt="Edward Newgate" className="testimonial-avatar mb-3 mb-md-0 me-md-4" />
                <div className="testimonial-text">
                  <p className="testimonial-quote mb-3">
                    "{t('landing.sobre.depoimento')}"
                  </p>
                  <h4 className="h5 mb-0 fw-bold">Edward Newgate</h4>
                  <p className="small text-testimonial-title">{t('landing.sobre.cargo')}</p>
                </div>
              </div>
            </div>
            <button className="arrow-btn next-btn d-none d-md-flex">&rarr;</button>
            <div className="d-flex d-md-none justify-content-center mt-3">
                <button className="arrow-btn prev-btn me-2">&larr;</button>
                <button className="arrow-btn next-btn">&rarr;</button>
            </div>
          </div>
        </div>
      </section>

      <footer className="flow-footer pt-5 pb-4">
        <div className="container">
          <div className="row gy-4 justify-content-center"> 
            <div className="col-lg-6 col-md-12 footer-brand mb-3 mb-lg-0 text-center">
              <img src={logobranca} alt="Manage Flow Logo" className="flow-logo-footer mb-3" />
              <p className="small mb-2">{t('landing.rodape.slogan')}</p>
              <p className="small text-white-50">{t('landing.rodape.direitos')}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;