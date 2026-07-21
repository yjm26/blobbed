# Aegis

Private blob storage on Shelby Protocol. Aegis encrypts files in the browser, stores encrypted blobs on Shelby, and uses Aptos wallets for identity, vault unlock, and owner authorization.

## What it does

- Connect an Aptos wallet to open a private drive.
- Encrypt files locally with AES-256-GCM before upload.
- Relay encrypted blobs to Shelby Protocol on Shelbynet.
- Store durable file/folder metadata in Neon Postgres when `DATABASE_URL` is configured.
- Preview images and videos in-app after browser-side decrypt.
- Share files or folder snapshots with capability links: `/view#...`.

## Current mode

Aegis currently runs in **Beta Mode**.

```txt
User wallet       = identity, upload authorization, vault unlock
Service wallet    = Shelby upload signer + sponsored beta fees
Shelby storage    = encrypted blob bytes only
Metadata database = owner address, file names, blob pointers, wrapped keys
Share link        = capability payload in URL fragment
```

The backend service wallet sponsors Shelby uploads during beta. Paid credits, user-paid Shelby transactions, and quota economics are intentionally out of scope for this version.

## Architecture

```txt
React SPA
  ├─ /          landing
  ├─ /gate      wallet connect
  ├─ /drive     encrypted library
  ├─ /view#...  capability share viewer
  └─ /download  legacy secure download route

Browser
  ├─ generates file encryption keys
  ├─ encrypts files locally
  ├─ asks wallet to sign owner auth / vault unlock messages
  └─ sends ciphertext + metadata intent to API

Node/Express API (Render)
  ├─ verifies owner auth
  ├─ rate-limits sponsored uploads
  ├─ uploads ciphertext to Shelby with service wallet
  └─ stores metadata only

Shelby Protocol
  └─ stores encrypted blobs addressed by storage account + blob name
```

## Tech stack

- React 18 + React Router
- TypeScript
- Vite
- Tailwind CSS v4 via `@tailwindcss/vite`
- Aptos Wallet Standard
- Shelby Protocol TypeScript SDK
- Express API server on Render (`server.ts`) with Vercel-compatible handler types
- Neon Postgres metadata store
- Vitest + Playwright

## Environment

Copy `.env.example` and configure the values needed for your deployment.

| Variable | Required | Purpose |
|---|---:|---|
| `APTOS_PRIVATE_KEY` | Yes for real uploads | Dedicated service wallet private key. Never use a user wallet/private key here. |
| `APTOS_NETWORK` | Yes | `shelbynet` recommended. |
| `DATABASE_URL` | Recommended | Neon Postgres metadata sync. Without it, API falls back to temporary memory/local behavior. |
| `LIBRARY_SESSION_SECRET` | Recommended | HMAC secret for library session tickets. Falls back to `APTOS_PRIVATE_KEY` if unset. |
| `CORS_ORIGINS` | Recommended in prod | Comma-separated allowed origins. |
| `UPLOAD_MAX_PER_HOUR` | Optional | Per-owner upload rate limit. Default: `30`. |
| `MAX_UPLOAD_BYTES` | Optional | Upload payload cap. Default: `10485760`. |
| `VITE_APTOS_NETWORK` | Optional | Browser download network override; should match server network. |

The service wallet must be funded on Shelbynet with both APT for gas and ShelbyUSD for storage.

Current production deployment target is **Render**. The `api/*` files keep `@vercel/node` request/response types because the handlers are portable and mounted by `server.ts` for Render.

Health check:

```bash
curl https://your-domain.example/api/status
```

## Local development

```bash
npm install --legacy-peer-deps
npm run dev
```

Open:

```txt
http://localhost:5173
```

Build:

```bash
npm run build
```

Run tests:

```bash
npm test
npx vitest run tests/drive-ux-modularity.test.ts
npm run test:e2e
```

## Security contact

Please report vulnerabilities privately first:

- Discord: `noeraxbt`
- X / Twitter: https://x.com/noeraxbt

See [`SECURITY.md`](./SECURITY.md) for scope, safe-harbor notes, and beta limitations.

## Security model

Aegis is designed around client-side encryption and capability links.

- Plain file bytes should not reach the API.
- Shelby stores ciphertext.
- The API can see owner address, file names, file sizes, MIME types, blob pointers, wrapped key blobs, and sealed thumbnails.
- Owner recovery keys are wallet-wrapped before being saved as metadata.
- Share links intentionally carry decrypt capability in the URL fragment. Anyone with the full link can decrypt the shared file/folder snapshot.
- Losing a capability link means losing that access path. There is no server-side “shared with me” inbox by default.
- Beta sponsored uploads still depend on the service wallet being funded and available.

Not solved yet:

- User-paid direct Shelby upload transactions.
- Formal third-party audit.
- Malicious frontend/deploy threat model.
- Progressive seekable encrypted video streaming.
- Live folder share mutation/revocation beyond the explicit live-share workstream.

## Project status

Aegis is a beta Shelby dApp focused on the core encrypted storage loop:

```txt
connect wallet → encrypt locally → upload encrypted blob → sync metadata → share capability link → decrypt in browser
```
