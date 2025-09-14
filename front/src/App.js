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
import Empresa from './components/Empresa/Empresa';
import FilaLista from './components/ListarFilas/FilaLista';
import GestaoFilaClientes from './components/GestaoFilaClientes/GestaoFilaClientes';
import Dashboard from './components/Dashboard/Dashboard';
import Relatorio from './components/Relatorio/Relatorio';
import Forbidden from './pages/Forbidden';

function App() {
  return (
    <Router>
      <Routes>
        {/* Públicas */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/redefinir-senha/:token" element={<RedefinirSenha />} />

        {/* Seleção de empresa (apenas exige login) */}
        <Route
          path="/escolher-empresa"
          element={
              <Empresa />
          }
        />

        {/* Protegidas por login + empresa + PERMISSÃO */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute resource="dashboard" action="view">
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/configuracao"
          element={
            <PrivateRoute resource="settings" action="view">
              <FormularioConfiguracaoFila />
            </PrivateRoute>
          }
        />

        <Route
          path="/filas"
          element={
            <PrivateRoute resource="queues" action="view">
              <FilaLista />
            </PrivateRoute>
          }
        />

        <Route
          path="/gestao-fila/:idEmpresa/:dtMovto/:idFila"
          element={
            <PrivateRoute resource="queueEntries" action="view">
              <GestaoFilaClientes />
            </PrivateRoute>
          }
        />

        <Route
          path="/relatorio"
          element={
            <PrivateRoute resource="analytics" action={['view', 'reports_own']}>
              <Relatorio />
            </PrivateRoute>
          }
        />

        {/* Home: só exige login + empresa */}
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />

        {/* 403 */}
        <Route path="/403" element={<Forbidden />} />

        {/* fallback opcional */}
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </Router>
  );
}

export default App;
