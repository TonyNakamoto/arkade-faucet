import html
import json
import os
import sqlite3
import subprocess
import time
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
_BG_IMAGE = "/static/bg-zen-garden.png"
_ADDR_LIMIT_MAX = int(os.environ.get("FAUCET_ADDR_MAX_24H", "5"))
_ADDR_LIMIT_WINDOW_HOURS = float(os.environ.get("FAUCET_ADDR_WINDOW_HOURS", "24"))
_ADDR_LIMIT_WINDOW_SECONDS = int(_ADDR_LIMIT_WINDOW_HOURS * 3600)
_CLAIM_RETENTION_DAYS = int(os.environ.get("FAUCET_CLAIM_RETENTION_DAYS", "7"))
_CLAIM_RETENTION_SECONDS = _CLAIM_RETENTION_DAYS * 24 * 3600


@app.after_request
def _set_csp_headers(resp):
    resp.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; "
        "img-src 'self' data: https:; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    )
    return resp


def _zen_shell_open(body_class: str) -> str:
    """Opening HTML through <div class="glass"> — pair with _zen_shell_close()."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>arkade faucet</title>
  <link rel="icon" href="/static/favicon.svg?v=1" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@600&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap" rel="stylesheet" />
  <style>
    :root {{
      --ink: #0d0d0d;
      --muted: #5c5954;
      --glass: rgba(255, 253, 249, 0.78);
      --glass-edge: rgba(255, 255, 255, 0.55);
      --shadow: 0 12px 48px rgba(15, 20, 25, 0.12);
      --chip-bg: rgba(255, 255, 255, 0.82);
      --chip-border: rgba(0, 0, 0, 0.12);
      --field-bg: rgba(255, 255, 255, 0.95);
      --field-border: rgba(0, 0, 0, 0.1);
      --panel-bg: rgba(255, 253, 249, 0.82);
      --panel-edge: rgba(255, 255, 255, 0.55);
      --bg-base: #e8e4dc;
      --bg-grad-1: rgba(252, 250, 246, 0.88);
      --bg-grad-2: rgba(240, 235, 228, 0.82);
      --bg-grad-3: rgba(248, 244, 238, 0.9);
      --fs-bump: 0.2rem;
    }}
    body.theme-dark {{
      --ink: #f2eee8;
      --muted: #c6bcae;
      --glass: rgba(26, 25, 24, 0.78);
      --glass-edge: rgba(255, 255, 255, 0.14);
      --shadow: 0 14px 52px rgba(0, 0, 0, 0.45);
      --chip-bg: rgba(32, 30, 28, 0.88);
      --chip-border: rgba(255, 255, 255, 0.2);
      --field-bg: rgba(30, 28, 26, 0.95);
      --field-border: rgba(255, 255, 255, 0.2);
      --stat-bg: rgba(30, 28, 26, 0.95);
      --panel-bg: rgba(30, 28, 26, 0.9);
      --panel-edge: rgba(255, 255, 255, 0.16);
      --bg-base: #11110f;
      --bg-grad-1: rgba(24, 24, 22, 0.88);
      --bg-grad-2: rgba(19, 18, 17, 0.84);
      --bg-grad-3: rgba(14, 13, 12, 0.9);
    }}
    * {{ box-sizing: border-box; }}
    html {{ height: 100%; }}
    body {{
      margin: 0;
      color: var(--ink);
      font-family: 'Zen Kaku Gothic New', system-ui, sans-serif;
      font-size: clamp(calc(0.8rem + var(--fs-bump)), 1.1vw, calc(0.95rem + var(--fs-bump)));
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
      text-transform: lowercase;
    }}
    code, .prebox, textarea, .addr, .stat strong {{
      text-transform: none;
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
    body.sub.sent-view .glass {{
      width: fit-content;
      max-width: calc(100vw - 2rem);
      flex: 0 1 auto;
    }}
    .bg {{
      position: fixed;
      inset: 0;
      z-index: -1;
      background-color: var(--bg-base);
      background-image:
        linear-gradient(165deg, var(--bg-grad-1) 0%, var(--bg-grad-2) 45%, var(--bg-grad-3) 100%),
        url("{_BG_IMAGE}");
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
    .home-link {{
      position: fixed;
      top: 0.8rem;
      left: 0.8rem;
      z-index: 7;
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      border: 1px solid var(--chip-border);
      background: var(--chip-bg);
      color: var(--ink);
      text-decoration: none;
      transition: transform 120ms ease, filter 120ms ease;
    }}
    .home-link:hover {{ transform: translateY(-1px); filter: brightness(1.04); }}
    .home-link:focus-visible {{ outline: 2px solid rgba(0, 0, 0, 0.25); outline-offset: 2px; }}
    .home-link svg {{ width: 19px; height: 19px; display: block; }}
    .theme-toggle {{
      position: fixed;
      top: 0.8rem;
      right: 0.8rem;
      z-index: 7;
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      border: 1px solid var(--chip-border);
      background: var(--chip-bg);
      color: var(--ink);
      text-decoration: none;
      transition: transform 120ms ease, filter 120ms ease;
      cursor: pointer;
      padding: 0;
      font-size: 18px;
      line-height: 1;
      transform: rotate(-90deg);
    }}
    .theme-toggle:hover {{ transform: translateY(-1px) rotate(-90deg); filter: brightness(1.04); }}
    .theme-toggle:focus-visible {{ outline: 2px solid rgba(0, 0, 0, 0.25); outline-offset: 2px; }}
    body.home .page {{
      height: 100vh;
      max-height: 100vh;
    }}
    .glass {{
      width: min(calc(19rem * 2 / 3 * 2 + 12cm), calc(100vw - 2rem));
      max-width: min(calc(19rem * 2 / 3 * 2 + 12cm), calc(100vw - 2rem));
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
      font-family: 'Zen Kaku Gothic New', system-ui, sans-serif;
      font-weight: 700;
      font-size: clamp(calc(1.16rem + var(--fs-bump)), 2.5vh, calc(1.38rem + var(--fs-bump)));
      letter-spacing: 0.2em;
      margin: 0;
    }}
    .sub {{
      font-size: clamp(calc(0.65rem + var(--fs-bump)), 1.2vh, calc(0.72rem + var(--fs-bump)));
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
      body.home {{ height: 100dvh; max-height: 100dvh; overflow: hidden; }}
      body.home .page {{ height: 100dvh; max-height: 100dvh; }}
      .page {{
        min-height: 100dvh;
        align-items: center;
        padding: 0.45rem 0.42rem;
      }}
      .home-link {{ top: 0.2rem; }}
      .theme-toggle {{ top: 0.2rem; right: 0.2rem; }}
      .creator-links {{ bottom: 0.2rem; }}
      .resource-links {{ bottom: 0.2rem; }}
      .glass {{ max-height: none; overflow: visible; }}
      .grid {{ grid-template-columns: 1fr; }}
    }}
    h2 {{
      font-family: 'Zen Kaku Gothic New', system-ui, sans-serif;
      font-weight: 400;
      font-size: calc(0.68rem + var(--fs-bump));
      letter-spacing: 0.24em;
      color: var(--muted);
      margin: 0 0 0.35rem;
    }}
    p {{ margin: 0 0 0.45rem; color: var(--muted); font-size: calc(0.82rem + var(--fs-bump)); }}
    p.lead {{ color: var(--ink); font-size: calc(0.78rem + var(--fs-bump)); line-height: 1.5; }}
    p.hint {{ font-size: calc(0.68rem + var(--fs-bump)); line-height: 1.4; text-align: center; margin: 0.22rem 0; }}
    .receive-title {{
      margin: 0 0 0.22rem;
      text-align: center;
      color: var(--ink);
      font-family: 'Zen Kaku Gothic New', system-ui, sans-serif;
      font-weight: 700;
      font-size: calc(0.92rem + var(--fs-bump));
      letter-spacing: 0.14em;
      line-height: 1.15;
    }}
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
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid rgba(0, 0, 0, 0.07);
      flex-shrink: 0;
    }}
    .stat > div {{ padding: 0.42rem 0.5rem; border-right: 1px solid rgba(0, 0, 0, 0.06); background: rgba(255, 255, 255, 0.65); text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 0.14rem; }}
    .stat > div:last-child {{ border-right: none; }}
    .stat strong {{
      display: block;
      font-family: 'Noto Serif JP', serif;
      font-size: clamp(0.72rem, 1.75vh, 0.9rem);
      font-weight: 600;
      color: var(--ink);
      margin: 0;
      line-height: 1;
      text-align: center;
    }}
    .stat span {{ display: block; margin: 0; font-size: calc(0.73rem + var(--fs-bump)); line-height: 1; letter-spacing: 0.06em; color: var(--muted); font-family: 'Zen Kaku Gothic New', system-ui, sans-serif; white-space: nowrap; }}
    .col-receive {{ text-align: center; align-items: center; }}
    .col-receive h2 {{ margin: 0 0 0.22rem; font-size: calc(0.8rem + var(--fs-bump)); }}
    .col-receive .lead {{ margin-bottom: 0.28rem; font-size: calc(0.68rem + var(--fs-bump)); text-align: center; }}
    .qr-wrap {{
      margin: 0.22rem auto 0.35rem;
      width: min(calc(104px + 0.353cm), calc(29vw + 0.353cm));
      aspect-ratio: 1;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.34rem;
      border-radius: 12px;
      border: 1px solid rgba(122, 112, 98, 0.18);
      background: linear-gradient(180deg, rgba(243, 237, 228, 0.88), rgba(236, 229, 219, 0.84));
      box-shadow: 0 3px 10px rgba(40, 34, 28, 0.06);
      flex-shrink: 0;
      overflow: hidden;
    }}
    .qr-wrap::before {{
      content: "";
      position: absolute;
      inset: 0;
      background:
        repeating-radial-gradient(
          circle at 18% 16%,
          rgba(122, 112, 98, 0.07) 0 1px,
          transparent 1px 10px
        ),
        repeating-radial-gradient(
          circle at 78% 82%,
          rgba(122, 112, 98, 0.05) 0 1px,
          transparent 1px 12px
        );
      pointer-events: none;
      opacity: 0.9;
    }}
    .qr-wrap::after {{
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 11% 86%, rgba(120, 139, 96, 0.26) 0 4px, transparent 4px),
        radial-gradient(circle at 88% 14%, rgba(120, 139, 96, 0.22) 0 3px, transparent 3px);
      pointer-events: none;
    }}
    .qr-wrap img {{
      width: 100%;
      height: auto;
      display: block;
      border-radius: 4px;
      background: #f9f8f5;
      position: relative;
      z-index: 1;
    }}
    .addr {{
      font-family: ui-monospace, monospace;
      font-size: calc(0.58rem + var(--fs-bump));
      overflow-wrap: anywhere;
      white-space: normal;
      color: var(--ink);
      background: var(--field-bg);
      padding: 0.45rem 0.5rem;
      padding-top: 8px;
      border-radius: 8px;
      border: 1px solid var(--field-border);
      line-height: 1.5;
      height: auto;
      min-height: fit-content;
      max-height: none;
      overflow-y: visible;
      flex-shrink: 1;
    }}
    .addr-row {{
      width: 100%;
      margin-top: 0.35rem;
    }}
    .addr-row .addr {{
      width: 100%;
      margin: 0;
      padding: 0.62rem 0.55rem;
      border-radius: 10px;
      border: 1px solid var(--field-border);
      background: var(--field-bg);
      font-family: ui-monospace, monospace;
      font-size: calc(0.72rem + var(--fs-bump));
      line-height: normal;
      font-weight: 400;
      color: #5c5954;
      letter-spacing: normal;
      opacity: 1;
      text-align: center;
      min-height: 0;
      user-select: none;
      cursor: pointer;
    }}
    .addr-row .addr:active {{ filter: brightness(0.98); }}
    .addr-actions {{
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      margin-top: 0.28rem;
    }}
    .btn-copy-zen {{
      appearance: none;
      border: 0;
      padding: 0;
      margin: 0;
      background: transparent;
      color: var(--ink);
      text-decoration: none;
      font: inherit;
      text-align: center;
      cursor: pointer;
    }}
    .btn-copy-zen:hover {{ filter: brightness(0.97); }}
    .addr-actions a {{ text-decoration: none; }}
    .mini {{
      font-size: calc(0.62rem + var(--fs-bump));
      color: var(--muted);
      margin-top: 0.35rem;
      text-align: center;
      flex-shrink: 0;
    }}
    .explorer-link {{
      display: flex;
      align-items: center;
      justify-content: center;
      height: 1.7rem;
      padding: 0 0.5rem;
      border-radius: 999px;
      border: 1px solid var(--field-border);
      background: var(--field-bg);
      color: var(--ink);
      font-size: calc(0.68rem + var(--fs-bump));
      font-weight: 400;
      letter-spacing: 0;
      text-decoration: none;
      overflow: visible;
      transition: background 120ms ease, border-color 120ms ease;
    }}
    .explorer-label {{
      display: inline-block;
      line-height: 1;
      transform: translateY(-5%);
    }}
    .explorer-link,
    .explorer-link:hover,
    .explorer-link:focus,
    .explorer-link:visited {{ text-decoration: none; }}
    .explorer-link:hover {{ filter: brightness(0.98); }}
    .explorer-link:active {{ filter: brightness(0.95); }}
    .back-link,
    .back-link:hover,
    .back-link:focus,
    .back-link:visited {{
      color: var(--ink);
      text-decoration: none;
    }}
    textarea {{
      width: 100%;
      padding: 0.62rem 0.55rem;
      border-radius: 10px;
      border: 1px solid var(--field-border);
      background: var(--field-bg);
      color: var(--ink);
      font-family: ui-monospace, monospace;
      font-size: calc(0.72rem + var(--fs-bump));
      height: auto;
      min-height: 0;
      max-height: none;
      overflow: hidden;
      word-break: break-all;
      overflow-wrap: anywhere;
      resize: none;
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
      font-size: calc(0.72rem + var(--fs-bump));
      letter-spacing: 0.18em;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
    }}
    button[type="submit"]:hover {{ filter: brightness(1.08); }}
    a {{ color: var(--ink); text-underline-offset: 3px; }}
    .alert {{ border-radius: 10px; border: 1px solid rgba(139, 115, 85, 0.45); padding: 0.5rem 0.65rem; margin-bottom: 0.45rem; background: rgba(255, 255, 255, 0.85); color: #4a4035; font-size: calc(0.75rem + var(--fs-bump)); flex-shrink: 0; }}
    .alert.err {{ border-color: rgba(166, 124, 124, 0.55); color: #5c3a3a; }}
    .prebox {{
      font-family: ui-monospace, monospace;
      font-size: calc(0.75rem + var(--fs-bump));
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
    .sentwrap {{
      width: fit-content;
      max-width: none;
      min-width: 0;
      margin: 0 auto;
      padding: 2rem 4rem;
    }}
    @media (max-width: 720px) {{
      .sentwrap {{
        width: auto;
        padding: 1.25rem 1.4rem;
      }}
    }}
    .creator-links {{
      position: fixed;
      right: 0.8rem;
      bottom: 0.8rem;
      z-index: 5;
      margin: 0;
      display: flex;
      gap: 0.55rem;
      pointer-events: auto;
    }}
    .creator-links a {{
      width: 30px;
      height: 30px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: var(--chip-bg);
      border: 1px solid var(--chip-border);
      color: var(--ink);
      text-decoration: none;
      transition: transform 120ms ease, filter 120ms ease;
    }}
    .creator-links a:hover {{ transform: translateY(-1px); filter: brightness(1.04); }}
    .creator-links svg {{ width: 18px; height: 18px; display: block; }}
    .creator-links a img {{ width: 18px; height: 18px; display: block; object-fit: contain; }}
    .resource-links {{
      position: fixed;
      left: 0.8rem;
      bottom: 0.8rem;
      z-index: 5;
      margin: 0;
      display: flex;
      gap: 0.55rem;
      pointer-events: auto;
    }}
    .resource-links a {{
      width: 30px;
      height: 30px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: var(--chip-bg);
      border: 1px solid var(--chip-border);
      color: var(--ink);
      text-decoration: none;
      transition: transform 120ms ease, filter 120ms ease;
    }}
    .resource-links a:hover {{ transform: translateY(-1px); filter: brightness(1.04); }}
    .resource-links svg {{ width: 18px; height: 18px; display: block; }}
    .resource-links a img {{
      width: 18px;
      height: 18px;
      display: block;
      object-fit: contain;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }}
    .resource-links a img.arkade-a {{
      transform: translateX(-1px);
    }}
    body.theme-dark .icon-invert-dark {{
      filter: invert(1);
    }}
    .stone-offering {{
      position: relative;
      z-index: 5;
      width: 30px;
      height: 30px;
      flex-shrink: 0;
      display: block;
      pointer-events: auto;
    }}
    .stone-btn {{
      position: absolute;
      left: 0;
      bottom: 0;
      width: 30px;
      height: 30px;
      margin: 0;
      padding: 0;
      border: 1px solid rgba(0, 0, 0, 0.12);
      background: var(--chip-bg);
      border-radius: 999px;
      cursor: pointer;
      color: var(--ink);
      opacity: 0.92;
      line-height: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: transform 120ms ease, filter 120ms ease, opacity 160ms ease;
    }}
    .stone-btn:hover {{ transform: translateY(-1px); filter: brightness(1.04); opacity: 1; }}
    .stone-btn:focus-visible {{ outline: 2px solid rgba(0, 0, 0, 0.25); outline-offset: 2px; }}
    .stone-btn svg {{ width: 21px; height: 21px; display: block; }}
    .stone-panel {{
      position: fixed;
      right: 0.8rem;
      bottom: 2.85rem;
      left: auto;
      top: auto;
      width: min(15.25rem, calc(100vw - 2rem));
      height: fit-content;
      max-height: none;
      overflow: visible;
      padding: 0.45rem 0.55rem;
      border-radius: 14px;
      background: var(--panel-bg);
      border: 1px solid var(--panel-edge);
      box-shadow: 0 10px 36px rgba(15, 20, 25, 0.14);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      opacity: 0;
      visibility: hidden;
      transform: translateY(6px) scale(0.98);
      transform-origin: bottom right;
      transition: opacity 180ms ease, transform 180ms ease, visibility 180ms;
    }}
    @media (max-width: 720px) {{
      .stone-panel {{
        right: 0.55rem;
        bottom: 2.55rem;
        width: min(14.5rem, calc(100vw - 1.1rem));
      }}
    }}
    .stone-offering.stone-offering--open .stone-panel {{
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }}
    .stone-tip {{
      margin: 0 0 0.4rem;
      font-size: calc(0.72rem + var(--fs-bump));
      line-height: 1.45;
      color: var(--muted);
      text-align: center;
    }}
    .stone-qr {{
      margin: 0.25rem auto 0.45rem;
      width: min(7.4rem, 42vw);
      aspect-ratio: 1;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.3rem;
      border-radius: 10px;
      border: 1px solid rgba(122, 112, 98, 0.18);
      background: linear-gradient(180deg, rgba(243, 237, 228, 0.88), rgba(236, 229, 219, 0.84));
      overflow: hidden;
    }}
    .stone-qr::before {{
      content: "";
      position: absolute;
      inset: 0;
      background:
        repeating-radial-gradient(
          circle at 24% 24%,
          rgba(122, 112, 98, 0.07) 0 1px,
          transparent 1px 9px
        );
      pointer-events: none;
    }}
    .stone-qr::after {{
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 14% 84%, rgba(120, 139, 96, 0.24) 0 3px, transparent 3px),
        radial-gradient(circle at 86% 16%, rgba(120, 139, 96, 0.2) 0 3px, transparent 3px);
      pointer-events: none;
    }}
    .stone-qr img {{
      width: 100%;
      height: auto;
      display: block;
      border-radius: 6px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      background: #f9f8f5;
      padding: 0.14rem;
      position: relative;
      z-index: 1;
    }}
    .stone-panel .addr {{
      margin: 0;
      max-height: none;
      overflow: visible;
      width: 100%;
      font-size: calc(0.52rem + var(--fs-bump));
      text-align: center;
      user-select: none;
      cursor: pointer;
      appearance: none;
    }}
    .stone-panel .btn-copy {{
      appearance: none;
      border: 0;
      background: transparent;
      padding: 0;
      margin: 0.35rem auto 0;
      display: block;
      color: var(--ink);
      font: inherit;
      font-size: calc(0.68rem + var(--fs-bump));
      text-decoration: none;
      cursor: pointer;
    }}
    body.theme-dark .stat > div {{
      background: var(--stat-bg);
      border-right-color: var(--field-border);
    }}
  </style>
</head>
<body class="{body_class}">
<div class="bg" aria-hidden="true"></div>
<a class="home-link" href="https://zenark.onrender.com/" aria-label="home">
<svg viewBox="0 0 24 24" aria-hidden="true">
<path fill="currentColor" d="M4 9.2h16c.5 0 .9.4.9.9s-.4.9-.9.9h-1.7v1.7h1.2c.5 0 .9.4.9.9s-.4.9-.9.9H4.5c-.5 0-.9-.4-.9-.9s.4-.9.9-.9h1.2V11H4c-.5 0-.9-.4-.9-.9s.4-.9.9-.9Zm2.7 1.8v1.7h10.6V11H6.7Zm-1.2 5.1h13c.5 0 .9.4.9.9s-.4.9-.9.9h-13c-.5 0-.9-.4-.9-.9s.4-.9.9-.9Zm1.8-9.6 2.3-2.4c1.3-1.3 3.4-1.3 4.7 0l2.4 2.4H7.3Zm3.5-1.1-.6.6h3.7l-.6-.6c-.6-.6-1.7-.6-2.3 0Z"/>
</svg>
</a>
<button type="button" class="theme-toggle" id="theme-toggle" aria-label="toggle dark mode" aria-pressed="false">☯</button>
<div class="resource-links" aria-label="arkade resources">
<a href="https://docs.arkadeos.com/" target="_blank" rel="noopener noreferrer" aria-label="arkade docs">
<img class="arkade-a icon-invert-dark" src="/static/arkade-a-bw-clear.png" width="18" height="18" alt="" />
</a>
<a href="https://arkade.money/" target="_blank" rel="noopener noreferrer" aria-label="arkade wallet">
<svg viewBox="0 0 24 24" aria-hidden="true">
<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
<circle cx="12" cy="12" r="9"/>
<circle cx="12" cy="12" r="6.6" opacity="0.35"/>
</g>
<text x="12" y="15.2" text-anchor="middle" font-size="10.5" font-family="ui-sans-serif, system-ui, sans-serif" fill="currentColor">B</text>
</svg>
</a>
</div>
<div class="page">
<div class="glass">
"""


