const { z } = require("zod");

const platforms = ["twitter", "linkedin", "instagram", "threads"];
const postTypes = ["announcement", "thread", "story", "promotional", "educational", "opinion"];
const tones = ["professional", "casual", "witty", "authoritative", "friendly"];
const models = ["openai", "anthropic"];

const contentSchema = z.object({
  idea: z.string().min(1).max(500),
  platforms: z.array(z.enum(platforms)).min(1),
  post_type: z.enum(postTypes),
  tone: z.enum(tones),
  model: z.enum(models),
  language: z.string().default("en"),
});

module.exports = { contentSchema };
