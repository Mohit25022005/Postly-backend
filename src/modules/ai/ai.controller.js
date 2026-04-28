const aiService = require("./ai.service");
const prisma = require("../../config/db");
const { decrypt } = require("../../utils/encryption");

exports.generate = async (req, res) => {
  try {
    // Validate required fields
    const { idea, post_type, platforms, tone, model } = req.body;
    
    if (!idea || idea.length < 3) {
      return res.status(400).json({
        data: null,
        meta: null,
        error: { message: "Idea is required (min 3 chars)", code: "VALIDATION_ERROR" }
      });
    }
    
    if (!post_type) {
      return res.status(400).json({
        data: null,
        meta: null,
        error: { message: "post_type is required", code: "VALIDATION_ERROR" }
      });
    }
    
    if (!platforms || !platforms.length) {
      return res.status(400).json({
        data: null,
        meta: null,
        error: { message: "platforms array is required", code: "VALIDATION_ERROR" }
      });
    }

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
