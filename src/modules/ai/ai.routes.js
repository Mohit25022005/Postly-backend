const express = require("express");
const router = express.Router();
const controller = require("./ai.controller");
const auth = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const { contentSchema } = require("../../validators/content.schema");

// All routes require authentication
router.post("/generate", auth, validate(contentSchema), controller.generate);

module.exports = router;
