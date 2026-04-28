const { TwitterApi } = require("twitter-api-v2");

async function publishToTwitter(content, accessToken, accessSecret) {
  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken,
    accessSecret,
  });

  const tweet = await client.v2.tweet(content);
  return { tweetId: tweet.data.id };
}

module.exports = { publishToTwitter };
