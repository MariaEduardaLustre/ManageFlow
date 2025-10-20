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
import EditarEmpresa from './pages/EditarEmpresa/EditarEmpresa';
import AvaliacaoEmpresaPage from './pages/AvaliacaoEmpresaPage/AvaliacaoEmpresaPage';

// <-- ADICIONADO: Import da nova página de avaliações
import AvaliacoesPage from './pages/AvaliacoesPage/AvaliacoesPage'; // Ajuste o caminho se necessário

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

                <Route path="*" element={<Navigate to="/login" />} />
              </>
            ) : (
              // --- ROTAS PRIVADAS (se o usuário ESTIVER autenticado) ---
              <>
                <Route path="/home" element={<Home onLogout={handleLogout} />} />
                <Route path="/empresa/editar/:idEmpresa" element={<EditarEmpresa onLogout={handleLogout} />} />
                <Route path="/dashboard" element={<Dashboard onLogout={handleLogout} />} />
                
                {/* <-- ADICIONADO: Rota para a nova página de avaliações */}
                <Route path="/dashboard/avaliacoes" element={<AvaliacoesPage onLogout={handleLogout} />} />

                <Route path="/filas-cadastradas" element={<FilasCadastradas onLogout={handleLogout} />} />
                <Route path="/filas" element={<FilaLista onLogout={handleLogout} />} />
                <Route path="/relatorio" element={<Relatorio onLogout={handleLogout} />} />
                <Route path="/gestao-fila/:idEmpresa/:dtMovto/:idFila" element={<GestaoFilaClientes onLogout={handleLogout} />} />
                <Route path="/configuracao/:id?" element={<ConfiguracaoFila onLogout={handleLogout} />} />
                
                {/* NOVO: Adicionada a rota do Painel de Exibição aqui também */}
                <Route path="/painel-fila/:idEmpresa/:dtMovto/:idFila" element={<PainelFilaExibicao />} />

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