ZEN_SHELL_CLOSE_GLASS_PAGE = """
</div>
</div>
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


def _claims_db_path() -> str:
    return os.path.join(_script_dir, "faucet_claims.db")


def _ensure_claims_table() -> None:
    with sqlite3.connect(_claims_db_path()) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS claims (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                address TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_claims_address_time ON claims(address, created_at)")
        conn.commit()


def _address_claims_in_window(address: str, now_ts: int | None = None) -> int:
    _ensure_claims_table()
    now = now_ts or int(time.time())
    since_ts = now - _ADDR_LIMIT_WINDOW_SECONDS
    with sqlite3.connect(_claims_db_path()) as conn:
        row = conn.execute(
            "SELECT COUNT(*) FROM claims WHERE address = ? AND created_at >= ?",
            (address, since_ts),
        ).fetchone()
    return int(row[0] if row else 0)


def _record_successful_claim(address: str, now_ts: int | None = None) -> None:
    _ensure_claims_table()
    ts = now_ts or int(time.time())
    prune_before = ts - _CLAIM_RETENTION_SECONDS
    with sqlite3.connect(_claims_db_path()) as conn:
        conn.execute(
            "INSERT INTO claims(address, created_at) VALUES (?, ?)",
            (address, ts),
        )
        conn.execute("DELETE FROM claims WHERE created_at < ?", (prune_before,))
        conn.commit()


def _parse_success_txid(stdout: str) -> str | None:
    for line in (stdout or "").splitlines():
        s = line.strip()
        if s.startswith("SUCCESS:"):
            return s[len("SUCCESS:") :].strip() or None
    return None


def _tx_explorer_url(txid: str) -> str:
    base = (os.environ.get("ARK_TX_EXPLORER_BASE") or "https://arkade.space/tx").rstrip("/")
    return f"{base}/{txid}"


_DONATION_ARK_ADDRESS = (
    "ark1qq4hfssprtcgnjzf8qlw2f78yvjau5kldfugg29k34y7j96q2w4t57000mamrghjsud6dw0kyl6zurqekz5kgee80hztenk47p7g6d6xa8gwdn"
)


def _stone_offering_html() -> str:
    addr = _DONATION_ARK_ADDRESS
    short_addr = _short_addr(addr, 12)
    addr_title = html.escape(addr, quote=True)
    addr_copy = html.escape(addr, quote=True)
    qr_url = html.escape(
        f"https://api.qrserver.com/v1/create-qr-code/?size=220x220&data={addr}",
        quote=True,
    )
    return (
        '<div class="stone-offering" id="stone-offering">'
        '<button type="button" class="stone-btn" id="stone-btn" aria-expanded="false" '
        'aria-controls="stone-panel" aria-label="garden offering — tip address">'
        '<svg viewBox="0 0 48 48" aria-hidden="true">'
        '<path fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" '
        'stroke-linejoin="round" opacity="0.88" '
        'd="M 12 34 C 2 21  9.5 5.5  26 6 c 17 0.5  25.5 17  20 29.5 C 42 40  28 44  17 38 '
        'c -4.5 -2.5 -7.5 -5.5 -5 -4"/>'
        '<path fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" opacity="0.35" '
        'd="M 18 14 c 8 -3  16 2  18 10"/>'
        "</svg></button>"
        '<div class="stone-panel" id="stone-panel" role="region" aria-label="tip address" aria-hidden="true">'
        '<p class="stone-tip">maintain the garden. tip via ark.</p>'
        f'<div class="stone-qr"><img src="{qr_url}" width="220" height="220" alt="donation address qr code" /></div>'
        f'<button type="button" class="addr" data-copy="{addr_copy}" title="{addr_title}" aria-label="copy full tip address">{html.escape(short_addr)}</button>'
        "</div></div>"
    )


def _zen_shell_footer_html() -> str:
    return (
        '<script defer src="/static/faucet.js"></script>'
        '<div class="creator-links" aria-label="creator links">'
        '<a href="https://x.com/firstworldpeace" target="_blank" rel="noopener noreferrer" aria-label="x (twitter)">'
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23.2 22h-6.4l-5-6.5L6.1 22H3l7.3-8.4L.8 2h6.5l4.5 5.9L18.9 2zm-1.1 18h1.8L5.2 3.9H3.3L17.8 20z"/></svg>'
        "</a>"
        '<a href="https://njump.me/npub100763pglp04l4tt8t0scnau9xt5427f8phvcylt2dhmx67nksx2s49szvh" target="_blank" rel="noopener noreferrer" aria-label="nostr">'
        '<img class="icon-invert-dark" src="/static/nostr-ostrich-clear.png" width="18" height="18" alt="" />'
        "</a>"
        + _stone_offering_html()
        + "</div></body></html>"
    )


def zen_shell_close() -> str:
    return ZEN_SHELL_CLOSE_GLASS_PAGE + _zen_shell_footer_html()


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


def _short_addr(addr: str, keep: int = 12) -> str:
    if len(addr) <= (keep * 2 + 3):
        return addr
    return f"{addr[:keep]}...{addr[-keep:]}"


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
            '<div class="brand"><h1>arkade faucet</h1></div>'
            '<div class="alert err">wallet is resting. try again in a moment.</div>'
            "</div>"
        )
        return _zen_shell_open("sub") + body + zen_shell_close(), 500

    addr = info["address"]
    bal = info["balance"]
    drip = info.get("dripAmount", 1)
    explorer = info.get("explorerUrl", "")
    b64 = info.get("qrPngBase64", "")

    available = bal.get("available", 0)
    short_addr = _short_addr(addr, 12)

    qr_img = ""
    if b64:
        qr_img = (
            f'<div class="qr-wrap"><img src="data:image/png;base64,{html.escape(b64)}" '
            f'width="220" height="220" alt="" /></div>'
        )

    invalid = request.args.get("invalid")
    addr_limit = request.args.get("addr_limit")
    alert = ""
    submit_label = "drip"
    submit_attrs = ""
    if addr_limit:
        alert = (
            '<div class="alert err" style="text-align:center">five drops have fallen. even the earth needs time to drink.</div>'
        )
        submit_label = "wait for sunrise"
        submit_attrs = ' disabled aria-disabled="true"'
    elif invalid:
        alert = (
            '<div class="alert err" style="text-align:center">patience. but first, precision</div>'
        )

    page = (
        _zen_shell_open("home")
        + '<div class="brand"><h1>arkade faucet</h1></div>'
        + alert
        + '<div class="grid">'
        + '<div class="col">'
        + '<div class="stat">'
        + f"<div><span>available sats</span><strong>{available}</strong></div>"
        + f"<div><span>drip sats</span><strong>{drip}</strong></div>"
        + "</div>"
        + '<p class="hint">send btc to refill</p>'
        + qr_img
        + '<div class="addr-row">'
        + f'<button type="button" class="addr" data-copy="{html.escape(addr, quote=True)}" title="tap to copy full address" aria-label="copy full faucet address">{html.escape(short_addr)}</button>'
        + "</div>"
        + '<div class="addr-actions">'
        + f'<a class="explorer-link" href="{html.escape(explorer)}" target="_blank" rel="noopener"><span class="explorer-label">explorer</span></a>'
        + "</div>"
        + "</div>"
        + '<div class="col col-receive">'
        + '<p class="receive-title">receive</p>'
        + '<p class="lead">paste your <code>ark1…</code> address</p>'
        + '<form method="post" action="/claim">'
        + '<textarea name="address" placeholder="ark1…" required autocomplete="off" rows="1"></textarea>'
        + f'<button type="submit"{submit_attrs}>{submit_label}</button>'
        + "</form>"
        + "</div>"
        + "</div>"
        + zen_shell_close()
    )
    return page


@app.route("/claim", methods=["POST"])
@_limiter.limit("10 per hour")
def claim_post():
    address = (request.form.get("address") or "").strip()
    if not address.startswith("ark1"):
        return redirect(url_for("home", invalid=1))
    if _address_claims_in_window(address) >= _ADDR_LIMIT_MAX:
        return redirect(url_for("home", addr_limit=1))
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

    raw_detail = (result.stdout or "") + (result.stderr or "")
    ok = "SUCCESS" in result.stdout
    detail = html.escape(raw_detail)

    if ok:
        _record_successful_claim(user_address)
        txid = _parse_success_txid(result.stdout)
        if txid:
            explorer = _tx_explorer_url(txid)
            short_tx = txid if len(txid) <= 20 else f"{txid[:10]}…{txid[-8:]}"
            inner = (
                '<div class="subwrap sentwrap">'
                '<div class="brand"><h1>sent</h1></div>'
                '<div class="addr-actions" style="margin-top:0.5rem">'
                f'<a class="explorer-link" href="{html.escape(explorer)}" target="_blank" rel="noopener noreferrer">'
                '<span class="explorer-label">explorer</span></a>'
                "</div>"
                f'<p class="mini" style="text-align:center;margin-top:0.35rem">{html.escape(short_tx)}</p>'
                f'<p style="margin-top:1.25rem;text-align:center"><a class="back-link" href="{url_for("home")}">back</a></p>'
                "</div>"
            )
            return _zen_shell_open("sub sent-view") + inner + zen_shell_close()
        inner = (
            '<div class="subwrap sentwrap">'
            f'<div class="brand"><h1>sent</h1></div>'
            '<p class="mini" style="text-align:center;margin-top:0.6rem">payment complete</p>'
            f'<p style="margin-top:1.25rem;text-align:center"><a class="back-link" href="{url_for("home")}">back</a></p>'
            "</div>"
        )
        return _zen_shell_open("sub sent-view") + inner + zen_shell_close()

    if "Invalid Ark address" in raw_detail:
        return redirect(url_for("home", invalid=1))

    inner = (
        '<div class="subwrap">'
        f'<div class="brand"><h1>pause</h1></div>'
        '<div class="alert err">flow interrupted. try again soon.</div>'
        f'<p style="margin-top:1.25rem"><a href="{url_for("home")}">← back</a></p>'
        "</div>"
    )
    return _zen_shell_open("sub") + inner + zen_shell_close(), 400


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
