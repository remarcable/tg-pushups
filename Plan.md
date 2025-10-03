## Pushups Bot — MVP Plan

### Goals

- **MVP objective**: A Telegram bot that tracks daily pushups for multiple groups, enforces a daily target, applies penalties when individuals miss their daily quota, and provides totals and simple settings. Designed with an internal API so additional interfaces can be added later.

### Core Assumptions (for MVP; to confirm in Questions)

- Groups map 1:1 to Telegram group chats. Bot is added to a TG group and identifies the group via chat id.
- Each group has: monthly goal (e.g., 2000), daily per-person target (e.g., 50), penalty per miss (e.g., -10 from group total), timezone.
- Users report their own pushups; others cannot report for them (admins can adjust via settings).
- Reports are per day; late backfill allowed for “yesterday” only in MVP. // could also add support for adding them on arbitrary dates, but only if this is easy to do
- Totals are computed from an append-only actions table.
- Month rolls over at local midnight for the group’s timezone; a new monthly cycle begins.

### Bot Commands (in group chats)

- `/add <amount>`: Add pushups for today for the sender.
- `/sub <amount>`: Subtract pushups for today for the sender (cannot go below 0 daily; negative actions only allowed to correct mistakes).
- `/add <amount> yesterday`: Add for yesterday for the sender (within backfill window).
- `/sub <amount> yesterday`: Subtract for yesterday for the sender.
- `/totals`: Show today’s per-user progress, month-to-date per-user totals, and group month total vs. goal; show missed-day penalties applied.
- `/settings`: View settings; admins can change via inline buttons or follow-up prompts (MVP: daily target, penalty, timezone).

Optional (MVP+):

- `/me`: Show only my stats (today + month-to-date).
- `/leaderboard`: Month-to-date per-user ranking.
- `/help`: Basic help.

### Data Model (SQLite via Prisma)

Entities:

- Group
    - id (string; TG chat id)
    - title (string)
    - timezone (string, IANA)
    - monthGoal (int) // default: dailyTarget \* numberOfMembers; admin can override
    - dailyTarget (int)
    - missedDayPenalty (int)
    - createdAt, updatedAt (datetime)
- Member
    - id (string; TG user id)
    - groupId (fk)
    - username (string | null)
    - displayName (string)
    - createdAt, updatedAt
- Action
    - id (uuid)
    - groupId (fk)
    - memberId (fk)
    - timestamp (datetime/number; UTC) // source of truth time
    - amount (int; positive for add, negative for sub)
    - createdAt

- SettingChange (audit log of settings changes)
    - id (uuid)
    - groupId (fk)
    - timestamp (datetime/number; UTC) // when change was made
    - payload (json) // full updated settings: { dailyTarget?, missedDayPenalty?, monthGoal?, timezone? }
    - createdAt

Notes:

- Penalties are computed on the fly from daily sums; no `PenaltyEvent` rows are persisted. We will generate virtual penalty events during reads for calculation and display purposes.
- Daily totals per member per date are computed by mapping each `Action.timestamp` to `localDate` using the group’s IANA timezone. A miss occurs if sum(localDate) < dailyTarget.
- Group monthly total = sum of all Action.amount + sum of computed penalties (negative) for all days in month.
- Storing `timestamp` (UTC) is the source of truth; `localDate` is computed at read time only (no materialization).
- `monthGoal` defaults to `dailyTarget * numberOfMembers` at the beginning of a month, but admins may override. Prefer snapshotting the value per month; see Month rollover.

### Penalty Calculation as Virtual Events

- For any date range, build a stream per member consisting of:
    - All `Action` records ordered by date then createdAt
    - Insert a virtual penalty event for each date where daily sum < `dailyTarget`, amount = `missedDayPenalty`, reason = "missed_daily_target"
- This virtualized stream is input to aggregation functions, enabling backfill to automatically remove a previously implied penalty if the daily sum reaches the target.

Core functions (in `StatsService`):

- `getActionsWithVirtualPenalties({ groupId, startDate, endDate })`
- `getMemberDailySummaries({ groupId, startDate, endDate })` → per-member per-day: pushups, penalty, net
- `getMonthlyTotals({ groupId, month })` → per-member MTD pushups, MTD penalties, net; group totals

### Internal API (domain layer) separate from Telegram adapter

Structure:

