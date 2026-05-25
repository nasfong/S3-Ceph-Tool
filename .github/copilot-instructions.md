# Copilot Instructions — S3 Browser

## Project Overview
A Next.js 14+ App Router web app that acts as a visual browser for S3-compatible object storage (supports custom endpoints like `https://fsgw.sabay.com`). Users log in with S3 credentials, browse buckets, manage ACLs, and list files — all without exposing credentials to the client beyond localStorage.

---

## Tech Stack
- **Framework**: Next.js 14+ with App Router (`app/` directory)
- **Language**: TypeScript, strict mode
- **Styling**: Tailwind CSS (utility-first, no CSS modules)
- **S3 SDK**: AWS SDK v3 (`@aws-sdk/client-s3`) — server-side only
- **Runtime**: Node.js (API routes run on the server)

---

## Project Structure
```
app/
  page.tsx              ← Main client component (HomePage)
  api/
    s3/
      buckets/route.ts  ← GET  — list all buckets
      list/route.ts     ← GET  — list files in a bucket (?bucket=name)
      acl/route.ts      ← GET  — get bucket ACL; PUT — set bucket ACL
lib/
  s3.ts                 ← S3 client factory (do not import in client components)
```

---

## Credential & Auth Pattern

Credentials are **never stored server-side**. The flow is:

1. User enters credentials in the login form
2. Saved to `localStorage` with these exact keys:
   - `s3_endpoint`
   - `s3_access_key`
   - `s3_secret_key`
   - `s3_reject_unauthorized` (`"true"` / `"false"`)
3. Every API call passes credentials as **custom request headers**:

```ts
headers: {
  "x-s3-endpoint": string,
  "x-s3-access-key": string,
  "x-s3-secret-key": string,
  "x-s3-reject-unauthorized": "true" | "false",
}
```

4. API routes extract these headers and construct a per-request S3 client — **never reuse a shared client**.

### API Route Template
Always follow this pattern in every `/api/s3/` route:

```ts
import { NextRequest, NextResponse } from "next/server";
import { S3Client } from "@aws-sdk/client-s3";

function getS3Client(req: NextRequest): S3Client {
  const endpoint = req.headers.get("x-s3-endpoint") || "";
  const accessKeyId = req.headers.get("x-s3-access-key") || "";
  const secretAccessKey = req.headers.get("x-s3-secret-key") || "";
  const rejectUnauthorized = req.headers.get("x-s3-reject-unauthorized") !== "false";

  return new S3Client({
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    region: "us-east-1",
    requestHandler: {
      requestTimeout: 10000,
      httpsAgent: new (require("https").Agent)({
        rejectUnauthorized,
      }),
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const client = getS3Client(req);
    // ... SDK commands here
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
```

---

## Core TypeScript Types

Always use these types — do not redefine them:

```ts
type S3File = {
  Key: string;
  Size: number;
  LastModified: string;
};

type S3Bucket = {
  Name: string;
  CreationDate: string;
};
```

---

## Client Component Rules (`page.tsx` and any `"use client"` files)

- All `fetch` calls to `/api/s3/*` must include the four `x-s3-*` headers
- Read credentials from state (`endpoint`, `accessKey`, `secretKey`, `rejectUnauthorized`) — never re-read from localStorage inside handlers
- URL state: active bucket is reflected in the URL query param `?bucket=<name>` via `router.push()`
- On mount: restore session from localStorage → call `fetchBuckets()` → if `?bucket` param exists, also call `loadFilesForBucket()`
- Error handling: always set `setError(err instanceof Error ? err.message : "Unknown error")` inside catch blocks
- Loading state: use `setLoading(true/false)` wrapping every async fetch block
- Never import S3 SDK or Node.js modules in client components

---

## State Shape Reference

```ts
// Auth
endpoint: string          // e.g. "https://fsgw.sabay.com"
accessKey: string
secretKey: string
rejectUnauthorized: boolean
isLoggedIn: boolean

// Data
buckets: S3Bucket[]
bucketAcls: Record<string, boolean>   // true = public, false = private
selectedBucket: string | null
files: S3File[]

// UI
loading: boolean
updatingAcl: string | null            // bucket name currently being updated
error: string | null
```

---

## API Routes Reference

| Route | Method | Query / Body | Returns |
|---|---|---|---|
| `/api/s3/buckets` | GET | — | `{ buckets: S3Bucket[] }` |
| `/api/s3/list` | GET | `?bucket=name` | `{ files: S3File[] }` |
| `/api/s3/acl` | GET | `?bucket=name` | `{ isPublic: boolean }` |
| `/api/s3/acl` | PUT | `{ bucket, isPublic }` | `{ success: true }` |

All routes return `{ error: string }` with an appropriate HTTP status on failure.

---

## Styling Conventions

- Use **Tailwind CSS utility classes** only — no inline styles, no CSS modules
- Dark theme palette:
  - Base bg: `bg-[#0a0a0f]`
  - Surface: `bg-[#111118]`
  - Elevated: `bg-[#1c1c28]`
  - Accent: `text-indigo-400`, `border-indigo-500`, `bg-indigo-600`
  - Muted text: `text-gray-400`, labels: `text-gray-500 text-xs uppercase tracking-widest`
  - Mono values (bucket names, file keys, endpoints): `font-mono`
- Borders: `border border-white/[0.07]` default, `border-indigo-500` on selected/focus
- Cards: `rounded-xl`, hover: `hover:-translate-y-0.5 hover:border-indigo-500/50 transition-all duration-150`
- Buttons: always include `disabled:opacity-50 disabled:cursor-not-allowed`
- Error alerts: `border-l-4 border-red-500 bg-red-500/10 text-red-400`

---

## Patterns to Always Follow

1. **Optimistic UI for ACL toggle** — update `bucketAcls` state immediately, revert on error
2. **Never block the full page** — use per-section loading states, not a full-screen spinner
3. **Stagger animations on lists** — bucket cards animate in with `delay-[Nms]` staggered by index
4. **Smart file size formatting**:
```ts
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
```
5. **ACL badge display**:
   - Public → `bg-amber-500/15 text-amber-400 rounded-full px-2.5 py-0.5 text-xs`
   - Private → `bg-green-500/15 text-green-400 rounded-full px-2.5 py-0.5 text-xs`

---

## What Copilot Should Never Do

- Do not import `@aws-sdk/*` inside any `"use client"` component
- Do not hardcode credentials or fallback keys anywhere
- Do not add a new state management library (no Redux, Zustand, etc.) — use `useState` only
- Do not change the localStorage key names (`s3_endpoint`, `s3_access_key`, `s3_secret_key`, `s3_reject_unauthorized`)
- Do not add API authentication middleware — the header-based pattern is intentional
- Do not use `getServerSideProps` or `getStaticProps` — this is App Router only
- Do not wrap API responses in extra nesting (e.g. `{ data: { buckets: [] } }` is wrong — use `{ buckets: [] }` directly)