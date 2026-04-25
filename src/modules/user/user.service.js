const prisma = require("../../config/db");

exports.findOrCreateTelegramUser = async (telegramUser) => {
  const existing = await prisma.user.findUnique({
    where: { telegram_id: telegramUser.id.toString() },
  });

  if (existing) return existing;

  // create new user
  const user = await prisma.user.create({
    data: {
      email: `tg_${telegramUser.id}@bot.com`, // dummy email
      password_hash: "bot_user", // not used
      name: telegramUser.first_name || "Telegram User",
      telegram_id: telegramUser.id.toString(),
    },
  });

  return user;
};