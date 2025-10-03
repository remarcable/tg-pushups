import { prisma } from "../db";

export const ensureGroup = async (groupId: string, title: string) => {
    const group = await prisma.group.findUnique({
        where: { id: groupId },
    });

    if (group) {
        return group;
    }

    return prisma.group.create({
        data: {
            id: groupId,
            title,
            timezone: "UTC",
            monthGoal: 2000,
            dailyTarget: 50,
            missedDayPenalty: -10,
        },
    });
};
