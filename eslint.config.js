const globals = require("globals");
const tseslint = require("typescript-eslint");
const prettier = require("eslint-plugin-prettier/recommended");

module.exports = [
    {
        ignores: ["dist/", "node_modules/", "eslint.config.js"],
    },
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    prettier,
];
