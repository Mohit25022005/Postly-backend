const aiService = require("./ai.service");
const prisma = require("../../config/db");
const { decrypt } = require("../../utils/encryption");

exports.generate = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.user_id;

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

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Failed to generate content",
    });
  }
};