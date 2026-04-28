# AI Usage Log — Postly

## Tools Used
- GitHub Copilot (VS Code) — primary development assistant  
- OpenAI ChatGPT (GPT-4o) — audit and bug fixing
- Anthropic Claude — architecture review

## Usage by Section

### Auth System
Tool: Copilot
Used for: JWT middleware scaffolding, bcrypt integration
Validated: Refresh token rotation logic — rewrote DB lookup manually
Changed: Added token_hash comparison instead of plain token storage

### Encryption
Tool: Copilot  
Used for: AES-256-GCM boilerplate
Validated: IV randomness, auth tag verification, legacy CBC fallback
Changed: Added null guard for empty string encryption

### Telegram Bot
Tool: GPT-4o
Used for: Multi-step conversation state machine structure
Validated: Redis TTL handling, session expiry edge cases
Changed: Fixed inline keyboard format, removed localhost HTTP call

### AI Engine
Tool: Copilot
Used for: OpenAI and Anthropic SDK integration
Validated: Model names, token counting, platform prompt constraints
Changed: Added language injection, graceful 502 on API failure

### Queue & Publishing
Tool: GPT-4o
Used for: BullMQ worker setup, retry configuration
Validated: Per-platform job separation, exponential backoff math
Changed: Fixed queue name mismatch, added platformPostId to job payload

## What I Own
I made the final implementation decisions around keeping publisher work isolated per platform, preserving the existing Express module layout, and using small validation middleware instead of rewriting controllers. I also chose to keep unsupported publishers explicit and non-retrying so production failures are visible without wasting queue attempts.
