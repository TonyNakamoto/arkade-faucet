# Arkade Faucet Notes

Last updated: 2026-04-03

## Live App

- URL: `https://zenark.onrender.com/`
- Repo: `https://github.com/TonyNakamoto/arkade-faucet`
- Deploy branch: **`main`** — includes **Lightning → Ark top-up** (Boltz) in the home UI once Render deploys the latest `main`.

## Branches & workflow

- **`main`** and **`stage-local`** are kept **aligned** (same tip as `origin/main` when last pushed). Both carry Lightning top-up + the same UX polish.
- **`stage-local`** exists as a parallel branch name for staging habits; it is not a divergent experiment line anymore.
- Pushes to GitHub are **explicit** (confirm with Tony before deploying secrets-dependent changes).

## Lightning top-up (on `main`)

**Flow (user):** enter amount (min **333** sats) → **create invoice** → pay BOLT11 → page **auto-claims** in a loop, **polls** `GET /api/faucet/balance`, shows **appreciation** then **reloads** (~4.5s) so balance updates. Invoice is **tap-to-copy** on the bolt11 (same `data-copy` / “copied” pattern as the on-chain address); there is **no** separate “copy invoice” button.

**Flow (tech):**

1. `POST /api/topup/lightning/invoice` → `node topup_lightning.js create <sats>` → Boltz reverse swap + invoice.
2. User pays invoice; Boltz locks Ark-side funds (VHTLC).
3. Browser repeatedly `POST /api/topup/lightning/claim` with `pendingSwap` until OK → `node topup_lightning.js claim '<json>'` → `waitAndClaim`.
4. Long-running paths: Flask/Gunicorn timeouts tuned for long claims; `_node_json` wraps Node and returns JSON (missing `jsonify` import once caused HTML 500 + `Unexpected token '<'` in the browser — fixed).

**Node script** (`topup_lightning.js`):

- Uses `ArkadeSwaps` + `InMemorySwapRepository` (Node has no IndexedDB).
- **`createWalletForInvoice()`**: `settlementConfig: false` — fast `Wallet.create` so invoice creation doesn’t hit Flask timeout.
- **`createWalletForClaim()`**: default settlement — needed so Ark **joinBatch / submitTx** doesn’t fail with errors like **“onchain coins could not be sent”**.
- Env: `ARKADE_MNEMONIC` / `ARKADE_MNEMONIC_FILE` / `ARKADE_NSEC`, optional `ARK_SERVER_URL`, `INDEXER_URL`, `BOLTZ_API_URL`.

**Debug:** `export TOPUP_LIGHTNING_DEBUG=1` before `./start_faucet.sh` — logs `[topup_lightning]` lines and stderr for Node.

**Static assets:** HTML references `static/arkade-a-bw.png` and Nostr icon assets per `faucet_server.py` (avoid broken `*-clear.png` names unless those files exist).

**Port in use:** `FAUCET_PORT=5001 ./start_faucet.sh` if 5000 is busy; `faucet_server.py` reads `PORT` / `FAUCET_PORT`.

## Session handoff (2026-04-03)

**GitHub / local sync:** `main`, `stage-local`, and `origin/main` were aligned at **`60aaca9`** after push (typography + Lightning UX commits on top of `c3d7374` Lightning feature).

**Commits after the Boltz feature (`c3d7374`) worth knowing:**

- `109b75f` — “send btc to refill” uses **`receive-title`** (same as “receive”); removed unused `p.hint`.
- `8145c9f` — “top up via lightning” uses **`receive-title`**; removed `.ln-title`.
- `607da21` — invoice **tap-to-copy** via `button#ln-invoice-text` + `data-copy`; removed separate copy button (`faucet_server.py` + `static/faucet.js`).
- `60aaca9` — vertical spacing: **`.ln-topup`** padding + **`.ln-topup > .receive-title`** margin / slight `translateY` so the heading sits between the rule and the inputs.

**Key files:** `faucet_server.py` (routes, `_node_json`, home HTML/CSS), `static/faucet.js` (Lightning block, balance poll, invoice `fetch` error handling), `topup_lightning.js` (CLI for limits/create/claim).

**Quick resume:** `cd ~/arkade-faucet` → `git pull` → `./start_faucet.sh` → open `http://localhost:5000/` (or `FAUCET_PORT`). `npm install` if `package.json` changed. Do not commit `faucet_claims.db` (local DB).

