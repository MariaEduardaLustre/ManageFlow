import React from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSelector.css'; // Importa o arquivo de estilo

const LanguageSelector = () => {
  // O hook useTranslation nos dá acesso à instância do i18n
  const { i18n } = useTranslation();

  // Função para mudar o idioma
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="language-selector-container">
      {/* Botão para Português (PT) */}
      <button 
        className={`language-button ${i18n.language === 'pt' ? 'active' : ''}`}
        onClick={() => changeLanguage('pt')}>
        PT
      </button>

      {/* Botão para Inglês (EN) */}
      <button 
        className={`language-button ${i18n.language === 'en' ? 'active' : ''}`}
        onClick={() => changeLanguage('en')}>
        EN
      </button>
    </div>
  );
};

export default LanguageSelector;