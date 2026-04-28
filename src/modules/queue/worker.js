const { Worker } = require("bullmq");
const prisma = require("../../config/db");
const redis = require("../../config/redis");
const { decrypt } = require("../../utils/encryption");
const { publishToTwitter } = require("../../publishers/twitter.publisher");

const worker = new Worker(
  "publish-queue",
  async (job) => {
    const { platformPostId, platform, userId, content } = job.data;

    console.log("Processing:", platform);

    try {
      // ================= SET PROCESSING =================
      await prisma.platformPost.update({
        where: { id: platformPostId },
        data: {
          status: "processing",
          attempts: { increment: 1 },
        },
      });

      // ================= TWITTER POST =================
      if (platform === "twitter") {
        const account = await prisma.socialAccount.findFirst({
          where: {
            user_id: userId,
            platform: "twitter",
          },
        });

        if (!account) {
          throw new Error("No connected Twitter account found");
        }

        const accessToken = decrypt(account.access_token_enc);
        const accessSecret = decrypt(account.refresh_token_enc);

        await publishToTwitter(content, accessToken, accessSecret);
      } else {
        console.log(`Publisher not implemented: ${platform}`);
        await prisma.platformPost.update({
          where: { id: platformPostId },
          data: {
            status: "failed",
            error_message: "Publisher not implemented",
            attempts: 3,
          },
        });
        return;
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

      const maxAttempts = job.opts.attempts || 3;
      const nextAttempt = job.attemptsMade + 1;

      if (nextAttempt >= maxAttempts) {
        await prisma.platformPost.update({
          where: { id: platformPostId },
          data: {
            status: "failed",
            error_message: err.message,
          },
        });
      }

      throw err;
    }
  },
  {
    connection: redis,
  }
);

module.exports = worker;
