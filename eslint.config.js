import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactCompiler from "eslint-plugin-react-compiler";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "engine/",
    "node_modules/",
    "**/dist/",
    "web/src/routeTree.gen.ts",
    "server/drizzle/",
  ]),

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Web-specific: React hooks + compiler
  {
    files: ["web/src/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-compiler": reactCompiler,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-compiler/react-compiler": "error",
    },
  },

  // Server-specific: Bun globals
  {
    files: ["server/src/**/*.ts"],
    languageOptions: {
      globals: {
        Bun: "readonly",
        process: "readonly",
        console: "readonly",
      },
    },
  },

  // Scripts: Bun globals
  {
    files: ["scripts/**/*.ts"],
    languageOptions: {
      globals: {
        Bun: "readonly",
        process: "readonly",
        console: "readonly",
      },
    },
  },

  // Prettier must be last to disable conflicting rules
  prettier,
]);
