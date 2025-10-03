# GEMINI.md

## Project Overview

This is a TypeScript monorepo for a Telegram bot that tracks pushups. The project is structured with a `packages` directory for shared code and an `apps` directory for the main application.

- **`apps/telegram-bot`**: The main application that runs the Telegram bot.
- **`packages/core`**: A shared package that contains the core logic of the bot.

The main technologies used are:

- **TypeScript**: For type-safe JavaScript development.
- **Node.js**: As the runtime environment.
- **tsx**: For running TypeScript files directly.
- **ESLint**: For code linting.
- **Prettier**: For code formatting.

## Building and Running

- **Install dependencies**: `npm install`
- **Run the bot**: `npm start`
- **Run the bot in development mode**: `npm run dev` in `apps/telegram-bot`
- **Lint the code**: `npm run lint`
- **Format the code**: `npm run format`

## Development Conventions

- The project uses a monorepo structure with `npm` workspaces.
- Code should be formatted with Prettier and linted with ESLint.
- The `main` branch is the primary branch.
- All new features should be developed in a new branch and submitted as a pull request.
- Commit often with short commit messages (no long descriptions)
- Write comprehensive tests!
- Make sure to run npm run format and then npm run lint often
