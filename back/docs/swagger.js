// back/src/docs/swagger.js
const pkg = require('../../package.json');

function buildServers() {
  const envBase = process.env.PUBLIC_API_BASE_URL || '';
  const local = `http://localhost:${process.env.PORT || 3001}/api`;
  const servers = [];

  if (envBase) servers.push({ url: envBase.replace(/\/+$/, '') + '/api' });
  servers.push({ url: local });

  return servers;
}

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'ManageFlow API',
    description:
      'API do ManageFlow — Sistema de filas de espera (TCC).<br/>' +
      'Autenticação via **JWT Bearer**. Informe o token em **Authorize**.',
    version: pkg.version || '1.0.0',
  },
  servers: buildServers(),
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      // Schemas principais (exemplos)
      LoginInput: {
        type: 'object',
        required: ['email', 'senha'],
        properties: {
          email: { type: 'string', example: 'admin@manageflow.app' },
          senha: { type: 'string', example: '123456' },
        },
      },
      LoginOutput: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          usuario: {
            type: 'object',
            properties: {
              ID_USUARIO: { type: 'integer', example: 1 },
              NOME: { type: 'string', example: 'Admin' },
              EMAIL: { type: 'string', example: 'admin@manageflow.app' },
            },
          },
        },
      },
      Empresa: {
        type: 'object',
        properties: {
          ID_EMPRESA: { type: 'integer', example: 10 },
          NOME_EMPRESA: { type: 'string', example: 'Restaurante Exemplo' },
          ENDERECO: { type: 'string', example: 'Av. Brasil, 100' },
          CIDADE: { type: 'string', example: 'Curitiba' },
          UF: { type: 'string', example: 'PR' },
          CEP: { type: 'string', example: '80000-000' },
          IMG_LOGO: { type: 'string', example: '/uploads/logo/10.png' },
          IMG_LOGO_URL: {
            type: 'string',
            example: 'https://api.seudominio.com/uploads/logo/10.png',
          },
        },
      },
      ConfiguracaoFila: {
        type: 'object',
        properties: {
          ID_CONF_FILA: { type: 'integer', example: 55 },
          ID_EMPRESA: { type: 'integer', example: 10 },
          NOME_FILA: { type: 'string', example: 'Fila Principal' },
          INI_VIG: { type: 'string', format: 'date', example: '2025-10-01' },
          FIM_VIG: { type: 'string', format: 'date', nullable: true },
          SITUACAO: { type: 'integer', example: 1 },
          TOKEN_FILA: { type: 'string', example: 'd122ed7b-35c9-41be-afd7-7b3d42...' },
          PER_LOC: { type: 'integer', example: 1 },
          TOLERANCIA_MIN: { type: 'integer', example: 10 },
        },
      },
      FilaDia: {
        type: 'object',
        properties: {
          ID_FILA: { type: 'integer', example: 777 },
          ID_CONF_FILA: { type: 'integer', example: 55 },
          DT_DIA: { type: 'string', format: 'date', example: '2025-10-17' },
          SITUACAO: { type: 'integer', example: 1 },
          BLOCK: { type: 'integer', example: 0 },
        },
      },
      ClienteFila: {
        type: 'object',
        properties: {
          ID_CLIENTE_FILA: { type: 'integer', example: 1001 },
          ID_FILA: { type: 'integer', example: 777 },
          NOME: { type: 'string', example: 'Beatriz Sakai' },
          CPF: { type: 'string', example: '123.456.789-00' },
          STATUS: {
            type: 'string',
            example: 'AGUARDANDO',
            enum: ['AGUARDANDO', 'CHAMADO', 'CONFIRMADO', 'NAO_COMPARECEU', 'ATENDIDO', 'REMOVIDO'],
          },
          DT_ENTRA: { type: 'string', format: 'date-time' },
        },
      },
      DefaultError: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          details: { type: 'string' },
        },
      },
    },
  },
  security: [
    // Por padrão, endpoints exigem JWT; público será declarado nas rotas
    { bearerAuth: [] },
  ],
  tags: [
    { name: 'Auth', description: 'Autenticação' },
    { name: 'Empresas', description: 'Gestão de empresas' },
    { name: 'ConfigFila', description: 'Configuração de filas' },
    { name: 'Filas', description: 'Fila do dia / gestão' },
    { name: 'Public', description: 'Rotas públicas (sem JWT)' },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: [
    // aponte para os arquivos onde você documenta rotas com JSDoc @openapi
    'src/routes/**/*.js',
    'src/controllers/**/*.js',
  ],
};

const swaggerJSDoc = require('swagger-jsdoc');
const swaggerSpec = swaggerJSDoc(options);

module.exports = { swaggerSpec };
