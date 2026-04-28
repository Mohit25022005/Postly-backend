const prisma = require("../../config/db");
const queue = require("../queue/queue");

// ================= PUBLISH =================
exports.publishPost = async (userId, data) => {
  if (!data.platforms?.length) {
    throw new Error("No platforms provided");
  }

  const post = await prisma.post.create({
    data: {
      user_id: userId,
      idea: data.idea,
      post_type: data.post_type,
      tone: data.tone,
      language: data.language || "en",
      model_used: data.model_used || "unknown",
      status: "queued",
    },
  });

  let createdCount = 0;

  for (const platform of data.platforms) {
    const platformData = data.generated?.[platform];

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
        postId: post.id,
        platformPostId: platformPost.id,
        platform,
        content: platformPost.content,
        userId,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      }
    );

    createdCount++;
  }

  if (createdCount === 0) {
    throw new Error("No valid platform content to publish");
  }

  return post;
};

// ================= GET POSTS =================
exports.getRecentPosts = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  return prisma.post.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    include: {
      platform_posts: true,
    },
  });
};

// ================= GET SINGLE =================
exports.getPostById = async (userId, postId) => {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      user_id: userId,
    },
    include: {
      platform_posts: true,
    },
  });

  if (!post) throw new Error("Post not found");

  return post;
};

// ================= RETRY =================
exports.retryPost = async (userId, postId) => {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      user_id: userId,
    },
    include: {
      platform_posts: true,
    },
  });

  if (!post) throw new Error("Post not found");

  const failedPosts = post.platform_posts.filter(
    (p) => p.status === "failed"
  );

  if (failedPosts.length === 0) {
    return { retried: 0 };
  }

  for (const p of failedPosts) {
    await prisma.platformPost.update({
      where: { id: p.id },
      data: {
        status: "queued",
        error_message: null,
      },
    });

    await queue.add(
      "publish",
      {
        postId: postId,
        platformPostId: p.id,
        platform: p.platform,
        content: p.content,
        userId,
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

  return { retried: failedPosts.length };
};

// ================= SCHEDULE =================
exports.schedulePost = async (userId, data) => {
  if (!data.publish_at) {
    throw new Error("publish_at is required");
  }

  const publishAt = new Date(data.publish_at);
  const delay = publishAt.getTime() - Date.now();

  if (delay <= 0) {
    throw new Error("publish_at must be in the future");
  }

  const post = await prisma.post.create({
    data: {
      user_id: userId,
      idea: data.idea,
      post_type: data.post_type,
      tone: data.tone,
      language: data.language || "en",
      model_used: data.model_used || "unknown",
      publish_at: publishAt,
      status: "queued",
    },
  });

  let createdCount = 0;

  for (const platform of data.platforms) {
    const platformData = data.generated?.[platform];
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
        postId: post.id,
        platformPostId: platformPost.id,
        platform,
        content: platformPost.content,
        userId,
      },
      {
        delay,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      }
    );

    createdCount++;
  }

  if (createdCount === 0) {
    throw new Error("No valid platform content to schedule");
  }

  return post;
};

// ================= CANCEL =================
exports.cancelPost = async (userId, postId) => {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      user_id: userId,
    },
    include: {
      platform_posts: true,
    },
  });

  if (!post) throw new Error("Post not found");

  if (post.status !== "queued") {
    const err = new Error("Only queued posts can be cancelled");
    err.status = 409;
    throw err;
  }

  let cancelledCount = 0;

  for (const p of post.platform_posts) {

    await prisma.platformPost.update({
      where: { id: p.id },
      data: {
        status: "cancelled",
      },
    });

    cancelledCount++;
  }

  await prisma.post.update({
    where: { id: postId },
    data: { status: "cancelled" },
  });

  return { cancelled: cancelledCount };
};