// src/modules/queue/queue.js
const { Queue } = require("bullmq");
const redis = require("../../config/redis");

const queue = new Queue("publish", {
  connection: redis, 
});

module.exports = queue;