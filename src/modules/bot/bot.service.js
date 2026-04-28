const redis = require("../../config/redis");
const userService = require("../user/user.service");
const postService = require("../post/post.service");
const aiService = require("../ai/ai.service");

const PLATFORMS = ["twitter", "linkedin", "instagram", "threads"];
const POST_TYPES = ["announcement", "thread", "story", "promotional", "educational", "opinion"];
const TONES = ["professional", "casual", "witty", "authoritative", "friendly"];
const MODELS = ["openai", "anthropic"];
const SESSION_TTL_SECONDS = 1800;

const sessionKey = (chatId) => `bot:session:${chatId}`;

const getState = async (chatId) => {
    const data = await redis.get(sessionKey(chatId));
    return data ? JSON.parse(data) : null;
};

const setState = async (chatId, state) => {
    await redis.set(sessionKey(chatId), JSON.stringify(state), "EX", SESSION_TTL_SECONDS);
};

const clearState = async (chatId) => {
    await redis.del(sessionKey(chatId));
};

const sendButtonWarning = (bot, chatId) => {
    return bot.sendMessage(chatId, "Please use the buttons to respond.");
};

const sendExpired = (bot, chatId) => {
    return bot.sendMessage(chatId, "Session expired. Send /post to start again.");
};

const postTypeKeyboard = () => ({
    inline_keyboard: POST_TYPES.map((type) => [
        { text: type[0].toUpperCase() + type.slice(1), callback_data: `type:${type}` },
    ]),
});

const platformKeyboard = (selected = []) => ({
    inline_keyboard: [
        ...PLATFORMS.map((platform) => [{
            text: `${selected.includes(platform) ? "✓ " : ""}${platform[0].toUpperCase() + platform.slice(1)}`,
            callback_data: `platform:${platform}`,
        }]),
        [{ text: "All", callback_data: "platform:all" }],
        [{ text: "Done", callback_data: "platform:done" }],
    ],
});

const toneKeyboard = () => ({
    inline_keyboard: TONES.map((tone) => [
        { text: tone[0].toUpperCase() + tone.slice(1), callback_data: `tone:${tone}` },
    ]),
});

const modelKeyboard = () => ({
    inline_keyboard: [
        [{ text: "GPT-4o", callback_data: "model:openai" }],
        [{ text: "Claude Sonnet", callback_data: "model:anthropic" }],
    ],
});

const confirmKeyboard = () => ({
    inline_keyboard: [
        [
            { text: "Yes ✅", callback_data: "confirm:yes" },
            { text: "Edit ✏️", callback_data: "confirm:edit" },
            { text: "Cancel ❌", callback_data: "confirm:cancel" },
        ],
    ],
});

const buildPreview = (state) => {
    let message = "";

    state.data.platforms.forEach((platform) => {
        message += `${platform.toUpperCase()}:\n${state.data.generated?.[platform]?.content || "N/A"}\n\n`;
    });

    return `${message}Confirm your action:`;
};

exports.startPostFlow = async (bot, msg) => {
    const chatId = msg.chat.id;

    await clearState(chatId);
    await setState(chatId, { step: "type", data: {} });

    return bot.sendMessage(chatId, "What type of post is this?", {
        reply_markup: postTypeKeyboard(),
    });
};

