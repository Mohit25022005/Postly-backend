const TelegramBot = require("node-telegram-bot-api");
const botService = require("./bot.service");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
  polling: true, // will switch to webhook in deployment
});

// ================= START =================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  await botService.clearState?.(chatId);

  bot.sendMessage(
    chatId,
    "Hey 👋 I’m Postly Bot\n\n" +
      "/post - create content\n" +
      "/status - view posts\n" +
      "/accounts - connected accounts\n" +
      "/help - all commands"
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
    "/post - create content\n" +
      "/status - view posts\n" +
      "/accounts - connected accounts\n" +
      "/help - show commands"
  );
});

// ================= MAIN MESSAGE HANDLER =================
bot.on("message", async (msg) => {
  if (msg.text?.startsWith("/")) return;

  await botService.handleMessage(bot, msg);
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

module.exports = bot;