const express = require("express");
const router = express.Router();
const service = require("./post.service");
const auth = require("../../middleware/auth");

router.post("/publish", auth, async (req, res) => {
  try {
    const post = await service.publishPost(req.user.id, req.body);
    res.json({ data: post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;