# Arkade Faucet Notes

Last updated: 2026-03-27

## Live App

- URL: `https://zenark.onrender.com/`
- Repo: `https://github.com/TonyNakamoto/arkade-faucet`
- Live branch: `main`
- Current live/main SHA: `7ec633f`

## Branch Workflow (important)

- `main`:
  - stable
  - matches GitHub `origin/main`
  - no Lightning top-up code
- `stage-local`:
  - local experimentation branch
  - latest stage SHA: `6fdf27f`
  - contains Lightning top-up test flow
- Rule:
  - build/test risky features on `stage-local`
  - only cherry-pick approved updates to `main`

## Current UX / UI State (main/live)

- Zen glass card UI with local background image: `static/bg-zen-garden.png`.
- Top-left home button + bottom icon rows (docs/wallet + X/Nostr + donation stone).
- Refill address behavior:
  - shortened display (12...12)
  - tap address row copies full address
  - `explorer` centered
  - copy fallback popup appears if clipboard API fails
- Donation popup behavior:
  - shortened donation address (12...12)
  - tap address row copies full address
  - no separate donation copy button
- Error messaging simplified to minimal/zen style:
  - invalid address -> `patience. but first, precision`
  - address cap reached -> `five drops have fallen. even the earth needs time to drink.`
- Mobile spacing/card positioning adjusted in recent commits.

## Theme Mode (main/live)

- Light/dark mode now available via top-right yin/yang toggle.
- Theme rules:
  - defaults to browser/device preference (`prefers-color-scheme`)
  - user toggle preference saved in `localStorage` key `zen-theme`
- Dark mode polish:
  - tuned card/field/icon colors
  - docs + nostr icon assets use transparent versions and invert in dark mode
  - new files:
    - `static/arkade-a-bw-clear.png`
    - `static/nostr-ostrich-clear.png`

## Lightning Status

- Main/live:
  - Lightning top-up is NOT present in `main`.
  - verified no markers such as `/api/topup/lightning` or `data-ln-amount` in `origin/main`.
- Stage only:
  - Lightning top-up test flow exists on `stage-local` commit `6fdf27f`.

## Local Dev Notes

- Local wallet fetch can fail with:
  - `{"error":"fetch failed"}`
- This has been observed as network-route dependent (VPN ON worked, VPN OFF failed).
- Production (Render) may still work normally while local laptop path fails.

## Anti-Abuse / Privacy Controls

- IP limits active (Flask-Limiter on claim routes).
- Per-address cap:
  - max 5 successful transfers per 24h (defaults)
  - env vars:
    - `FAUCET_ADDR_MAX_24H` (default `5`)
    - `FAUCET_ADDR_WINDOW_HOURS` (default `24`)
- Retention:
  - claims stored in `faucet_claims.db`
  - prune records older than 7 days on successful claim
  - env var: `FAUCET_CLAIM_RETENTION_DAYS` (default `7`)
- Drip amount fixed at 5 sats.

## Secrets / Key Handling

- Never commit:
  - `phrase.txt`
  - real `.env`
  - mnemonic/nsec values
- Production mnemonic should remain in Render env secret: `ARKADE_MNEMONIC`.
- Local dev uses: `ARKADE_MNEMONIC_FILE=./phrase.txt` (gitignored).

## Open Source (future plan)

- User wants to open-source safely in future.
- Prep checklist before announcing:
  - add license + clear disclaimer
  - verify no secrets in history
  - keep faucet balance low
  - confirm abuse protections are active
  - add short "safe self-hosting" section in README

## Recent Main Commits (latest first)

- `7ec633f` Add yin-yang theme toggle and polish dark mode styling.
- `3e76f34` Simplify donation address display and tap-to-copy behavior.
- `5e19719` Center mobile faucet card while keeping fixed controls unchanged.
- `58c7eb0` Top-align mobile card and tighten vertical edge spacing.
- `6bc9a85` Unify user-facing drip messages and add manual-copy fallback popup.
- `0f8f43e` Tighten mobile vertical spacing around main faucet card.

## Quick Resume Commands

- Start stable local main:
  - `git checkout main && ./start_faucet.sh`
- Start local stage experiments:
  - `git checkout stage-local && ./start_faucet.sh`

