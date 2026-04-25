const express = require("express");
const router = express.Router();
const controller = require("./ai.controller");

router.post("/generate", controller.generate);

module.exports = router;