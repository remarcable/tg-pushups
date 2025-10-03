import { VirtualPenalty } from "../types/types";
import { getEffectiveSettings } from "./SettingsService";
import { prisma } from "../db";
import { Action, Member } from "@prisma/client";

export interface EffectiveSettings {
    groupId: string;
    timezone: string;
    dailyTarget: number;
    missedDayPenalty: number;
}

export const getLocalDate = (date: Date, timezone: string) => {
    const utcDate = new Date(date.valueOf());
    const offset =
        new Date(utcDate.toLocaleString("en-US", { timeZone: timezone })).getTime() -
        utcDate.getTime();
    return new Date(utcDate.getTime() + offset);
};

export const getDayWindow = (date: Date, timezone: string) => {
    const getOffset = (tz: string) => {
        const roundedTime = Math.floor(date.getTime() / 1000) * 1000;
        const utcDate = new Date(roundedTime);
        return (
            new Date(utcDate.toLocaleString("en-US", { timeZone: tz })).getTime() -
            utcDate.getTime()
        );
    };

    const offset = getOffset(timezone);
    const localDate = new Date(date.getTime() + offset);

    const startOfDayLocal = new Date(
        localDate.getFullYear(),
        localDate.getMonth(),
        localDate.getDate(),
        0,
        0,
        0,
        0
    );
    const endOfDayLocal = new Date(
        localDate.getFullYear(),
        localDate.getMonth(),
        localDate.getDate(),
        23,
        59,
        59,
        999
    );

    const startDate = new Date(startOfDayLocal.getTime() - offset);
    const endDate = new Date(endOfDayLocal.getTime() - offset);

    return { startDate, endDate };
};

export const _calculateVirtualPenalties = ({
    actions,
    members,
    settings,
    startDate,
    endDate,
}: {
    actions: Action[];
    members: Member[];
    settings: EffectiveSettings;
    startDate: Date;
    endDate: Date;
}): (Action | VirtualPenalty)[] => {
    const virtualPenalties: VirtualPenalty[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const member of members) {
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            if (d >= today) {
                continue;
            }

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
                    groupId: settings.groupId,
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

export const getActionsWithVirtualPenalties = async ({
    groupId,
    startDate,
    endDate,
}: {
    groupId: string;
    startDate: Date;
    endDate: Date;
}): Promise<(Action | VirtualPenalty)[]> => {
    const settings: EffectiveSettings = await getEffectiveSettings(groupId, endDate);
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

    return _calculateVirtualPenalties({
        actions,
        members,
        settings,
        startDate,
        endDate,
    });
};

export const _generateMemberDailySummaries = async ({
    actionsWithPenalties,
    getSettingsForTimestamp,
}: {
    actionsWithPenalties: (Action | VirtualPenalty)[];
    getSettingsForTimestamp: (timestamp: Date) => Promise<EffectiveSettings>;
}) => {
    const summaries: {
        [key: string]: { [key: string]: { pushups: number; penalty: number; net: number } };
    } = {};

    for (const item of actionsWithPenalties) {
        const settings = await getSettingsForTimestamp(item.timestamp);
        const localDate = getLocalDate(item.timestamp, settings.timezone).toDateString();

        if (!summaries[item.memberId]) {
            summaries[item.memberId] = {};
        }
        if (!summaries[item.memberId][localDate]) {
            summaries[item.memberId][localDate] = { pushups: 0, penalty: 0, net: 0 };
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

export const getMemberDailySummaries = async ({
    groupId,
    startDate,
    endDate,
}: {
    groupId: string;
    startDate: Date;
    endDate: Date;
}) => {
    const actionsWithPenalties: (Action | VirtualPenalty)[] = await getActionsWithVirtualPenalties({
        groupId,
        startDate,
        endDate,
    });

    const getSettingsForTimestamp = async (timestamp: Date) => {
        return getEffectiveSettings(groupId, timestamp);
    };

    return _generateMemberDailySummaries({
        actionsWithPenalties,
        getSettingsForTimestamp,
    });
};

export const _generateMonthlyTotals = ({
    actionsWithPenalties,
    settings,
    dayCount,
}: {
    actionsWithPenalties: (Action | VirtualPenalty)[];
    settings: EffectiveSettings;
    dayCount: number;
}) => {
    const totals: {
        [key: string]: {
            pushups: number;
            penalties: number;
            net: number;
            missedDays: number;
            monthlyTarget: number;
        };
    } = {};
    const monthlyTarget = settings.dailyTarget * dayCount;

    for (const item of actionsWithPenalties) {
        if (!totals[item.memberId]) {
            totals[item.memberId] = {
                pushups: 0,
                penalties: 0,
                net: 0,
                missedDays: 0,
                monthlyTarget: monthlyTarget,
            };
        }

        if ("reason" in item && item.reason === "missed_daily_target") {
            totals[item.memberId].penalties += item.amount;
            totals[item.memberId].missedDays++;
        } else {
            totals[item.memberId].pushups += item.amount;
        }
        totals[item.memberId].net = totals[item.memberId].pushups + totals[item.memberId].penalties;
    }

    return totals;
};

export const getMonthlyTotals = async ({ groupId, month }: { groupId: string; month: Date }) => {
    const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
    const today = new Date();
    const monthEndDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const endDate = today < monthEndDate ? today : monthEndDate;

    const actionsWithPenalties: (Action | VirtualPenalty)[] = await getActionsWithVirtualPenalties({
        groupId,
        startDate,
        endDate,
    });

    const settings = await getEffectiveSettings(groupId, endDate);

    let dayCount = 0;
    for (let d = new Date(startDate); d < today && d < monthEndDate; d.setDate(d.getDate() + 1)) {
        dayCount++;
    }

    return _generateMonthlyTotals({
        actionsWithPenalties,
        settings,
        dayCount,
    });
};
