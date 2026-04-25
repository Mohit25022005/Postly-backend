const TelegramBot = require("node-telegram-bot-api");
const botService = require("./bot.service");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
  polling: true, // later change to webhook
});

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Hey 👋 Use /post to create content");
});

bot.onText(/\/post/, async (msg) => {
  await botService.startPostFlow(bot, msg);
});

bot.on("message", async (msg) => {
  await botService.handleMessage(bot, msg);
});

module.exports = bot;