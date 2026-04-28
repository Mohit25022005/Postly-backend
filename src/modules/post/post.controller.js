const service = require("./post.service");
const prisma = require("../../config/db");
const aiService = require("../ai/ai.service");

exports.publish = async (req, res) => {
  try {
    const generated = await aiService.generateContent(req.body);
    const post = await service.publishPost(req.user.id, {
      ...req.body,
      generated: generated.generated,
      model_used: generated.model_used,
    });
    res.json({ data: post, meta: null, error: null });
  } catch (err) {
    console.error(`[publish] ${err.message}`);
    res.status(500).json({ data: null, meta: null, error: { message: err.message } });
  }
};

exports.getAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const { status, platform, from, to } = req.query;
    const skip = (page - 1) * limit;

    const where = { user_id: userId };

    if (status || platform) {
      where.platform_posts = {
        some: {
          ...(status && { status }),
          ...(platform && { platform }),
        },
      };
    }

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

    res.json({
      data: posts,
      meta: { total, page, limit },
      error: null,
    });
  } catch (err) {
    console.error(`[getAll] ${err.message}`);
    res.status(500).json({ data: null, meta: null, error: { message: err.message } });
  }
};

exports.getOne = async (req, res) => {
  try {
    const post = await service.getPostById(req.user.id, req.params.id);
    res.json({ data: post, meta: null, error: null });
  } catch (err) {
    console.error(`[getOne] ${err.message}`);
    res.status(500).json({ data: null, meta: null, error: { message: err.message } });
  }
};

exports.retry = async (req, res) => {
  try {
    const result = await service.retryPost(req.user.id, req.params.id);
    res.json({ data: result, meta: null, error: null });
  } catch (err) {
    console.error(`[retry] ${err.message}`);
    res.status(500).json({ data: null, meta: null, error: { message: err.message } });
  }
};

exports.schedule = async (req, res) => {
  try {
    const post = await service.schedulePost(req.user.id, req.body);
    res.json({ data: post, meta: null, error: null });
  } catch (err) {
    console.error(`[schedule] ${err.message}`);
    res.status(500).json({ data: null, meta: null, error: { message: err.message } });
  }
};

exports.cancel = async (req, res) => {
  try {
    const result = await service.cancelPost(req.user.id, req.params.id);
    res.json({ data: result, meta: null, error: null });
  } catch (err) {
    console.error(`[cancel] ${err.message}`);
    res.status(err.status || 500).json({ data: null, meta: null, error: { message: err.message } });
  }
};
