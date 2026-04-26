const express = require("express");
const router = express.Router();
const { TwitterApi } = require("twitter-api-v2");
const userService = require("../user/user.service");
const redis = require("../../config/redis");

// ================= LOGIN =================
// Redirect user to Twitter OAuth
router.get("/login", async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).send("❌ Missing user_id");
    }

    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });

    const { url, codeVerifier, state } =
      client.generateOAuth2AuthLink(
        process.env.TWITTER_REDIRECT_URI,
        {
          scope: [
            "tweet.read",
            "tweet.write",
            "users.read",
            "offline.access",
          ],
        }
      );

    // 🔥 Store OAuth session in Redis (expires in 10 min)
    await redis.set(
      `twitter_oauth:${state}`,
      JSON.stringify({ codeVerifier, user_id }),
      "EX",
      600
    );

    return res.redirect(url);
  } catch (err) {
    console.error("TWITTER LOGIN ERROR:", err.message);
    return res.status(500).send("❌ Failed to initiate Twitter login");
  }
});

// ================= CALLBACK =================
// Handle Twitter redirect
router.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).send("❌ Missing code or state");
    }

    // 🔥 Retrieve OAuth session from Redis
    const data = await redis.get(`twitter_oauth:${state}`);

    if (!data) {
      return res.status(400).send("❌ OAuth session expired or invalid");
    }

    const { codeVerifier, user_id } = JSON.parse(data);

    // Clean up Redis
    await redis.del(`twitter_oauth:${state}`);

    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });

    const {
      client: loggedClient,
      accessToken,
      refreshToken,
    } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: process.env.TWITTER_REDIRECT_URI,
    });

    // 🔥 Get user info
    const me = await loggedClient.v2.me();

    // 🔥 Save account in DB
    await userService.addSocialAccount(user_id, {
      platform: "twitter",
      access_token: accessToken,
      refresh_token: refreshToken,
      handle: `@${me.data.username}`,
    });

    return res.send(
      "✅ Twitter connected successfully! You can go back to Telegram."
    );
  } catch (err) {
    console.error("TWITTER CALLBACK ERROR:", err.message);
    return res.status(500).send("❌ Twitter connection failed");
  }
});

module.exports = router;