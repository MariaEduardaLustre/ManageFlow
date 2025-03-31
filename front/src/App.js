import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Cadastro from './components/Cadastro/Cadastro';
import LandingPage from './components/Landing/Landing';

function App() {
  return (
    
    <Router>
      <Routes>
        <Route path="/cadastro" element={<Cadastro />} />
      </Routes>
      <Routes>
        <Route path="/landing" element={<LandingPage />} />
      </Routes>
    </Router>
  );
}

export default App;
