const prisma = require("../../config/db");
const { encrypt } = require("../../utils/encryption");

exports.findOrCreateTelegramUser = async (telegramUser) => {
  const telegramId = telegramUser.id.toString();

  const existing = await prisma.user.findUnique({
    where: { telegram_id: telegramId },
  });

  const userWithAccounts = await prisma.user.findFirst({
    where: {
      social_accounts: {
        some: {},
      },
    },
  });

  if (existing && userWithAccounts && existing.id !== userWithAccounts.id) {
    console.log("🔗 Merging Telegram user with existing user");

    await prisma.post.updateMany({
      where: { user_id: existing.id },
      data: { user_id: userWithAccounts.id },
    });

    await prisma.socialAccount.updateMany({
      where: { user_id: existing.id },
      data: { user_id: userWithAccounts.id },
    });

    await prisma.user.update({
      where: { id: existing.id },
      data: { telegram_id: null },
    });

    await prisma.user.update({
      where: { id: userWithAccounts.id },
      data: { telegram_id: telegramId },
    });

    return userWithAccounts;
  }

  if (existing) return existing;

  if (userWithAccounts) {
    return prisma.user.update({
      where: { id: userWithAccounts.id },
      data: {
        telegram_id: telegramId,
      },
    });
  }

  return prisma.user.create({
    data: {
      email: `tg_${telegramId}@bot.com`,
      password_hash: "bot_user",
      name: telegramUser.first_name || "Telegram User",
      telegram_id: telegramId,
    },
  });
};

// ================= PROFILE =================
exports.getProfile = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      bio: true,
      default_tone: true,
      default_language: true,
    },
  });
};

exports.updateProfile = async (userId, data) => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      bio: data.bio,
      default_tone: data.default_tone,
      default_language: data.default_language,
    },
  });
};

// ================= SOCIAL ACCOUNTS =================
exports.addSocialAccount = async (userId, data) => {
  return prisma.socialAccount.create({
    data: {
      user_id: userId,
      platform: data.platform,
      access_token_enc: encrypt(data.access_token),
      refresh_token_enc: encrypt(data.refresh_token || ""),
      handle: data.handle,
    },
  });
};

exports.getSocialAccounts = async (userId) => {
  return prisma.socialAccount.findMany({
    where: { user_id: userId },
  });
};

exports.deleteSocialAccount = async (userId, id) => {
  return prisma.socialAccount.delete({
    where: { id },
  });
};

// ================= AI KEYS =================
exports.saveAIKeys = async (userId, data) => {
  return prisma.aIKey.upsert({
    where: { user_id: userId },
    update: {
      openai_key_enc: encrypt(data.openai_key || ""),
      anthropic_key_enc: encrypt(data.anthropic_key || ""),
    },
    create: {
      user_id: userId,
      openai_key_enc: encrypt(data.openai_key || ""),
      anthropic_key_enc: encrypt(data.anthropic_key || ""),
    },
  });
};