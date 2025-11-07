const twilio = require('twilio');
const axios = require('axios');
const nodemailer = require('nodemailer');
const db = require('../database/connection');


// Configuração do Nodemailer
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

/**
 * Envia uma notificação por e-mail para o cliente.
 */
const sendEmailNotification = async (email, subject, bodyHtml) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: subject,
        html: bodyHtml,
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`E-mail de notificação enviado para ${email}.`);
    } catch (error) {
        console.error(`Erro ao enviar e-mail para ${email}:`, error);
        throw new Error('Falha no envio do e-mail.');
    }
};

/**
 * Envia uma notificação por WhatsApp usando a Cloud API (Modelo Genérico).
 */
const sendWhatsappNotification = async (cliente, templateName) => {
    console.log('Dados do cliente para o WhatsApp:', cliente);
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!phoneNumberId || !accessToken) {
        console.error('Credenciais da WhatsApp Cloud API ausentes.');
        throw new Error('Credenciais da WhatsApp Cloud API ausentes.');
    }
    
    // ESTRUTURA SIMPLIFICADA E CORRIGIDA: usa o modelo genérico
    const payload = {
        messaging_product: 'whatsapp',
        to: `+55${cliente.DDDCEL}${cliente.NR_CEL}`,
        type: 'template',
        template: { 
            name: templateName, 
            language: { code: 'pt_BR' } 
        },
    };
    
    const config = {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    };
    
    try {
        const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
        const response = await axios.post(url, payload, config);
        console.log(`Mensagem do WhatsApp enviada para +55${cliente.DDDCEL}${cliente.NR_CEL}.`, response.data);
    } catch (error) {
        console.error('Erro ao enviar mensagem do WhatsApp:', error.response ? error.response.data : error.message);
        throw new Error('Falha no envio da mensagem do WhatsApp.');
    }
};

/**
 * Envia uma notificação por SMS usando a API da Twilio.
 */
const sendSmsNotification = async (cliente, mensagem) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!accountSid || !authToken || !twilioPhoneNumber) {
        console.error('Credenciais da Twilio ausentes.');
        throw new Error('Credenciais da Twilio ausentes.');
    }
    const client = twilio(accountSid, authToken);
    const numeroCompleto = `+${cliente.DDI || '55'}${cliente.DDDCEL}${cliente.NR_CEL}`;
    try {
        await client.messages.create({ body: mensagem, from: twilioPhoneNumber, to: numeroCompleto });
        console.log(`SMS de notificação enviado para ${numeroCompleto}.`);
    } catch (error) {
        console.error('Erro ao enviar SMS:', error);
        throw new Error('Falha no envio do SMS.');
    }
};


/**
 * Função principal para enviar notificação de 'vez chegando'
 */
const sendNotification = async (cliente) => {
    const nome = cliente.NOME || 'Cliente';
    const mensagem = `Ola, ${nome}! Sua vez esta chegando. Por favor, dirija-se a area de espera.`;
    const subject = 'Sua vez está chegando!';
    const html = `<p>Olá, ${nome}!</p><p>Seu atendimento está prestes a ser iniciado. Por favor, dirija-se à área de espera para a sua chamada.</p><p>Agradecemos a sua paciência!</p>`;
    
    switch (cliente.MEIO_NOTIFICACAO) {
        case 'whatsapp':
            if (!cliente.DDDCEL || !cliente.NR_CEL) throw new Error('Número de telefone do cliente ausente.');
            // Usa o modelo genérico 'aviso_generico'
            await sendWhatsappNotification(cliente, 'aviso_generico'); 
            break;
        case 'sms':
            if (!cliente.DDDCEL || !cliente.NR_CEL) throw new Error('Número de telefone do cliente ausente.');
            await sendSmsNotification(cliente, mensagem);
            break;
        case 'email':
            if (!cliente.EMAIL) throw new Error('Endereço de e-mail ausente.');
            await sendEmailNotification(cliente.EMAIL, subject, html);
            break;
        default:
            console.warn(`Meio de notificação desconhecido: ${cliente.MEIO_NOTIFICACAO}`);
    }
};


/**
 * Envia a notificação inicial de confirmação de entrada na fila.
 */
