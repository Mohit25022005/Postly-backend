const express = require("express");
const router = express.Router();
const service = require("./post.service");
const auth = require("../../middleware/auth");
const prisma = require("../../config/db");

// ================= PUBLISH =================
router.post("/publish", auth, async (req, res) => {
  try {
    const post = await service.publishPost(req.user.id, req.body);

    return res.json({
      data: post,
      meta: null,
      error: null,
    });
  } catch (err) {
    return res.status(500).json({
      data: null,
      meta: null,
      error: err.message,
    });
  }
});

// ================= GET ALL (WITH FILTER + PAGINATION) =================
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const { status, platform, from, to } = req.query;

    const skip = (page - 1) * limit;

    const where = {
      user_id: userId,
    };

    if (status || platform) {
      where.platform_posts = {
        some: {
          ...(status && { status }),
          ...(platform && { platform }),
        },
      };
    }

    // date range
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at.gte = new Date(from);
      if (to) where.created_at.lte = new Date(to);
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: { platform_posts: true },
      }),
      prisma.post.count({ where }),
    ]);

    return res.json({
      data: posts,
      meta: {
        total,
        page,
        limit,
      },
      error: null,
    });
  } catch (err) {
    return res.status(500).json({
      data: null,
      meta: null,
      error: err.message,
    });
  }
});

// ================= GET ONE =================
router.get("/:id", auth, async (req, res) => {
  try {
    const post = await service.getPostById(req.user.id, req.params.id);

    return res.json({
      data: post,
      meta: null,
      error: null,
    });
  } catch (err) {
    return res.status(500).json({
      data: null,
      meta: null,
      error: err.message,
    });
  }
});

// ================= RETRY =================
router.post("/:id/retry", auth, async (req, res) => {
  try {
    const result = await service.retryPost(req.user.id, req.params.id);

    return res.json({
      data: result,
      meta: null,
      error: null,
    });
  } catch (err) {
    return res.status(500).json({
      data: null,
      meta: null,
      error: err.message,
    });
  }
});

// ================= SCHEDULE =================
router.post("/schedule", auth, async (req, res) => {
  try {
    const post = await service.schedulePost(req.user.id, req.body);

    return res.json({
      data: post,
      meta: null,
      error: null,
    });
  } catch (err) {
    return res.status(500).json({
      data: null,
      meta: null,
      error: err.message,
    });
  }
});

// ================= DELETE (CANCEL) =================
router.delete("/:id", auth, async (req, res) => {
  try {
    const result = await service.cancelPost(req.user.id, req.params.id);

    return res.json({
      data: result,
      meta: null,
      error: null,
    });
  } catch (err) {
    return res.status(500).json({
      data: null,
      meta: null,
      error: err.message,
    });
  }
});

module.exports = router;