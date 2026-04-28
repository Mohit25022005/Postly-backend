const express = require("express");
const router = express.Router();
const controller = require("./post.controller");
const auth = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const { contentSchema } = require("../../validators/content.schema");

router.post("/publish", auth, validate(contentSchema), controller.publish);
router.get("/", auth, controller.getAll);
router.get("/:id", auth, controller.getOne);
router.post("/:id/retry", auth, controller.retry);
router.post("/schedule", auth, controller.schedule);
router.delete("/:id", auth, controller.cancel);

module.exports = router;
