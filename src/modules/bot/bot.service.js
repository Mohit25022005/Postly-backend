const Redis = require("ioredis");
// const redis = new Redis();
const redis = require("../../config/redis");

const axios = require("axios");
const userService = require("../user/user.service");
const postService = require("../post/post.service");

// ================= STATE =================
const getState = async (chatId) => {
    const data = await redis.get(`chat:${chatId}`);
    return data ? JSON.parse(data) : null;
};

const setState = async (chatId, state) => {
    await redis.set(`chat:${chatId}`, JSON.stringify(state), "EX", 1800);
};

// ================= START =================
exports.startPostFlow = async (bot, msg) => {
    const chatId = msg.chat.id;

    await redis.del(`chat:${chatId}`);
    await setState(chatId, { step: "type", data: {} });

    return bot.sendMessage(chatId, "Hey 👋 What type of post is this?", {
        reply_markup: {
            keyboard: [
                ["Announcement", "Thread"],
                ["Story", "Promotional"],
                ["Educational", "Opinion"],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
        },
    });
};

// ================= HANDLE FLOW =================
exports.handleMessage = async (bot, msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.toLowerCase();

    const state = await getState(chatId);
    if (!state) return;
    // ===== CONNECT PLATFORM =====
    if (state.step === "connect_platform") {
        const validPlatforms = ["twitter", "linkedin", "instagram", "threads"];

        if (!validPlatforms.includes(text)) {
            return bot.sendMessage(
                chatId,
                "❌ Invalid platform. Choose Twitter, LinkedIn, Instagram, or Threads"
            );
        }

        try {
            const user = await userService.findOrCreateTelegramUser(msg.from);

            await userService.addSocialAccount(user.id, {
                platform: text,
                access_token: "demo_token",
                refresh_token: "demo_refresh",
                handle: "@demo_user",
            });

            await redis.del(`chat:${chatId}`);

            return bot.sendMessage(
                chatId,
                `✅ ${text.toUpperCase()} connected successfully!`,
                { reply_markup: { remove_keyboard: true } }
            );
        } catch (err) {
            console.error(err);
            return bot.sendMessage(chatId, "❌ Failed to connect account");
        }
    }
    // ===== API KEY TYPE =====
    if (state.step === "api_key_type") {
        if (!["openai", "anthropic"].includes(text)) {
            return bot.sendMessage(chatId, "❌ Choose OpenAI or Anthropic");
        }

        state.data.key_type = text;
        state.step = "api_key_value";
        await setState(chatId, state);

        return bot.sendMessage(chatId, `Paste your ${text.toUpperCase()} API key:`);
    }

    // ===== API KEY VALUE =====
    if (state.step === "api_key_value") {
        const user = await userService.findOrCreateTelegramUser(msg.from);

        try {
            const payload =
                state.data.key_type === "openai"
                    ? { openai_key: text }
                    : { anthropic_key: text };

            await userService.saveAIKeys(user.id, payload);

            await redis.del(`chat:${chatId}`);

            return bot.sendMessage(chatId, "✅ API key saved successfully!");
        } catch (err) {
            console.error(err);
            return bot.sendMessage(chatId, "❌ Failed to save key");
        }
    }
    // ===== TYPE =====
    if (state.step === "type") {
        const validTypes = [
            "announcement",
            "thread",
            "story",
            "promotional",
            "educational",
            "opinion",
        ];

        if (!validTypes.includes(text)) {
            return bot.sendMessage(
                chatId,
                "❌ Invalid type.\nChoose: Announcement | Thread | Story | Promotional | Educational | Opinion"
            );
        }

        state.data.post_type = text;
        state.step = "platform";
        await setState(chatId, state);

        return bot.sendMessage(chatId, "Which platforms?", {
            reply_markup: {
                keyboard: [
                    ["Twitter", "LinkedIn"],
                    ["Instagram", "Threads"],
                    ["All"],
                ],
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        });
    }

    // ===== PLATFORM =====
    if (state.step === "platform") {
        const validPlatforms = [
            "twitter",
            "linkedin",
            "instagram",
            "threads",
            "all",
        ];

        if (!validPlatforms.includes(text)) {
            return bot.sendMessage(
                chatId,
                "❌ Invalid platform.\nChoose: Twitter | LinkedIn | Instagram | Threads | All"
            );
        }

        state.data.platforms =
            text === "all"
                ? ["twitter", "linkedin", "instagram", "threads"]
                : [text];

        state.step = "tone";
        await setState(chatId, state);

        return bot.sendMessage(chatId, "Choose tone:", {
            reply_markup: {
                keyboard: [
                    ["Professional", "Casual"],
                    ["Witty", "Authoritative"],
                    ["Friendly"],
                ],
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        });
    }

    // ===== TONE =====
    if (state.step === "tone") {
        const validTones = [
            "professional",
            "casual",
            "witty",
            "authoritative",
            "friendly",
        ];

        if (!validTones.includes(text)) {
            return bot.sendMessage(
                chatId,
                "❌ Invalid tone.\nChoose: Professional | Casual | Witty | Authoritative | Friendly"
            );
        }

        state.data.tone = text;
        state.step = "model";
        await setState(chatId, state);

        return bot.sendMessage(chatId, "Which AI model?", {
            reply_markup: {
                keyboard: [["GPT-4o"], ["Claude Sonnet"]],
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        });
    }

    // ===== MODEL =====
    if (state.step === "model") {
        if (!text.includes("gpt") && !text.includes("claude")) {
            return bot.sendMessage(
                chatId,
                "❌ Invalid model.\nChoose: GPT-4o or Claude Sonnet"
            );
        }

        state.data.model = text.includes("claude") ? "anthropic" : "openai";
        state.step = "idea";
        await setState(chatId, state);

        return bot.sendMessage(chatId, "Tell me the idea (max 500 chars)");
    }

    // ===== IDEA =====
    if (state.step === "idea") {
        if (!text || text.length < 3) {
            return bot.sendMessage(chatId, "❌ Idea too short.");
        }

        if (text.length > 500) {
            return bot.sendMessage(chatId, "❌ Idea too long (max 500 chars)");
        }

        state.data.idea = text;

        try {
            await bot.sendMessage(chatId, "⚙️ Generating content...");

            const user = await userService.findOrCreateTelegramUser(msg.from);

            const response = await axios.post(
                "http://localhost:5000/api/content/generate",
                {
                    ...state.data,
                    user_id: user.id,
                }
            );

            state.data.generated = response.data.generated;

        } catch (err) {
            console.error("AI ERROR:", err.message);


            state.data.generated = {
                twitter: { content: `🚀 ${text} #AI #Tech` },
                linkedin: { content: `${text}\n\nThis is a powerful shift.\n\n#AI #Innovation` },
                instagram: { content: `${text} ✨🔥 #AI #Tech` },
                threads: { content: `${text} – thoughts?` },
            };
        }

        state.step = "confirm";
        await setState(chatId, state);

        let message = "";
        const platforms = state.data.platforms;
        const generated = state.data.generated || {};


        if (platforms.includes("twitter")) {
            message += `📱 Twitter:\n${generated.twitter?.content || "N/A"}\n\n`;
        }
        if (platforms.includes("linkedin")) {
            message += `💼 LinkedIn:\n${generated.linkedin?.content || "N/A"}\n\n`;
        }
        if (platforms.includes("instagram")) {
            message += `📸 Instagram:\n${generated.instagram?.content || "N/A"}\n\n`;
        }
        if (platforms.includes("threads")) {
            message += `🧵 Threads:\n${generated.threads?.content || "N/A"}\n\n`;
        }

        message += "Confirm your action:";

        return bot.sendMessage(chatId, message, {
            reply_markup: {
                keyboard: [
                    ["Yes"],
                    ["Edit", "Cancel"]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    }

    // ===== CONFIRM =====
    if (state.step === "confirm") {
        if (text === "yes") {
            try {
                await bot.sendMessage(chatId, "🚀 Publishing...");

                const user = await userService.findOrCreateTelegramUser(msg.from);
                await postService.publishPost(user.id, state.data);

                await redis.del(`chat:${chatId}`);
                return bot.sendMessage(chatId, "✅ Post queued successfully!");
            } catch (err) {
                console.error("PUBLISH ERROR:", err);
                return bot.sendMessage(chatId, "❌ Failed to publish");
            }
        }

        if (text === "edit") {
            state.step = "idea";
            await setState(chatId, state);
            return bot.sendMessage(chatId, "✏️ Enter new idea");
        }

        if (text === "cancel") {
            await redis.del(`chat:${chatId}`);
            return bot.sendMessage(chatId, "❌ Cancelled");
        }
    }
};

// ================= STATUS =================
exports.handleStatus = async (bot, msg) => {
    const chatId = msg.chat.id;

    try {
        const user = await userService.findOrCreateTelegramUser(msg.from);
        const posts = await postService.getRecentPosts(user.id);

        if (!posts.length) {
            return bot.sendMessage(chatId, "No posts yet.");
        }

        let message = "📊 Last 5 posts:\n\n";

        posts.forEach((post, i) => {
            message += `${i + 1}. ${post.idea.slice(0, 40)}\n`;

            post.platform_posts.forEach((p) => {
                let icon = "⏳";
                if (p.status === "published") icon = "✅";
                if (p.status === "failed") icon = "❌";

                message += `   ${p.platform} → ${p.status} ${icon}\n`;
            });

            message += "\n";
        });

        return bot.sendMessage(chatId, message);
    } catch (err) {
        console.error(err);
        return bot.sendMessage(chatId, "❌ Failed to fetch status");
    }
};

// ================= ACCOUNTS =================
exports.handleAccounts = async (bot, msg) => {
    const chatId = msg.chat.id;

    try {
        const user = await userService.findOrCreateTelegramUser(msg.from);
        const accounts = await userService.getSocialAccounts(user.id);

        if (!accounts || accounts.length === 0) {
            return bot.sendMessage(
                chatId,
                "No accounts connected.\n\nUse /connect to add one."
            );
        }

        let message = "🔗 Connected accounts:\n\n";

        accounts.forEach((acc, index) => {
            message += `${index + 1}. ${acc.platform.toUpperCase()} (${acc.handle})\n`;
        });

        return bot.sendMessage(chatId, message);
    } catch (err) {
        console.error(err);
        return bot.sendMessage(chatId, "❌ Failed to fetch accounts");
    }
};

exports.handleConnect = async (bot, msg) => {
    const chatId = msg.chat.id;

    await redis.del(`chat:${chatId}`);
    await setState(chatId, { step: "connect_platform" });

    return bot.sendMessage(
        chatId,
        "🔗 Choose platform to connect:",
        {
            reply_markup: {
                keyboard: [
                    ["Twitter", "LinkedIn"],
                    ["Instagram", "Threads"]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        }
    );
};

exports.handleApiKey = async (bot, msg) => {
  const chatId = msg.chat.id;

  await redis.del(`chat:${chatId}`);
  await setState(chatId, { step: "api_key_type", data: {} });

  return bot.sendMessage(
    chatId,
    "🔑 Which API key do you want to add?",
    {
      reply_markup: {
        keyboard: [
          ["OpenAI"],
          ["Anthropic"]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    }
  );
};


// ================= CLEAR STATE =================
exports.clearState = async (chatId) => {
    await redis.del(`chat:${chatId}`);
};