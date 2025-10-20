import React from 'react';
import Menu from '../../components/Menu/Menu'; // Ajuste o caminho se necessário
import DashboardAvaliacoes from '../../components/DashboardAvaliacoes/DashboardAvaliacoes'; // Ajuste o caminho se necessário
import './AvaliacoesPage.css'; // Importando o NOVO CSS que criaremos no Passo 2

// Esta página, assim como o Dashboard.js, precisa receber 'onLogout'
const AvaliacoesPage = ({ onLogout }) => {
    const empresaSel = JSON.parse(localStorage.getItem("empresaSelecionada"));
    const idEmpresa = empresaSel?.ID_EMPRESA || null;

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
                </div>

                {/* O Card Principal com o Dashboard de Avaliações */}
                {/* Usamos as classes mf-card e mf-mt para manter o visual de card */}
                <div className="mf-card mf-mt">
                    <div className="mf-card-body">
                        {idEmpresa ? (
                            <DashboardAvaliacoes idEmpresa={idEmpresa} />
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