const sendInitialNotification = async (cliente, posicaoNaFila) => {
    const nome = cliente.NOME || 'Cliente';
    const mensagem = `Olá ${nome}! Você acabou de entrar na fila. O seu lugar é o ${posicaoNaFila}. Iremos notificá-lo quando a sua vez estiver a aproximar-se.`;
    const subject = 'Confirmação de Entrada na Fila';
    const html = `<p>Olá, ${nome}!</p><p>Você acaba de entrar na fila. Seu lugar é o **${posicaoNaFila}**. Iremos notificá-lo quando a sua vez estiver a aproximar-se.</p><p>Agradecemos a sua paciência!</p>`;
    
    switch (cliente.MEIO_NOTIFICACAO) {
        case 'whatsapp':
             if (!cliente.DDDCEL || !cliente.NR_CEL) throw new Error('Número de telefone do cliente ausente.');
             // Usa o modelo genérico 'aviso_generico'
             await sendWhatsappNotification(cliente, 'aviso_generico'); 
             break;
        case 'sms':
            if (!cliente.DDDCEL || !cliente.NR_CEL) throw new Error('Número de telefone do cliente ausente.');
            await sendSmsNotification(cliente, mensagem);
            break;
        case 'email':
            if (!cliente.EMAIL) throw new Error('Endereço de e-mail ausente.');
            await sendEmailNotification(cliente.EMAIL, subject, html);
            break;
        default:
            console.warn(`Meio de notificação desconhecido para notificação inicial: ${cliente.MEIO_NOTIFICACAO}`);
    }
};


/**
 * Agenda uma verificação para marcar o cliente como "Não Compareceu" se o tempo de tolerância expirar.
 */
const scheduleTimeoutForAbsence = (idEmpresa, dtMovto, idFila, idCliente, timeoutEmMs, io) => {
    console.log(`[AGENDAMENTO CRIADO] Cliente ${idCliente} será verificado em ${timeoutEmMs / 1000} segundos.`);
    const dtMovtoFormatted = dtMovto.includes('T') ? dtMovto.split('T')[0] : dtMovto;

    setTimeout(async () => {
        console.log(`[AGENDAMENTO EXECUTADO] Verificando cliente ${idCliente} AGORA.`);

        try {
            // 1. Verificar qual é a situação ATUAL do cliente no banco
            const [[cliente]] = await db.query(
                `SELECT SITUACAO FROM clientesfila
                 WHERE ID_EMPRESA = ? AND DATE(DT_MOVTO) = ? AND ID_FILA = ? AND ID_CLIENTE = ?`,
                [idEmpresa, dtMovtoFormatted, idFila, idCliente]
            );

            // 2. SÓ atualizar se o cliente ainda estiver como "Chamado" (SITUACAO = 3)
            if (cliente && cliente.SITUACAO === 3) {
                console.log(`Cliente ${idCliente} ainda está como 'Chamado'. Atualizando para 'Não Compareceu'.`);

                // 3. Atualizar o status para "Não Compareceu" (SITUACAO = 2)
                await db.query(
                    `UPDATE clientesfila SET SITUACAO = 2, DT_SAIDA = NOW() 
                     WHERE ID_EMPRESA = ? AND DATE(DT_MOVTO) = ? AND ID_FILA = ? AND ID_CLIENTE = ?`,
                    [idEmpresa, dtMovtoFormatted, idFila, idCliente]
                );

                // 4. Avisar o frontend
                if (io) {
                    io.emit('cliente_atualizado', { idEmpresa, idFila, idCliente, novaSituacao: 2 });
                }
                console.log(`Cliente ${idCliente} atualizado para 'Não Compareceu' com sucesso.`);
            } else {
                 console.log(`Cliente ${idCliente} não precisa ser atualizado (Situação atual: ${cliente ? cliente.SITUACAO : 'não encontrado'}). Ação cancelada.`);
            }
        } catch (error) {
            console.error(`[ERRO NO AGENDAMENTO] Falha ao processar o timeout para o cliente ${idCliente}:`, error);
        }
    }, timeoutEmMs);
};


module.exports = {
    sendNotification,
    scheduleTimeoutForAbsence,
    sendInitialNotification,
};