- `packages/core` (pure TS, no Telegram code)
    - `services/GroupsService`
    - `services/MembersService`
    - `services/ActionsService`
    - `services/StatsService` (totals, penalties calc)
    - `services/SettingsService` (apply changes, resolve effective settings)
    - `services/SchedulerService` (identify who’s missing today)
    - `db` (Prisma client, repository functions)
    - `types`
- `apps/telegram-bot` (Telegraf or grammY)
    - command handlers map to core services
- `apps/worker` (later) for scheduled jobs (cron) and reminders

API surface (examples; synchronous calls from bot):

- `recordAction({ groupId, userId, date, amount })`
- `getTotals({ groupId, month })` → per-member MTD, group total, today’s status
- `getTodayStatus({ groupId, date })` → who met target, who hasn’t
- `getActionsWithVirtualPenalties({ groupId, startDate, endDate })`
- `updateGroupSettings({ groupId, dailyTarget?, penalty?, timezone?, monthGoal? })` // writes current settings and appends SettingChange
- `applySettingChange({ groupId, diff, timestamp })` // append-only audit log entry
- `getEffectiveSettings({ groupId, atTimestamp? })` // reduce SettingChange over Group base to resolve settings at a time
- `ensureGroupAndMember({ chat, user })` → idempotent upsert on first interaction

### Penalty Logic

- For each day D in the month, per member: if total(D, member) < dailyTarget → apply `missedDayPenalty` once.
- “Missed” is independent of partial progress; as long as sum >= dailyTarget, no penalty.
- Backfill policy (per answers): allow backfill for "yesterday" only. Because penalties are computed lazily, a backfilled action that lifts a day to the target will remove the virtual penalty.
- Penalties are evaluated lazily at read time; there is no persisted penalty state.
- Date mapping: penalties are evaluated against `localDate` derived from UTC `timestamp` using the group’s timezone.

### Scheduling & Notifications (MVP)

- A single daily reminder near end of day (configurable, default 21:00 local) to members who haven’t met target yet.
- Implementation: simple cron job (node-cron) per group timezone; compute list via `getTodayStatus` and send DM or group mention_reply.
- Out of scope for MVP: per-user custom schedules, smart nudges.

Smart nudges (future):

- Detect patterns (e.g., frequent last-minute adds, frequent misses on certain weekdays) and send tailored nudges earlier on risky days.
- Lightweight approach: heuristic rules on top of recent 7–14 days data; avoid ML initially.
- If needed later: simple scoring model that estimates miss risk and adjusts message time/wording.

### Bot UX Flows

- First run in a group: When added, bot greets and asks admin to run `/settings` to set daily target, penalty, timezone, and month goal.
- `/add 30`: Bot validates number, ensures membership, records action for today. Replies with my today total and how many left to target.
- `/add 30 yesterday`: Records for yesterday. Replies similarly.
- `/sub 10`: Records -10 for today; clip so that today’s total cannot go below 0 and inform the user.
- `/totals`: Shows today’s per-user status; MTD per-member metrics with three numbers: pushups, penalties, and net (pushups + penalties); group month total vs monthGoal.
- `/settings`: Shows current settings and offers inline buttons to adjust key numbers; full command-arguments also supported (e.g., `/settings daily 50`).
    - When admins change settings, we update `Group` (current snapshot) and append a `SettingChange` with the diff for audit/history.

### Validation & Edge Cases

- Parsing commands with natural language variants ("yday", "yesterday").
- Negative numbers rejected on `/add`; `/sub` only allows positive numbers.
- Prevent extreme inputs (e.g., >2000 in one go) via configurable max.
- Handle users leaving the group (keep historical data; stop reminders).
- Timezone changes mid-month: apply prospectively; historical dates remain computed by previously derived `localDate` (or derive using the timezone effective at that time via `SettingChange`).
- Month boundary: new month should reset month context but retains historical data.

### Timezones (assumption: members share a timezone)

- MVP assumes all members share the group’s timezone (set by an admin in `/settings`).
- If members differ in timezones (future consideration):
    - Option A: Keep a single group timezone for fairness and simplicity; communicate this clearly.
    - Option B: Track per-user timezones and evaluate daily targets per user’s local day, but aggregate penalties to the group month; this adds complexity to reminders and daily windows.
    - Recommendation: Stick to a single group timezone for now.
