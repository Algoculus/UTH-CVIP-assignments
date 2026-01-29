import { config as baseConfig } from "@facenet/eslint-config/base";

/**
 * ESLint configuration for API service
 * @type {import("eslint").Linter.Config}
 */
export default [
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
