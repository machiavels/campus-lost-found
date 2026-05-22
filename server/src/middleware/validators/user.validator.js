const Joi = require('joi');

/**
 * Schema for PUT /api/users/me
 * username, avatar and bio are all optional but at least one must be present.
 */
exports.updateMeSchema = Joi.object({
  username: Joi.string()
    .pattern(/^[a-zA-Z0-9_]+$/)
    .min(3)
    .max(30)
    .optional()
    .messages({
      'string.pattern.base': "Le nom d'utilisateur ne doit contenir que des lettres, chiffres ou underscores",
      'string.min':          "Le nom d'utilisateur doit comporter au moins 3 caractères",
      'string.max':          "Le nom d'utilisateur ne peut pas dépasser 30 caractères",
    }),
  avatar: Joi.string().uri().max(512).optional().allow('', null).messages({
    'string.uri': "L'avatar doit être une URL valide",
    'string.max': "L'URL de l'avatar ne peut pas dépasser 512 caractères",
  }),
  bio: Joi.string().max(300).optional().allow('', null).messages({
    'string.max': 'La bio ne peut pas dépasser 300 caractères',
  }),
}).min(1).messages({
  'object.min': 'Au moins un champ à mettre à jour est requis (username, avatar ou bio)',
});

/**
 * Schema for PATCH /api/users/me/password
 */
exports.changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Le mot de passe actuel est requis',
  }),
  newPassword: Joi.string().min(8).required().messages({
    'string.min':   'Le nouveau mot de passe doit comporter au moins 8 caractères',
    'any.required': 'Le nouveau mot de passe est requis',
  }),
});
