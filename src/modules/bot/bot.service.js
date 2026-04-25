const Redis = require("ioredis");
const redis = new Redis();

const getState = async (chatId) => {
  const data = await redis.get(`chat:${chatId}`);
  return data ? JSON.parse(data) : null;
};

const setState = async (chatId, state) => {
  await redis.set(`chat:${chatId}`, JSON.stringify(state), "EX", 1800);
};

exports.startPostFlow = async (bot, msg) => {
  const chatId = msg.chat.id;

  await setState(chatId, { step: "type", data: {} });

  bot.sendMessage(chatId, "What type of post?\n1. Announcement\n2. Thread\n3. Story");
};

exports.handleMessage = async (bot, msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  const state = await getState(chatId);
  if (!state) return;

  // STEP 1: Post Type
  if (state.step === "type") {
    state.data.post_type = text;
    state.step = "platform";

    await setState(chatId, state);

    return bot.sendMessage(chatId, "Which platform? (twitter/linkedin)");
  }

  // STEP 2: Platform
  if (state.step === "platform") {
    state.data.platforms = [text.toLowerCase()];
    state.step = "tone";

    await setState(chatId, state);

    return bot.sendMessage(chatId, "Choose tone (professional/casual)");
  }

  // STEP 3: Tone
  if (state.step === "tone") {
    state.data.tone = text;
    state.step = "idea";

    await setState(chatId, state);

    return bot.sendMessage(chatId, "Enter your idea (max 500 chars)");
  }

  // STEP 4: Idea
  if (state.step === "idea") {
    state.data.idea = text;
    state.step = "confirm";

    await setState(chatId, state);

    // ⚡ For now mock AI response
    return bot.sendMessage(
      chatId,
      `Preview:\nTwitter: ${text}\n\nPost now? (yes/no)`
    );
  }

  // STEP 5: Confirm
  if (state.step === "confirm") {
    if (text.toLowerCase() === "yes") {
      await redis.del(`chat:${chatId}`);

      return bot.sendMessage(chatId, " Posted (mock)");
    } else {
      await redis.del(`chat:${chatId}`);
      return bot.sendMessage(chatId, " Cancelled");
    }
  }
};