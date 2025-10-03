import { prisma } from "../db";

export const ensureMember = async (
    groupId: string,
    userId: string,
    username: string | undefined,
    displayName: string
) => {
    const member = await prisma.member.findUnique({
        where: { id: userId },
    });

    if (member) {
        return member;
    }

    return prisma.member.create({
        data: {
            id: userId,
            groupId,
            username,
            displayName,
        },
    });
};
