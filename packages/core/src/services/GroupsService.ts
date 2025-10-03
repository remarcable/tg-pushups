import { prisma } from "../db";
import { updateGroupSettings } from "./SettingsService";

export const ensureGroup = async (groupId: string, title: string) => {
    const group = await prisma.group.findUnique({
        where: { id: groupId },
    });

    if (group) {
        return group;
    }

    const newGroup = await prisma.group.create({
        data: {
            id: groupId,
            title,
        },
    });

    // Create initial settings for the new group
    await updateGroupSettings(groupId, {
        timezone: "UTC",
        monthGoal: 2000,
        dailyTarget: 50,
        missedDayPenalty: -10,
    });

    return newGroup;
};
