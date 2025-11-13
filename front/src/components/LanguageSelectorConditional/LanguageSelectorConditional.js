import React from 'react';
import { useLocation } from 'react-router-dom';
import LanguageSelector from '../LanguageSelector/LanguageSelector';

const LanguageSelectorConditional = () => {
    // Pega a localização atual da URL.
    const location = useLocation();

    // Define as rotas onde o seletor de idioma deve ser exibido.
    const allowedPaths = [
        '/login',
        '/cadastro',
        '/esqueci-senha',
        '/landing'
    ];
    
    // Verifica se a rota atual começa com '/redefinir-senha/'.
    const isRedefinirSenha = location.pathname.startsWith('/redefinir-senha/');

    // Se a rota for uma das permitidas ou a de redefinir senha, renderiza o seletor.
    if (allowedPaths.includes(location.pathname) || isRedefinirSenha) {
        return <LanguageSelector />;
    }
    
    // Caso contrário, não renderiza nada.
    return null;
};

export default LanguageSelectorConditional;