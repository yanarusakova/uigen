# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup       # Initial setup: install deps, generate Prisma client, run migrations
npm run dev         # Start development server (Next.js + Turbopack via dev-server.js)
npm run build       # Build for production
npm run lint        # Run ESLint
npm run test        # Run Vitest tests
npm run db:reset    # Reset the SQLite database
```

To run a single test file:
```bash
npx vitest run src/path/to/file.test.ts
```

## Environment

Copy `.env.example` to `.env`. The `ANTHROPIC_API_KEY` is optional — without it the app uses a mock provider that generates demo responses.

`node-compat.cjs` is a shim loaded before Next.js to fix Node 25+ compatibility: Node 25 exposes stub `localStorage`/`sessionStorage` globals in SSR context that break code guarded by `typeof localStorage === "undefined"`. The shim deletes these globals server-side.

## Architecture

UIGen is an AI-powered React component generator with a **3-panel layout**: chat (left), live preview/code editor (right).

### Core Data Flow

1. User sends message in chat
2. `ChatContext` (`src/lib/contexts/chat-context.tsx`) calls `/api/chat` with current file system state serialized as JSON
3. API route (`src/app/api/chat/route.ts`) streams Claude's response using Vercel AI SDK's `streamText`
4. Claude returns tool calls (`str_replace_editor`, `file_manager`) to create/modify files
5. `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) applies tool calls to the **virtual file system** (in-memory, no disk writes)
6. File changes trigger the preview to re-render JSX in an iframe via Babel standalone + esm.sh import maps

### Virtual File System

`src/lib/file-system.ts` implements an in-memory file tree. Files exist only in React state — the AI "writes" code by emitting tool calls, not actual filesystem operations.

The two AI tools exposed to the model are:
- `str_replace_editor`: `view`, `create`, `str_replace`, `insert` commands (defined in `src/lib/tools/str-replace.ts`)
- `file_manager`: `rename` and `delete` commands (defined in `src/lib/tools/file-manager.ts`)

### AI Provider

`src/lib/provider.ts` selects between real Claude (`claude-haiku-4-5-20251001`) and a mock provider. The mock returns hard-coded tool-call sequences to simulate component generation without an API key.

### JSX Preview

`src/lib/transform/jsx-transformer.ts` uses `@babel/standalone` to transform JSX and generates an HTML document with an import map pointing to `esm.sh` for React and other dependencies. This HTML is injected into a sandboxed iframe in `PreviewFrame.tsx`.

### AI Generation Rules (from prompt)

- Entry point must be `/App.jsx`
- Components use Tailwind CSS for styling (no CSS files unless user asks)
- Use `@/` import alias for cross-file imports
- External npm packages are allowed (resolved via esm.sh at preview time)

### Authentication & Persistence

- JWT sessions via HTTP-only cookies (`src/lib/auth.ts`, 7-day expiry)
- SQLite + Prisma: `User` and `Project` models. The schema is defined in `prisma/schema.prisma` — always reference it when understanding the structure of data stored in the database.
- Anonymous users can generate components; only authenticated users have projects persisted
- Anonymous work (messages + file system snapshot) is preserved in `sessionStorage` via `src/lib/anon-work-tracker.ts` so it can be saved after sign-in
- `messages` and `data` (file system snapshot) are stored as JSON strings on the `Project` model

### Path Alias

`@/*` maps to `./src/*` (defined in `tsconfig.json`).

## Code Style

Use comments sparingly. Only comment complex code.