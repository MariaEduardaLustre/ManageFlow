const db = require('../database/connection');

exports.obterDadosGraficos = async (req, res) => {
    const { idFila } = req.params;

    try {
        // 1. Fluxo de clientes por hora (entradas)
        const [fluxoPorHora] = await db.query(
            `SELECT HOUR(DT_ENTRA) AS hora, COUNT(*) AS qtd_clientes
             FROM clientesfila
             WHERE ID_FILA = ?
             GROUP BY HOUR(DT_ENTRA)
             ORDER BY hora`, 
            [idFila]
        );

        // 2. Fluxo por dia da semana vs hora (heatmap)
        const [fluxoPorDiaHora] = await db.query(
            `SELECT DAYOFWEEK(DT_ENTRA) AS dia_semana, HOUR(DT_ENTRA) AS hora, COUNT(*) AS qtd_clientes
             FROM clientesfila
             WHERE ID_FILA = ?
             GROUP BY dia_semana, hora
             ORDER BY dia_semana, hora`,
            [idFila]
        );

        // 3. Tempo médio de espera por hora
        // Tempo de espera = DT_CHAMA - DT_ENTRA em minutos
        const [tempoEsperaMedia] = await db.query(
            `SELECT DATE(DT_ENTRA) AS data, AVG(TIMESTAMPDIFF(MINUTE, DT_ENTRA, DT_CHAMA)) AS media_espera
             FROM clientesfila
             WHERE ID_FILA = ? AND DT_CHAMA IS NOT NULL
             GROUP BY DATE(DT_ENTRA)
             ORDER BY DATE(DT_ENTRA)`,
            [idFila]
        );

        res.json({
            fluxoPorHora,
            fluxoPorDiaHora,
            tempoEsperaMedia
        });

    } catch (error) {
        console.error('Erro ao obter dados gráficos:', error);
        res.status(500).json({ error: 'Erro ao obter dados gráficos.' });
    }
};

