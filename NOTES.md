# Arkade Faucet Notes

Last updated: 2026-03-25

## Live App

- URL: `https://zenark.onrender.com/`
- Repo: `https://github.com/TonyNakamoto/arkade-faucet`
- Branch: `main`

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
  - address row + `explorer` and `copy` minimal text actions
  - faucet address box now wraps fully (no internal scroll) on mobile/desktop
  - hint text: `scan to refill faucet`
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

