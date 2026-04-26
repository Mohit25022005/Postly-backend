require("dotenv").config();

const express = require("express");
const app = require("./app");

const bot = require("./modules/bot/bot"); 
require("./modules/queue/worker");

const PORT = process.env.PORT || 5000;

// ================= WEBHOOK SETUP =================
if (process.env.NODE_ENV === "production") {
  const url = process.env.RENDER_EXTERNAL_URL;

  if (!url) {
    console.error("❌ RENDER_EXTERNAL_URL not set");
  } else {
    const webhookUrl = `${url}/bot${process.env.TELEGRAM_TOKEN}`;

    bot.setWebHook(webhookUrl)
      .then(() => console.log("✅ Webhook set:", webhookUrl))
      .catch((err) => console.error("❌ Webhook error:", err.message));

    app.post(`/bot${process.env.TELEGRAM_TOKEN}`, (req, res) => {
      bot.processUpdate(req.body);
      res.sendStatus(200);
    });
  }
}

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});