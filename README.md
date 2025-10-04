# Pushups Bot

Telegram bot to track pushups as a group.

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- npm

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/remarcable/tg-pushups.git
    cd tg-pushups
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Database Setup:**

    Apply Prisma migrations to set up database:

    ```bash
    npx prisma migrate dev --name init
    ```

4.  **Environment Variables:**

    Create a `.env` file in the root directory and add your Telegram Bot Token:

    ```env
    DATABASE_URL="file:dev.db"
    TELEGRAM_BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN"
    ```

### Running the Bot

```bash
npm start
```
