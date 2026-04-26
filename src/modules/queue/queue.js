const { Queue } = require("bullmq");

const queue = new Queue("post-queue", {
  connection: {
    url: process.env.REDIS_URL, 
  },
});

module.exports = queue;