import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './RedefinirSenha.css'; // Crie este arquivo CSS

const RedefinirSenha = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);

  // Estados para validação em tempo real
  const [senhaValida, setSenhaValida] = useState(true);
  const [senhasCoincidem, setSenhasCoincidem] = useState(true);

  useEffect(() => {
    // O token já está na URL
  }, [token]);

  // Função para validar a segurança da senha
  const validarSenhaSegura = (senha) => {
    const temOitoCaracteres = senha.length >= 8;
    const temLetraMaiuscula = /[A-Z]/.test(senha);
    const temCaractereEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(senha);
    return temOitoCaracteres && temLetraMaiuscula && temCaractereEspecial;
  };

  // Função para lidar com a mudança nos campos de senha
  const handleChangeNovaSenha = (e) => {
    const value = e.target.value;
    setNovaSenha(value);
    // Valida a segurança da senha em tempo real
    setSenhaValida(validarSenhaSegura(value));
    // Se o campo de confirmação já estiver preenchido, verifica se coincidem
    if (confirmarNovaSenha) {
      setSenhasCoincidem(value === confirmarNovaSenha);
    }
  };

  const handleChangeConfirmarNovaSenha = (e) => {
    const value = e.target.value;
    setConfirmarNovaSenha(value);
    // Verifica se as senhas coincidem em tempo real
    setSenhasCoincidem(value === novaSenha);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagem('');
    setErro('');
    setMostrarModal(false);

    // Validações finais antes de enviar o formulário
    if (!validarSenhaSegura(novaSenha)) {
      setErro('A nova senha deve conter no mínimo 8 caracteres, uma letra maiúscula e um caractere especial.');
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      setErro('As senhas não coincidem!');
      return;
    }

    try {
      const response = await api.post('/redefinir-senha', { token, novaSenha });
      setMensagem(response.data);
      setMostrarModal(true);
    } catch (error) {
      console.error('Erro ao redefinir a senha:', error);
      if (error.response && error.response.data) {
        setErro(error.response.data);
      } else {
        setErro('Ocorreu um erro ao redefinir a senha.');
      }
      setMostrarModal(false);
    }
  };

  const fecharModal = () => {
    setMostrarModal(false);
    navigate('/login');
  };

  return (
    <div className="redefinir-senha-container">
      <h2>Redefinir Senha</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="novaSenha">Nova Senha:</label>
          <input
            type="password" // Tipo fixo como 'password'
            id="novaSenha"
            name="novaSenha"
            value={novaSenha}
            onChange={handleChangeNovaSenha}
            required
          />
          {/* Mensagem de alerta para a segurança da senha */}
          {!senhaValida && novaSenha.length > 0 && (
            <p className="mensagem-alerta">
              A senha deve conter no mínimo 8 caracteres, uma letra maiúscula e um caractere especial.
            </p>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="confirmarNovaSenha">Confirmar Nova Senha:</label>
          <input
            type="password" // Tipo fixo como 'password'
            id="confirmarNovaSenha"
            name="confirmarNovaSenha"
            value={confirmarNovaSenha}
            onChange={handleChangeConfirmarNovaSenha}
            required
          />
          {/* Mensagem de alerta para senhas que não coincidem */}
          {!senhasCoincidem && confirmarNovaSenha.length > 0 && (
            <p className="mensagem-alerta">As senhas não coincidem!</p>
          )}
        </div>
        <button type="submit" className="btn-primary">Redefinir Senha</button>
      </form>
      {erro && <p className="mensagem-erro">{erro}</p>}

      {/* Renderização condicional do modal de sucesso */}
      {mostrarModal && mensagem && (
        <div className="modal-overlay">
          <div className="modal">
            <p className="mensagem-sucesso">{mensagem}</p>
            <button onClick={fecharModal} className="btn-fechar-modal">Ir para Login</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedefinirSenha;