import { CommandGroup } from "@grammyjs/commands";
import { Context } from "grammy";
import { getEffectiveSettings, updateGroupSettings } from "@pushups-bot/core";

export const registerSettingsCommand = (myCommands: CommandGroup<Context>) => {
    myCommands.command("settings", "Configure group settings", async (ctx: Context) => {
        const chat = ctx.chat;
        const from = ctx.from;

        if (!chat || chat.type === "private" || !from) {
            return ctx.reply("This command only works in groups.");
        }

        const member = await ctx.getChatMember(from.id);
        if (member.status !== "administrator" && member.status !== "creator") {
            return ctx.reply("Only admins can change settings.");
        }

        const match = (typeof ctx.match === "string" ? ctx.match : "").split(" ");
        const setting = match[0];
        const value = parseInt(match[1], 10);

        if (setting === "dailyTarget" && !isNaN(value) && value > 0) {
            await updateGroupSettings(chat.id.toString(), { dailyTarget: value });
            return ctx.reply(`Daily target updated to ${value}.`);
        } else {
            const settings = await getEffectiveSettings(chat.id.toString());
            return ctx.reply(
                `Current settings:\n- dailyTarget: ${settings.dailyTarget}\nTo update, use: /settings dailyTarget <value>`
            );
        }
    });
};
