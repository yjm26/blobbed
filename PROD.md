# Blobbed production checklist

Live: https://blobbed.vercel.app  
Health (after Phase 3 deploy): https://blobbed.vercel.app/api/status  

Repo HEAD may be ahead of live when Vercel is rate-limited.

## Live probe (2026-07-18)

| Check | Result |
|-------|--------|
| Site HTTP 200 + CSP / XFO / nosniff | OK live |
| `GET /api/library` → `backend: neon` | OK Neon configured |
| Upload without owner auth | Blocked (auth required; Shelby key present) |
| Legacy `POST /api/folders` + `/api/files` without auth | **OPEN on live until Phase 3 deploys** |
| `GET /api/status` | Ships in git `0ee3440+` — not live yet |
| Deploy `0ee3440` | **Vercel Hobby build rate limit — retry ~24h** |

Git already locks legacy mutations (410), adds `/api/status`, disables shares mock.

**You must redeploy after rate limit resets** (or upgrade Vercel):  
https://vercel.com/ — then:

```bash
curl -sS https://blobbed.vercel.app/api/status | jq .
# expect: ready true, db.backend neon, shelby.configured true

curl -sS -X POST https://blobbed.vercel.app/api/folders \
  -H 'content-type: application/json' \
  -d '{"ownerAddress":"0x1","name":"x"}'
# expect: 410 USE_LIBRARY_API
```

## Required Vercel env

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon — multi-device library |
| `APTOS_PRIVATE_KEY` | Service wallet Shelby uploads |
| `APTOS_NETWORK=shelbynet` | ShelbyUSD network |

Optional: `LIBRARY_SESSION_SECRET`, `UPLOAD_MAX_PER_HOUR=30`, `MAX_UPLOAD_BYTES`, `VITE_APTOS_NETWORK=shelbynet`.

Env change → **Redeploy**.

## Service wallet funding

1. After status is live: copy `shelby.serviceAddress`
2. Fund APT + ShelbyUSD on shelbynet  
   https://docs.shelby.xyz/tools/wallets/petra-setup
3. Local keygen: `npm run wallet:service` (never commit the key)

## App smoke

1. Hard refresh drive  
2. Connect → vault sign → library session sign  
3. “Library synced (Neon)” + “Keys wrapped”  
4. Rail prod checks green (after Phase 3 live)  
5. Upload → queue → preview → share sheet  
6. Second device same wallet → meta syncs  

## Failure map

| Symptom | Fix |
|---------|-----|
| Deploy rate limited | Wait ~24h or upgrade; redeploy HEAD |
| Library memory/local | Set `DATABASE_URL`, redeploy |
| MISSING_APTOS_PRIVATE_KEY | Set key + shelbynet, redeploy |
| INSUFFICIENT_FUNDS | Fund service wallet ShelbyUSD + APT |
| AUTH_* on upload | Reconnect wallet (publicKey + sign) |
| Vault every refresh | Expected (memory-only) |

## API surface (after Phase 3 live)

| Route | Auth |
|-------|------|
| GET /api/status | Public health |
| GET /api/library | Public meta (wrapped keys) |
| POST /api/library | Session or owner auth |
| POST /api/upload | Owner auth (ciphertext hash) |
| GET files/folders | Read-only legacy |
| POST/PATCH/DELETE legacy + shares | **410** |
