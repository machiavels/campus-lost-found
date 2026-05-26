// ESLint v9 — flat config
// Doc : https://eslint.org/docs/latest/use/configure/configuration-files

'use strict';

const js = require('@eslint/js');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  // Fichiers à ignorer
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'prisma/migrations/**',
    ],
  },

  // Config de base recommandée
  js.configs.recommended,

  // Règles projet
  {
    files: ['src/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require:      'readonly',
        module:       'readonly',
        exports:      'writable',
        __dirname:    'readonly',
        __filename:   'readonly',
        process:      'readonly',
        console:      'readonly',
        Buffer:       'readonly',
        setTimeout:   'readonly',
        clearTimeout: 'readonly',
        setInterval:  'readonly',
        clearInterval:'readonly',
        // Jest globals (tests uniquement)
        describe:     'readonly',
        it:           'readonly',
        test:         'readonly',
        expect:       'readonly',
        beforeAll:    'readonly',
        afterAll:     'readonly',
        beforeEach:   'readonly',
        afterEach:    'readonly',
        jest:         'readonly',
      },
    },
    rules: {
      // Erreurs bloquantes
      'no-unused-vars': ['error', {
        argsIgnorePattern:              '^_',
        varsIgnorePattern:              '^_',
        destructuredArrayIgnorePattern: '^_',
        caughtErrorsIgnorePattern:      '^_',
        caughtErrors:                   'all',
      }],
      'no-undef':             'error',
      'no-console':           ['warn', { allow: ['warn', 'error', 'info'] }],

      // Qualité du code
      'eqeqeq':               ['error', 'always'],
      'curly':                'error',
      'no-var':               'error',
      'prefer-const':         'error',
      'no-duplicate-imports': 'error',

      // Style (non bloquant en local, bloquant en CI via --max-warnings 0)
      'semi':                 ['warn', 'always'],
      'quotes':               ['warn', 'single', { avoidEscape: true }],
    },
  },
];
