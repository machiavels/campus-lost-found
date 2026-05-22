/**
 * Script to export the OpenAPI spec to docs/openapi.json
 * Usage: node scripts/export-openapi.js
 * Or:    npm run docs:export
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const swaggerSpec = require('../src/config/swagger');

const outputDir  = path.join(__dirname, '..', '..', 'docs');
const outputFile = path.join(outputDir, 'openapi.json');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputFile, JSON.stringify(swaggerSpec, null, 2), 'utf-8');
console.log(`✅  OpenAPI spec exported to ${outputFile}`);
