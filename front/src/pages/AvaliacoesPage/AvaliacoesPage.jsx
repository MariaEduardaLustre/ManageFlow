import React, { useState } from 'react'; // 1. Importar o useState
import Menu from '../../components/Menu/Menu'; // Ajuste o caminho se necessário
import DashboardAvaliacoes from '../../components/DashboardAvaliacoes/DashboardAvaliacoes'; // Ajuste o caminho se necessário
import './AvaliacoesPage.css'; // Importando o CSS
import { Button } from 'react-bootstrap'; // 2. Importar o Button

// Esta página, assim como o Dashboard.js, precisa receber 'onLogout'
const AvaliacoesPage = ({ onLogout }) => {
    const empresaSel = JSON.parse(localStorage.getItem("empresaSelecionada"));
    const idEmpresa = empresaSel?.ID_EMPRESA || null;

    // 3. O estado dos gráficos agora vive AQUI
    const [mostrarGraficos, setMostrarGraficos] = useState(false);

    return (
        <div className="mf-dash"> {/* Layout principal (reutilizado do Dashboard.css) */}
            <Menu onLogout={onLogout} />
            <div className="mf-dash-content">
                {/* Título da Página */}
                <div className="mf-dash-header">
                    <div>
                        <h1>Painel de Avaliações</h1>
                        <p className="mf-subtitle">
                            Veja a média geral, distribuição e comentários da sua empresa.
                            {empresaSel?.NOME_EMPRESA ? ` — ${empresaSel.NOME_EMPRESA}` : ""}
                        </p>
                    </div>

                    {/* 4. Botão movido para o cabeçalho */}
                    <div className="mf-header-actions">
                         <Button
                            variant="outline-secondary"
                            onClick={() => setMostrarGraficos(!mostrarGraficos)}
                            className="mf-header-button" // Classe para estilo opcional
                        >
                            {mostrarGraficos ? 'Ocultar Gráficos' : 'Exibir Gráficos'}
                        </Button>
                    </div>
                </div>

                {/* O Card Principal com o Dashboard de Avaliações */}
                {/* Usamos as classes mf-card e mf-mt para manter o visual de card */}
                <div className="mf-card mf-mt">
                    <div className="mf-card-body">
                        {idEmpresa ? (
                            <DashboardAvaliacoes 
                                idEmpresa={idEmpresa} 
                                // 5. Passamos o estado (e se deve mostrar) como prop
                                mostrarGraficos={mostrarGraficos} 
                            />
                        ) : (
                            <p className="mf-center-muted">
                                Empresa não selecionada.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AvaliacoesPage;