import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
// Importe o componente que criamos
import LanguageSelector from './components/LanguageSelector/LanguageSelector';

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
import PainelFilaExibicao from './components/PainelFilaExibicao/PainelFilaExibicao';


function App() {
  return (
    <Router>
      {/* Adicione o seletor de idioma aqui, fora de <Routes> */}
      <LanguageSelector />
      
      <Routes>
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/redefinir-senha/:token" element={<RedefinirSenha />} />
        <Route path="/escolher-empresa" element={<Empresa />} />
        <Route path="/configuracao/:id?" element={<ConfiguracaoFila />} />
        <Route path="/filas-cadastradas" element={<FilasCadastradas />} />
        <Route path="/filas" element={<FilaLista />} />
        <Route path="/gestao-fila/:idEmpresa/:dtMovto/:idFila" element={<GestaoFilaClientes />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/relatorio" element={<Relatorio />} />
        <Route path="/painel-fila/:idEmpresa/:dtMovto/:idFila" element={<PainelFilaExibicao />} />

        <Route
          path="/home"
          element={
            // <PrivateRoute>
              <Home />
            // </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;