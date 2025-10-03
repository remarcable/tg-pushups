import { prisma } from "../db";

// TODO: Rename settingChange => groupSettingsChange
// TODO: UpdateGroupSettings only appends to the list of changes, and they are not "cached" in the group object
// Instead, the latest settings are the latest full change
// Also, changes aren't a diff but the full settings object
export const updateGroupSettings = async (
    groupId: string,
    settings: {
        timezone?: string;
        monthGoal?: number;
        dailyTarget?: number;
        missedDayPenalty?: number;
    }
) => {
    await prisma.groupSettingChange.create({
        data: {
            groupId,
            timestamp: new Date(),
            payload: JSON.stringify(settings),
        },
    });
};

export const getEffectiveSettings = async (groupId: string, atTimestamp?: Date) => {
    // Default settings
    let effectiveSettings = {
        groupId: groupId, // Keep groupId for consistency with the interface
        timezone: "UTC", // Default timezone
        monthGoal: 2000, // Default month goal
        dailyTarget: 50, // Default daily target
        missedDayPenalty: -10, // Default missed day penalty
    };

    const changes = await prisma.groupSettingChange.findMany({
        where: {
            groupId,
            timestamp: { lte: atTimestamp || new Date() },
        },
        orderBy: { timestamp: "asc" },
    });

    for (const change of changes) {
        effectiveSettings = { ...effectiveSettings, ...JSON.parse(change.payload) };
    }

    return effectiveSettings;
};
