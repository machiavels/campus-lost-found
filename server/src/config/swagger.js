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
        description: 'Local development server',
        variables: {
          port: { default: '3000', description: 'Port defined by PORT env var' },
        },
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token obtained from POST /auth/login or POST /auth/refresh',
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
            total:    { type: 'integer', example: 42 },
            page:     { type: 'integer', example: 1 },
            limit:    { type: 'integer', example: 20 },
            totalPages: { type: 'integer', example: 3 },
          },
        },
        User: {
          type: 'object',
          properties: {
            id:        { type: 'string', format: 'uuid' },
            email:     { type: 'string', format: 'email', example: 'alice@campus.fr' },
            username:  { type: 'string', example: 'alice42' },
            role:      { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Item: {
          type: 'object',
          properties: {
            id:          { type: 'string', format: 'uuid' },
            title:       { type: 'string', example: 'Blue backpack' },
            description: { type: 'string', example: 'Found near the library entrance' },
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
            message:   { type: 'string', example: 'I lost this backpack on Monday' },
            status:    { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'], example: 'PENDING' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id:         { type: 'string', format: 'uuid' },
            content:    { type: 'string', example: 'Hi, is this backpack still available?' },
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
            message:   { type: 'string', example: 'Your claim has been approved' },
            read:      { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id:   { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Electronics' },
          },
        },
        Location: {
          type: 'object',
          properties: {
            id:   { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Library' },
          },
        },
      },
    },
  },
  apis: [
    './src/routes/*.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
