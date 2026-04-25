const OpenAI = require("openai");
const Anthropic = require("@anthropic-ai/sdk");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const buildPrompt = ({ idea, post_type, tone, platforms }) => {
    return `
You are a social media content generator.

Idea: ${idea}
Post Type: ${post_type}
Tone: ${tone}

Generate content for: ${platforms.join(", ")}

Rules:
- Twitter: max 280 chars, 2-3 hashtags
- LinkedIn: 800-1300 chars, professional tone, 3-5 hashtags
- Instagram: caption + 10-15 hashtags, emoji friendly
- Threads: max 500 chars, conversational

Return JSON like:
{
  "twitter": "...",
  "linkedin": "...",
  "instagram": "...",
  "threads": "..."
}
`;
};

exports.generateContent = async (input) => {
    const prompt = buildPrompt(input);

    try {
        if (input.model === "openai") {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
            });

            return JSON.parse(response.choices[0].message.content);
        }

        if (input.model === "anthropic") {
            const response = await anthropic.messages.create({
                model: "claude-3-haiku-20240307",
                max_tokens: 1000,
                messages: [{ role: "user", content: prompt }],
            });

            const content = response.content[0].text;

            try {
                return JSON.parse(content);
            } catch {
                return {
                    twitter: content,
                    linkedin: content,
                };
            }
        }
    } catch (err) {
        console.error("AI ERROR:", err.message);

        //FALLBACK
        return {
            twitter: `🚀 ${input.idea} #AI #Tech`,
            linkedin: `${input.idea}\n\nThis is a powerful shift in the industry. What are your thoughts?\n\n#AI #Innovation #Startups`,
            instagram: `${input.idea} ✨🔥\n\n#AI #Tech #Innovation #Future #StartupLife`,
            threads: `${input.idea} – thoughts?`,
        };
    }
};