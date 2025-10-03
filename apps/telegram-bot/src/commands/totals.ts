import { Context } from "grammy";
import { CommandGroup } from "@grammyjs/commands";
import { getMonthlyTotals } from "@pushups-bot/core";

export const registerTotalsCommand = (myCommands: CommandGroup<Context>) => {
    myCommands.command("totals", "Show monthly totals", async (ctx: Context) => {
        const chat = ctx.chat;

        if (!chat || chat.type === "private") {
            return ctx.reply("This command only works in groups.");
        }

        const month = new Date();
        const totals = await getMonthlyTotals({ groupId: chat.id.toString(), month });

        let reply = "**Monthly Totals**\n\n";

        for (const memberId in totals) {
            const member = await ctx.api.getChatMember(chat.id, parseInt(memberId));
            const total = totals[memberId];
            reply += `${member.user.first_name}: ${total.pushups} pushups, ${total.penalties} penalties, ${total.net} net\n`;
        }

        return ctx.reply(reply, { parse_mode: "Markdown" });
    });
};
