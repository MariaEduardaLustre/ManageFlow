import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
// Corrigido: Importa o componente do caminho correto.
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
<<<<<<< HEAD
// Novo componente para a tela de listagem de filas configuradas
import FilasCadastradas from './components/FilasCadastradas/FilasCadastradas';
import Dashboard from './components/Dashboard/Dashboard';
import Relatorio from './components/Relatorio/Relatorio';
import Forbidden from './pages/Forbidden';
import EntrarFilaPage from './pages/EntrarFilaPage';
=======
import FilasCadastradas from './components/FilasCadastradas/FilasCadastradas';
import Dashboard from './components/Dashboard/Dashboard';
import Relatorio from './components/Relatorio/Relatorio';
>>>>>>> origin/Notificação_EntradaFila
import PainelFilaExibicao from './components/PainelFilaExibicao/PainelFilaExibicao';

function App() {
  return (
    <Router>
      {/* Agora, o componente condicional decide se o seletor será exibido. */}
      <LanguageSelectorConditional />
      
      <Routes>
        {/* Públicas */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/redefinir-senha/:token" element={<RedefinirSenha />} />
        <Route path="/entrar-fila/:token" element={<EntrarFilaPage />} />
        {/* Seleção de empresa (apenas exige login - se quiser, pode envolver com PrivateRoute depois) */}
        <Route path="/escolher-empresa" element={<Empresa />} />
<<<<<<< HEAD
        {/* Painel público para TV/monitor (mantém comportamento do outro branch) */}
        <Route path="/painel-fila/:idEmpresa/:dtMovto/:idFila" element={<PainelFilaExibicao />} />

        {/* Protegidas por login + empresa + PERMISSÃO */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute resource="dashboard" action="view">
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* Configuração com ID opcional: sem ID = cadastro, com ID = edição */}
        <Route
          path="/configuracao/:id?"
          element={
            <PrivateRoute resource="settings" action="view">
              <ConfiguracaoFila />
            </PrivateRoute>
          }
        />

        {/* Lista de configurações (nova tela) */}
        <Route
          path="/filas-cadastradas"
          element={
            <PrivateRoute resource="queues" action="view">
              <FilasCadastradas />
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
=======
        <Route path="/configuracao/:id?" element={<ConfiguracaoFila />} />
        <Route path="/filas-cadastradas" element={<FilasCadastradas />} />
        <Route path="/filas" element={<FilaLista />} />
        <Route path="/gestao-fila/:idEmpresa/:dtMovto/:idFila" element={<GestaoFilaClientes />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/relatorio" element={<Relatorio />} />
        <Route path="/painel-fila/:idEmpresa/:dtMovto/:idFila" element={<PainelFilaExibicao />} />

>>>>>>> origin/Notificação_EntradaFila
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
