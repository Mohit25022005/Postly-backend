## 🚀 Live API: https://YOUR_APP.railway.app

# Postly Backend

Production Node.js backend for AI-assisted content generation, Telegram-driven publishing, and multi-platform post queues.

## Quick Start

```bash
git clone <repo-url>
cd postly-backend
cp .env.example .env
docker-compose up
```

## Environment Variables

| Key | Description | Required |
| --- | --- | --- |
| DATABASE_URL | PostgreSQL connection string | Yes |
| POSTGRES_PASSWORD | Docker Postgres password | Yes |
| REDIS_URL | Redis connection string | Yes |
| JWT_SECRET | JWT signing secret | Yes |
| ENCRYPTION_KEY | 32+ character encryption key | Yes |
| TELEGRAM_TOKEN | Telegram bot token from BotFather | Yes |
| BASE_URL | Public API URL for Telegram webhook | Production |
| TWITTER_API_KEY | Twitter app API key | Twitter publishing |
| TWITTER_API_SECRET | Twitter app API secret | Twitter publishing |
| OPENAI_API_KEY | Server fallback OpenAI key | Optional |
| ANTHROPIC_API_KEY | Server fallback Anthropic key | Optional |
| PORT | HTTP server port | Optional |
| CORS_ORIGIN | Allowed frontend origin | Optional |

## API Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | /api/auth/register | No | Create a user |
| POST | /api/auth/login | No | Login and receive access and refresh tokens |
| POST | /api/auth/refresh | No | Rotate refresh token |
| POST | /api/auth/logout | Yes | Revoke refresh token |
| GET | /api/auth/me | Yes | Return current JWT user |
| GET | /api/user/profile | Yes | Get profile |
| PUT | /api/user/profile | Yes | Update profile |
| POST | /api/user/social-accounts | Yes | Add social account credentials |
| GET | /api/user/social-accounts | Yes | List connected social accounts |
| DELETE | /api/user/social-accounts/:id | Yes | Delete owned social account |
| PUT | /api/user/ai-keys | Yes | Save encrypted AI provider keys |
| POST | /api/content/generate | Yes | Generate platform-specific content |
| POST | /api/posts/publish | Yes | Generate and enqueue platform publish jobs |
| POST | /api/posts/schedule | Yes | Schedule platform publish jobs |
| GET | /api/posts | Yes | List posts with pagination |
| GET | /api/posts/:id | Yes | Get one post |
| POST | /api/posts/:id/retry | Yes | Retry failed platform posts |
| DELETE | /api/posts/:id | Yes | Cancel queued post |
| GET | /api/dashboard/stats | Yes | Dashboard statistics |

## Telegram Bot Setup

1. Open BotFather in Telegram.
2. Run `/newbot` and follow the prompts.
3. Copy the token into `TELEGRAM_TOKEN`.
4. Set `BASE_URL` to the deployed HTTPS API URL.
5. In production, set the webhook:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_TOKEN/setWebhook?url=$BASE_URL/bot/webhook"
```

In development, the bot uses polling.

## Known Limitations

LinkedIn, Instagram, and Threads publishers are not implemented yet and are marked failed without retries. Twitter publishing requires valid Twitter app credentials plus user OAuth access token and secret. AI provider calls fall back to generated placeholder content if provider calls fail.
