const prisma = require("../../config/db");

exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // total posts
    const totalPosts = await prisma.post.count({
      where: { user_id: userId },
    });

    // total platform posts
    const totalPlatformPosts = await prisma.platformPost.count({
      where: {
        post: { user_id: userId },
      },
    });

    // successful posts
    const successful = await prisma.platformPost.count({
      where: {
        status: "published",
        post: { user_id: userId },
      },
    });

    const successRate =
      totalPlatformPosts === 0
        ? 0
        : ((successful / totalPlatformPosts) * 100).toFixed(2);

    // posts per platform
    const perPlatform = await prisma.platformPost.groupBy({
      by: ["platform"],
      where: {
        post: { user_id: userId },
      },
      _count: true,
    });

    return res.json({
      data: {
        total_posts: totalPosts,
        success_rate: Number(successRate),
        posts_per_platform: perPlatform,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};