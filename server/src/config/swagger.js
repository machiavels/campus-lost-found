const path       = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Campus Lost & Found API',
      version: '1.0.0',
      description:
        'REST API for the Campus Lost & Found platform. ' +
        'Allows students to report lost/found items, submit claims, ' +
        'exchange messages, and manage notifications.',
      contact: {
        name: 'Campus Lost & Found',
        url: 'https://github.com/machiavels/campus-lost-found',
      },
    },
    servers: [
      {
        url: 'http://localhost:{port}/api',
        description: 'Serveur de développement',
        variables: {
          port: { default: '3000', description: 'Port défini par la variable PORT' },
        },
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token obtenu via POST /auth/login ou POST /auth/refresh',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Unauthorized' },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            total:      { type: 'integer', example: 42 },
            page:       { type: 'integer', example: 1 },
            limit:      { type: 'integer', example: 20 },
            totalPages: { type: 'integer', example: 3 },
          },
        },
        User: {
          type: 'object',
          properties: {
            id:        { type: 'string', format: 'uuid' },
            email:     { type: 'string', format: 'email', example: 'alice@eleve.isep.fr' },
            username:  { type: 'string', example: 'alice42' },
            role:      { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Item: {
          type: 'object',
          properties: {
            id:          { type: 'string', format: 'uuid' },
            title:       { type: 'string', example: 'Sac à dos bleu' },
            description: { type: 'string', example: 'Trouvé près de la bibliothèque' },
            type:        { type: 'string', enum: ['LOST', 'FOUND'], example: 'FOUND' },
            status:      { type: 'string', enum: ['PENDING', 'ACTIVE', 'CLAIMED', 'REJECTED'], example: 'ACTIVE' },
            categoryId:  { type: 'integer', example: 1 },
            locationId:  { type: 'integer', example: 3 },
            userId:      { type: 'string', format: 'uuid' },
            createdAt:   { type: 'string', format: 'date-time' },
            updatedAt:   { type: 'string', format: 'date-time' },
          },
        },
        Claim: {
          type: 'object',
          properties: {
            id:        { type: 'string', format: 'uuid' },
            itemId:    { type: 'string', format: 'uuid' },
            userId:    { type: 'string', format: 'uuid' },
            message:   { type: 'string', example: 'Mon portefeuille perdu lundi matin' },
            status:    { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'], example: 'PENDING' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id:         { type: 'string', format: 'uuid' },
            content:    { type: 'string', example: 'Bonjour, est-ce votre portefeuille ?' },
            itemId:     { type: 'string', format: 'uuid' },
            senderId:   { type: 'string', format: 'uuid' },
            receiverId: { type: 'string', format: 'uuid' },
            read:       { type: 'boolean', example: false },
            createdAt:  { type: 'string', format: 'date-time' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id:        { type: 'string', format: 'uuid' },
            type:      { type: 'string', example: 'CLAIM_APPROVED' },
            message:   { type: 'string', example: 'Votre réclamation a été approuvée' },
            read:      { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id:   { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Électronique' },
          },
        },
        Location: {
          type: 'object',
          properties: {
            id:   { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Bibliothèque' },
          },
        },
      },
    },
  },
  // Chemin absolu — indépendant du process.cwd()
  apis: [
    path.join(__dirname, '../routes/*.js'),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
