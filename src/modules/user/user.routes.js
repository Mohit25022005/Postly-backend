// user.routes.js
const express = require("express");
const router = express.Router();
const controller = require("./user.controller");
const auth = require("../../middleware/auth");

router.get("/profile", auth, controller.getProfile);
router.put("/profile", auth, controller.updateProfile);

router.post("/social-accounts", auth, controller.addSocial);
router.get("/social-accounts", auth, controller.getSocial);
router.delete("/social-accounts/:id", auth, controller.deleteSocial);

router.put("/ai-keys", auth, controller.saveAIKeys);

module.exports = router;