const { Worker } = require("bullmq");
const prisma = require("../../config/db");

const worker = new Worker(
  "post-queue",
  async (job) => {
    const { platformPostId, platform, content } = job.data;

    console.log("Processing:", platform, content);

    try {
      //  mark as processing
      await prisma.platformPost.update({
        where: { id: platformPostId },
        data: { status: "processing" },
      });

      // simulate API call
      await new Promise((res) => setTimeout(res, 2000));

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
    connection: {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      ...(process.env.REDIS_PASSWORD && {
        password: process.env.REDIS_PASSWORD,
      }),
    },
  }
);

module.exports = worker;