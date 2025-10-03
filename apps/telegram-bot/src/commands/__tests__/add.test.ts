import { generateReplyText } from "../add";

describe("add command helpers", () => {
    describe("generateReplyText", () => {
        it("should generate the correct reply when remaining > 0", () => {
            const reply = generateReplyText({ amount: 50, dailyTotal: 50, dailyTarget: 100 });
            expect(reply).toBe(
                "Added 50 pushups. Your total for today is 50. You have 50 to go to reach your daily target."
            );
        });

        it("should generate the correct reply when remaining <= 0", () => {
            const reply = generateReplyText({ amount: 50, dailyTotal: 100, dailyTarget: 100 });
            expect(reply).toBe(
                "Added 50 pushups. Your total for today is 100. You have reached your daily target!"
            );
        });

        it("should handle the case where the total exceeds the target", () => {
            const reply = generateReplyText({ amount: 50, dailyTotal: 120, dailyTarget: 100 });
            expect(reply).toBe(
                "Added 50 pushups. Your total for today is 120. You have reached your daily target!"
            );
        });
    });
});
