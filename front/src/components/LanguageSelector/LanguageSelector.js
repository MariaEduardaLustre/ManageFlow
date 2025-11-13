import React from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSelector.css';

// O componente agora aceita uma propriedade 'variant', com 'fixed' como valor padrão
const LanguageSelector = ({ variant = 'fixed' }) => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  // A classe do container agora muda com base na variante recebida
  return (
    <div className={`language-selector-container ${variant}`}>
      <button 
        className={`language-button ${i18n.language === 'pt' ? 'active' : ''}`}
        onClick={() => changeLanguage('pt')}>
        PT
      </button>

      <button 
        className={`language-button ${i18n.language === 'en' ? 'active' : ''}`}
        onClick={() => changeLanguage('en')}>
        EN
      </button>
    </div>
  );
};

export default LanguageSelector;