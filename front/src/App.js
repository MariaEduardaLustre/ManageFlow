import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css'; 
// ✨ 1. IMPORTANDO OS PROVEDORES E A CONFIGURAÇÃO DE IDIOMA
import { ThemeProvider } from './context/ThemeContext';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n'; // O seu ficheiro de configuração i18n.js

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
// NOVO: Importa o componente da página de edição da empresa
import EditarEmpresa from './pages/EditarEmpresa/EditarEmpresa';

function App() {
  return (
    // ✨ 2. GARANTINDO QUE OS PROVEDORES ENVOLVAM TODA A APLICAÇÃO
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <Router>
          {/* Este componente agora está DENTRO do ThemeProvider e não causará mais erros */}
          <LanguageSelectorConditional />
          
          <Routes>
            {/* Públicas */}
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha/:token" element={<RedefinirSenha />} />
            <Route path="/entrar-fila/:token" element={<EntrarFilaPage />} />
            <Route path="/escolher-empresa" element={<Empresa />} />
            <Route path="/painel-fila/:idEmpresa/:dtMovto/:idFila" element={<PainelFilaExibicao />} />
            <Route path="/entrar-fila/:token/status" element={<FilaStatus />} />
            <Route path="/fila/:token/chamado" element={<FilaChamado />} />

            {/* Protegidas */}
            <Route path="/dashboard" element={<PrivateRoute resource="dashboard" action="view"><Dashboard /></PrivateRoute>} />
            <Route path="/configuracao/:id?" element={<PrivateRoute resource="settings" action="view"><ConfiguracaoFila /></PrivateRoute>} />
            <Route path="/filas-cadastradas" element={<PrivateRoute resource="queues" action="view"><FilasCadastradas /></PrivateRoute>} />
            <Route path="/filas" element={<PrivateRoute resource="queues" action="view"><FilaLista /></PrivateRoute>} />
            <Route path="/gestao-fila/:idEmpresa/:dtMovto/:idFila" element={<PrivateRoute resource="queueEntries" action="view"><GestaoFilaClientes /></PrivateRoute>} />
            <Route path="/relatorio" element={<PrivateRoute resource="analytics" action={['view', 'reports_own']}><Relatorio /></PrivateRoute>} />
            <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
            
            {/* NOVO: Adiciona a rota para a página de edição */}
            <Route path="/empresa/editar/:idEmpresa" element={<PrivateRoute><EditarEmpresa /></PrivateRoute>} />

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