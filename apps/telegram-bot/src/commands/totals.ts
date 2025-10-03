import { Context } from "grammy";
import { CommandGroup } from "@grammyjs/commands";
import { getMonthlyTotals } from "@pushups-bot/core";
import { ChatMember } from "grammy/types";

type Totals = { [key: string]: { pushups: number; penalties: number; net: number } };
type GetChatMember = (chatId: number, memberId: number) => Promise<ChatMember>;

export const generateTotalsReply = async (
    totals: Totals,
    chatId: number,
    getChatMember: GetChatMember
): Promise<string> => {
    let reply = "**Monthly Totals**\n\n";

    for (const memberId in totals) {
        const member = await getChatMember(chatId, parseInt(memberId));
        const total = totals[memberId];
        reply += `${member.user.first_name}: ${total.pushups} pushups, ${total.penalties} penalties, ${total.net} net\n`;
    }

    return reply;
};

export const registerTotalsCommand = (myCommands: CommandGroup<Context>) => {
    myCommands.command("totals", "Show monthly totals", async (ctx: Context) => {
        const chat = ctx.chat;

        if (!chat || chat.type === "private") {
            return ctx.reply("This command only works in groups.");
        }

        const month = new Date();
        const totals = await getMonthlyTotals({ groupId: chat.id.toString(), month });

        const message = await generateTotalsReply(
            totals,
            chat.id,
            ctx.api.getChatMember.bind(ctx.api)
        );

        return ctx.reply(message, { parse_mode: "Markdown" });
    });
};
