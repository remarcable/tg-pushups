import { Bot, Context } from "grammy";
import { run } from "@grammyjs/runner";
import { config } from "dotenv";
import { CommandGroup } from "@grammyjs/commands";

import { registerStartCommand } from "./commands/start";
import { registerAddCommand } from "./commands/add";
import { registerSettingsCommand } from "./commands/settings";
import { registerTotalsCommand } from "./commands/totals";
import { registerHelpCommand } from "./commands/help";
import { loggerMiddleware } from "./middleware/logger";

config({ path: "../../.env" });

const bot = new Bot(process.env.BOT_TOKEN || "");

bot.use(loggerMiddleware);

const myCommands = new CommandGroup<Context>();

registerStartCommand(myCommands);
registerAddCommand(myCommands);
registerSettingsCommand(myCommands);
registerTotalsCommand(myCommands);
registerHelpCommand(myCommands);

myCommands.setCommands(bot);

bot.use(myCommands);

bot.on("chat_member", async (ctx) => {
    const chatMemberUpdate = ctx.chatMember;
    const newUser = chatMemberUpdate.new_chat_member;

    // Check if a new user joined the group and it's not the bot itself
    if (
        newUser.status === "member" &&
        chatMemberUpdate.old_chat_member.status !== "member" &&
        newUser.user.id !== ctx.me.id
    ) {
        const welcomeMessage = `Welcome ${newUser.user.first_name}!\n\nI am the pushups bot. I help you track your pushups and compete with your friends.\n\nHere are some basic commands to get you started:\n/add <amount> - Add pushups for today\n/totals - Show monthly totals\n/help - Show all available commands\n\nLet's get pushing!`;

        await ctx.reply(welcomeMessage);
    }
});

const runner = run(bot);

console.log("Bot started and commands set...");

const stop = async () => {
    console.log("Stopping bot...");
    if (runner.isRunning()) {
        await runner.stop();
        console.log("Bot stopped.");
    }
};

const gracefulShutdown = async () => {
    await stop();
    process.exit(0);
};

// Remove all previous listeners to prevent memory leaks in watch mode
process.removeAllListeners("SIGINT");
process.removeAllListeners("SIGTERM");

process.on("SIGINT", () => gracefulShutdown());
process.on("SIGTERM", () => gracefulShutdown());

// Vite HMR
if (import.meta.hot) {
    import.meta.hot.on("vite:beforeFullReload", async () => {
        await stop();
    });
}
