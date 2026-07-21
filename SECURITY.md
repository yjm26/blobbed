# Security Policy

Aegis is currently in beta. Please report security issues privately first so they can be fixed before public disclosure.

## Supported version

| Version | Status |
|---|---|
| `main` / `v0.1.0-beta` | Supported for beta security reports |

## Report a vulnerability

Preferred contact:

- Discord: `noeraxbt`
- X / Twitter: https://x.com/noeraxbt

Please include:

- A short description of the issue.
- Affected route/API/file if known.
- Reproduction steps or proof of concept.
- Expected impact: data exposure, auth bypass, service-wallet burn, XSS, etc.
- Whether the issue is local-only, live deployment, or repository/source related.

Do not include private keys, wallet seed phrases, or real user data in the report.

## Scope

In scope:

- Client-side encryption/key handling bugs.
- Share-link/capability leaks beyond the intended URL fragment model.
- Upload owner-auth bypasses.
- Library metadata authorization bugs.
- CORS/session-ticket issues.
- API routes that allow unauthenticated writes or private metadata reads.
- Frontend XSS that can access file keys or wallet/session material.

Out of scope for this beta policy:

- Social engineering.
- Denial-of-service without a practical security impact.
- Issues caused by leaked user wallet secrets outside Aegis.
- Problems in third-party wallets, Shelby Protocol, Aptos, Vercel, Neon, or browser vendors unless Aegis usage makes them exploitable.

## Current beta limitations

Aegis is not claiming a formal security audit. Known beta constraints:

- Uploads are sponsored by a service wallet during beta.
- User-paid direct Shelby transactions are not implemented yet.
- Share links are capability links: anyone with the full `/view#...` link can decrypt the shared payload.
- The live frontend/deployment must be trusted because malicious frontend code could exfiltrate client-side keys before encryption/decryption.
- Progressive seekable encrypted video streaming is not final.

## Safe harbor

Good-faith testing is welcome if it avoids:

- Accessing or modifying other users' data.
- Exfiltrating secrets or private files.
- Interrupting service for other users.
- Publicly disclosing details before a fix is available.

If you are unsure whether a test is safe, ask first via Discord `noeraxbt` or X `https://x.com/noeraxbt`.
