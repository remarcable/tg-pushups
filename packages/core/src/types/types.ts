export type VirtualPenalty = {
    groupId: string;
    memberId: string;
    timestamp: Date;
    amount: number;
    reason: "missed_daily_target";
};
