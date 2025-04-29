import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import Cadastro from './components/Cadastro/Cadastro';
import LandingPage from './components/Landing/Landing';
import Login from './components/Login/Login';
import Home from './components/Home/Home';
import PrivateRoute from './components/PrivateRoute';
import EsqueciSenha from './components/EsqueciSenha/EsqueciSenha';
import RedefinirSenha from './components/RedefinirSenha/RedefinirSenha';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/redefinir-senha/:token" element={<RedefinirSenha />} />
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;