const { Worker } = require("bullmq");
const prisma = require("../../config/db");
const redis = require("../../config/redis");
const { TwitterApi } = require("twitter-api-v2");
const { decrypt } = require("../../utils/encryption");

const worker = new Worker(
  "post-queue",
  async (job) => {
    const { platformPostId, platform, content } = job.data;

    console.log("Processing:", platform, content);

    try {
      // ================= SET PROCESSING =================
      await prisma.platformPost.update({
        where: { id: platformPostId },
        data: { status: "processing" },
      });

      // ================= FETCH PLATFORM POST =================
      const platformPost = await prisma.platformPost.findUnique({
        where: { id: platformPostId },
        include: {
          post: {
            include: {
              user: true,
            },
          },
        },
      });

      // ================= FETCH USER ACCOUNT =================
      const account = await prisma.socialAccount.findFirst({
        where: {
          user_id: platformPost.post.user_id,
          platform: platform,
        },
      });

      if (!account) {
        throw new Error("No connected account found");
      }

      // ================= TWITTER POST =================
      if (platform === "twitter") {
        const accessToken = decrypt(account.access_token_enc);

        const client = new TwitterApi(accessToken);

        await client.v2.tweet(content);
      }

      // ================= SUCCESS =================
      await prisma.platformPost.update({
        where: { id: platformPostId },
        data: {
          status: "published",
          published_at: new Date(),
          error_message: null,
        },
      });

      console.log("Published:", platform);
    } catch (err) {
      console.error("PUBLISH ERROR:", err.message);

      await prisma.platformPost.update({
        where: { id: platformPostId },
        data: {
          status: "failed",
          error_message: err.message,
          attempts: job.attemptsMade + 1,
        },
      });

      throw err;
    }
  },
  {
    connection: redis,
  }
);

module.exports = worker;