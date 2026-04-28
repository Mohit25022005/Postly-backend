const OpenAI = require("openai");
const Anthropic = require("@anthropic-ai/sdk");

// ================= CLIENT FACTORY =================
const getOpenAI = (key) =>
  new OpenAI({
    apiKey: key || process.env.OPENAI_API_KEY,
  });

const getAnthropic = (key) =>
  new Anthropic({
    apiKey: key || process.env.ANTHROPIC_API_KEY,
  });

// ================= PROMPT =================
const buildPrompt = ({ idea, post_type, tone, platforms, language = "en" }) => {
  const languageMap = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    pt: "Portuguese",
    it: "Italian",
  };
  const langName = languageMap[language] || "English";

  return `
Generate STRICT social media content in ${langName}.

INPUT:
- Idea: ${idea}
- Post Type: ${post_type}
- Tone: ${tone}
- Language: ${langName}
- Platforms: ${platforms.join(", ")}

RULES (STRICT):
- Twitter: max 280 chars, 2–3 hashtags, punchy opener
- LinkedIn: 800–1300 chars, ALWAYS professional tone, 3–5 hashtags
- Instagram: caption + 10–15 hashtags, emoji-friendly
- Threads: max 500 chars, conversational

OUTPUT STRICT JSON:
{
  "twitter": { "content": "...", "hashtags": ["#tag"] },
  "linkedin": { "content": "...", "hashtags": ["#tag"] },
  "instagram": { "content": "...", "hashtags": ["#tag"] },
  "threads": { "content": "..." }
}

NO extra text. JSON only.
`;
};

// ================= HELPERS =================
const extractHashtags = (text) => {
  return text.match(/#\w+/g) || [];
};

const enforceRules = (data) => {
  // Twitter
  if (data.twitter) {
    data.twitter.content = data.twitter.content.slice(0, 280);
    let tags = extractHashtags(data.twitter.content);
    data.twitter.hashtags = tags.slice(0, 3);
  }

  // Threads
  if (data.threads) {
    data.threads.content = data.threads.content.slice(0, 500);
  }

  // LinkedIn
  if (data.linkedin) {
    let content = data.linkedin.content;

    if (content.length < 800) {
      content = content + "\n\nThis is an important shift in the industry.";
    }

    data.linkedin.content = content.slice(0, 1300);
    data.linkedin.hashtags = extractHashtags(content).slice(0, 5);
  }

  // Instagram
  if (data.instagram) {
    let tags = extractHashtags(data.instagram.content);

    // ensure 10–15 hashtags
    while (tags.length < 10) {
      tags.push("#AI");
    }

    data.instagram.hashtags = tags.slice(0, 15);
  }

  return data;
};

const addMetadata = (data) => {
  const result = {};

  for (const key in data) {
    const content = data[key]?.content || "";

    result[key] = {
      content,
      char_count: content.length,
      hashtags: data[key]?.hashtags || extractHashtags(content),
    };
  }

  return result;
};

// ================= MAIN =================
exports.generateContent = async (input, userKeys = {}) => {
  const prompt = buildPrompt(input);

  try {
    let raw;
    let model_used = "";
    let tokens_used = 0;
    if (!["openai", "anthropic"].includes(input.model)) {
      throw new Error("Invalid model. Use 'openai' or 'anthropic'");
    }
    // ===== OPENAI =====
    if (input.model === "openai") {
      const openai = getOpenAI(userKeys.openai_key);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You strictly follow platform constraints and output JSON only.",
          },
          { role: "user", content: prompt },
        ],
      });

      raw = response.choices[0].message.content;
      model_used = "gpt-4o";
      tokens_used = response.usage?.total_tokens || 0;
    }

    // ===== ANTHROPIC =====
    if (input.model === "anthropic") {
      const anthropic = getAnthropic(userKeys.anthropic_key);

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: "You strictly follow platform constraints and output JSON only.",
        messages: [{ role: "user", content: prompt }],
      });

      raw = response.content[0].text;
      model_used = "claude-sonnet-4-20250514";
      tokens_used = response.usage?.input_tokens + response.usage?.output_tokens || 0;
    }

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Invalid JSON from AI");
    }

    parsed = enforceRules(parsed);

    const filtered = {};
    const normalizedPlatforms = input.platforms.map(p => p.toLowerCase());

    normalizedPlatforms.forEach((p) => {
      if (parsed[p]) filtered[p] = parsed[p];
    });
    const generated = addMetadata(filtered);

    return {
      generated,
      model_used,
      tokens_used,
    };
  } catch (err) {
    console.error("AI ERROR:", err.message);

    // ===== FALLBACK =====
    const fallback = {
      twitter: {
        content: `🚀 ${input.idea} #AI #Tech`,
      },
      linkedin: {
        content: `${input.idea}\n\nThis is a major shift in the industry.\n\n#AI #Innovation`,
      },
      instagram: {
        content: `${input.idea} ✨🔥\n\n#AI #Tech #Innovation`,
      },
      threads: {
        content: `${input.idea} – thoughts?`,
      },
    };

    const filtered = {};
    const normalizedPlatforms = input.platforms.map(p => p.toLowerCase());

    normalizedPlatforms.forEach((p) => {
      if (fallback[p]) filtered[p] = fallback[p];
    });


    return {
      generated: addMetadata(filtered),
      model_used: "fallback",
      tokens_used: 0,
    };
  }
};