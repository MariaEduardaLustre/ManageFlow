import React from 'react';
import './Landing.css';

const LandingPage = () => {
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
      <nav className="navbar navbar-expand-lg navbar-light bg-white fixed-top flow-header shadow-sm">
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
                <a className="nav-link" href="#home">Home</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#servicos">Serviços</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#sobre">Sobre Nós</a>
              </li>
            </ul>
            <div className="flow-auth-buttons ms-lg-auto">
              <a href="/login" className="btn flow-btn-login me-2">Entrar</a>
              <a href="/cadastro" className="btn flow-btn-signup">Cadastrar-se</a>
            </div>
          </div>
        </div>
      </nav>

      <section id="home" className="flow-hero pt-5 pb-0"> 
        <div className="container hero-container py-5">
          <div className="row align-items-center">
            <div className="col-lg-6 hero-content text-center text-lg-start">
              <h1 className="mb-3">Gerencie filas de forma inteligente e melhore a experiência de seus clientes</h1>
              <p className="lead mb-4">
                O ManageFlow é a solução digital completa para restaurantes que desejam automatizar o gerenciamento de filas,
                reduzir o tempo de espera dos clientes e melhorar a organização do atendimento.
              </p>
              <a href="/cadastro" className="btn flow-btn-primary btn-lg">Comece Agora</a>
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
            <h2 className="fw-bold">Nossos Serviços</h2>
            <p className="lead text-muted services-subtitle mx-auto">
              Nosso compromisso é simplificar a gestão do seu estabelecimento, proporcionando uma experiência fluida e organizada.
            </p>
          </div>
          <div className="row g-4">
            {[
              {IconSrc: fila, title: "Fila de Espera", desc: "Organize sua fila de forma digital e eficiente, informando o tempo estimado de espera." },
              {IconSrc: reserva, title: "Reserva de Mesa", desc: "Permita que seus clientes reservem mesas com antecedência, otimizando o fluxo." },
              {IconSrc: tv, title: "Painel de TV", desc: "Exiba o status da fila em tempo real em um painel visível para todos no local." },
              {IconSrc: avaliacao, title: "Avaliações", desc: "Colete feedbacks dos seus clientes para aprimorar continuamente seus serviços." },
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

      <section id='sobre' className="flow-testimonials py-5 text-white">
        <div className="container">
          <h2 className="text-center mb-5 fw-bold">O que nossos clientes dizem?</h2>
          <div className="testimonial-card-wrapper mx-auto">
            <button className="arrow-btn prev-btn d-none d-md-flex">&larr;</button>
            <div className="testimonial-card-flow">
              <div className="d-flex flex-column flex-md-row align-items-center text-center text-md-start">
                <img src={avatar} alt="Edward Newgate" className="testimonial-avatar mb-3 mb-md-0 me-md-4" />
                <div className="testimonial-text">
                  <p className="testimonial-quote mb-3">
                    "O Flow transformou a maneira como gerenciamos nossos clientes. A organização melhorou 100% e os feedbacks são incríveis!"
                  </p>
                  <h4 className="h5 mb-0 fw-bold">Edward Newgate</h4>
                  <p className="small text-testimonial-title">Founder Circle</p>
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
              <p className="small mb-2">Gerenciamento de filas simplificado para otimizar a experiência do cliente.</p>
              <p className="small text-white-50">&copy; 2025 ManageFlow. Todos os direitos reservados.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;