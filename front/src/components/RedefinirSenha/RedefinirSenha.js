import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import './RedefinirSenha.css';

const RedefinirSenha = () => {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false); 

  const [senhaValida, setSenhaValida] = useState(true);
  const [senhasCoincidem, setSenhasCoincidem] = useState(true);

  const validarSenhaSegura = (senha) => {
    const temOitoCaracteres = senha.length >= 8;
    const temLetraMaiuscula = /[A-Z]/.test(senha);
    const temCaractereEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(senha);
    return temOitoCaracteres && temLetraMaiuscula && temCaractereEspecial;
  };

  const handleChangeNovaSenha = (e) => {
    const value = e.target.value;
    setNovaSenha(value);
    setSenhaValida(validarSenhaSegura(value));
    if (confirmarNovaSenha) {
      setSenhasCoincidem(value === confirmarNovaSenha);
    }
  };

  const handleChangeConfirmarNovaSenha = (e) => {
    const value = e.target.value;
    setConfirmarNovaSenha(value);
    setSenhasCoincidem(value === novaSenha);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagem('');
    setErro('');

    if (!validarSenhaSegura(novaSenha)) {
      setErro(t('redefinirSenha.mensagens.alerta.senhaInvalida'));
      return;
    }
    if (novaSenha !== confirmarNovaSenha) {
      setErro(t('redefinirSenha.mensagens.alerta.senhasNaoCoincidem'));
      return;
    }

    setLoading(true); 

    try {
      const response = await api.post('/redefinir-senha', { token, novaSenha });
      
      if (response.data && response.data.message) {
        setMensagem(response.data.message);
      } else {
        setMensagem(t('redefinirSenha.mensagens.sucessoPadrao'));
      }
      setSucesso(true); 

    } catch (error) {
      console.error('Erro ao redefinir a senha:', error);
      if (error.response && error.response.data) {
        const errorMessage = error.response.data.error || error.response.data.message || error.response.data;
        setErro(errorMessage);
      } else {
        setErro(t('redefinirSenha.mensagens.erroPadrao'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="redefinir-senha-container">
      <h2>{t('redefinirSenha.titulo')}</h2>

      {sucesso ? (
        
        <div className="mensagem-card"> 
          <p className="mensagem-sucesso">{mensagem}</p>
          <button onClick={() => navigate('/login')} className="btn-primary">
            {t('redefinirSenha.botoes.irLogin')}
          </button>
        </div>

      ) : (

        <>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="novaSenha">{t('redefinirSenha.labels.novaSenha')}</label>
              <input
                type="password"
                id="novaSenha"
                value={novaSenha}
                onChange={handleChangeNovaSenha}
                required
                disabled={loading}
              />
              {!senhaValida && novaSenha.length > 0 && (
                <p className="mensagem-alerta">
                  {t('redefinirSenha.mensagens.alerta.senhaInvalida')}
                </p>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="confirmarNovaSenha">{t('redefinirSenha.labels.confirmarNovaSenha')}</label>
              <input
                type="password"
                id="confirmarNovaSenha"
                value={confirmarNovaSenha}
                onChange={handleChangeConfirmarNovaSenha}
                required
                disabled={loading}
              />
              {!senhasCoincidem && confirmarNovaSenha.length > 0 && (
                <p className="mensagem-alerta">
                  {t('redefinirSenha.mensagens.alerta.senhasNaoCoincidem')}
                </p>
              )}
            </div>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
            >
              {loading ? t('redefinirSenha.botoes.salvando') : t('redefinirSenha.botoes.redefinir')}
            </button>
          </form>
          {erro && <p className="mensagem-erro">{erro}</p>}
        </>
      )}
    </div>
  );
};

export default RedefinirSenha;