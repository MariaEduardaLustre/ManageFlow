// Arquivo: cronJobs.js
const cron = require('node-cron');
const db = require('./database/connection'); // Verifique se este caminho está correto

async function verificarTimeouts() {
    try {
        // Encontre os clientes que foram notificados e cujo tempo de tolerância já se esgotou
        const query = `
            SELECT
                c.ID_EMPRESA,
                c.ID_FILA,
                c.ID_CLIENTE
            FROM clientesfila c
            JOIN ConfiguracaoFila cf ON c.ID_EMPRESA = cf.ID_EMPRESA
            WHERE
                c.SITUACAO = 3 AND
                c.DT_NOTIFICACAO IS NOT NULL AND
                NOW() > DATE_ADD(c.DT_NOTIFICACAO, INTERVAL cf.TEMP_TOL MINUTE);
        `;
        const [clientesParaAtualizar] = await db.query(query);

        console.log(`[CRON] Encontrados ${clientesParaAtualizar.length} clientes com timeout.`);

        // Para cada cliente, atualize a situação para "Não Compareceu" (2)
        if (clientesParaAtualizar.length > 0) {
            for (const cliente of clientesParaAtualizar) {
                await db.query(
                    'UPDATE clientesfila SET SITUACAO = 2, DT_SAIDA = NOW() WHERE ID_EMPRESA = ? AND ID_FILA = ? AND ID_CLIENTE = ?',
                    [cliente.ID_EMPRESA, cliente.ID_FILA, cliente.ID_CLIENTE]
                );
                console.log(`[CRON] Cliente ID ${cliente.ID_CLIENTE} atualizado para 'Não Compareceu'.`);
            }
        }
    } catch (error) {
        console.error('[CRON] Erro ao verificar timeouts:', error);
    }
}

// Agende a tarefa para rodar a cada 5 minutos
// O formato é 'minuto hora dia_do_mes mes dia_da_semana'
cron.schedule('*/1 * * * *', () => {
    console.log('[CRON] Iniciando a verificação de timeouts...');
    verificarTimeouts();
});

console.log('Serviço de cron jobs iniciado. Verificando a cada 1 minuto.');