import { CommandGroup } from "@grammyjs/commands";
import { Context } from "grammy";

export const registerHelpCommand = (myCommands: CommandGroup<Context>) => {
    myCommands.command("help", "Show available commands", async (ctx: Context) => {
        let reply = "**Available Commands:**\n\n";
        const commands = myCommands.commands;

        for (const command of commands) {
            reply += `/${command.name} - ${command.description}\n`;
        }
        return ctx.reply(reply, { parse_mode: "Markdown" });
    });
};
