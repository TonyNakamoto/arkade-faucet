# Host the faucet safely (GitHub + cloud)

## What stays secret

- **Never** commit `phrase.txt`, `.env` with real keys, or your **12 words** anywhere in Git.
- On a server, set **`ARKADE_MNEMONIC`** in the host’s **Environment / Secrets** UI (Render, Fly, etc.) — one line, 12 words, spaces only.
- The signing key **only exists on the server** as an environment variable. Visitors **cannot** change your seed or steal funds by editing the website; they only trigger **sends** the server signs (same as today).
- **Rate limits** (`10` claims per IP per hour) reduce drain attacks; they are not perfect — monitor balance.

## “Free 24/7” — honest summary

| Option | Cost | Uptime |
|--------|------|--------|
| **Render free** | $0 | Sleeps after ~15 min idle; wakes on next visit ([docs](https://render.com/docs/free)) |
| **Fly.io / Railway** | Free credits / low tiers | Varies; check current pricing |
| **Oracle Cloud “Always Free” ARM** | $0 | True 24/7 if you run Docker yourself (more setup) |
| **Paid small VPS** (Hetzner, etc.) | ~€4–5/mo | Reliable 24/7 |

There is **no** magic where Cursor connects GitHub to a host without you **once** clicking “Connect repo” on a provider and pasting secrets in their dashboard.

## Suggested free **subdomain** name (Zen + Ark)

Render gives you `https://<service-name>.onrender.com` for free. Name ideas you can use for the **service name**:

- `still-zen-ark` (stillness · zen · Ark)
- `zen-ark-drip`
- `ma-ark` (間 *ma* — pause / negative space)

Buying a **custom** domain like `zen-ark-faucet.com` costs roughly **$10–15/year** from a registrar; then you point DNS at Render (their docs: custom domains).

## Deploy on Render (Docker)

1. Push this repo to **GitHub** (without `phrase.txt` / `.env`).
2. Create account on [render.com](https://render.com) → **New** → **Blueprint** → connect the repo, or **Web Service** → **Docker**.
3. In **Environment**, add:
   - `ARKADE_MNEMONIC` = your 12 words (single line) — mark as **Secret**.
   - `FAUCET_PUBLIC_URL` = `https://YOUR-SERVICE-NAME.onrender.com/` (trailing slash optional).
   - Drip size is **not** an env var: edit `DRIP_AMOUNT` in `arkade_logic.js` and the matching `drip` value in `faucet_info.js` (currently **21** sats each).
4. Deploy. Open the URL and test.

**Note:** Free tier may spin down when idle; first visitor after idle waits ~1 minute.

## After deploy

- Fund the faucet Ark address shown on the page (same as local).
- If you change domain, update `FAUCET_PUBLIC_URL` so links stay correct.

## GitHub Action

This repo includes a workflow that **fails the push** if `phrase.txt` or `.env` is accidentally committed.
