const express = require("express");
const router = express.Router();
const controller = require("./dashboard.controller");
const auth = require("../../middleware/auth");

router.get("/stats", auth, controller.getStats);

module.exports = router;