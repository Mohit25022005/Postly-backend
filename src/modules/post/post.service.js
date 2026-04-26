const prisma = require("../../config/db");
const queue = require("../queue/queue");

exports.publishPost = async (userId, data) => {
    // 1. Create main post
    const post = await prisma.post.create({
        data: {
            user_id: userId,
            idea: data.idea,
            post_type: data.post_type,
            tone: data.tone,
            language: data.language || "en",
            status: "queued",
        },
    });

    // 2. Create platform posts + queue jobs
    for (const platform of data.platforms) {
        const platformData = data.generated?.[platform];

        // 🚫 Skip if no content
        if (!platformData?.content) continue;

        const platformPost = await prisma.platformPost.create({
            data: {
                post_id: post.id,
                platform,
                content: platformData.content,
                status: "queued",
            },
        });

        await queue.add(
            "publish",
            {
                platformPostId: platformPost.id,
                platform,
                content: platformPost.content,
            },
            {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 1000,
                },
            }
        );
    }

    return post;
};

exports.getRecentPosts = async (userId) => {
    return prisma.post.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        take: 5,
        include: {
            platform_posts: true,
        },
    });
};