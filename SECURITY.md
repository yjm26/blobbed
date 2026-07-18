# Blobbed security model

Not a formal audit. Encrypted-first drive on Shelby — honest about residual risk.

## Data paths

| Data | Where | Who can read |
|------|--------|----------------|
| File plaintext | Browser memory during encrypt/decrypt | User device |
| Ciphertext blob | Shelby nodes | Anyone who fetches bytes (useless without DEK) |
| File DEK (raw) | Share URL `#fragment`; briefly in RAM when unwrapped | Anyone with the share link |
| File DEK at rest | Neon/local as `bw1.…` | Wrapped; needs wallet vault signature |
| Thumbs at rest | Neon/local as `bt1.…` | Wrapped; plain `data:` stripped by API |
| Vault signature | **Memory only** (never sessionStorage) | Cleared on tab close / disconnect |
| Library session | Memory HMAC ticket (~2h) after 1 sign | Server verifies MAC |
| Names, sizes, blob pointers | Neon library meta | Backend + DB operators |

## Controls (this release)

1. **CSP + security headers** (`vercel.json`): default-src self, no framing, nosniff.
2. **No `dangerouslySetInnerHTML`** on gate (XSS surface reduced).
3. **Vault memory-only** — reload requires vault re-sign; no sig on disk.
4. **Thumb seal** `bt1.` + server rejects plain `data:` thumbs.
5. **Upload owner auth** — Ed25519 sign over ciphertext hash; rate limit /hour.
6. **Library session** — one sign → HMAC ticket; mutations require ticket.
7. **Service wallet** still pays Shelby gas (testnet relay) — not user-paid yet; auth stops anonymous burn.

## Wallet key wrap (v1)

1. `aptos:signMessage` fixed nonce `blobbed-vault-v1`.
2. `SHA-256("blobbedv1" || lower(address) || sigBytes)` → AES-GCM vault key.
3. DEKs → `bw1.` · thumbs → `bt1.`
4. Legacy plain migrate on unlock.

## Share links

- Raw DEK only in URL **fragment**.
- `POST /api/upload` ciphertext + auth only.
- Lose link → lose access (no shared-with-you inbox).

## Upload economics

- Service account (`APTOS_PRIVATE_KEY`) pays APT + ShelbyUSD on **shelbynet**.
- Client must prove wallet ownership of `ownerAddress` per upload.
- `UPLOAD_MAX_PER_HOUR` (default 30).

## Production checklist

1. `DATABASE_URL` (Neon)
2. `APTOS_PRIVATE_KEY` + `APTOS_NETWORK=shelbynet`
3. Optional `LIBRARY_SESSION_SECRET` (else falls back to APTOS_PRIVATE_KEY)
4. Fund service wallet ShelbyUSD + APT
5. Confirm CSP headers on live response
6. Drive: vault unlock + library session signs; chip **Keys wrapped**

## Residual risks (still true)

| Risk | Mitigation now | Still open |
|------|----------------|------------|
| Malicious frontend build | CSP, no inline scripts from third parties | Supply-chain / compromised deploy |
| XSS | CSP, no unsafe HTML sink on gate | Future rich UI must stay clean |
| Shared machine | No vault sig in storage | User must lock wallet / close tab |
| Service wallet hot key | Owner auth + rate limit | Move to user-paid upload later |
| Share link = bearer token | Documented | User education |
| GET library by owner address | Public meta index | Optional auth’d GET later |

## API

| Endpoint | Auth |
|----------|------|
| `POST /api/upload` | Wallet sign over sha256(ciphertext) |
| `POST /api/library` `session` | Wallet sign once |
| `POST /api/library` other ops | `sessionToken` or full auth |
| `GET /api/library` | Open read of **meta** (wrapped keys/thumbs only) |
