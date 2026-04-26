const express = require("express");
const router = express.Router();
const service = require("./post.service");
const auth = require("../../middleware/auth");

// ================= PUBLISH =================
router.post("/publish", auth, async (req, res) => {
  try {
    const post = await service.publishPost(req.user.id, req.body);
    res.json({ data: post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= GET ALL =================
router.get("/", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const posts = await service.getRecentPosts(req.user.id, page, limit);
    res.json({ data: posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= GET ONE =================
router.get("/:id", auth, async (req, res) => {
  try {
    const post = await service.getPostById(req.user.id, req.params.id);
    res.json({ data: post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= RETRY =================
router.post("/:id/retry", auth, async (req, res) => {
  try {
    const result = await service.retryPost(req.user.id, req.params.id);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= SCHEDULE =================
router.post("/schedule", auth, async (req, res) => {
  try {
    const post = await service.schedulePost(req.user.id, req.body);
    res.json({ data: post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= DELETE (CANCEL) =================
router.delete("/:id", auth, async (req, res) => {
  try {
    const result = await service.cancelPost(req.user.id, req.params.id);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;