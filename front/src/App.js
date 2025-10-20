// front/src/App.jsx
import React from 'react';
import { Route, BrowserRouter as Router, Routes, Navigate } from 'react-router-dom';
import './App.css';
import { ThemeProvider } from './context/ThemeContext';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

// Componentes
import LanguageSelectorConditional from './components/LanguageSelectorConditional/LanguageSelectorConditional';
import Cadastro from './components/Cadastro/Cadastro';
import ConfiguracaoFila from './components/ConfiguracaoFila/ConfiguracaoFila';
import EsqueciSenha from './components/EsqueciSenha/EsqueciSenha';
import Home from './components/Home/Home';
import LandingPage from './components/Landing/Landing';
import Login from './components/Login/Login';
import PrivateRoute from './components/PrivateRoute';
import RedefinirSenha from './components/RedefinirSenha/RedefinirSenha';
import Empresa from './components/Empresa/Empresa';
import FilaLista from './components/ListarFilas/FilaLista';
import GestaoFilaClientes from './components/GestaoFilaClientes/GestaoFilaClientes';
import FilasCadastradas from './components/FilasCadastradas/FilasCadastradas';
import Dashboard from './components/Dashboard/Dashboard';
import Relatorio from './components/Relatorio/Relatorio';
import Forbidden from './pages/Forbidden';
import EntrarFilaPage from './pages/EntrarFilaPage';
import PainelFilaExibicao from './components/PainelFilaExibicao/PainelFilaExibicao';
import FilaStatus from './pages/FilaStatus';
import FilaChamado from './pages/FilaChamado';
import PerfilUsuario from './components/PerfilUsuario/PerfilUsuario';
import EditarEmpresa from './pages/EditarEmpresa/EditarEmpresa';
import AvaliacaoEmpresaPage from './pages/AvaliacaoEmpresaPage/AvaliacaoEmpresaPage';
import EmpresaPublicaPorToken from './pages/EmpresaPublica/EmpresaPublicaPorToken';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  const handleLogin = () => {
    // seu fluxo de login já deve setar o token no localStorage
    window.location.replace('/home');
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.replace('/login');
  };

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <Router>
          <LanguageSelectorConditional />
          <Routes>
            {/*
              ======================
              ROTAS PÚBLICAS (sempre)
              ======================
              NENHUMA delas deve cair em guards ou wildcards que redirecionem para /home
            */}
            <Route path="/login" element={<Login onLoginSuccess={handleLogin} />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha/:token" element={<RedefinirSenha />} />

            {/* Público do módulo de filas */}
            <Route path="/entrar-fila/:token" element={<EntrarFilaPage />} />
            <Route path="/entrar-fila/:token/status" element={<FilaStatus />} />
            <Route path="/fila/:token/chamado" element={<FilaChamado />} />

            {/* Público de avaliações/perfil */}
            <Route path="/avaliar/:token" element={<AvaliacaoEmpresaPage />} />
            <Route path="/perfil/:token" element={<EmpresaPublicaPorToken />} />

            {/* Painel público (se for público para TVs) */}
            <Route path="/painel-fila/:idEmpresa/:dtMovto/:idFila" element={<PainelFilaExibicao />} />

            {/*
              ======================
              ROTAS PRIVADAS
              ======================
              Envolvidas pelo PrivateRoute para exigir token.
            */}
            <Route
              path="/home"
              element={
                <PrivateRoute>
                  <Home onLogout={handleLogout} />
                </PrivateRoute>
              }
            />
            <Route
              path="/empresa/editar/:idEmpresa"
              element={
                <PrivateRoute>
                  <EditarEmpresa onLogout={handleLogout} />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute resource="dashboard" action="view">
                  <Dashboard onLogout={handleLogout} />
                </PrivateRoute>
              }
            />
            <Route
              path="/filas-cadastradas"
              element={
                <PrivateRoute resource="queues" action="view">
                  <FilasCadastradas onLogout={handleLogout} />
                </PrivateRoute>
              }
            />
            <Route
              path="/filas"
              element={
                <PrivateRoute resource="queues" action="view">
                  <FilaLista onLogout={handleLogout} />
                </PrivateRoute>
              }
            />
            <Route
              path="/relatorio"
              element={
                <PrivateRoute resource="analytics" action={['view', 'reports_own']}>
                  <Relatorio onLogout={handleLogout} />
                </PrivateRoute>
              }
            />
            <Route
              path="/gestao-fila/:idEmpresa/:dtMovto/:idFila"
              element={
                <PrivateRoute resource="queueEntries" action="view">
                  <GestaoFilaClientes onLogout={handleLogout} />
                </PrivateRoute>
              }
            />
            <Route
              path="/configuracao/:id?"
              element={
                <PrivateRoute resource="settings" action="view">
                  <ConfiguracaoFila onLogout={handleLogout} />
                </PrivateRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <PrivateRoute resource="profile" action="view">
                  <PerfilUsuario />
                </PrivateRoute>
              }
            />
            <Route path="/escolher-empresa" element={
              <PrivateRoute>
                <Empresa />
              </PrivateRoute>
            } />

            {/* Rota raiz: decide para onde mandar */}
            <Route
              path="/"
              element={
                isAuthenticated ? <Navigate to="/home" replace /> : <Navigate to="/landing" replace />
              }
            />

            {/* 403 e 404 */}
            <Route path="/403" element={<Forbidden />} />
            <Route path="*" element={<div style={{ padding: 24 }}>Página não encontrada.</div>} />
          </Routes>
        </Router>
      </ThemeProvider>
    </I18nextProvider>
  );
}

export default App;
