import { CommandGroup } from "@grammyjs/commands";
import { Context } from "grammy";
import { getEffectiveSettings, updateGroupSettings, EffectiveSettings } from "@pushups-bot/core";

export const parseSettingsCommand = (
    match: string
): { setting: string | null; value: number | null } => {
    const parts = match.split(" ");
    const setting = parts[0] || null;
    const value = parseInt(parts[1], 10);
    return { setting, value: isNaN(value) ? null : value };
};

export const generateSettingsUpdatedMessage = (setting: string, value: number): string => {
    return `${setting} updated to ${value}.`;
};

export const generateCurrentSettingsMessage = (settings: EffectiveSettings): string => {
    return `Current settings:\n- dailyTarget: ${settings.dailyTarget}\nTo update, use: /settings dailyTarget <value>`;
};

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

        const { setting, value } = parseSettingsCommand(
            typeof ctx.match === "string" ? ctx.match : ""
        );

        if (setting === "dailyTarget" && value !== null && value > 0) {
            await updateGroupSettings(chat.id.toString(), { dailyTarget: value });
            return ctx.reply(generateSettingsUpdatedMessage("Daily target", value));
        } else {
            const settings = await getEffectiveSettings(chat.id.toString());
            return ctx.reply(generateCurrentSettingsMessage(settings));
        }
    });
};
