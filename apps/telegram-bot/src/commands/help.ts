import { CommandGroup } from "@grammyjs/commands";
import { Context } from "grammy";

export const registerHelpCommand = (myCommands: CommandGroup<Context>) => {
    myCommands.command("help", "Show available commands", async (ctx: Context) => {
        const message = generateHelpMessage(myCommands.commands);
        return ctx.reply(message, { parse_mode: "Markdown" });
    });
};

export const generateHelpMessage = (
    commands: { name: string | RegExp; description: string }[]
): string => {
    let reply = "**Available Commands:**\n\n";
    for (const command of commands) {
        if (typeof command.name === "string") {
            reply += `/${command.name} - ${command.description}\n`;
        }
    }
    return reply;
};
