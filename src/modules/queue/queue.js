const { Queue } = require("bullmq");
const connection = require("../../config/redis"); 

const queue = new Queue("post-queue", {
  connection,
});

module.exports = queue;