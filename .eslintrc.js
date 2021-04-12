module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
    sourceType: "module",
    // Only ESLint 6.2.0 and later support ES2020.
    ecmaVersion: 2020
  },
  env: {
    es6: true,
    node: true,
    jest: true
  },
  plugins: ["@typescript-eslint/eslint-plugin", "prettier"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:node/recommended-module",
    "plugin:prettier/recommended"
  ],
  root: true,
  // healthcheck & danger *.js
  ignorePatterns: [".eslintrc.js", "**/*.js", "*.json", "**/dist/", "node_modules"],
  rules: {
    "quotes": [
      "error",
      "single",
      {
        "allowTemplateLiterals": true,
        "avoidEscape": true
      }
    ],
    // temporary disabled
    // 'sort-imports': [
    // 	'warn',
    // 	{
    // 		ignoreCase: false,
    // 		ignoreDeclarationSort: false,
    // 		ignoreMemberSort: false,
    // 		memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple'],
    // 		allowSeparatedGroups: false,
    // 	},
    // ],
    // temporary committed as prettier conflicts with
    // indent: ['error', 'tab', { MemberExpression: 1 }],
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": ["error"],
    "@typescript-eslint/no-empty-function": "warn",
    "prettier/prettier": "error",
    "max-classes-per-file": ["error", 1],
    "camelcase": ["error", { "properties": "always" }],
    "no-underscore-dangle": "error",
    "no-console": ["error"],
    "newline-per-chained-call": "error",
    "no-multi-spaces": ["error"],
    // change to error
    "no-use-before-define": ["warn", { "functions": true, "classes": true }],
    "space-before-blocks": ["warn"],
    // node
    "node/exports-style": ["error", "exports"],
    "node/file-extension-in-import": "off",
    "node/prefer-global/buffer": ["error", "always"],
    "node/prefer-global/console": ["error", "always"],
    "node/prefer-global/process": ["error", "always"],
    "node/prefer-global/url-search-params": ["error", "always"],
    "node/prefer-global/url": ["error", "always"],
    "node/prefer-promises/dns": "error",
    "node/prefer-promises/fs": "error",
    "node/no-unsupported-features/es-syntax": "off",
    "node/no-missing-import": "off",
    "node/no-unpublished-import": "off",
    "node/no-extraneous-import": "off"
    // jest - temporary no tests
    // 'jest/no-disabled-tests': 'warn',
    // 'jest/no-focused-tests': 'warn',
    // 'jest/no-identical-title': 'error',
    // 'jest/prefer-to-have-length': 'warn',
    // 'jest/valid-expect': 'off',
  }
};
