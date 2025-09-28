import React, { createContext, useState, useEffect, useContext } from 'react';

// 1. Cria o Contexto
const ThemeContext = createContext();

// 2. Cria o Provedor (Provider)
export const ThemeProvider = ({ children }) => {
  // Tenta pegar o tema salvo no localStorage, ou usa 'light' como padrão
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    // ESTE LOG VAI MOSTRAR SE O ATRIBUTO ESTÁ SENDO APLICADO
    console.log(`Aplicando o atributo data-theme="${theme}" no body.`);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Função para alternar o tema
  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      // ESTE LOG VAI MOSTRAR SE A FUNÇÃO ESTÁ SENDO CHAMADA CORRETAMENTE
      console.log('Tema alterado de', prevTheme, 'para', newTheme);
      return newTheme;
    });
  };

  // Fornece o tema e a função para os componentes filhos
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 3. Cria um hook customizado para facilitar o uso do contexto
export const useTheme = () => useContext(ThemeContext);