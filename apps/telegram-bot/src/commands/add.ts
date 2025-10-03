import { CommandGroup } from "@grammyjs/commands";
import { Context } from "grammy";
import {
    ensureGroup,
    ensureMember,
    recordAction,
    getEffectiveSettings,
    getMemberDailySummaries,
    getLocalDate,
} from "@pushups-bot/core";

export const registerAddCommand = (myCommands: CommandGroup<Context>) => {
    myCommands.command("add", "Add pushups for today", async (ctx: Context) => {
        const amount = parseInt(typeof ctx.match === "string" ? ctx.match : "", 10);
        if (isNaN(amount) || amount <= 0) {
            return ctx.reply("Please provide a valid number of pushups.");
        }

        const from = ctx.from;
        const chat = ctx.chat;

        if (!from || !chat) {
            return ctx.reply("Could not identify user or chat.");
        }

        if (chat.type === "private") {
            return ctx.reply("This bot only works in groups.");
        }

        await ensureGroup(chat.id.toString(), chat.title);
        await ensureMember(chat.id.toString(), from.id.toString(), from.username, from.first_name);

        await recordAction(chat.id.toString(), from.id.toString(), amount, new Date());

        const settings = await getEffectiveSettings(chat.id.toString());

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 1); // 24 hours ago
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 1); // 24 hours in future

        const dailySummaries = await getMemberDailySummaries({
            groupId: chat.id.toString(),
            startDate: startDate,
            endDate: endDate,
        });

        const localToday = getLocalDate(new Date(), settings.timezone);
        const userSummary =
            dailySummaries[from.id.toString()]?.[localToday.toDateString()];
        const dailyTotal = userSummary?.pushups || 0;

        const remaining = settings.dailyTarget - dailyTotal;

        let reply = `Added ${amount} pushups. Your total for today is ${dailyTotal}.`;
        if (remaining > 0) {
            reply += ` You have ${remaining} to go to reach your daily target.`;
        } else {
            reply += ` You have reached your daily target!`;
        }

        return ctx.reply(reply);
    });
};
