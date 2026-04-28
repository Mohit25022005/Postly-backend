const aiService = require("./ai.service");
const prisma = require("../../config/db");
const { decrypt } = require("../../utils/encryption");

exports.generate = async (req, res) => {
  try {
    const userId = req.user.id;

    let userKeys = {};

    if (userId) {
      const keys = await prisma.aIKey.findUnique({
        where: { user_id: userId },
      });

      if (keys) {
        userKeys = {
          openai_key: keys.openai_key_enc
            ? decrypt(keys.openai_key_enc)
            : null,
          anthropic_key: keys.anthropic_key_enc
            ? decrypt(keys.anthropic_key_enc)
            : null,
        };
      }
    }

    const result = await aiService.generateContent(
      req.body,
      userKeys
    );

    return res.json({ data: result, meta: null, error: null });
  } catch (err) {
    console.error(`[generate] ${err.message}`);
    
    // Return 502 for AI provider failures
    if (err.message.includes("API") || err.message.includes("rate limit") || err.message.includes("timeout")) {
      return res.status(502).json({
        data: null,
        meta: null,
        error: { message: "AI provider unavailable", code: "AI_PROVIDER_ERROR" },
      });
    }
    
    return res.status(500).json({
      data: null,
      meta: null,
      error: { message: "Failed to generate content", code: "INTERNAL_ERROR" },
    });
  }
};
