import { generateHelpMessage } from "../help";

describe("help command helpers", () => {
    describe("generateHelpMessage", () => {
        it("should generate a help message with a list of commands", () => {
            const commands = [
                { name: "start", description: "Start the bot" },
                { name: "help", description: "Show available commands" },
            ];
            const message = generateHelpMessage(commands);
            expect(message).toBe(
                "**Available Commands:**\n\n/start - Start the bot\n/help - Show available commands\n"
            );
        });

        it("should handle an empty list of commands", () => {
            const commands: { name: string; description: string }[] = [];
            const message = generateHelpMessage(commands);
            expect(message).toBe("**Available Commands:**\n\n");
        });
    });
});
