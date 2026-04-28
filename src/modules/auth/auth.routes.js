const express = require("express");
const router = express.Router();
const controller = require("./auth.controller");
const auth = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const { registerSchema } = require("../../validators/auth.schema");

router.post("/register", validate(registerSchema), controller.register);
router.post("/login", controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", auth, controller.logout);
router.get("/me", auth, controller.me);

module.exports = router;
