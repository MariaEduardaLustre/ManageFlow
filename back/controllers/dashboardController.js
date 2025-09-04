// controllers/dashboardController.js

const db = require('../database/connection');

exports.obterDadosGraficos = async (req, res) => {
    const { idFila } = req.params;

    try {
        // 1. Fluxo por hora
        const [fluxoHora] = await db.execute(`
            SELECT HOUR(DT_ENTRA) AS hora, COUNT(*) AS qtd_clientes
            FROM clientesfila
            WHERE ID_FILA = ? AND DT_ENTRA IS NOT NULL
            GROUP BY HOUR(DT_ENTRA)
            ORDER BY hora
        `, [idFila]);

        // 2. Fluxo por dia da semana vs hora
        const [fluxoDiaHora] = await db.execute(`
            SELECT 
                WEEKDAY(DT_ENTRA) + 1 AS dia_semana, 
                HOUR(DT_ENTRA) AS hora, 
                COUNT(*) AS qtd_clientes
            FROM clientesfila
            WHERE ID_FILA = ? AND DT_ENTRA IS NOT NULL
            GROUP BY dia_semana, hora
            ORDER BY dia_semana, hora
        `, [idFila]);

        // 3. Tempo de espera por cliente
        const [temposEspera] = await db.execute(`
            SELECT 
                TIMESTAMPDIFF(MINUTE, DT_ENTRA, DT_CHAMA) AS tempo_espera_min
            FROM clientesfila
            WHERE ID_FILA = ? AND DT_ENTRA IS NOT NULL AND DT_CHAMA IS NOT NULL
        `, [idFila]);

        // 4. Média de tempo de espera por dia
        const [esperaMedia] = await db.execute(`
            SELECT 
                DATE(DT_ENTRA) AS data,
                AVG(TIMESTAMPDIFF(MINUTE, DT_ENTRA, DT_CHAMA)) AS media_espera
            FROM clientesfila
            WHERE ID_FILA = ? AND DT_ENTRA IS NOT NULL AND DT_CHAMA IS NOT NULL
            GROUP BY DATE(DT_ENTRA)
            ORDER BY data
        `, [idFila]);

        // 5. Tempo de permanência
        const [permanencias] = await db.execute(`
            SELECT 
                DT_ENTRA, DT_SAIDA,
                TIMESTAMPDIFF(MINUTE, DT_ENTRA, DT_SAIDA) AS tempo_permanencia_min
            FROM clientesfila
            WHERE ID_FILA = ? AND DT_ENTRA IS NOT NULL AND DT_SAIDA IS NOT NULL
        `, [idFila]);

        const tempoPermanencia = permanencias.map(p => ({
            DT_ENTRA: p.DT_ENTRA,
            tempo_permanencia_min: p.tempo_permanencia_min
        }));

        // Resposta para o frontend
        res.json({
            fluxoPorHora: fluxoHora,
            fluxoPorDiaHora: fluxoDiaHora,
            tempoEspera: temposEspera,
            tempoEsperaMedia: esperaMedia,
            tempoPermanencia: tempoPermanencia
        });

    } catch (err) {
        console.error('Erro ao obter dados dos gráficos:', err);
        res.status(500).json({ erro: 'Erro ao buscar dados dos gráficos.', detalhes: err.message });
    }
};
