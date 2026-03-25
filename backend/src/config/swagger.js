const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cobranças SaaS API',
      version: '1.0.0',
      description: 'API para sistema de cobranças multi-tenant para clínicas médicas',
    },
    servers: [
      { url: 'https://dividas-backend.onrender.com/api', description: 'Produção' },
      { url: 'http://localhost:3000/api', description: 'Desenvolvimento' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Debtor: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'João Silva' },
            cpf: { type: 'string', example: '123.456.789-00' },
            email: { type: 'string', example: 'joao@email.com' },
            phone: { type: 'string', example: '11999999999' },
            tenant_id: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Debt: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            debtor_id: { type: 'string', format: 'uuid' },
            tenant_id: { type: 'string', format: 'uuid' },
            original_amount: { type: 'number', example: 1500.00 },
            current_amount: { type: 'number', example: 1500.00 },
            due_date: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['pending', 'negotiating', 'paid', 'cancelled'] },
            description: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Agreement: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            debt_id: { type: 'string', format: 'uuid' },
            debtor_id: { type: 'string', format: 'uuid' },
            tenant_id: { type: 'string', format: 'uuid' },
            installments: { type: 'integer', example: 3 },
            installment_value: { type: 'number', example: 500.00 },
            total_value: { type: 'number', example: 1500.00 },
            status: { type: 'string', enum: ['active', 'completed', 'cancelled'] },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Autenticação e registro' },
      { name: 'Devedores', description: 'Gestão de devedores' },
      { name: 'Dívidas', description: 'Gestão de dívidas' },
      { name: 'Cobranças', description: 'Histórico de cobranças' },
      { name: 'Acordos', description: 'Acordos de pagamento' },
      { name: 'WhatsApp', description: 'Envio de mensagens via WhatsApp' },
      { name: 'Dashboard', description: 'Métricas e relatórios' },
      { name: 'Perfil', description: 'Perfil da clínica' },
      { name: 'Export', description: 'Exportação de dados' },
      { name: 'Stripe', description: 'Planos e pagamentos' },
      { name: 'Admin', description: 'Painel super admin' },
    ],
  },
  apis: ['./src/modules/**/*.routes.js'],
}

module.exports = swaggerJsdoc(options)
