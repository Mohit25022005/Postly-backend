require("dotenv").config();

const express = require("express");
const app = require("./app");

const bot = require("./modules/bot/bot"); 
require("./modules/queue/worker");

const PORT = process.env.PORT || 5000;

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

bot.start(app).catch((err) => {
  console.error("Bot startup error:", err.message);
});
