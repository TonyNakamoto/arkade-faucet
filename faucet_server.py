import html
import json
import os
import subprocess
from flask import Flask, redirect, request, url_for

_script_dir = os.path.dirname(os.path.abspath(__file__))

try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(_script_dir, ".env"))
except ImportError:
    pass

_mnemonic_file = os.environ.get("ARKADE_MNEMONIC_FILE")
if _mnemonic_file and not os.path.isabs(_mnemonic_file):
    os.environ["ARKADE_MNEMONIC_FILE"] = os.path.normpath(
        os.path.join(_script_dir, _mnemonic_file)
    )

app = Flask(__name__)

try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address

    _limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["60 per minute"],
        storage_uri="memory://",
    )
except ImportError:

    def _noop_decorator(f):
        return f

    class _NoopLim:
        def limit(self, *_a, **_k):
            return _noop_decorator

    _limiter = _NoopLim()

# Background art (decorative). Falls back to gradient if an image fails to load.
_BG_VECTEEZY = "https://static.vecteezy.com/system/resources/thumbnails/004/850/435/small_2x/beautiful-nature-colourful-tree-leaves-in-japanese-zen-garden-in-autumn-season-at-kyoto-japan-photo.jpg"
_BG_FT = "https://t4.ftcdn.net/jpg/17/33/50/87/240_F_1733508721_M6ol5BLrT1v91xQMOFIEk81Xsaxul1na.jpg"


