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
 * @param {object} cliente - Objeto com os dados do cliente (NOME, EMAIL, etc.).
 */
const sendEmailNotification = async (cliente) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: cliente.EMAIL,
        subject: 'Sua vez está chegando!',
        html: `
            <p>Olá, ${cliente.NOME}!</p>
            <p>Seu atendimento está prestes a ser iniciado. Por favor, dirija-se à área de espera para a sua chamada.</p>
            <p>Agradecemos a sua paciência!</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`E-mail de notificação enviado para ${cliente.EMAIL}.`);
        return { success: true, message: 'E-mail enviado com sucesso.' };
    } catch (error) {
        console.error(`Erro ao enviar e-mail para ${cliente.EMAIL}:`, error);
        throw new Error('Falha no envio do e-mail.');
    }
};

/**
 * Envia uma notificação por WhatsApp usando a Cloud API.
 * @param {object} cliente - Objeto com os dados do cliente (NOME, DDDCEL, NR_CEL, etc.).
 */
const sendWhatsappNotification = async (cliente) => {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
        console.error('Credenciais da WhatsApp Cloud API ausentes.');
        throw new Error('Credenciais da WhatsApp Cloud API ausentes.');
    }

    const payload = {
        messaging_product: 'whatsapp',
        to: `+55${cliente.DDDCEL}${cliente.NR_CEL}`, // Linha corrigida para incluir +55
        type: 'template',
        template: {
            name: 'aviso_chamada',
            language: {
                code: 'pt_BR',
            },
            components: [
                {
                    type: 'body',
                    parameters: [
                        {
                            type: 'text',
                            text: cliente.NOME,
                        },
                    ],
                },
            ],
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
 */
const sendSmsNotification = async (cliente) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhoneNumber) {
        console.error('Credenciais da Twilio ausentes.');
        throw new Error('Credenciais da Twilio ausentes.');
    }

    const client = twilio(accountSid, authToken);

    // Constrói o número completo no formato internacional: +DDI(DDD)(NÚMERO)
    // Usamos o DDI do cliente, se existir. Caso contrário, usamos +55.
    const numeroCompleto = `+${cliente.DDI || '55'}${cliente.DDDCEL}${cliente.NR_CEL}`;

    const mensagem = `Ola, ${cliente.NOME}! Sua vez esta chegando. Por favor, dirija-se a area de espera.`;

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
 * Função principal para enviar notificação com base no meio escolhido.
 * @param {object} cliente - Objeto com os dados do cliente.
 */
exports.sendNotification = async (cliente) => {
    switch (cliente.MEIO_NOTIFICACAO) {
        case 'whatsapp':
            if (!cliente.DDDCEL || !cliente.NR_CEL) {
                console.error(`Cliente ${cliente.NOME} escolheu WhatsApp, mas o número de telefone está ausente.`);
                throw new Error('Número de telefone do cliente ausente.');
            }
            await sendWhatsappNotification(cliente);
            break;
        case 'sms':
            if (!cliente.DDDCEL || !cliente.NR_CEL) {
                console.error(`Cliente ${cliente.NOME} escolheu SMS, mas o número de telefone está ausente.`);
                throw new Error('Número de telefone do cliente ausente.');
            }
            await sendSmsNotification(cliente);
            break;
        case 'email':
            if (!cliente.EMAIL) {
                console.error(`Cliente ${cliente.NOME} escolheu e-mail, mas o endereço está ausente.`);
                throw new Error('Endereço de e-mail ausente.');
            }
            await sendEmailNotification(cliente);
            break;
        default:
            console.warn(`Meio de notificação desconhecido: ${cliente.MEIO_NOTIFICACAO}`);
    }
};

exports.scheduleTimeoutForAbsence = (idEmpresa, dtMovto, idFila, idCliente, timeout, io) => {
    // Sua lógica de agendamento aqui
};