const Redis = require("ioredis");
const redis = new Redis();

const axios = require("axios");
const userService = require("../user/user.service");
const postService = require("../post/post.service");

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

    bot.sendMessage(
        chatId,
        "What type of post?\n1. Announcement\n2. Thread\n3. Story"
    );
};

// ================= HANDLE FLOW =================
exports.handleMessage = async (bot, msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    const state = await getState(chatId);
    if (!state) return;

    if (state.step === "type") {
        state.data.post_type = text;
        state.step = "platform";

        await setState(chatId, state);

        return bot.sendMessage(chatId, "Which platform? (twitter/linkedin)");
    }

    if (state.step === "platform") {
        state.data.platforms = [text.toLowerCase()];
        state.step = "tone";

        await setState(chatId, state);

        return bot.sendMessage(chatId, "Choose tone (professional/casual)");
    }

    if (state.step === "tone") {
        state.data.tone = text;
        state.step = "idea";

        await setState(chatId, state);

        return bot.sendMessage(chatId, "Enter your idea (max 500 chars)");
    }

    if (state.step === "idea") {
        state.data.idea = text;

        try {
            await bot.sendMessage(chatId, "⚙️ Generating content...");

            const response = await axios.post(
                "http://localhost:5000/api/content/generate",
                {
                    ...state.data,
                    model: "anthropic", // fallback safe
                    language: "en",
                }
            );

            state.data.generated = response.data.data;
            state.step = "confirm";

            await setState(chatId, state);

            return bot.sendMessage(
                chatId,
                `📱 Twitter:\n${state.data.generated.twitter || "N/A"}\n\n` +
                `💼 LinkedIn:\n${state.data.generated.linkedin || "N/A"}\n\n` +
                `Post now? (yes/no)`
            );
        } catch (err) {
            console.error("AI ERROR:", err.message);

            state.data.generated = {
                twitter: `🚀 ${text} #AI #Tech`,
                linkedin: `${text}\n\nThis is a powerful shift in the industry.\n\n#AI #Innovation`,
            };

            state.step = "confirm";
            await setState(chatId, state);

            return bot.sendMessage(
                chatId,
                `⚠️ Using fallback content:\n\n` +
                `📱 Twitter:\n${state.data.generated.twitter}\n\n` +
                `Post now? (yes/no)`
            );
        }
    }

    if (state.step === "confirm") {
        if (text.toLowerCase() === "yes") {
            try {
                await bot.sendMessage(chatId, "🚀 Publishing...");


                // STEP 5: Confirm
                if (state.step === "confirm") {
                    if (text.toLowerCase() === "yes") {
                        try {
                            await bot.sendMessage(chatId, "🚀 Publishing...");

                            const user = await userService.findOrCreateTelegramUser(msg.from);

                            await postService.publishPost(user.id, state.data);

                            await redis.del(`chat:${chatId}`);

                            return bot.sendMessage(
                                chatId,
                                "✅ Post queued successfully!"
                            );
                        } catch (err) {
                            console.error("PUBLISH ERROR:", err);

                            return bot.sendMessage(chatId, "❌ Failed to publish");
                        }
                    } else {
                        await redis.del(`chat:${chatId}`);
                        return bot.sendMessage(chatId, "❌ Cancelled");
                    }
                }

                await redis.del(`chat:${chatId}`);

                return bot.sendMessage(
                    chatId,
                    "✅ Post queued successfully! Processing..."
                );
            } catch (err) {
                console.error("PUBLISH ERROR:", err);

                return bot.sendMessage(chatId, "❌ Failed to publish");
            }
        } else {
            await redis.del(`chat:${chatId}`);
            return bot.sendMessage(chatId, "❌ Cancelled");
        }
    }
};



exports.handleStatus = async (bot, msg) => {
  const chatId = msg.chat.id;

  try {
    // 🔥 get user
    const user = await userService.findOrCreateTelegramUser(msg.from);

    const posts = await postService.getRecentPosts(user.id);

    if (!posts.length) {
      return bot.sendMessage(chatId, "No posts yet.");
    }

    let message = "📊 Last 5 posts:\n\n";

    posts.forEach((post, index) => {
      message += `${index + 1}. Idea: ${post.idea}\n`;

      post.platform_posts.forEach((p) => {
        let statusIcon = "⏳";

        if (p.status === "published") statusIcon = "✅";
        if (p.status === "failed") statusIcon = "❌";

        message += `   ${p.platform} → ${p.status} ${statusIcon}\n`;
      });

      message += "\n";
    });

    return bot.sendMessage(chatId, message);
  } catch (err) {
    console.error(err);
    return bot.sendMessage(chatId, "❌ Failed to fetch status");
  }
};