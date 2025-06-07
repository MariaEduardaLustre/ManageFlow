import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';

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
// Novo componente para a tela de listagem de filas configuradas
import FilasCadastradas from './components/FilasCadastradas/FilasCadastradas'; // Crie este arquivo


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/redefinir-senha/:token" element={<RedefinirSenha />} />
        <Route path="/escolher-empresa" element={<Empresa />} />
        {/* Rota para o Formulário de Configuração de Fila (cadastro e edição) */}
        {/* O ':id?' indica que o ID é opcional. Sem ID = cadastro, Com ID = edição */}
        <Route path="/configuracao/:id?" element={<ConfiguracaoFila />} />

        {/* Nova rota para a tela de listagem de filas configuradas */}
        {/* Este é o componente que vai exibir a tabela da imagem de referência */}
        <Route path="/filas-cadastradas" element={<FilasCadastradas />} />

        <Route path="/filas" element={<FilaLista />} />
        <Route path="/gestao-fila/:idEmpresa/:dtMovto/:idFila" element={<GestaoFilaClientes />} />
       
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