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
- Sent page:
  - compact fit-content style card
  - `explorer` link label

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

