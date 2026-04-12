/**
 * validate — middleware générique de validation Joi
 * @param {import('joi').Schema} schema  Schéma Joi à appliquer
 * @param {'body'|'query'} [source='body']  Partie de la requête à valider
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly:   false,
    stripUnknown: true,
    convert:      true, // coerce strings to numbers/dates for query params
  });
  if (error) {
    const details = error.details.map(d => d.message);
    return res.status(422).json({ error: 'Données invalides', details });
  }
  req[source] = value; // données nettoyées et validées
  next();
};

module.exports = validate;
