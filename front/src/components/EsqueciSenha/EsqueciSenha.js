import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next'; // <-- 1. IMPORTAÇÕES i18n
import api from '../../services/api';
import './EsqueciSenha.css';

// NÃO PRECISAMOS MAIS DE NADA RELACIONADO AO TEMA AQUI!

const EsqueciSenha = () => {
  const { t } = useTranslation(); // <-- 2. INICIALIZAÇÃO DO HOOK i18n
  const [email, setEmail] = useState('');
  
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);  
  const [sucesso, setSucesso] = useState(false);  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagem('');
    setErro('');
    setLoading(true); 

    try {
      const response = await api.post('/esqueci-senha', { email });
      
      if (response.data && response.data.message) {
        setMensagem(response.data.message);
      } else {
        setMensagem(t('esqueciSenha.mensagens.sucessoPadrao')); 
      }
      setSucesso(true); 

    } catch (error) {
      if (error.response && error.response.data) {
        const errorMessage = error.response.data.message || error.response.data;
        setErro(errorMessage);
      } else {
        setErro(t('esqueciSenha.mensagens.erroPadrao'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    // <-- 3. O DIV VOLTA A SER SIMPLES
    <div className="esqueci-senha-container">
      <h2>{t('esqueciSenha.titulo')}</h2>

      {sucesso ? (
        
        <div className="mensagem-card">  
          <p className="mensagem-sucesso">{mensagem}</p>
          <p>
            <a href="/login">{t('esqueciSenha.links.voltarLogin')}</a>
          </p>
        </div>

      ) : (

        <>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">{t('esqueciSenha.labelEmail')}</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('esqueciSenha.placeholderEmail')}
                required
                disabled={loading}
              />
            </div>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
            >
              {loading ? t('esqueciSenha.botoes.enviando') : t('esqueciSenha.botoes.enviar')}
            </button>
          </form>
        
          {erro && <p className="mensagem-erro">{erro}</p>}

          <p>
            <Trans i18nKey="esqueciSenha.links.lembrouSenha">
              Lembrou a senha? <a href="/login">Fazer login</a>
            </Trans>
          </p>
        </>
      )}
    </div>
  );
};

export default EsqueciSenha;