def _zen_shell_open(body_class: str) -> str:
    """Opening HTML through <div class="glass"> — pair with _zen_shell_close()."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Arkade faucet</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;600&family=Zen+Kaku+Gothic+New:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    :root {{
      --ink: #0d0d0d;
      --muted: #5c5954;
      --glass: rgba(255, 253, 249, 0.78);
      --glass-edge: rgba(255, 255, 255, 0.55);
      --shadow: 0 12px 48px rgba(15, 20, 25, 0.12);
    }}
    * {{ box-sizing: border-box; }}
    html {{ height: 100%; }}
    body {{
      margin: 0;
      color: var(--ink);
      font-family: 'Zen Kaku Gothic New', system-ui, sans-serif;
      font-size: clamp(0.8rem, 1.1vw, 0.95rem);
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
    }}
    body.home {{
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
    }}
    body.sub {{
      min-height: 100vh;
      overflow-x: hidden;
    }}
    .bg {{
      position: fixed;
      inset: 0;
      z-index: -1;
      background-color: #e8e4dc;
      background-image:
        linear-gradient(165deg, rgba(252, 250, 246, 0.88) 0%, rgba(240, 235, 228, 0.82) 45%, rgba(248, 244, 238, 0.9) 100%),
        url("{_BG_VECTEEZY}"),
        url("{_BG_FT}");
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }}
    .page {{
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: clamp(0.4rem, 1.2vh, 0.85rem);
    }}
    body.home .page {{
      height: 100vh;
      max-height: 100vh;
    }}
    .glass {{
      width: min(52rem, 100%);
      max-height: min(96vh, 100%);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: clamp(0.65rem, 1.8vh, 1rem) clamp(0.85rem, 2vw, 1.25rem);
      border-radius: 18px;
      background: var(--glass);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid var(--glass-edge);
      box-shadow: var(--shadow);
    }}
    body.home .glass {{
      flex: 1;
      min-height: 0;
    }}
    .brand {{
      text-align: center;
      margin-bottom: clamp(0.35rem, 1vh, 0.55rem);
      flex-shrink: 0;
    }}
    h1 {{
      font-family: 'Noto Serif JP', serif;
      font-weight: 600;
      font-size: clamp(1rem, 2.2vh, 1.2rem);
      letter-spacing: 0.2em;
      margin: 0;
    }}
    .sub {{
      font-size: clamp(0.65rem, 1.2vh, 0.72rem);
      color: var(--muted);
      letter-spacing: 0.18em;
      margin: 0.2rem 0 0;
    }}
    .grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: clamp(0.5rem, 1.2vw, 0.85rem);
      align-items: stretch;
      min-height: 0;
      flex: 1;
    }}
    @media (max-width: 720px) {{
      body.home {{ height: auto; max-height: none; overflow-y: auto; }}
      body.home .page {{ height: auto; max-height: none; }}
      .glass {{ max-height: none; overflow: visible; }}
      .grid {{ grid-template-columns: 1fr; }}
    }}
    h2 {{
      font-family: 'Noto Serif JP', serif;
      font-weight: 400;
      font-size: 0.68rem;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: var(--muted);
      margin: 0 0 0.35rem;
    }}
    p {{ margin: 0 0 0.45rem; color: var(--muted); font-size: 0.82rem; }}
    p.lead {{ color: var(--ink); font-size: 0.78rem; line-height: 1.5; }}
    p.hint {{ font-size: 0.72rem; line-height: 1.45; }}
    .col {{
      display: flex;
      flex-direction: column;
      min-height: 0;
      padding: clamp(0.35rem, 0.8vh, 0.5rem);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.45);
      border: 1px solid rgba(0, 0, 0, 0.05);
    }}
    .stat {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid rgba(0, 0, 0, 0.07);
      flex-shrink: 0;
    }}
    .stat > div {{ padding: 0.45rem 0.5rem; border-right: 1px solid rgba(0, 0, 0, 0.06); background: rgba(255, 255, 255, 0.65); }}
    .stat > div:last-child {{ border-right: none; }}
    .stat strong {{
      display: block;
      font-family: 'Noto Serif JP', serif;
      font-size: clamp(1.15rem, 3vh, 1.45rem);
      font-weight: 600;
      color: var(--ink);
      margin-top: 0.15rem;
      line-height: 1.1;
    }}
    .stat span {{ font-size: 0.58rem; letter-spacing: 0.12em; color: var(--muted); text-transform: uppercase; }}
    .qr-wrap {{
      margin: 0.35rem auto;
      width: min(108px, 28vw);
      aspect-ratio: 1;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
      flex-shrink: 0;
    }}
    .qr-wrap img {{ width: 76%; height: auto; display: block; border-radius: 4px; }}
    .addr {{
      font-family: ui-monospace, monospace;
      font-size: 0.58rem;
      word-break: break-all;
      color: var(--ink);
      background: rgba(255, 255, 255, 0.9);
      padding: 0.45rem 0.5rem;
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.07);
      line-height: 1.35;
      max-height: 4.5rem;
      overflow-y: auto;
      flex-shrink: 1;
    }}
    .mini {{
      font-size: 0.62rem;
      color: var(--muted);
      margin-top: 0.35rem;
      text-align: center;
      flex-shrink: 0;
    }}
    .explorer {{ font-size: 0.68rem; margin-top: 0.25rem; }}
    textarea {{
      width: 100%;
      padding: 0.5rem 0.55rem;
      border-radius: 10px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      background: rgba(255, 255, 255, 0.95);
      font-family: ui-monospace, monospace;
      font-size: 0.72rem;
      min-height: 2.75rem;
      max-height: 5rem;
      resize: vertical;
    }}
    button[type="submit"] {{
      width: 100%;
      margin-top: 0.45rem;
      padding: 0.55rem;
      border-radius: 10px;
      border: none;
      background: linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%);
      color: #faf8f5;
      font-family: 'Zen Kaku Gothic New', sans-serif;
      font-size: 0.78rem;
      letter-spacing: 0.18em;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
    }}
    button[type="submit"]:hover {{ filter: brightness(1.08); }}
    a {{ color: var(--ink); text-underline-offset: 3px; }}
    .alert {{ border-radius: 10px; border: 1px solid rgba(139, 115, 85, 0.45); padding: 0.5rem 0.65rem; margin-bottom: 0.45rem; background: rgba(255, 255, 255, 0.85); color: #4a4035; font-size: 0.75rem; flex-shrink: 0; }}
    .alert.err {{ border-color: rgba(166, 124, 124, 0.55); color: #5c3a3a; }}
    .prebox {{
      font-family: ui-monospace, monospace;
      font-size: 0.75rem;
      line-height: 1.5;
      border-radius: 10px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 0.85rem;
      margin: 0;
      background: rgba(255, 255, 255, 0.95);
      white-space: pre-wrap;
      word-break: break-all;
      overflow-wrap: anywhere;
      max-width: 100%;
    }}
    .prebox.tall {{ max-height: min(50vh, 18rem); overflow-y: auto; }}
    .subwrap {{ max-width: 28rem; margin: 0 auto; padding: 1rem; }}
  </style>
</head>
<body class="{body_class}">
<div class="bg" aria-hidden="true"></div>
<div class="page">
<div class="glass">
"""


ZEN_SHELL_CLOSE = """
</div>
</div>
</body>
</html>
"""


def _node_env():
    """Pass env to Node. Drop stray ARKADE_MNEMONIC only when a real phrase file is used (local)."""
    env = os.environ.copy()
    path = env.get("ARKADE_MNEMONIC_FILE")
    if path:
        ap = path if os.path.isabs(path) else os.path.normpath(os.path.join(_script_dir, path))
        if os.path.isfile(ap):
            env.pop("ARKADE_MNEMONIC", None)
    return env


def _faucet_info():
    r = subprocess.run(
        ["node", "faucet_info.js"],
        capture_output=True,
        text=True,
        cwd=os.path.dirname(os.path.abspath(__file__)) or ".",
        env=_node_env(),
    )
    raw = (r.stdout or "").strip()
    if not raw:
        return {"error": r.stderr or "No output from faucet_info.js"}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"error": raw[:500]}


