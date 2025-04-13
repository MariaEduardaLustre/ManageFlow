import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Cadastro from './components/Cadastro/Cadastro';
import LandingPage from './components/Landing/Landing';
import Login from './components/Login/Login';

function App() {
  return (
    
    <Router>
      <Routes>
        <Route path="/cadastro" element={<Cadastro />} />
      </Routes>
      <Routes>
        <Route path="/landing" element={<LandingPage />} />
      </Routes>
      <Routes>
      <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;
