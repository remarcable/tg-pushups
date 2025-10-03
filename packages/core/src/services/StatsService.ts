import { VirtualPenalty } from "../types/types";
import { getEffectiveSettings } from "./SettingsService";
import { prisma } from "../db";

export const getLocalDate = (date: Date, timezone: string) => {
    const utcDate = new Date(date.valueOf());
    const offset =
        new Date(utcDate.toLocaleString("en-US", { timeZone: timezone })).getTime() -
        utcDate.getTime();
    return new Date(utcDate.getTime() + offset);
};

export const getActionsWithVirtualPenalties = async ({
    groupId,
    startDate,
    endDate,
}: {
    groupId: string;
    startDate: Date;
    endDate: Date;
}) => {
    const settings = await getEffectiveSettings(groupId, endDate);
    const actions = await prisma.action.findMany({
        where: {
            groupId,
            timestamp: {
                gte: startDate,
                lte: endDate,
            },
        },
        orderBy: { timestamp: "asc" },
    });

    const members = await prisma.member.findMany({ where: { groupId } });
    const virtualPenalties: VirtualPenalty[] = [];

    for (const member of members) {
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const localDate = getLocalDate(d, settings.timezone);
            const actionsOnDate = actions.filter(
                (a) =>
                    a.memberId === member.id &&
                    getLocalDate(a.timestamp, settings.timezone).toDateString() ===
                        localDate.toDateString()
            );

            const dailyTotal = actionsOnDate.reduce((sum, a) => sum + a.amount, 0);

            if (dailyTotal < settings.dailyTarget) {
                virtualPenalties.push({
                    groupId,
                    memberId: member.id,
                    timestamp: new Date(
                        localDate.getFullYear(),
                        localDate.getMonth(),
                        localDate.getDate(),
                        23,
                        59,
                        59,
                        999
                    ),
                    amount: settings.missedDayPenalty,
                    reason: "missed_daily_target",
                });
            }
        }
    }

    return [...actions, ...virtualPenalties].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
};

export const getMemberDailySummaries = async ({
    groupId,
    startDate,
    endDate,
}: {
    groupId: string;
    startDate: Date;
    endDate: Date;
}) => {
    const actionsWithPenalties = await getActionsWithVirtualPenalties({
        groupId,
        startDate,
        endDate,
    });

    const summaries: {
        [key: string]: { [key: string]: { pushups: number; penalty: number; net: number } };
    } = {};

    for (const item of actionsWithPenalties) {
        const settings = await getEffectiveSettings(groupId, item.timestamp);
        const localDate = getLocalDate(item.timestamp, settings.timezone).toDateString();

        if (!summaries[item.memberId]) {
            summaries[item.memberId] = {};
        }
        if ("reason" in item && item.reason === "missed_daily_target") {
            summaries[item.memberId][localDate].penalty += item.amount;
        } else {
            summaries[item.memberId][localDate].pushups += item.amount;
        }
        summaries[item.memberId][localDate].net =
            summaries[item.memberId][localDate].pushups +
            summaries[item.memberId][localDate].penalty;
    }

    return summaries;
};

export const getMonthlyTotals = async ({ groupId, month }: { groupId: string; month: Date }) => {
    const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
    const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const actionsWithPenalties = await getActionsWithVirtualPenalties({
        groupId,
        startDate,
        endDate,
    });

    const totals: { [key: string]: { pushups: number; penalties: number; net: number } } = {};

    for (const item of actionsWithPenalties) {
        if (!totals[item.memberId]) {
            totals[item.memberId] = { pushups: 0, penalties: 0, net: 0 };
        }

        if ("reason" in item && item.reason === "missed_daily_target") {
            totals[item.memberId].penalties += item.amount;
        } else {
            totals[item.memberId].pushups += item.amount;
        }
        totals[item.memberId].net = totals[item.memberId].pushups + totals[item.memberId].penalties;
    }

    return totals;
};