def request_root_url():
    u = os.environ.get("FAUCET_PUBLIC_URL", "").rstrip("/")
    if u:
        return u if u.endswith("/") else u + "/"
    return request.url_root


@app.route("/health")
def health():
    """Fast 200 for load balancers (Render, etc.) — do not call Node here."""
    return "ok", 200, {"Content-Type": "text/plain; charset=utf-8"}


@app.route("/")
def home():
    info = _faucet_info()
    err = info.get("error")
    if err:
        body = (
            '<div class="subwrap">'
            '<div class="brand"><h1>Arkade faucet</h1><p class="sub">静 · stillness</p></div>'
            f'<div class="alert err">Could not load wallet. Check <code>phrase.txt</code> and run '
            f'<code>unset ARKADE_MNEMONIC</code> then <code>./start_faucet.sh</code></div>'
            f'<pre class="prebox tall">{html.escape(err)}</pre>'
            "</div>"
        )
        return _zen_shell_open("sub") + body + ZEN_SHELL_CLOSE, 500

    addr = info["address"]
    bal = info["balance"]
    drip = info.get("dripAmount", 1)
    explorer = info.get("explorerUrl", "")
    b64 = info.get("qrPngBase64", "")

    boarding = bal.get("boarding", {}).get("total", 0)
    available = bal.get("available", 0)
    total = bal.get("total", 0)

    qr_img = ""
    if b64:
        qr_img = (
            f'<div class="qr-wrap"><img src="data:image/png;base64,{html.escape(b64)}" '
            f'width="220" height="220" alt="" /></div>'
        )

    invalid = request.args.get("invalid")
    alert = ""
    if invalid:
        alert = (
            '<div class="alert err">Use a full Ark address starting with '
            "<code>ark1</code> (from your wallet’s Receive screen).</div>"
        )

    page = (
        _zen_shell_open("home")
        + '<div class="brand"><h1>Arkade faucet</h1><p class="sub">静 · stillness</p></div>'
        + alert
        + '<div class="grid">'
        + '<div class="col">'
        + '<div class="stat">'
        + f"<div><span>Available · sats</span><strong>{available}</strong></div>"
        + f"<div><span>Drip · sats</span><strong>{drip}</strong></div>"
        + "</div>"
        + '<p class="hint">Scan QR with an Ark-capable wallet — you <strong>send</strong> to refill the faucet.</p>'
        + qr_img
        + f'<div class="addr">{html.escape(addr)}</div>'
        + f'<p class="explorer"><a href="{html.escape(explorer)}" target="_blank" rel="noopener">Explorer</a></p>'
        + "</div>"
        + '<div class="col">'
        + "<h2>Receive</h2>"
        + '<p class="lead">Paste your <code>ark1…</code> address.</p>'
        + '<form method="post" action="/claim">'
        + '<textarea name="address" placeholder="ark1…" required autocomplete="off" rows="2"></textarea>'
        + '<button type="submit">Request drip</button>'
        + "</form>"
        + "</div>"
        + "</div>"
        + f'<p class="mini">Boarding {boarding} · Total {total}</p>'
        + ZEN_SHELL_CLOSE
    )
    return page


@app.route("/claim", methods=["POST"])
@_limiter.limit("10 per hour")
def claim_post():
    address = (request.form.get("address") or "").strip()
    if not address.startswith("ark1"):
        return redirect(url_for("home", invalid=1))
    return redirect(url_for("claim", user_address=address))


@app.route("/claim/<user_address>")
@_limiter.limit("10 per hour")
def claim(user_address):
    result = subprocess.run(
        ["node", "arkade_logic.js", user_address],
        capture_output=True,
        text=True,
        cwd=os.path.dirname(os.path.abspath(__file__)) or ".",
        env=_node_env(),
    )

    ok = "SUCCESS" in result.stdout
    detail = html.escape(result.stdout + result.stderr)

    if ok:
        inner = (
            '<div class="subwrap">'
            f'<div class="brand"><h1>Sent</h1><p class="sub">受 · received</p></div>'
            f'<p class="lead">Check your wallet.</p>'
            f'<pre class="prebox">{detail}</pre>'
            f'<p style="margin-top:1.25rem"><a href="{url_for("home")}">← Back</a></p>'
            "</div>"
        )
        return _zen_shell_open("sub") + inner + ZEN_SHELL_CLOSE

    inner = (
        '<div class="subwrap">'
        f'<div class="brand"><h1>Not sent</h1><p class="sub">間 · pause</p></div>'
        f'<div class="alert err">Could not complete drip (balance, network, or limits).</div>'
        f'<pre class="prebox tall">{detail}</pre>'
        f'<p style="margin-top:1.25rem"><a href="{url_for("home")}">← Back</a></p>'
        "</div>"
    )
    return _zen_shell_open("sub") + inner + ZEN_SHELL_CLOSE, 400


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
