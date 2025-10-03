import { generateTotalsReply } from "../totals";
import { ChatMember } from "grammy/types";

describe("totals command helpers", () => {
    describe("generateTotalsReply", () => {
        it("should generate a totals message", async () => {
            const totals = {
                "123": { pushups: 100, penalties: -10, net: 90 },
                "456": { pushups: 200, penalties: 0, net: 200 },
            };
            const getChatMember = async (chatId: number, memberId: number): Promise<ChatMember> => {
                if (memberId === 123) {
                    return { user: { id: 123, is_bot: false, first_name: "Alice" } } as ChatMember;
                }
                if (memberId === 456) {
                    return { user: { id: 456, is_bot: false, first_name: "Bob" } } as ChatMember;
                }
                throw new Error("User not found");
            };

            const message = await generateTotalsReply(totals, 12345, getChatMember);

            expect(message).toBe(
                "**Monthly Totals**\n\nAlice: 100 pushups, -10 penalties, 90 net\nBob: 200 pushups, 0 penalties, 200 net\n"
            );
        });

        it("should handle empty totals", async () => {
            const totals = {};
            const getChatMember = async () => ({}) as ChatMember;
            const message = await generateTotalsReply(totals, 12345, getChatMember);
            expect(message).toBe("**Monthly Totals**\n\n");
        });
    });
});
