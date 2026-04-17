const Joi = require('joi');

/**
 * Validation schema for GET /api/search query parameters.
 */
exports.searchQuerySchema = Joi.object({
  q:          Joi.string().trim().min(1).max(200).required()
                .messages({
                  'any.required': 'Le paramètre q est obligatoire',
                  'string.empty': 'Le paramètre q ne peut pas être vide',
                  'string.min':   'q doit contenir au moins 1 caractère',
                }),

  type:       Joi.string().valid('LOST', 'FOUND').optional()
                .messages({ 'any.only': 'type doit être LOST ou FOUND' }),

  categoryId: Joi.string().uuid().optional()
                .messages({ 'string.guid': 'categoryId doit être un UUID valide' }),

  locationId: Joi.string().uuid().optional()
                .messages({ 'string.guid': 'locationId doit être un UUID valide' }),

  from:       Joi.date().iso().optional()
                .messages({ 'date.format': 'from doit être une date ISO valide' }),

  to:         Joi.date().iso().min(Joi.ref('from')).optional()
                .messages({
                  'date.format': 'to doit être une date ISO valide',
                  'date.min':    'to doit être postérieure ou égale à from',
                }),

  // status filter is accepted but enforced server-side (admin only)
  status:     Joi.string().valid('PENDING', 'VERIFIED', 'REJECTED').optional()
                .messages({ 'any.only': 'status doit être PENDING, VERIFIED ou REJECTED' }),

  page:       Joi.number().integer().min(1).default(1)
                .messages({ 'number.min': 'page doit être >= 1' }),

  limit:      Joi.number().integer().min(1).max(100).default(20)
                .messages({
                  'number.min': 'limit doit être >= 1',
                  'number.max': 'limit doit être <= 100',
                }),
});
