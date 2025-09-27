import React from 'react';
import { FaSun, FaMoon } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext'; // Importa nosso hook
import './ThemeToggleButton.css';

const ThemeToggleButton = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle-button"
      onClick={toggleTheme}
      title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
    >
      {theme === 'light' ? <FaMoon /> : <FaSun />}
      <span className="toggle-label">
        {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
      </span>
    </button>
  );
};

export default ThemeToggleButton;