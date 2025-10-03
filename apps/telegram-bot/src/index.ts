import { Bot, Context } from "grammy";
import { config } from "dotenv";
import { CommandGroup } from "@grammyjs/commands";

import { registerStartCommand } from "./commands/start";
import { registerAddCommand } from "./commands/add";
import { registerSettingsCommand } from "./commands/settings";
import { registerTotalsCommand } from "./commands/totals";
import { registerHelpCommand } from "./commands/help";

config({ path: "../../.env" });

const bot = new Bot(process.env.BOT_TOKEN || "");

const myCommands = new CommandGroup<Context>();

registerStartCommand(myCommands);
registerAddCommand(myCommands);
registerSettingsCommand(myCommands);
registerTotalsCommand(myCommands);
registerHelpCommand(myCommands);

myCommands.setCommands(bot);

bot.use(myCommands);

bot.start({
    onStart: (botInfo) => {
        console.log(botInfo);
        console.log("Bot started and commands set...");
    },
}).catch(console.log);