## Current UX / UI State

- Background uses local file: `static/bg-zen-garden.png` (no external fallback images).
- Top-left fixed temple-style home button links to:
  - `https://zenark.onrender.com/`
- Bottom-right fixed icon row:
  - X/Twitter
  - Nostr (ostrich icon)
  - Donation button (stone)
- Bottom-left fixed icon row:
  - Arkade docs: `https://docs.arkadeos.com/`
  - Arkade wallet: `https://arkade.money/`
- Donation popup includes:
  - tip text
  - donation QR
  - donation address
  - copy action
- Refill card copy/action style:
  - headings **send btc to refill**, **top up via lightning**, and **receive** share **`receive-title`** typography
  - on-chain address: tap row to copy; `explorer` link
  - Lightning block: amount + **create invoice**; invoice bolt11 tap-to-copy (no separate copy button)
  - faucet address box wraps fully (no internal scroll) on mobile/desktop
- Sent page:
  - compact fit-content style card
  - `explorer` link label
- Branding:
  - Enso favicon via `static/favicon.svg` (linked as `/static/favicon.svg?v=1`)
  - docs/wallet resource icons in bottom-left (Arkade A + coin/B mark)

## Anti-Abuse / Privacy Controls

- IP limit: Flask-Limiter route caps are active (claim endpoint).
- Per-address limit:
  - max 5 successful transfers per 24h (default)
  - env-configurable:
    - `FAUCET_ADDR_MAX_24H` (default `5`)
    - `FAUCET_ADDR_WINDOW_HOURS` (default `24`)
- Retention / privacy:
  - claim records stored in `faucet_claims.db`
  - records older than 7 days are auto-pruned on successful claim
  - env-configurable:
    - `FAUCET_CLAIM_RETENTION_DAYS` (default `7`)
- Drip policy:
  - fixed drip amount is hardcoded to `5` sats (not user-selectable)

## Secrets / Key Handling

- Do NOT commit:
  - `phrase.txt`
  - real `.env`
  - mnemonic/nsec values
- Production key source:
  - Render environment secret `ARKADE_MNEMONIC`
- Local dev:
  - `ARKADE_MNEMONIC_FILE=./phrase.txt` (gitignored)
- Repo protections present:
  - `.gitignore` excludes `phrase.txt`
  - `.dockerignore` excludes `phrase.txt`
  - GitHub workflow checks for accidental `phrase.txt` / `.env` commits
- Note:
  - Render free tier may not support account 2FA; compensate with strong unique password and low on-server faucet balance.

## Recent Commits (latest first)

- `60aaca9` Balance Lightning section heading vertically between rule and inputs.
- `607da21` Tap invoice to copy; remove separate copy invoice button.
- `8145c9f` Match “top up via lightning” to `receive-title`.
- `109b75f` Match “send btc to refill” to `receive-title`.
- `c3d7374` Lightning top-up via Boltz (API, UI, `topup_lightning.js`).
- `47bd301` Fix faucet address wrapping and simplify refill hint.
- `37d048d` Add Enso favicon.
- `d984d4f` Set faucet drip to fixed 5 sats.
- `6da30e2` Add project notes and launch checklist.
- `0e64b57` Update Arkade resource icons.
- `deab85b` Add top-left temple home link.
- `c4ce7b9` Center address-limit alert copy.
- `09dcd06` Polish address-limit messaging and button state.
- `192627b` Add per-address claim cap with privacy retention.

## Important Behavior Notes

- Faucet UI displays `balance.available` (not necessarily explorer "total").
- `arkade_logic.js` spends offchain VTXOs with `withRecoverable: false`.
- Recoverable / boarding states can make explorer totals differ from spendable amount.
- Sending to your own address can still reduce available sats due to fees/state transitions.

## Pre-Publication Checklist

- [ ] Confirm latest commit is deployed on Render.
- [ ] Confirm Render env vars are set (especially `ARKADE_MNEMONIC`).
- [ ] Keep faucet balance low while testing public traffic.
- [ ] Verify per-address limiter behavior:
  - 1–5 successes: allowed
  - 6th in 24h: blocked with alert
- [ ] Confirm no secrets in commit history.
- [ ] Confirm Render deployed commit matches latest GitHub SHA (webhook can lag; manual deploy if needed).

