import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import Cadastro from './components/Cadastro/Cadastro';
import FormularioConfiguracaoFila from './components/Configuracao/Configuracao';
import EsqueciSenha from './components/EsqueciSenha/EsqueciSenha';
import Home from './components/Home/Home';
import LandingPage from './components/Landing/Landing';
import Login from './components/Login/Login';
import PrivateRoute from './components/PrivateRoute';
import RedefinirSenha from './components/RedefinirSenha/RedefinirSenha';
import ConfiguracaoFila from './components/ConfiguracaoFila/ConfiguracaoFila';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/redefinir-senha/:token" element={<RedefinirSenha />} />
         <Route path="/configuracaofila" element={<ConfiguracaoFila />} />
        <Route path="/escolher-empresa" element={<Empresa />} />
        <Route path="/configuracao" element={<FormularioConfiguracaoFila />} />

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