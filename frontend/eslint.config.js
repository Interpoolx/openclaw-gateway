// Temporary flat config for ESLint v9 compatibility in constrained environments.
// TypeScript-specific lint rules are intentionally deferred until parser/plugins are available.
export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '**/*.ts',
      '**/*.tsx',
    ],
  },
];
