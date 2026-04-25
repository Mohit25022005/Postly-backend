const { Worker } = require("bullmq");
const prisma = require("../../config/db");

const worker = new Worker(
  "post-queue",
  async (job) => {
    const { platformPostId, platform, content } = job.data;

    console.log("Processing:", platform, content);

    try {
      //  Simulate API call (replace later with real)
      await new Promise((res) => setTimeout(res, 2000));

      await prisma.platformPost.update({
        where: { id: platformPostId },
        data: {
          status: "published",
          published_at: new Date(),
        },
      });

      console.log("Published:", platform);
    } catch (err) {
      await prisma.platformPost.update({
        where: { id: platformPostId },
        data: {
          status: "failed",
          error_message: err.message,
          attempts: { increment: 1 },
        },
      });

      throw err;
    }
  },
  {
    connection: { host: "127.0.0.1", port: 6379 },
  }
);

module.exports = worker;