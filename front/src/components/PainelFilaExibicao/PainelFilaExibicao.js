// Arquivo: src/pages/PainelFilaExibicao/PainelFilaExibicao.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { io } from "socket.io-client";
import { BiFullscreen, BiExitFullscreen } from 'react-icons/bi';

import './PainelFilaExibicao.css';

// Estrutura padrão para as configurações
const defaultSettings = {
    customTitle: '',
    backgroundColor: '#f4f7f6',
    logoBase64: '',
    titleColor: '#3A5AFE',
    columnTitleColor: '#3A5AFE',
    columnBgColor: '#ffffff',
    clientNameColor: '#333',
    bannerTextColor: '#333',
    bannerBgColor: '#e9ecef',
    messages: [
        "Bem-vindo(a) ao nosso painel de atendimento!",
        "Fique atento(a) ao seu nome e número de guichê.",
        "Agradecemos a sua paciência!",
    ],
    showBanner: true
};

const PainelFilaExibicao = () => {
    const { idEmpresa, dtMovto, idFila } = useParams();
    const navigate = useNavigate();

    // Estados da aplicação
    const [clientesAguardando, setClientesAguardando] = useState([]);
    const [clientesChamados, setClientesChamados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const [savedSettings, setSavedSettings] = useState(defaultSettings);
    const [editingSettings, setEditingSettings] = useState(defaultSettings);
    const [messagesInput, setMessagesInput] = useState(defaultSettings.messages.join('\n'));
    
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    
    const fetchClientesFila = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const url = `/empresas/fila/${idEmpresa}/${dtMovto}/${idFila}/clientes`;
            const response = await api.get(url);
            const allClients = response.data;
            const aguardando = allClients.filter(c => Number(c.SITUACAO) === 0);
            const chamados = allClients.filter(c => Number(c.SITUACAO) === 3).sort((a, b) => new Date(b.DT_ENTRA) - new Date(a.DT_ENTRA)).slice(0, 5);
            setClientesAguardando(aguardando);
            setClientesChamados(chamados);
        } catch (err) {
             setError(err.response?.status !== 404 ? 'Não foi possível carregar os clientes.' : 'Nenhum cliente na fila.');
        } finally {
            setLoading(false);
        }
    }, [idEmpresa, dtMovto, idFila]);

    const handleSettingChange = (field, value) => setEditingSettings(prev => ({ ...prev, [field]: value }));
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => handleSettingChange('logoBase64', reader.result);
            reader.readAsDataURL(file);
        }
    };
    const handleRemoveLogo = () => {
        handleSettingChange('logoBase64', '');
        const fileInput = document.getElementById('logo-upload');
        if (fileInput) fileInput.value = '';
    };
    const handleSaveSettings = () => {
        const processedMessages = messagesInput.split('\n').map(msg => msg.trim()).filter(Boolean);
        const finalSettingsToSave = { ...editingSettings, messages: processedMessages };
        localStorage.setItem('painelSettings', JSON.stringify(finalSettingsToSave));
        setSavedSettings(finalSettingsToSave);
        setNotificationMessage('Configurações salvas com sucesso!');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
    };
    useEffect(() => {
        const settingsFromStorage = localStorage.getItem('painelSettings');
        if (settingsFromStorage) {
            const parsedSettings = JSON.parse(settingsFromStorage);
            const completeSettings = { ...defaultSettings, ...parsedSettings };
            setSavedSettings(completeSettings);
            setEditingSettings(completeSettings);
            setMessagesInput(completeSettings.messages.join('\n'));
        }
    }, []);
    useEffect(() => {
        const socket = io("http://localhost:3001");
        socket.on('cliente_atualizado', () => fetchClientesFila());
        fetchClientesFila();
        return () => socket.disconnect();
    }, [fetchClientesFila]);
    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
    const handleFullscreenToggle = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    // TELA DE CONFIGURAÇÃO
    if (!isFullscreen) {
        return (
            <div className="painel-exibicao-container">
                <header className="painel-header">
                    <div className="painel-header-content">
                        <button className="btn-voltar" onClick={() => navigate(-1)}>&larr; Voltar</button>
                        <h1>Configuração do Painel</h1>
                        <button className="btn-fullscreen" onClick={handleFullscreenToggle} title="Ativar Tela Cheia"><BiFullscreen /></button>
                    </div>
                </header>

                <div className="painel-configuracao-wrapper">
                    <div className="painel-configuracao">
                        <div className="config-group"><label>Título do Painel:</label><input type="text" value={editingSettings.customTitle} onChange={(e) => handleSettingChange('customTitle', e.target.value)} /></div>
                        <div className="config-group"><label>Logo da Empresa:</label><div className="file-input-wrapper"><input type="file" id="logo-upload" accept="image/*" onChange={handleFileChange} />{editingSettings.logoBase64 && <button className="btn-remover-logo" onClick={handleRemoveLogo}>Remover</button>}</div></div>
                        <div className="config-group"><div className="toggle-switch-container"><label>Exibir Banner Rotativo:</label><label className="toggle-switch"><input type="checkbox" checked={editingSettings.showBanner} onChange={(e) => handleSettingChange('showBanner', e.target.checked)} /><span className="slider"></span></label></div><label>Mensagens do Banner (uma por linha):</label><textarea value={messagesInput} onChange={(e) => setMessagesInput(e.target.value)} rows="5" /></div>
                        <div className="color-card-group">
                            <div className="color-card"><h5>Cores do Painel</h5><div className="color-option"><label>Fundo do Painel:</label><input type="color" value={editingSettings.backgroundColor} onChange={(e) => handleSettingChange('backgroundColor', e.target.value)} /></div><div className="color-option"><label>Letra do Título:</label><input type="color" value={editingSettings.titleColor} onChange={(e) => handleSettingChange('titleColor', e.target.value)} /></div></div>
                            <div className="color-card"><h5>Cores das Colunas</h5><div className="color-option"><label>Fundo das Colunas:</label><input type="color" value={editingSettings.columnBgColor} onChange={(e) => handleSettingChange('columnBgColor', e.target.value)} /></div><div className="color-option"><label>Letras Título Colunas:</label><input type="color" value={editingSettings.columnTitleColor} onChange={(e) => handleSettingChange('columnTitleColor', e.target.value)} /></div><div className="color-option"><label>Letras dos Clientes:</label><input type="color" value={editingSettings.clientNameColor} onChange={(e) => handleSettingChange('clientNameColor', e.target.value)} /></div></div>
                            <div className="color-card"><h5>Cores do Banner</h5><div className="color-option"><label>Cor de Fundo:</label><input type="color" value={editingSettings.bannerBgColor} onChange={(e) => handleSettingChange('bannerBgColor', e.target.value)} /></div><div className="color-option"><label>Cor da Letra:</label><input type="color" value={editingSettings.bannerTextColor} onChange={(e) => handleSettingChange('bannerTextColor', e.target.value)} /></div></div>
                        </div>
                        <button className="btn-save-settings" onClick={handleSaveSettings}>Salvar Configurações</button>
                    </div>
                    
                    {/* ===== A CORREÇÃO ESTÁ NESTA LINHA ===== */}
                    <div className="painel-preview" style={{ backgroundColor: editingSettings.backgroundColor }}>
                        <div className="painel-preview-content">
                            <header className="painel-header" style={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}><div className="painel-header-content">{editingSettings.logoBase64 && <img src={editingSettings.logoBase64} alt="Logo da Empresa" className="painel-logo" />}<h1 style={{ color: editingSettings.titleColor }}>{editingSettings.customTitle || 'Painel da Fila'}</h1></div></header>
                            <div className="painel-colunas">
                                <div className="coluna-clientes na-fila" style={{ backgroundColor: editingSettings.columnBgColor }}><h2 style={{ color: editingSettings.columnTitleColor }}>Aguardando</h2><div className="lista-clientes">{clientesAguardando.map(c => (<div key={`prev-aguardando-${c.ID_CLIENTE}`} className="cartao-cliente aguardando"><span className="cliente-nome" style={{ color: editingSettings.clientNameColor }}>{c.NOME}</span></div>))}</div></div>
                                <div className="coluna-clientes chamados" style={{ backgroundColor: editingSettings.columnBgColor }}><h2 style={{ color: editingSettings.columnTitleColor }}>Chamados</h2><div className="lista-clientes">{clientesChamados.map(c => (<div key={`prev-chamado-${c.ID_CLIENTE}`} className="cartao-cliente chamado"><span className="cliente-nome" style={{ color: editingSettings.clientNameColor }}>{c.NOME}</span></div>))}</div></div>
                            </div>
                            {editingSettings.showBanner && (<div className="mensagens-rotativas-container" style={{ backgroundColor: editingSettings.bannerBgColor }}><div className="mensagem-texto" style={{ color: editingSettings.bannerTextColor }}>{editingSettings.messages.map((msg, i) => (<span key={`prev-m1-${i}`} className="mensagem-item">{msg}</span>))}{editingSettings.messages.map((msg, i) => (<span key={`prev-m2-${i}`} className="mensagem-item">{msg}</span>))}</div></div>)}
                        </div>
                    </div>
                </div>
                {showNotification && <div className="custom-notification"><p>{notificationMessage}</p></div>}
            </div>
        );
    }
    
    // TELA CHEIA
    return (
        <div className="painel-exibicao-container fullscreen-ativo" style={{ backgroundColor: savedSettings.backgroundColor }}>
            <header className="painel-header">
                <div className="painel-header-content">
                    {savedSettings.logoBase64 && <img src={savedSettings.logoBase64} alt="Logo da Empresa" className="painel-logo" />}
                    <h1 style={{ color: savedSettings.titleColor }}>{savedSettings.customTitle || 'Painel da Fila'}</h1>
                    <button className="btn-fullscreen" onClick={handleFullscreenToggle} title="Sair da Tela Cheia"><BiExitFullscreen /></button>
                </div>
            </header>
            {loading && <div className="loading-message">Carregando...</div>}
            {error && <div className="error-message-panel">{error}</div>}
            <div className="painel-colunas">
                <div className="coluna-clientes na-fila" style={{ backgroundColor: savedSettings.columnBgColor }}><h2 style={{ color: savedSettings.columnTitleColor }}>Aguardando</h2><div className="lista-clientes">{clientesAguardando.map(c => (<div key={`fs-aguardando-${c.ID_CLIENTE}`} className="cartao-cliente aguardando"><span className="cliente-nome" style={{ color: savedSettings.clientNameColor }}>{c.NOME}</span></div>))}</div></div>
                <div className="coluna-clientes chamados" style={{ backgroundColor: savedSettings.columnBgColor }}><h2 style={{ color: savedSettings.columnTitleColor }}>Chamados</h2><div className="lista-clientes">{clientesChamados.map(c => (<div key={`fs-chamado-${c.ID_CLIENTE}`} className="cartao-cliente chamado"><span className="cliente-nome" style={{ color: savedSettings.clientNameColor }}>{c.NOME}</span></div>))}</div></div>
            </div>
            {savedSettings.showBanner && (<div className="mensagens-rotativas-container" style={{ backgroundColor: savedSettings.bannerBgColor }}><div className="mensagem-texto" style={{ color: savedSettings.bannerTextColor }}>{savedSettings.messages.map((msg, i) => (<span key={`fs-m1-${i}`} className="mensagem-item">{msg}</span>))}{savedSettings.messages.map((msg, i) => (<span key={`fs-m2-${i}`} className="mensagem-item">{msg}</span>))}</div></div>)}
        </div>
    );
};

export default PainelFilaExibicao;