const express = require("express");
const router = express.Router();
const controller = require("./dashboard.controller");
const auth = require("../../middleware/auth");

router.get("/stats", auth, controller.getStats);

// Telegram bot stats (uses telegram_id instead of JWT user.id)
router.get("/stats-telegram", controller.getStatsTelegram);

module.exports = router;