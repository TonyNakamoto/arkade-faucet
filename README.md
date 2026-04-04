# arkade-faucet

A small **web faucet** for [Arkade](https://docs.arkadeos.com/) — Flask UI, rate limits, optional Lightning top-up flows, and Node scripts that send **off-chain** drips using an Arkade wallet identity (`ARKADE_MNEMONIC`, `ARKADE_MNEMONIC_FILE`, or `ARKADE_NSEC`).

---

## Disclaimer (read this)

**This software is provided for informational and educational purposes.** By building, deploying, or running it you agree that:

- **No warranty.** The authors and contributors license this project under the [MIT License](LICENSE). The license states that the software is provided **"AS IS"**, **without warranty of any kind**, and that **the authors and copyright holders are not liable** for claims, damages, or other liability arising from use of the software.
- **No responsibility for funds.** You are **solely responsible** for any **loss of funds**, failed transactions, incorrect configuration, bugs, **hacks**, **key compromise**, **server compromise**, phishing, or **any other harm** related to operating a faucet or using this code. **Nothing here is financial, legal, or security advice.**
- **High risk.** Hot wallets, automated sends, and public services are **inherently risky**. Use **only amounts you can afford to lose**, protect secrets **outside** the repository, and follow your host's security practices.
- **Not an endorsement** of any blockchain, asset, or third-party service.

If you do not accept this, **do not use or deploy** this software.

---

## Features (overview)

- Home UI with Ark receive QR, claim form, and related flows (see repo for current UI).
- Server-side rate limiting and abuse-related controls (see `faucet_server.py` and `env.example`).
- Node helpers for Ark operations (e.g. `arkade_logic.js`, Lightning scripts) driven from the Flask app.

---

## Requirements

- **Node.js** (for `npm install` and Arkade scripts)
- **Python 3** with dependencies in `requirements.txt` (Flask app)
- A funded Arkade wallet / identity as required by `@arkade-os/sdk` (see scripts' headers)

---

## Quick start (local)

From the repository root:

```bash
./install.sh
./start_faucet.sh
```

Then open `http://localhost:5000/` (or set `PORT` / `FAUCET_PORT`).

- Copy `env.example` to `.env` and adjust if needed.
- Put your **12-word phrase** in `phrase.txt` (or use env vars as documented) — **`phrase.txt` is gitignored; never commit it.**

For deployment and secrets, see **[DEPLOY.md](DEPLOY.md)** and **[render.yaml](render.yaml)** if you use Render.

---

## Configuration

- **`env.example`** — documented environment variables (public URL, rate limits, logging, etc.).
- **Secrets** — set `ARKADE_MNEMONIC` or equivalent **only** in your host's secret store or local `.env`, not in git.

---

## Security

See **[SECURITY.md](SECURITY.md)** for how to report vulnerabilities.

---

## License

[MIT License](LICENSE) — Copyright (c) 2026 Tony Nakamoto.

You may use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software subject to the conditions in the license file. **The software is provided without warranty; see the disclaimer above and the license text.**

---

## Contributing

Issues and pull requests are welcome. By contributing, you agree that your contributions are licensed under the same **MIT License** as the project.

---

## About

Hey! This faucet was created by using **cursor** and no experience with coding. The main idea is to share sats, spark curiosity, and educate people about the ark protocol. Stay hydrated and liberated.

> *They say, darkness we defeat, trust me.... we fight for light*

**#open source everything**
