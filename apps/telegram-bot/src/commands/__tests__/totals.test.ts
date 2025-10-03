import { generateTotalsReply } from "../totals";
import { ChatMember } from "grammy/types";

describe("generateTotalsReply", () => {
    it("should generate a totals message with penalties", async () => {
        const totals = {
            "123": {
                pushups: 100,
                penalties: -50,
                net: 50,
                missedDays: 1,
                monthlyTarget: 150,
            },
        };
        const getChatMember = async (chatId: number, memberId: number): Promise<ChatMember> => {
            return {
                user: { id: 123, is_bot: false, first_name: "Alice" },
            } as ChatMember;
        };

        const message = await generateTotalsReply(totals, 12345, getChatMember);

        expect(message).toBe(
            "**Monthly Totals**\n\nAlice: 100 pushups, -50 penalties (missed 1 days) = 50 net of 150 pushups\n"
        );
    });

    it("should generate a totals message without penalties", async () => {
        const totals = {
            "456": {
                pushups: 200,
                penalties: 0,
                net: 200,
                missedDays: 0,
                monthlyTarget: 150,
            },
        };
        const getChatMember = async (chatId: number, memberId: number): Promise<ChatMember> => {
            return {
                user: { id: 456, is_bot: false, first_name: "Bob" },
            } as ChatMember;
        };

        const message = await generateTotalsReply(totals, 12345, getChatMember);

        expect(message).toBe(
            "**Monthly Totals**\n\nBob: 200 pushups, no penalties = 200 net of 150 pushups\n"
        );
    });

    it("should handle empty totals", async () => {
        const totals = {};
        const getChatMember = async () => ({}) as ChatMember;
        const message = await generateTotalsReply(totals, 12345, getChatMember);
        expect(message).toBe("**Monthly Totals**\n\n");
    });
});
