// Arquivo: cronJobs.js
const cron = require('node-cron');
const db = require('./database/connection');

// Importar o objeto 'io' do seu arquivo principal (server.js)
const { io } = require('./server');

async function verificarTimeouts() {
    try {
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

        if (clientesParaAtualizar.length > 0) {
            for (const cliente of clientesParaAtualizar) {
                await db.query(
                    'UPDATE clientesfila SET SITUACAO = 2, DT_SAIDA = NOW() WHERE ID_EMPRESA = ? AND ID_FILA = ? AND ID_CLIENTE = ?',
                    [cliente.ID_EMPRESA, cliente.ID_FILA, cliente.ID_CLIENTE]
                );
                
                // Emita um evento Socket.IO para o frontend
                io.emit('cliente_atualizado', { idCliente: cliente.ID_CLIENTE, novaSituacao: 2 });

                console.log(`[CRON] Cliente ID ${cliente.ID_CLIENTE} atualizado e notificado via Socket.IO.`);
            }
        }
    } catch (error) {
        console.error('[CRON] Erro ao verificar timeouts:', error);
    }
}

cron.schedule('* * * * *', () => {
    console.log('[CRON] Iniciando a verificação de timeouts...');
    verificarTimeouts();
});

console.log('Serviço de cron jobs iniciado. Verificando a cada 1 minuto.');