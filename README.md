# News-to-Thread Agent (MVP)

Turn a news or article URL (or pasted text) into an X (Twitter) thread: 7–10 tweets with a hook and CTA. English-first, minimal UI, one happy path + graceful fallbacks.

## Tech stack

- **Next.js** (App Router) + TypeScript
- **TailwindCSS** + **shadcn/ui** (Radix)
- **Zod** for validation
- **OpenAI** Node SDK (server-side only)
- **jsdom** + **@mozilla/readability** for article extraction
- **localStorage** for last 10 generations (no auth, no DB)

## Setup

1. Clone and install:

   ```bash
   yarn install
   ```

2. Environment variables: copy `.env.example` to `.env.local` and fill in values. Required and optional vars:

   - `OPENAI_API_KEY` (required): Your OpenAI API key. Never exposed to the client.
   - `OPENAI_MODEL` (optional): Model for thread generation. Default: `gpt-4o-mini`.
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`: Required for production rate limiting (Upstash Redis). If unset, rate limiting is skipped (dev only).
   - `OVERRIDE_MAX_OUTPUT_TOKENS` (optional): Max tokens for OpenAI completions. Default: `900`.
   - `LOG_SALT` (optional but recommended): Salt for hashing IPs in logs. If set, `hashIp()` uses `sha256(ip + LOG_SALT)` so logs never contain raw IPs.
   - `RESEND_API_KEY`, `BETA_NOTIFY_EMAIL` (optional): For beta signup (`POST /api/beta`). If unset in production, the endpoint returns 503.
   - `SENTRY_DSN` (optional): Sentry DSN for server-side error reporting. If unset, Sentry is disabled.
   - `SENTRY_ENVIRONMENT` (optional): Sentry environment name (e.g. `production`, `staging`). Defaults to `NODE_ENV`.
   - `SENTRY_TRACES_SAMPLE_RATE` (optional): Sentry performance tracing sample rate (0–1). Default: `0`.

3. Run locally:

   ```bash
   yarn dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script        | Description                    |
|---------------|--------------------------------|
| `yarn dev`    | Start dev server               |
| `yarn build`  | Production build               |
| `yarn start`  | Start production server        |
| `yarn lint`   | Run ESLint                     |
| `yarn format` | Format with Prettier           |
| `yarn test`   | Run Vitest (unit tests)        |
| `yarn test:watch` | Vitest watch mode          |

## How it works

1. **Input**: User enters a news/article URL or pastes text (fallback if extraction fails).
2. **Extraction**: Server fetches URL, parses HTML with jsdom, runs Readability. Returns title, siteName, byline, text, excerpt. If content &lt; ~800 chars, API returns error and suggests pasting text.
3. **Generation** (two-stage):
   - **Outline**: OpenAI produces a JSON plan (7–10 tweet topics + bullets) from the extracted text only.
   - **Render**: OpenAI turns the outline into final tweet strings, each ≤280 chars. Server enforces 280-char limit; no invented numbers/quotes.
4. **Output**: Array of tweets + metadata. UI shows per-tweet copy, “copy all (numbered)”, “copy all (block)”, and character counts.
5. **History**: Last 10 results saved in localStorage; clicking an item restores that thread.

## Deploy to Vercel

1. **Connect the repo**  
   Use [Vercel Git integration](https://vercel.com/docs/git): import the repo and link the Git provider. Do not commit secrets; use Vercel Environment Variables.

2. **Environment variables**  
   In the Vercel project → Settings → Environment Variables, set (copy from `.env.example` as reference):

   - **Required**: `OPENAI_API_KEY`, `OPENAI_MODEL` (e.g. `gpt-4o-mini`)
   - **Recommended for production**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (rate limiting)
   - **Beta signup**: `RESEND_API_KEY`, `BETA_NOTIFY_EMAIL` (for `POST /api/beta`). If unset, beta signup returns 503 in production.
   - **Optional**: `LOG_SALT`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`

   Apply to **Production** and **Preview** so both deployment types work.

3. **Preview deployments on PRs**  
   With Git integration, every pull request gets a unique preview URL. No extra config.

4. **Production on main**  
   Pushes (or merges) to the default branch (e.g. `main`) deploy to the production URL. Confirm in Vercel → Settings → Git that "Production Branch" is set to `main`.

5. **Recommended Vercel project settings**  
   - Framework Preset: Next.js  
   - Build Command: `yarn build` (default)  
   - Install Command: `yarn install` (default)  
   - Node.js Version: 20.x (set in project Settings if needed)

   No `vercel.json` is required; Next.js and Route Handlers work with Vercel defaults. Extraction and generate routes use the Node runtime for jsdom/Readability.

## Security

- **API key**: OpenAI API key is server-only; never sent to the client. Never log it.
- **SSRF protection** (`lib/security/ssrf`): User-submitted URLs are validated before fetch. Only `http`/`https`; localhost and `*.localhost` blocked; DNS resolved and private/link-local IPs rejected (10/8, 127/8, 169.254/16, 172.16/12, 192.168/16). Redirects limited (max 3), re-validated per hop; 8s timeout, 1.5MB max response. Configurable via `lib/security/constants`.
- **Cost guards** (`lib/cost/guards`): Extracted text clamped to 20k chars; OpenAI `max_output_tokens` enforced (default 900). See `lib/cost/constants`.
- **Rate limiting** (`lib/security/rateLimit`): Upstash Redis. Per-IP: 5/hour, 20/day. Failure tracking: ≥5 failures in 10 min → 15 min cooldown. On success, failures cleared. If Redis env vars are missing, rate limiting is skipped (dev only).
- **Errors**: API returns `{ error: { code, message, request_id? } }` for failures. Generate route includes `request_id` in every response (success and error) for correlation. Never log article text, pasted text, prompts, or secrets.
- **Tuning**: IP ranges, rate-limit values, fetch timeouts, and cost limits live in `lib/security/constants` and `lib/cost/constants` so you can adjust them without touching business logic.

## Testing

- Unit tests for `lib/thread.ts`, `lib/cost/guards.ts`, and `lib/security/ssrf.ts` (char limiting, clamp, IP/hostname validation) with Vitest. No OpenAI calls in tests.
- Run: `yarn test`.

## Scope (MVP)

- **In**: URL or paste → extract → thread (7–10 tweets), tone/length/angle, copy actions, history (localStorage), dark mode.
- **Out**: OAuth / X posting, user accounts, DB, multi-language, analytics dashboards.
