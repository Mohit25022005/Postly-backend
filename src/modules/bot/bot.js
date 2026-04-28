const TelegramBot = require("node-telegram-bot-api");
const botService = require("./bot.service");

const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;

const bot = new TelegramBot(token, {
    polling: false,
});

bot.on("polling_error", (err) => {
    console.error("[BOT] Polling error:", err.message);
});

bot.start = async () => {
    if (process.env.NODE_ENV === "production") {
        const webhookUrl = `${process.env.BASE_URL}/bot/webhook`;
        // Drop all pending updates so stale callbacks do not crash server startup.
        await bot.setWebHook("");
        await new Promise((resolve) => setTimeout(resolve, 500));
        await bot.setWebHook(webhookUrl);
        console.log(`[BOT] Webhook set: ${webhookUrl}`);
    } else {
        bot.startPolling();
        process.once("SIGINT", () => bot.stopPolling({ reason: "SIGINT" }));
        process.once("SIGTERM", () => bot.stopPolling({ reason: "SIGTERM" }));
    }
};

// ================= START =================
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    await botService.clearState?.(chatId);

    bot.sendMessage(
        chatId,
        `Hey 👋 I’m Postly Bot

Create & publish AI posts in seconds.

📌 Commands:
/post - create content
/status - view posts
/accounts - connected accounts
/connect - link social accounts
/apikey - add your AI key 
/cancel - stop current flow
/help - show commands`
    );
});

// ================= POST =================
bot.onText(/\/post/, async (msg) => {
    await botService.startPostFlow(bot, msg);
});

// ================= STATUS =================
bot.onText(/\/status/, async (msg) => {
    await botService.handleStatus(bot, msg);
});

// ================= ACCOUNTS =================
bot.onText(/\/accounts/, async (msg) => {
    console.log("👉 /accounts command received");
    await botService.handleAccounts(bot, msg);
});

// ================= HELP =================
bot.onText(/\/help/, async (msg) => {
    bot.sendMessage(
        msg.chat.id,
        `📌 Available Commands:

/post - create content
/status - view recent posts
/accounts - connected accounts
/connect - link social accounts
/apikey - add your AI key 
/cancel - cancel current flow
/restart - restart post flow`
    );
});

// ================= MAIN MESSAGE HANDLER =================
bot.on("message", async (msg) => {
    if (msg.text?.startsWith("/")) return;

    await botService.handleMessage(bot, msg);
});

bot.on("callback_query", async (query) => {
    await botService.handleCallback(bot, query);
});

bot.onText(/\/cancel/, async (msg) => {
    const chatId = msg.chat.id;

    await botService.clearState(chatId);

    bot.sendMessage(chatId, "❌ Flow cancelled.\nUse /post to start again.", {
        reply_markup: { remove_keyboard: true }
    });
});

bot.onText(/\/restart/, async (msg) => {
    await botService.startPostFlow(bot, msg);
});

bot.onText(/\/connect/, async (msg) => {
    await botService.handleConnect(bot, msg);
});

bot.onText(/\/apikey/, async (msg) => {
    await botService.handleApiKey(bot, msg);
});

module.exports = bot;
