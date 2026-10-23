import tseslint from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
export default [
  { ignores: [".next/**", "node_modules/**", "tests/**"] },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { "react-hooks": hooks },
    rules: {
      ...hooks.configs.recommended.rules,
      "no-debugger": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      // Existing components synchronize browser storage in effects and use refs for drag state.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
  },
];
