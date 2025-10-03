import {
    parseSettingsCommand,
    generateSettingsUpdatedMessage,
    generateCurrentSettingsMessage,
} from "../settings";
import { EffectiveSettings } from "@pushups-bot/core";

describe("settings command helpers", () => {
    describe("parseSettingsCommand", () => {
        it("should parse a valid setting and value", () => {
            const { setting, value } = parseSettingsCommand("dailyTarget 150");
            expect(setting).toBe("dailyTarget");
            expect(value).toBe(150);
        });

        it("should handle missing value", () => {
            const { setting, value } = parseSettingsCommand("dailyTarget");
            expect(setting).toBe("dailyTarget");
            expect(value).toBeNull();
        });

        it("should handle invalid value", () => {
            const { setting, value } = parseSettingsCommand("dailyTarget abc");
            expect(setting).toBe("dailyTarget");
            expect(value).toBeNull();
        });

        it("should handle empty input", () => {
            const { setting, value } = parseSettingsCommand("");
            expect(setting).toBeNull();
            expect(value).toBeNull();
        });
    });

    describe("generateSettingsUpdatedMessage", () => {
        it("should generate the correct message", () => {
            const message = generateSettingsUpdatedMessage("Daily target", 150);
            expect(message).toBe("Daily target updated to 150.");
        });
    });

    describe("generateCurrentSettingsMessage", () => {
        it("should generate the correct message", () => {
            const settings: EffectiveSettings = {
                groupId: "test",
                timezone: "UTC",
                dailyTarget: 100,
                missedDayPenalty: -10,
            };
            const message = generateCurrentSettingsMessage(settings);
            expect(message).toBe(
                "Current settings:\n- dailyTarget: 100\nTo update, use: /settings dailyTarget <value>"
            );
        });
    });
});
