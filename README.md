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

2. Environment variables (create `.env.local`):

   ```env
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4o-mini
   ```

   - `OPENAI_API_KEY` (required): Your OpenAI API key. Never exposed to the client.
   - `OPENAI_MODEL` (optional): Model for thread generation. Default: `gpt-4o-mini`.

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

## Deployment (Vercel)

- Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` in the project environment.
- Build: `yarn build`. No special config; App Router and Route Handlers work on Vercel.
- Extraction and generate routes use **Node runtime** (`runtime = 'nodejs'`) for jsdom/Readability.

## Security

- OpenAI API key is server-only; never sent to the client.
- Minimal rate limiting on `/api/generate` (in-memory, per IP) to reduce abuse.
- Never log `OPENAI_API_KEY`.

## Testing

- Unit tests for `lib/thread.ts` (char limiting, batch) with Vitest. No OpenAI calls in tests.
- Run: `yarn test`.

## Scope (MVP)

- **In**: URL or paste → extract → thread (7–10 tweets), tone/length/angle, copy actions, history (localStorage), dark mode.
- **Out**: OAuth / X posting, user accounts, DB, multi-language, analytics dashboards.
