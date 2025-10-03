import { CommandGroup } from "@grammyjs/commands";
import { Context } from "grammy";

export const registerStartCommand = (myCommands: CommandGroup<Context>) => {
    myCommands.command("start", "Start the bot", (ctx: Context) =>
        ctx.reply("Welcome! I am the pushups bot.")
    );
};
