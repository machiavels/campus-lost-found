const Joi = require('joi');

/**
 * Schéma de validation pour POST /api/items
 */
exports.createItemSchema = Joi.object({
  name:          Joi.string().trim().min(2).max(120).required()
                   .messages({ 'any.required': 'Le nom est obligatoire' }),
  description:   Joi.string().trim().min(5).max(2000).required()
                   .messages({ 'any.required': 'La description est obligatoire' }),
  reportType:    Joi.string().valid('LOST', 'FOUND').required()
                   .messages({ 'any.required': 'Le type (LOST/FOUND) est obligatoire', 'any.only': 'reportType doit être LOST ou FOUND' }),
  locationId:    Joi.string().uuid().required()
                   .messages({ 'any.required': 'Le lieu est obligatoire', 'string.guid': 'locationId doit être un UUID valide' }),
  categoryId:    Joi.string().uuid().required()
                   .messages({ 'any.required': 'La catégorie est obligatoire', 'string.guid': 'categoryId doit être un UUID valide' }),
  dateLostFound: Joi.date().iso().max('now').optional()
                   .messages({ 'date.max': 'La date ne peut pas être dans le futur' }),
});

/**
 * Schéma de validation pour PUT /api/items/:id
 * Au moins un champ modifiable requis
 */
exports.updateItemSchema = Joi.object({
  name:          Joi.string().trim().min(2).max(120),
  description:   Joi.string().trim().min(5).max(2000),
  locationId:    Joi.string().uuid()
                   .messages({ 'string.guid': 'locationId doit être un UUID valide' }),
  categoryId:    Joi.string().uuid()
                   .messages({ 'string.guid': 'categoryId doit être un UUID valide' }),
  dateLostFound: Joi.date().iso().max('now').optional()
                   .messages({ 'date.max': 'La date ne peut pas être dans le futur' }),
}).min(1).messages({ 'object.min': 'Au moins un champ doit être fourni pour la mise à jour' });
