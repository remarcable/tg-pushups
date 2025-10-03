import { Bot } from "grammy";
import { config } from "dotenv";
import { CommandGroup } from "@grammyjs/commands";
import {
    ensureGroup,
    ensureMember,
    recordAction,
    getEffectiveSettings,
    getMemberDailySummaries,
    getMonthlyTotals,
    updateGroupSettings,
} from "@pushups-bot/core";

config({ path: "../../.env" });

const bot = new Bot(process.env.BOT_TOKEN || "");

const myCommands = new CommandGroup();

myCommands.command("start", "Start the bot", (ctx) => ctx.reply("Welcome! I am the pushups bot."));

myCommands.command("add", "Add pushups for today", async (ctx) => {
    const amount = parseInt(ctx.match, 10);
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
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dailySummaries = await getMemberDailySummaries({
        groupId: chat.id.toString(),
        startDate: today,
        endDate: tomorrow,
    });

    const userSummary = dailySummaries[from.id.toString()]?.[today.toDateString()];
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

myCommands.command("settings", "Configure group settings", async (ctx) => {
    const chat = ctx.chat;
    const from = ctx.from;

    if (!chat || chat.type === "private" || !from) {
        return ctx.reply("This command only works in groups.");
    }

    const member = await ctx.getChatMember(from.id);
    if (member.status !== "administrator" && member.status !== "creator") {
        return ctx.reply("Only admins can change settings.");
    }

    const match = ctx.match.split(" ");
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

myCommands.command("totals", "Show monthly totals", async (ctx) => {
    const chat = ctx.chat;

    if (!chat || chat.type === "private") {
        return ctx.reply("This command only works in groups.");
    }

    const month = new Date();
    const totals = await getMonthlyTotals({ groupId: chat.id.toString(), month });

    let reply = "**Monthly Totals**\n\n";

    for (const memberId in totals) {
        const member = await bot.api.getChatMember(chat.id, parseInt(memberId));
        const total = totals[memberId];
        reply += `${member.user.first_name}: ${total.pushups} pushups, ${total.penalties} penalties, ${total.net} net\n`;
    }

    return ctx.reply(reply, { parse_mode: "Markdown" });
});

bot.use(myCommands);

bot.start();
myCommands.setCommands(bot);
console.log("Bot started and commands set...");