exports.handleCallback = async (bot, query) => {
    const chatId = query.message.chat.id;
    const [action, value] = query.data.split(":");
    const state = await getState(chatId);

    await bot.answerCallbackQuery(query.id);

    if (!state) {
        return sendExpired(bot, chatId);
    }

    if (state.step !== action) {
        return sendButtonWarning(bot, chatId);
    }

    if (action === "type") {
        if (!POST_TYPES.includes(value)) return sendButtonWarning(bot, chatId);

        state.data.post_type = value;
        state.step = "platform";
        state.data.platforms = [];
        await setState(chatId, state);

        return bot.sendMessage(chatId, "Which platforms?", {
            reply_markup: platformKeyboard(state.data.platforms),
        });
    }

    if (action === "platform") {
        if (value === "all") {
            state.data.platforms = [...PLATFORMS];
        } else if (value === "done") {
            if (!state.data.platforms?.length) {
                return bot.sendMessage(chatId, "Choose at least one platform.");
            }

            state.step = "tone";
            await setState(chatId, state);
            return bot.sendMessage(chatId, "Choose tone:", {
                reply_markup: toneKeyboard(),
            });
        } else if (PLATFORMS.includes(value)) {
            const selected = new Set(state.data.platforms || []);
            selected.has(value) ? selected.delete(value) : selected.add(value);
            state.data.platforms = [...selected];
        } else {
            return sendButtonWarning(bot, chatId);
        }

        await setState(chatId, state);
        return bot.editMessageReplyMarkup(platformKeyboard(state.data.platforms), {
            chat_id: chatId,
            message_id: query.message.message_id,
        });
    }

    if (action === "tone") {
        if (!TONES.includes(value)) return sendButtonWarning(bot, chatId);

        state.data.tone = value;
        state.step = "model";
        await setState(chatId, state);

        return bot.sendMessage(chatId, "Which AI model?", {
            reply_markup: modelKeyboard(),
        });
    }

    if (action === "model") {
        if (!MODELS.includes(value)) return sendButtonWarning(bot, chatId);

        state.data.model = value;
        state.step = "idea";
        await setState(chatId, state);

        return bot.sendMessage(chatId, "Tell me the idea (max 500 chars)");
    }

    if (action === "confirm") {
        if (value === "edit") {
            state.step = "idea";
            await setState(chatId, state);
            return bot.sendMessage(chatId, "Enter the revised idea (max 500 chars)");
        }

        if (value === "cancel") {
            await clearState(chatId);
            return bot.sendMessage(chatId, "Cancelled.");
        }

        if (value !== "yes") return sendButtonWarning(bot, chatId);

        try {
            const user = await userService.findOrCreateTelegramUser(query.from);
            await postService.publishPost(user.id, state.data);
            await clearState(chatId);

            const status = state.data.platforms
                .map((platform) => `${platform}: queued`)
                .join("\n");

            return bot.sendMessage(chatId, `Publish jobs queued:\n${status}`);
        } catch (err) {
            console.error("PUBLISH ERROR:", err.message);
            return bot.sendMessage(chatId, "Failed to publish.");
        }
    }

    return sendButtonWarning(bot, chatId);
};

exports.handleMessage = async (bot, msg) => {
    const chatId = msg.chat.id;
    const text = msg.text || "";
    const state = await getState(chatId);

    if (!state) return sendExpired(bot, chatId);

    if (["type", "platform", "tone", "model", "confirm"].includes(state.step)) {
        return sendButtonWarning(bot, chatId);
    }

    if (state.step === "connect_platform") {
        const platform = text.toLowerCase();

        if (!PLATFORMS.includes(platform)) {
            return bot.sendMessage(chatId, "Invalid platform. Choose Twitter, LinkedIn, Instagram, or Threads");
        }

        try {
            const user = await userService.findOrCreateTelegramUser(msg.from);

            if (platform === "twitter") {
                const baseUrl = process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL;
                const url = `${baseUrl}/api/auth/twitter/login?user_id=${user.id}`;

                await clearState(chatId);
                return bot.sendMessage(chatId, `Connect your Twitter account:\n\n${url}\n\nAfter connecting, come back and use /accounts`, {
                    reply_markup: { remove_keyboard: true },
                });
            }

            await clearState(chatId);
            return bot.sendMessage(chatId, "This platform is not integrated yet. Currently only Twitter is supported.", {
                reply_markup: { remove_keyboard: true },
            });
        } catch (err) {
            console.error("CONNECT ERROR:", err.message);
            return bot.sendMessage(chatId, "Failed to connect account");
        }
    }

    if (state.step === "api_key_type") {
        const keyType = text.toLowerCase();
        if (!MODELS.includes(keyType)) {
            return bot.sendMessage(chatId, "Choose OpenAI or Anthropic");
        }

        state.data.key_type = keyType;
        state.step = "api_key_value";
        await setState(chatId, state);

        return bot.sendMessage(chatId, `Paste your ${keyType.toUpperCase()} API key:`);
    }

    if (state.step === "api_key_value") {
        const user = await userService.findOrCreateTelegramUser(msg.from);

        try {
            const payload = state.data.key_type === "openai"
                ? { openai_key: text }
                : { anthropic_key: text };

            await userService.saveAIKeys(user.id, payload);
            await clearState(chatId);

            return bot.sendMessage(chatId, "API key saved successfully!");
        } catch (err) {
            console.error("API KEY ERROR:", err.message);
            return bot.sendMessage(chatId, "Failed to save key");
        }
    }

    if (state.step === "idea") {
        if (!text.trim()) {
            return bot.sendMessage(chatId, "Idea is required.");
        }

        if (text.length > 500) {
            return bot.sendMessage(chatId, "Idea is too long. Max 500 chars.");
        }

        try {
            const user = await userService.findOrCreateTelegramUser(msg.from);
            state.data.idea = text;
            state.data.language = state.data.language || "en";

            await bot.sendMessage(chatId, "Generating content...");
            const result = await aiService.generateContent(state.data, user.id);

            state.data.generated = result.generated;
            state.data.model_used = result.model_used;
            state.step = "confirm";
            await setState(chatId, state);

            return bot.sendMessage(chatId, buildPreview(state), {
                reply_markup: confirmKeyboard(),
            });
        } catch (err) {
            console.error("AI ERROR:", err.message);
            return bot.sendMessage(chatId, "Failed to generate content.");
        }
    }

    return sendButtonWarning(bot, chatId);
};

