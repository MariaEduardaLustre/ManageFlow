// Arquivo: services/notificationService.js
const twilio = require('twilio');
const axios = require('axios');
const nodemailer = require('nodemailer');
const db = require('../database/connection'); // <-- 1. ADICIONEI A IMPORTAÇÃO DO BANCO

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

// ... (as outras funções de sendWhatsappNotification e sendSmsNotification permanecem iguais) ...
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
        template: { name: templateName, language: { code: 'pt_BR' }, components: [{ type: 'body', parameters: parameters }] },
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
    const mensagem = `Ola, ${cliente.NOME || 'Cliente'}! Sua vez esta chegando. Por favor, dirija-se a area de espera.`;
    const subject = 'Sua vez está chegando!';
    const html = `<p>Olá, ${cliente.NOME || 'Cliente'}!</p><p>Seu atendimento está prestes a ser iniciado. Por favor, dirija-se à área de espera para a sua chamada.</p><p>Agradecemos a sua paciência!</p>`;
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
 * Envia a notificação inicial de confirmação de entrada na fila.
 */
const sendInitialNotification = async (cliente, posicaoNaFila) => {
    const mensagem = `Olá ${cliente.NOME || 'Cliente'}! Você acabou de entrar na fila. O seu lugar é o ${posicaoNaFila}. Iremos notificá-lo quando a sua vez estiver a aproximar-se.`;
    const subject = 'Confirmação de Entrada na Fila';
    const html = `<p>Olá, ${cliente.NOME || 'Cliente'}!</p><p>Você acaba de entrar na fila. Seu lugar é o **${posicaoNaFila}**. Iremos notificá-lo quando a sua vez estiver a aproximar-se.</p><p>Agradecemos a sua paciência!</p>`;
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

/**
 * Agenda uma verificação para marcar o cliente como "Não Compareceu" se o tempo de tolerância expirar.
 * --- ESTA É A FUNÇÃO CORRIGIDA E IMPLEMENTADA ---
 */
const scheduleTimeoutForAbsence = (idEmpresa, dtMovto, idFila, idCliente, timeoutEmMs, io) => {
  console.log(`[AGENDAMENTO CRIADO] Cliente ${idCliente} será verificado em ${timeoutEmMs / 1000} segundos.`);

  setTimeout(async () => {
    console.log(`[AGENDAMENTO EXECUTADO] Verificando cliente ${idCliente} AGORA.`);
    const dtMovtoFormatted = dtMovto.includes('T') ? dtMovto.split('T')[0] : dtMovto;

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
        
        await db.query(
          `UPDATE clientesfila SET SITUACAO = 2 
           WHERE ID_EMPRESA = ? AND DATE(DT_MOVTO) = ? AND ID_FILA = ? AND ID_CLIENTE = ?`,
          [idEmpresa, dtMovtoFormatted, idFila, idCliente]
        );

        // 3. Avisar o frontend da mudança em tempo real
        if (io) {
          io.emit('cliente_atualizado', {
            idEmpresa,
            idFila,
            idCliente,
            novaSituacao: 2,
          });
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