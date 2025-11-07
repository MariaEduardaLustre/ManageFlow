// src/App.jsx
import React, { useState } from 'react';
import { Route, BrowserRouter as Router, Routes, Navigate, useLocation } from 'react-router-dom';
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
import EditarEmpresa from './pages/EditarEmpresa/EditarEmpresa';
import AvaliacaoEmpresaPage from './pages/AvaliacaoEmpresaPage/AvaliacaoEmpresaPage';
import EmpresaPublicaPorToken from './pages/EmpresaPublica/EmpresaPublicaPorToken';
import AvaliacoesPage from './pages/AvaliacoesPage/AvaliacoesPage';
import PerfilUsuario from './components/PerfilUsuario/PerfilUsuario';

function TopBarLanguageGate({ isAuthenticated }) {
  const { pathname } = useLocation();

  // Rotas públicas onde NÃO queremos mostrar o seletor global
  const hideOnPublic = [
    '/login',
    '/cadastro',
    '/landing',
    '/esqueci-senha'
  ];

  // Rotas com parâmetros: usa startsWith para cobrir variações
  const hideStartsWith = [
    '/redefinir-senha/',
    '/entrar-fila/',
    '/fila/',            // /fila/:token/chamado
    '/avaliar/',
    '/perfil/',          // perfil público por token
    '/painel-fila/'      // painel público
  ];

  const isInHideList =
    hideOnPublic.includes(pathname) ||
    hideStartsWith.some(p => pathname.startsWith(p));

  // Regras:
  // - se não estiver autenticado → esconde (evita aparecer no login)
  // - se rota pública/hide → esconde
  const show = isAuthenticated && !isInHideList;

  return show ? <LanguageSelectorConditional /> : null;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
  };

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <Router>
          {/* ✅ Só mostra o seletor global quando autenticado e fora das rotas públicas */}
          <TopBarLanguageGate isAuthenticated={isAuthenticated} />

          <Routes>
            {!isAuthenticated ? (
              // --- ROTAS PÚBLICAS ---
              <>
                <Route path="/login" element={<Login onLoginSuccess={handleLogin} />} />
                <Route path="/cadastro" element={<Cadastro />} />
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/esqueci-senha" element={<EsqueciSenha />} />
                <Route path="/redefinir-senha/:token" element={<RedefinirSenha />} />
                <Route path="/entrar-fila/:token" element={<EntrarFilaPage />} />
                <Route path="/entrar-fila/:token/status" element={<FilaStatus />} />
                <Route path="/fila/:token/chamado" element={<FilaChamado />} />
                <Route path="/avaliar/:token" element={<AvaliacaoEmpresaPage />} />
                <Route path="/perfil/:token" element={<EmpresaPublicaPorToken />} />
                {/* Painel também público */}
                <Route path="/painel-fila/:idEmpresa/:dtMovto/:idFila" element={<PainelFilaExibicao />} />
                <Route path="*" element={<Navigate to="/login" />} />
              </>
            ) : (
              // --- ROTAS PRIVADAS ---
              <>
                <Route path="/home" element={<Home onLogout={handleLogout} />} />
                <Route path="/empresa/editar/:idEmpresa" element={<EditarEmpresa onLogout={handleLogout} />} />
                <Route path="/dashboard" element={<Dashboard onLogout={handleLogout} />} />
                <Route path="/dashboard/avaliacoes" element={<AvaliacoesPage onLogout={handleLogout} />} />
                <Route path="/filas-cadastradas" element={<FilasCadastradas onLogout={handleLogout} />} />
                <Route path="/filas" element={<FilaLista onLogout={handleLogout} />} />
                <Route path="/relatorio" element={<Relatorio onLogout={handleLogout} />} />
                <Route path="/gestao-fila/:idEmpresa/:dtMovto/:idFila" element={<GestaoFilaClientes onLogout={handleLogout} />} />
                <Route path="/configuracao/:id?" element={<ConfiguracaoFila onLogout={handleLogout} />} />
                {/* Painel também disponível autenticado */}
                <Route path="/painel-fila/:idEmpresa/:dtMovto/:idFila" element={<PainelFilaExibicao />} />
                <Route
                  path="/perfil"
                  element={
                    <PrivateRoute resource="profile" action="view">
                      <PerfilUsuario />
                    </PrivateRoute>
                  }
                />
                <Route path="/escolher-empresa" element={<Empresa />} />
                <Route path="/login" element={<Navigate to="/home" />} />
                <Route path="/403" element={<Forbidden />} />
                <Route path="*" element={<Navigate to="/home" />} />
              </>
            )}
          </Routes>
        </Router>
      </ThemeProvider>
    </I18nextProvider>
  );
}

export default App;
