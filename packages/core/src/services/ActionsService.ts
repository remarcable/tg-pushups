import { prisma } from "../db";

export const recordAction = async (
    groupId: string,
    memberId: string,
    amount: number,
    timestamp: Date
) => {
    const action = await prisma.action.create({
        data: {
            groupId,
            memberId,
            amount,
            timestamp,
        },
    });

    return action;
};
