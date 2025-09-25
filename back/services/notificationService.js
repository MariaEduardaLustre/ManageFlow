// Arquivo: services/notificationService.js
const twilio = require('twilio');
const axios = require('axios');
const nodemailer = require('nodemailer');

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
 * @param {string} email - Endereço de e-mail do cliente.
 * @param {string} subject - Assunto do e-mail.
 * @param {string} bodyHtml - Corpo do e-mail em HTML.
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
 * Envia uma notificação por WhatsApp usando a Cloud API.
 * Nota: É necessário ter um template aprovado para mensagens proativas.
 * @param {object} cliente - Objeto com os dados do cliente.
 * @param {string} templateName - Nome do template do WhatsApp.
 * @param {array} parameters - Array de parâmetros para o template.
 */
const sendWhatsappNotification = async (cliente, templateName, parameters) => {
    console.log('Dados do cliente para o WhatsApp:', cliente);

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
        console.error('Credenciais da WhatsApp Cloud API ausentes.');
        throw new Error('Credenciais da WhatsApp Cloud API ausentes.');
    }

    const payload = {
        messaging_product: 'whatsapp',
        to: `+55${cliente.DDDCEL}${cliente.NR_CEL}`,
        type: 'template',
        template: {
            name: templateName,
            language: {
                code: 'pt_BR',
            },
            components: [{
                type: 'body',
                parameters: parameters,
            }],
        },
    };

    const config = {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
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
 * @param {object} cliente - Objeto com os dados do cliente (DDDCEL, NR_CEL, etc.).
 * @param {string} mensagem - A mensagem de texto a ser enviada.
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
        await client.messages.create({
            body: mensagem,
            from: twilioPhoneNumber,
            to: numeroCompleto,
        });
        console.log(`SMS de notificação enviado para ${numeroCompleto}.`);
    } catch (error) {
        console.error('Erro ao enviar SMS:', error);
        throw new Error('Falha no envio do SMS.');
    }
};

/**
 * Função principal para enviar notificação de 'vez chegando' com base no meio escolhido.
 * @param {object} cliente - Objeto com os dados do cliente.
 */
const sendNotification = async (cliente) => {
    const mensagem = `Ola, ${cliente.NOME || 'Cliente'}! Sua vez esta chegando. Por favor, dirija-se a area de espera.`;
    const subject = 'Sua vez está chegando!';
    const html = `
        <p>Olá, ${cliente.NOME || 'Cliente'}!</p>
        <p>Seu atendimento está prestes a ser iniciado. Por favor, dirija-se à área de espera para a sua chamada.</p>
        <p>Agradecemos a sua paciência!</p>`;

    switch (cliente.MEIO_NOTIFICACAO) {
        case 'whatsapp':
            await sendWhatsappNotification(cliente, 'aviso_chamada', [{ type: 'text', text: String(cliente.NOME || 'Cliente') }]);
            break;
        case 'sms':
            await sendSmsNotification(cliente, mensagem);
            break;
        case 'email':
            await sendEmailNotification(cliente.EMAIL, subject, html);
            break;
        default:
            console.warn(`Meio de notificação desconhecido: ${cliente.MEIO_NOTIFICACAO}`);
    }
};

/**
 * NOVA FUNÇÃO: Envia a notificação inicial de confirmação de entrada na fila.
 * @param {object} cliente - Objeto com os dados do cliente.
 * @param {number} posicaoNaFila - Posição do cliente na fila.
 */
const sendInitialNotification = async (cliente, posicaoNaFila) => {
    const mensagem = `Olá ${cliente.NOME || 'Cliente'}! Você acabou de entrar na fila. O seu lugar é o ${posicaoNaFila}. Iremos notificá-lo quando a sua vez estiver a aproximar-se.`;
    const subject = 'Confirmação de Entrada na Fila';
    const html = `
        <p>Olá, ${cliente.NOME || 'Cliente'}!</p>
        <p>Você acaba de entrar na fila. Seu lugar é o **${posicaoNaFila}**. Iremos notificá-lo quando a sua vez estiver a aproximar-se.</p>
        <p>Agradecemos a sua paciência!</p>`;

    switch (cliente.MEIO_NOTIFICACAO) {
        case 'whatsapp':
            await sendWhatsappNotification(cliente, 'aviso_entrada_fila', [{ type: 'text', text: String(cliente.NOME || 'Cliente') }, { type: 'text', text: String(posicaoNaFila) }]);
            break;
        case 'sms':
            await sendSmsNotification(cliente, mensagem);
            break;
        case 'email':
            await sendEmailNotification(cliente.EMAIL, subject, html);
            break;
        default:
            console.warn(`Meio de notificação desconhecido para notificação inicial: ${cliente.MEIO_NOTIFICACAO}`);
    }
};

const scheduleTimeoutForAbsence = (idEmpresa, dtMovto, idFila, idCliente, timeout, io) => {
    // Sua lógica de agendamento aqui
};

module.exports = {
    sendNotification,
    scheduleTimeoutForAbsence,
    sendInitialNotification,
};