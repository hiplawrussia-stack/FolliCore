/**
 * ESLint Flat Configuration for FolliCore Platform
 *
 * Based on CogniCore configuration and 2025-2026 best practices:
 * - ESLint 9 flat config format
 * - typescript-eslint v8 with projectService
 * - eslint-plugin-n for Node.js rules
 * - eslint-plugin-security for OWASP compliance
 *
 * References:
 * - https://eslint.org/blog/2025/03/flat-config-extends-define-config-global-ignores/
 * - https://typescript-eslint.io/getting-started/
 * - https://github.com/eslint-community/eslint-plugin-security
 */

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import nodePlugin from 'eslint-plugin-n';
import securityPlugin from 'eslint-plugin-security';
import globals from 'globals';

export default tseslint.config(
  // =============================================================================
  // GLOBAL IGNORES
  // =============================================================================
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.js',
      '*.mjs',
      '*.cjs',
      '**/*.d.ts',
    ],
  },

  // =============================================================================
  // BASE CONFIGURATION - All TypeScript files
  // =============================================================================
  {
    files: ['src/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      n: nodePlugin,
      security: securityPlugin,
    },
    rules: {
      // =========================================================================
      // TypeScript Specific Rules
      // =========================================================================

      // Allow unused vars with underscore prefix (intentional pattern)
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],

      // Allow explicit any in specific cases (we have cases to review)
      '@typescript-eslint/no-explicit-any': 'warn',

      // Allow non-null assertions where TypeScript can't infer
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Floating promises must be handled
      '@typescript-eslint/no-floating-promises': 'error',

      // Require await in async functions
      '@typescript-eslint/require-await': 'warn',

      // Consistent type imports
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],

      // Restrict template expressions to safe types
      '@typescript-eslint/restrict-template-expressions': ['error', {
        allowNumber: true,
        allowBoolean: true,
        allowNullish: false,
      }],

      // Allow empty functions for stubs/callbacks
      '@typescript-eslint/no-empty-function': 'off',

      // Prefer for-of but don't enforce strictly (existing codebase pattern)
      '@typescript-eslint/prefer-for-of': 'warn',

      // Prefer nullish coalescing - DISABLED (requires strictNullChecks)
      '@typescript-eslint/prefer-nullish-coalescing': 'off',

      // No unnecessary type assertions (warn for gradual cleanup)
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',

      // Unnecessary conditions - DISABLED (requires strictNullChecks)
      '@typescript-eslint/no-unnecessary-condition': 'off',

      // No unnecessary boolean literal compare - DISABLED (requires strictNullChecks)
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',

      // Consistent generic constructors (stylistic)
      '@typescript-eslint/consistent-generic-constructors': 'warn',

      // =========================================================================
      // Unsafe Rules - WARN (requires strictNullChecks for full effectiveness)
      // TODO: Change to 'error' after enabling strictNullChecks in tsconfig.json
      // Reference: https://typescript-eslint.io/rules/no-unsafe-member-access/
      // =========================================================================
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',

      // =========================================================================
      // Node.js Rules (eslint-plugin-n)
      // =========================================================================

      // Ensure correct Node.js version features
      'n/no-unsupported-features/node-builtins': ['error', {
        version: '>=18.0.0',
      }],

      // Prefer promises over callbacks
      'n/prefer-promises/fs': 'warn',
      'n/prefer-promises/dns': 'warn',

      // =========================================================================
      // Security Rules (eslint-plugin-security) - OWASP Compliance
      // =========================================================================

      // Detect eval() usage
      'security/detect-eval-with-expression': 'error',

      // Detect non-literal require()
      'security/detect-non-literal-require': 'warn',

      // Detect non-literal fs operations
      'security/detect-non-literal-fs-filename': 'warn',

      // Detect possible timing attacks
      'security/detect-possible-timing-attacks': 'warn',

      // Detect unsafe regex
      'security/detect-unsafe-regex': 'error',

      // Detect object injection
      'security/detect-object-injection': 'warn',

      // Detect child_process usage
      'security/detect-child-process': 'warn',

      // Detect pseudorandom number generators
      'security/detect-pseudoRandomBytes': 'error',

      // =========================================================================
      // General Best Practices
      // =========================================================================

      // Enforce consistent brace style
      'curly': ['error', 'all'],

      // Require === and !==
      'eqeqeq': ['error', 'always'],

      // Disallow console in production (warn only)
      'no-console': 'warn',

      // Prefer const over let when possible
      'prefer-const': 'error',

      // No var declarations
      'no-var': 'error',

      // Require error handling in callbacks
      'no-unused-expressions': 'error',
    },
  },

  // =============================================================================
  // TEST FILES - Relaxed rules
  // =============================================================================
  {
    files: ['src/**/*.spec.ts', 'src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
    rules: {
      // Allow any in tests for mocking
      '@typescript-eslint/no-explicit-any': 'off',

      // Allow non-null assertions in tests
      '@typescript-eslint/no-non-null-assertion': 'off',

      // Allow unsafe operations in tests
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',

      // Allow console in tests
      'no-console': 'off',

      // Relax security rules in tests
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',

      // Allow unbound methods in tests (common pattern with Jest mocks)
      '@typescript-eslint/unbound-method': 'off',
    },
  },

  // =============================================================================
  // MOCK FILES - Very relaxed
  // =============================================================================
  {
    files: ['src/**/__mocks__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'security/detect-pseudoRandomBytes': 'off',
    },
  },
);