exports.handleStatus = async (bot, msg) => {
    const chatId = msg.chat.id;

    try {
        const user = await userService.findOrCreateTelegramUser(msg.from);
        const posts = await postService.getRecentPosts(user.id, 1, 5);

        if (!posts.length) {
            return bot.sendMessage(chatId, "No posts yet.");
        }

        let message = "Last 5 posts:\n\n";

        posts.forEach((post, index) => {
            message += `${index + 1}. ${post.idea.slice(0, 40)}\n`;
            post.platform_posts.forEach((platformPost) => {
                message += `   ${platformPost.platform}: ${platformPost.status}\n`;
            });
            message += "\n";
        });

        return bot.sendMessage(chatId, message);
    } catch (err) {
        console.error("STATUS ERROR:", err.message);
        return bot.sendMessage(chatId, "Failed to fetch status");
    }
};

exports.handleAccounts = async (bot, msg) => {
    const chatId = msg.chat.id;

    try {
        const user = await userService.findOrCreateTelegramUser(msg.from);
        const accounts = await userService.getSocialAccounts(user.id);

        if (!accounts?.length) {
            return bot.sendMessage(chatId, "No accounts connected.\n\nUse /connect to add one.");
        }

        const message = accounts
            .map((account, index) => `${index + 1}. ${account.platform.toUpperCase()} (${account.handle || "connected"})`)
            .join("\n");

        return bot.sendMessage(chatId, `Connected accounts:\n\n${message}`);
    } catch (err) {
        console.error("ACCOUNTS ERROR:", err.message);
        return bot.sendMessage(chatId, "Failed to fetch accounts");
    }
};

exports.handleConnect = async (bot, msg) => {
    const chatId = msg.chat.id;

    await clearState(chatId);
    await setState(chatId, { step: "connect_platform", data: {} });

    return bot.sendMessage(chatId, "Choose platform to connect:", {
        reply_markup: {
            keyboard: [["Twitter"], ["LinkedIn", "Instagram", "Threads"]],
            resize_keyboard: true,
            one_time_keyboard: true,
        },
    });
};

exports.handleApiKey = async (bot, msg) => {
    const chatId = msg.chat.id;

    await clearState(chatId);
    await setState(chatId, { step: "api_key_type", data: {} });

    return bot.sendMessage(chatId, "Which API key do you want to add?", {
        reply_markup: {
            keyboard: [["OpenAI"], ["Anthropic"]],
            resize_keyboard: true,
            one_time_keyboard: true,
        },
    });
};

exports.clearState = clearState;
