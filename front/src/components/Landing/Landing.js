// src/components/LandingPage/LandingPage.js
import React from 'react';
import './Landing.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <header>
        <div className="container">
          <div className="image-container">
            <img src="/imagens/landing.png" alt="Imagem ilustrativa com computadores e celular" className="responsive-image" />
          </div>
          <div className="buttons">
            <a href='/login'><button className="btn">Entrar</button></a>
            
            <a href="/cadastro" style={{ textDecoration: 'none' }}>
              <button className="btn">Cadastrar-se</button>
            </a>

          </div>
          <h1>Gerencie filas de forma inteligente e melhore a experiência dos seus clientes.</h1>
          <p>Diga adeus às longas esperas e ao caos na recepção!</p>
          <p>O ManageFlow é a solução digital completa para restaurantes que desejam automatizar o gerenciamento de filas, reduzir o tempo de espera dos clientes e melhorar a organização do atendimento.</p>
        </div>
      </header>

      <main>
        <section className="landing-content">
          
          <div className="features">
            <ul>
              <li>Fila de Espera</li>
              <li>Relatórios e Dashboards</li>
              <li>Redução de Tempo e Processos</li>
              <li>Avaliações e Feedbacks</li>
            </ul>
          </div>
        </section>
      </main>

      <footer>
        <p>&copy; 2025 ManageFlow. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
