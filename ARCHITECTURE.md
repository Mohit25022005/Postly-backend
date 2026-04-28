# Postly Architecture

## Data Flow

```text
User -> Telegram Bot -> Express API -> AI Engine (OpenAI/Anthropic)
                                  -> BullMQ Queue -> Platform Publishers
                                  -> PostgreSQL
                          Redis <- (sessions + queue backing)
```

## Redis Conversation State

Telegram conversation state is stored at `bot:session:{chatId}` with a 1800 second TTL. Each step writes the selected post type, platforms, tone, model, idea, and generated preview into the same session payload. If the key is missing when a user replies, the bot treats the flow as expired and replies: `Session expired. Send /post to start again.`

Redis also backs BullMQ, which stores publish jobs and retry metadata for each platform-specific publish attempt.

## Schema Decisions

Refresh tokens live in a separate `RefreshToken` table so tokens can be rotated, revoked, expired, and audited independently without adding mutable token fields to `User`. Only token hashes are stored.

`SocialAccount` uses `@@unique([user_id, platform])` so each user has one active account per platform. This avoids ambiguous publisher credentials and makes account upserts predictable.

## Partial Failure Handling

Each platform creates its own BullMQ job with `{ postId, platformPostId, platform, userId, content }`. If Twitter fails but LinkedIn succeeds, Twitter retries independently while LinkedIn remains published. The aggregate post can be represented as `partial` when at least one platform post is published and at least one platform post is failed.

## Indexing Strategy

`User.email` is unique and indexed for login lookups. `Post` indexes `[user_id, status]` for dashboard and listing filters. `PlatformPost` indexes `post_id` for loading platform statuses with a post, and platform counts filter through the related `Post.user_id` to keep dashboard stats user-scoped.
