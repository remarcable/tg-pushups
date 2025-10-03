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
    const group = await prisma.group.update({
        where: { id: groupId },
        data: settings,
    });

    await prisma.settingChange.create({
        data: {
            groupId,
            timestamp: new Date(),
            payload: JSON.stringify(settings),
        },
    });

    return group;
};

export const getEffectiveSettings = async (groupId: string, atTimestamp?: Date) => {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
        throw new Error("Group not found");
    }

    const changes = await prisma.settingChange.findMany({
        where: {
            groupId,
            timestamp: { lte: atTimestamp || new Date() },
        },
        orderBy: { timestamp: "asc" },
    });

    let effectiveSettings = {
        timezone: group.timezone,
        monthGoal: group.monthGoal,
        dailyTarget: group.dailyTarget,
        missedDayPenalty: group.missedDayPenalty,
    };

    for (const change of changes) {
        effectiveSettings = { ...effectiveSettings, ...JSON.parse(change.payload) };
    }

    return effectiveSettings;
};
