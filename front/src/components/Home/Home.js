import React from 'react';

const Home = () => {
  const nome = localStorage.getItem('nome') || 'usuário';

  return (
    <div style={{ padding: '20px' }}>
      <h1>Bem-vindo, {nome}!</h1>
      <p>Você está autenticado com sucesso 🎉</p>
    </div>
  );
};

export default Home;
