const TelegramBot = require("node-telegram-bot-api");
const botService = require("./bot.service");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
    polling: true, // later change to webhook
});

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    await redis.del(`chat:${chatId}`);

    bot.sendMessage(chatId, "Hey 👋 Use /post to create content");
});

bot.onText(/\/post/, async (msg) => {
    await botService.startPostFlow(bot, msg);
});

bot.on("message", async (msg) => {
    if (msg.text?.startsWith("/")) return;

    await botService.handleMessage(bot, msg);
});

bot.onText(/\/status/, async (msg) => {
  await botService.handleStatus(bot, msg);
});

module.exports = bot;