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

    // failed posts
    const failedPosts = await prisma.platformPost.count({
      where: {
        status: "failed",
        post: { user_id: userId },
      },
    });

    const successRate =
      totalPlatformPosts === 0
        ? 0
        : ((successful / totalPlatformPosts) * 100).toFixed(2);

    const [twitter, linkedin, instagram, threads] = await Promise.all([
      prisma.platformPost.count({ where: { platform: "twitter", post: { user_id: userId } } }),
      prisma.platformPost.count({ where: { platform: "linkedin", post: { user_id: userId } } }),
      prisma.platformPost.count({ where: { platform: "instagram", post: { user_id: userId } } }),
      prisma.platformPost.count({ where: { platform: "threads", post: { user_id: userId } } }),
    ]);

    const postsPerPlatform = {
      twitter,
      linkedin,
      instagram,
      threads,
    };

    // posts this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const postsThisWeek = await prisma.post.count({
      where: {
        user_id: userId,
        created_at: { gte: weekAgo },
      },
    });

    return res.json({
      data: {
        total_posts: totalPosts,
        success_rate: Number(successRate),
        posts_per_platform: postsPerPlatform,
        posts_this_week: postsThisWeek,
        failed_posts: failedPosts,
      },
      meta: null,
      error: null,
    });
  } catch (err) {
    console.error(`[getStats] ${err.message}`);
    res.status(500).json({
      data: null,
      meta: null,
      error: { message: err.message, code: "INTERNAL_ERROR" },
    });
  }
};
