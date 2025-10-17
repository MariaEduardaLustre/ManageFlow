import React, { useState } from 'react';
import { Route, BrowserRouter as Router, Routes, Navigate } from 'react-router-dom';
import './App.css'; 
import { ThemeProvider } from './context/ThemeContext';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

// Importe todos os seus componentes
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
import PainelFilaExibicao from './components/PainelFilaExibicao/PainelFilaExibicao'; // <-- Confirme se o import existe
import FilaStatus from './pages/FilaStatus';
import FilaChamado from './pages/FilaChamado';
import PerfilUsuario from './components/PerfilUsuario/PerfilUsuario';
import EditarEmpresa from './pages/EditarEmpresa/EditarEmpresa';
import AvaliacaoEmpresaPage from './pages/AvaliacaoEmpresaPage/AvaliacaoEmpresaPage';

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
          <LanguageSelectorConditional />
          <Routes>
            {!isAuthenticated ? (
              // --- ROTAS PÚBLICAS (se o usuário NÃO estiver autenticado) ---
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
                
                {/* A rota do painel também deve ser acessível publicamente caso seja compartilhada */}
                <Route path="/painel-fila/:idEmpresa/:dtMovto/:idFila" element={<PainelFilaExibicao />} />

            {/* Protegidas */}
            <Route path="/dashboard" element={<PrivateRoute resource="dashboard" action="view"><Dashboard /></PrivateRoute>} />
            <Route path="/configuracao/:id?" element={<PrivateRoute resource="settings" action="view"><ConfiguracaoFila /></PrivateRoute>} />
            <Route path="/filas-cadastradas" element={<PrivateRoute resource="queues" action="view"><FilasCadastradas /></PrivateRoute>} />
            <Route path="/filas" element={<PrivateRoute resource="queues" action="view"><FilaLista /></PrivateRoute>} />
            <Route path="/gestao-fila/:idEmpresa/:dtMovto/:idFila" element={<PrivateRoute resource="queueEntries" action="view"><GestaoFilaClientes /></PrivateRoute>} />
            <Route path="/relatorio" element={<PrivateRoute resource="analytics" action={['view', 'reports_own']}><Relatorio /></PrivateRoute>} />
            <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
            <Route
            path="/perfil"
            element={
              <PrivateRoute resource="profile" action="view">
                <PerfilUsuario />
              </PrivateRoute>
            }
          />
            {/* 403 e fallback */}
            <Route path="/403" element={<Forbidden />} />
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </I18nextProvider>
  );
}

export default App;