import {
    _calculateVirtualPenalties,
    _generateMemberDailySummaries,
    _generateMonthlyTotals,
    getLocalDate,
    EffectiveSettings,
} from "../StatsService";
import { VirtualPenalty } from "../../types/types";
import { Action, Member } from "@prisma/client";

describe("StatsService pure functions", () => {
    // Mock data for testing
    const mockSettings: EffectiveSettings = {
        groupId: "group1",
        timezone: "America/New_York",
        dailyTarget: 100,
        missedDayPenalty: -50,
    };

    const mockMember1: Member = {
        id: "member1",
        groupId: "group1",
        username: "user1",
        displayName: "User One",
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockMember2: Member = {
        id: "member2",
        groupId: "group1",
        username: "user2",
        displayName: "User Two",
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockAction1: Action = {
        id: "action1",
        groupId: "group1",
        memberId: "member1",
        timestamp: new Date("2025-01-01T10:00:00.000Z"),
        amount: 60,
        createdAt: new Date(),
    };

    const mockAction2: Action = {
        id: "action2",
        groupId: "group1",
        memberId: "member1",
        timestamp: new Date("2025-01-01T11:00:00.000Z"),
        amount: 50,
        createdAt: new Date(),
    };

    const mockAction3: Action = {
        id: "action3",
        groupId: "group1",
        memberId: "member2",
        timestamp: new Date("2025-01-01T12:00:00.000Z"),
        amount: 120,
        createdAt: new Date(),
    };

    const mockAction4: Action = {
        id: "action4",
        groupId: "group1",
        memberId: "member1",
        timestamp: new Date("2025-01-02T09:00:00.000Z"),
        amount: 80,
        createdAt: new Date(),
    };

    const mockAction5: Action = {
        id: "action5",
        groupId: "group1",
        memberId: "member2",
        timestamp: new Date("2025-01-02T13:00:00.000Z"),
        amount: 70,
        createdAt: new Date(),
    };

    describe("_calculateVirtualPenalties", () => {
        it("should return an ordered list of actions and no virtual penalties if no missed daily targets", () => {
            const actions: Action[] = [mockAction1, mockAction2, mockAction3]; // member1: 110, member2: 120
            const members: Member[] = [mockMember1, mockMember2];
            const startDate = new Date("2025-01-01T05:00:00.000Z"); // 2025-01-01 00:00:00 in America/New_York
            const endDate = new Date("2025-01-02T04:59:59.999Z"); // 2025-01-01 23:59:59 in America/New_York

            const result = _calculateVirtualPenalties({
                actions,
                members,
                settings: mockSettings,
                startDate,
                endDate,
            });
            expect(result).toHaveLength(3);
            expect(result).toEqual(
                [mockAction1, mockAction2, mockAction3].sort(
                    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
                )
            );
        });

        it("should return an ordered list of actions and virtual penalties for missed daily targets", () => {
            const actions: Action[] = [mockAction1]; // member1: 60
            const members: Member[] = [mockMember1];
            const startDate = new Date("2025-01-01T05:00:00.000Z"); // 2025-01-01 00:00:00 in America/New_York
            const endDate = new Date("2025-01-02T04:59:59.999Z"); // 2025-01-01 23:59:59 in America/New_York

            const settingsWithPenalty: EffectiveSettings = { ...mockSettings, dailyTarget: 70 }; // Set daily target higher than action1 amount

            const result = _calculateVirtualPenalties({
                actions,
                members,
                settings: settingsWithPenalty,
                startDate,
                endDate,
            });
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(mockAction1);
            expect(result[1]).toMatchObject({
                groupId: "group1",
                memberId: "member1",
                amount: -50, // Using mockSettings.missedDayPenalty
                reason: "missed_daily_target",
            });
        });

        it("should handle multiple members and multiple days with actions and penalties", () => {
            const actions: Action[] = [mockAction1, mockAction3, mockAction4, mockAction5]; // member1: Day1: 60, Day2: 80; member2: Day1: 120, Day2: 70
            const members: Member[] = [mockMember1, mockMember2];
            const startDate = new Date("2025-01-01T05:00:00.000Z"); // 2025-01-01 00:00:00 in America/New_York
            const endDate = new Date("2025-01-03T04:59:59.999Z"); // 2025-01-02 23:59:59 in America/New_York

            const result = _calculateVirtualPenalties({
                actions,
                members,
                settings: mockSettings,
                startDate,
                endDate,
            });
            expect(result).toHaveLength(7); // 4 actions + 3 penalties
            // Expect the result to be sorted by timestamp
            for (let i = 0; i < result.length - 1; i++) {
                expect(result[i].timestamp.getTime()).toBeLessThanOrEqual(
                    result[i + 1].timestamp.getTime()
                );
            }
            // Further assertions to check specific penalties and actions
            const expectedPenalties: VirtualPenalty[] = [
                {
                    groupId: "group1",
                    memberId: "member1",
                    timestamp: new Date("2025-01-01T23:59:59.999Z"), // Adjusted to local end of day
                    amount: -50,
                    reason: "missed_daily_target",
                },
                {
                    groupId: "group1",
                    memberId: "member1",
                    timestamp: new Date("2025-01-02T23:59:59.999Z"), // Adjusted to local end of day
                    amount: -50,
                    reason: "missed_daily_target",
                },
                {
                    groupId: "group1",
                    memberId: "member2",
                    timestamp: new Date("2025-01-02T23:59:59.999Z"), // Adjusted to local end of day
                    amount: -50,
                    reason: "missed_daily_target",
                },
            ];

            const expectedCombined = [...actions, ...expectedPenalties].sort(
                (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
            );
            expect(result).toEqual(expectedCombined);
        });

        it("should not add penalty if daily target is met exactly", () => {
            const settingsWithExactTarget: EffectiveSettings = { ...mockSettings, dailyTarget: 60 };
            const actions: Action[] = [mockAction1]; // member1: 60
            const members: Member[] = [mockMember1];
            const startDate = new Date("2025-01-01T05:00:00.000Z"); // 2025-01-01 00:00:00 in America/New_York
            const endDate = new Date("2025-01-02T04:59:59.999Z"); // 2025-01-01 23:59:59 in America/New_York

            const result = _calculateVirtualPenalties({
                actions,
                members,
                settings: settingsWithExactTarget,
                startDate,
                endDate,
            });
            expect(result).toHaveLength(1);
            expect(result).toEqual([mockAction1]);
        });
    });

    describe("_generateMemberDailySummaries", () => {
        it("should return empty summaries for empty actionsWithPenalties", async () => {
            const actionsWithPenalties: (Action | VirtualPenalty)[] = [];
            const getSettingsForTimestamp = async () => mockSettings;

            const result = await _generateMemberDailySummaries({
                actionsWithPenalties,
                getSettingsForTimestamp,
            });
            expect(result).toEqual({});
        });

        it("should correctly summarize actions without penalties", async () => {
            const actionsWithPenalties: (Action | VirtualPenalty)[] = [
                mockAction1,
                mockAction2,
                mockAction3,
            ];
            const getSettingsForTimestamp = async () => mockSettings;

            const result = await _generateMemberDailySummaries({
                actionsWithPenalties,
                getSettingsForTimestamp,
            });
            const expectedDate = getLocalDate(
                mockAction1.timestamp,
                mockSettings.timezone
            ).toDateString();

            expect(result).toEqual({
                member1: {
                    [expectedDate]: { pushups: 110, penalty: 0, net: 110 },
                },
                member2: {
                    [expectedDate]: { pushups: 120, penalty: 0, net: 120 },
                },
            });
        });

        it("should correctly summarize actions with penalties", async () => {
            const virtualPenalty1: VirtualPenalty = {
                groupId: "group1",
                memberId: "member1",
                timestamp: new Date("2025-01-01T23:59:59.999Z"),
                amount: -50,
                reason: "missed_daily_target",
            };

            const actionsWithPenalties: (Action | VirtualPenalty)[] = [
                mockAction1,
                virtualPenalty1,
            ];
            const getSettingsForTimestamp = async () => mockSettings;

            const result = await _generateMemberDailySummaries({
                actionsWithPenalties,
                getSettingsForTimestamp,
            });
            const expectedDate = getLocalDate(
                mockAction1.timestamp,
                mockSettings.timezone
            ).toDateString();

            expect(result).toEqual({
                member1: {
                    [expectedDate]: { pushups: 60, penalty: -50, net: 10 },
                },
            });
        });

        it("should handle multiple days and members correctly", async () => {
            const virtualPenalty1: VirtualPenalty = {
                groupId: "group1",
                memberId: "member1",
                timestamp: new Date("2025-01-01T23:59:59.999Z"),
                amount: -50,
                reason: "missed_daily_target",
            };
            const virtualPenalty2: VirtualPenalty = {
                groupId: "group1",
                memberId: "member1",
                timestamp: new Date("2025-01-02T23:59:59.999Z"),
                amount: -50,
                reason: "missed_daily_target",
            };
            const virtualPenalty3: VirtualPenalty = {
                groupId: "group1",
                memberId: "member2",
                timestamp: new Date("2025-01-02T23:59:59.999Z"),
                amount: -50,
                reason: "missed_daily_target",
            };

            const actionsWithPenalties: (Action | VirtualPenalty)[] = [
                mockAction1, // member1, day1: 60
                mockAction3, // member2, day1: 120
                mockAction4, // member1, day2: 80
                mockAction5, // member2, day2: 70
                virtualPenalty1, // member1, day1 penalty
                virtualPenalty2, // member1, day2 penalty
                virtualPenalty3, // member2, day2 penalty
            ];
            const getSettingsForTimestamp = async () => mockSettings;

            const result = await _generateMemberDailySummaries({
                actionsWithPenalties,
                getSettingsForTimestamp,
            });

            const expectedDate1 = getLocalDate(
                new Date("2025-01-01T05:00:00.000Z"), // 2025-01-01 00:00:00 in America/New_York
                mockSettings.timezone
            ).toDateString();
            const expectedDate2 = getLocalDate(
                new Date("2025-01-02T05:00:00.000Z"), // 2025-01-02 00:00:00 in America/New_York
                mockSettings.timezone
            ).toDateString();

            expect(result).toEqual({
                member1: {
                    [expectedDate1]: { pushups: 60, penalty: -50, net: 10 },
                    [expectedDate2]: { pushups: 80, penalty: -50, net: 30 },
                },
                member2: {
                    [expectedDate1]: { pushups: 120, penalty: 0, net: 120 },
                    [expectedDate2]: { pushups: 70, penalty: -50, net: 20 },
                },
            });
        });
    });

    describe("_generateMonthlyTotals", () => {
        it("should return empty totals for empty actionsWithPenalties", () => {
            const actionsWithPenalties: (Action | VirtualPenalty)[] = [];
            const result = _generateMonthlyTotals({ actionsWithPenalties });
            expect(result).toEqual({});
        });

        it("should correctly calculate monthly totals for actions only", () => {
            const actionsWithPenalties: (Action | VirtualPenalty)[] = [
                mockAction1,
                mockAction2,
                mockAction3,
                mockAction4,
                mockAction5,
            ];
            const result = _generateMonthlyTotals({ actionsWithPenalties });

            expect(result).toEqual({
                member1: { pushups: 190, penalties: 0, net: 190 }, // 60 + 50 + 80
                member2: { pushups: 190, penalties: 0, net: 190 }, // 120 + 70
            });
        });

        it("should correctly calculate monthly totals for actions and penalties", () => {
            const virtualPenalty1: VirtualPenalty = {
                groupId: "group1",
                memberId: "member1",
                timestamp: new Date("2025-01-01T23:59:59.999Z"),
                amount: -50,
                reason: "missed_daily_target",
            };
            const virtualPenalty2: VirtualPenalty = {
                groupId: "group1",
                memberId: "member2",
                timestamp: new Date("2025-01-01T23:59:59.999Z"),
                amount: -50,
                reason: "missed_daily_target",
            };

            const actionsWithPenalties: (Action | VirtualPenalty)[] = [
                mockAction1, // member1: 60
                mockAction3, // member2: 120
                virtualPenalty1, // member1 penalty
                virtualPenalty2, // member2 penalty
            ];
            const result = _generateMonthlyTotals({ actionsWithPenalties });

            expect(result).toEqual({
                member1: { pushups: 60, penalties: -50, net: 10 },
                member2: { pushups: 120, penalties: -50, net: 70 },
            });
        });
    });
});
