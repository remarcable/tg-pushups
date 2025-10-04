import { Context } from "grammy";

const GREEN = "\x1b[32m";
const GRAY = "\x1b[90m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

const getFormattedTimestamp = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    return `[${year}-${month}-${day} ${hours}:${minutes}:${seconds}]`;
};

export const loggerMiddleware = async (ctx: Context, next: () => Promise<void>) => {
    if (ctx.message?.text?.startsWith("/")) {
        const userTimestamp = getFormattedTimestamp();
        const coloredUserTimestamp = `${GRAY}${userTimestamp}${RESET}`;

        const from = ctx.from;
        const username = from?.username || from?.first_name || "unknown_user";
        const command = ctx.message.text;

        const userLogPrefix = `${coloredUserTimestamp} ${GREEN}@${username}${RESET}`;
        console.log(userLogPrefix);
        console.log(`${CYAN}${command}${RESET}`);

        // Monkey-patch ctx.reply
        const originalReply = ctx.reply;
        ctx.reply = (...args: Parameters<typeof originalReply>) => {
            const replyTimestamp = getFormattedTimestamp();
            const coloredReplyTimestamp = `${GRAY}${replyTimestamp}${RESET}`;
            const replyText = args[0];
            const botLogPrefix = `${coloredReplyTimestamp} ${GREEN}@bot${RESET}`;

            console.log(botLogPrefix);
            console.log(`${CYAN}${replyText}${RESET}`);
            return originalReply.apply(ctx, args);
        };
    }
    await next();
};