- Implementation detail: always store `timestamp` in UTC; derive `localDate` via IANA TZ when aggregating at read time only (no materialization).

### Tech Choices

- Node.js + TypeScript
- SQLite + Prisma
- Telegram framework: grammY (lean), or Telegraf (popular). MVP choose grammY.
- Scheduling: node-cron (or hosted scheduler if deploying to serverless).
- Deployment: Fly.io/Render/Heroku-like. Persist SQLite (volume). For cron, run a worker process.

### Milestones

1. Scaffold repo: TS, ESLint, Prettier, tsup/ts-node, workspace structure.
2. Data model with Prisma; migrations; seed.
3. Core services: recordAction, totals, settings (with `SettingChange` audit), ensureGroup/Member.
4. Telegram bot: wire commands to core; minimal replies.
5. Scheduling: daily reminder job.
6. Polish UX, error handling, help.

### Future: Staking/Escrow Feature (not in MVP)

- Stake per member at month start (e.g., 25€). Integrations: Stripe, PayPal, crypto, or simple pledge without collection.
- Logic: If member fails threshold (e.g., meets daily target X% of days), stake forfeited. Disposition: donation to Wikipedia via API, redistribution to compliant members, or accumulated pot for next month’s reward.
- Requires: KYC considerations, payouts, regional constraints. Might start with donation-only.

Group-level monthly outcomes (future rules):

- If the group misses the monthly goal but some individuals met their personal daily targets:
    - Option A: Apply an additional group penalty shared equally across all members (e.g., -X each) regardless of individual performance to reinforce collective responsibility.
    - Option B: Apply a smaller group penalty to everyone, and a reduced or zero extra penalty to members who met their own targets.
    - Option C: No extra penalty; instead roll over a deficit to next month’s group goal.
- Recommendation: Start with Option C (no extra penalty) for clarity; revisit after seeing behavior.

Win-back staking rule (future):

- If a member misses their monthly target, they can “win back” next month by staking again and then meeting both:
    - Their personal daily target compliance for the next month, and
    - The group reaching its monthly goal for the next month.
- Implementation later: track member’s prior-month status and evaluate win-back condition at month end.

Cheap LLM for more fun messages (future):

- Use a tiny/cheap model (e.g., `gpt-4o-mini` or similar low-cost) with short prompts and templated context:
    - Keep a local library of message templates and pass only minimal variables (name, short status).
    - Cache a few witty variants per situation and sample from them to reduce API calls.
    - Fallback to static templates on outages or rate limits.

### Open Questions (to confirm before implementation)

1. Are groups strictly Telegram chats, or do you want named groups independent of TG chats? => only tg chats
2. Which Telegram framework do you prefer (grammY vs Telegraf), or should I pick? => grammY
3. Default values: dailyTarget, missedDayPenalty, monthGoal? => 20, -10, dailyTarget\*numberOfMembers
4. Should `/sub` be able to reduce today’s sum below 0? Or clip at 0 and inform? Only inform, clip to 0
5. Backfill: allow only "yesterday" or a small window (e.g., last 3 days)? If it's easy to backfill other dates of month, do that
6. Timezone: who sets it—first admin who configures settings? How to handle members across timezones? Only do Admin TZ for now, can be defined in settings if needed
7. Month rollover: do we lock previous month (no backfill) after N days? => yes month completely resets, only backfill for yesterday possible
8. Reminders: DM each user or post in group (and mention)? Preferred default time? => post in group for now
9. Visibility: should `/totals` include per-member daily misses and count of missed days in the month? Yes
10. Penalties persistence: compute on the fly or store `PenaltyEvent` records? Preference? On the fly
11. Admin controls: who can change `/settings`? TG admins only or any member? Only group admins
12. Security: do we need to verify message sender vs member identity beyond Telegram user id? no
13. Data retention: keep history indefinitely? would be nice, but not important.
14. Error handling language and tone preferences? Not for now
15. Future staking: threshold for forfeiture? Donation vs redistribution default? Not important for now.

### Rough Timeline (MVP today)

- 1–2h: scaffold + Prisma + schema + migrations
- 2–3h: core services (record/compute) + tests for core logic
- 2h: telegram command handlers + minimal replies
- 1h: reminder job + basic scheduler
- Buffer: 1h polish

## Testing

The project should include comprehensive unit tests during every stage.
