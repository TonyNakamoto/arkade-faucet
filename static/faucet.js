function showManualCopyPopup(text) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.24)";
  overlay.style.zIndex = "9999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "1rem";

  const card = document.createElement("div");
  card.style.width = "min(26rem, 96vw)";
  card.style.background = "rgba(255,253,249,0.96)";
  card.style.border = "1px solid rgba(0,0,0,0.12)";
  card.style.borderRadius = "12px";
  card.style.padding = "0.7rem";
  card.style.boxShadow = "0 12px 36px rgba(15,20,25,0.18)";

  const title = document.createElement("p");
  title.textContent = "copy manually";
  title.style.margin = "0 0 0.35rem";
  title.style.textAlign = "center";
  title.style.color = "#5c5954";
  title.style.fontSize = "0.86rem";

  const area = document.createElement("textarea");
  area.value = text;
  area.readOnly = true;
  area.style.width = "100%";
  area.style.minHeight = "5.4rem";
  area.style.padding = "0.5rem";
  area.style.border = "1px solid rgba(0,0,0,0.12)";
  area.style.borderRadius = "8px";
  area.style.background = "rgba(255,255,255,0.95)";
  area.style.fontFamily = "ui-monospace, monospace";
  area.style.fontSize = "0.78rem";
  area.style.color = "#111";
  area.style.resize = "vertical";

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "close";
  close.style.margin = "0.45rem auto 0";
  close.style.display = "block";
  close.style.border = "0";
  close.style.background = "transparent";
  close.style.color = "#111";
  close.style.cursor = "pointer";

  card.appendChild(title);
  card.appendChild(area);
  card.appendChild(close);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const remove = () => overlay.remove();
  close.addEventListener("click", remove);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) remove();
  });

  area.focus();
  area.select();
}

document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const text = btn.getAttribute("data-copy");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const prev = btn.textContent;
      btn.textContent = "copied";
      setTimeout(() => {
        btn.textContent = prev;
      }, 800);
    } catch {
      btn.textContent = "copy manually";
      showManualCopyPopup(text);
    }
  });
});

(() => {
  const storageKey = "zen-theme";
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  const saved = localStorage.getItem(storageKey);

  const applyTheme = (theme) => {
    const dark = theme === "dark";
    document.documentElement.classList.toggle("theme-dark", dark);
    document.body.classList.toggle("theme-dark", dark);
    toggle.setAttribute("aria-pressed", dark ? "true" : "false");
    toggle.setAttribute("aria-label", dark ? "switch to light mode" : "switch to dark mode");
  };

  if (saved === "dark" || saved === "light") {
    applyTheme(saved);
  } else {
    applyTheme("dark");
  }

  toggle.addEventListener("click", () => {
    const dark = !document.body.classList.contains("theme-dark");
    const next = dark ? "dark" : "light";
    localStorage.setItem(storageKey, next);
    applyTheme(next);
  });
})();

(() => {
  const field = document.querySelector('textarea[name="address"]');
  if (!field) return;

  const autosize = () => {
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  };

  autosize();
  field.addEventListener("input", autosize);
})();

(() => {
  const root = document.getElementById("stone-offering");
  const btn = document.getElementById("stone-btn");
  const panel = document.getElementById("stone-panel");
  if (!root || !btn || !panel) return;

  function setOpen(open) {
    root.classList.toggle("stone-offering--open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    panel.setAttribute("aria-hidden", open ? "false" : "true");
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(!root.classList.contains("stone-offering--open"));
  });

  root.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.addEventListener("click", () => {
    setOpen(false);
  });
})();

(() => {
  const isMobile =
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 720px)").matches;
  if (!isMobile) return;

  const THRESHOLD_PX = 72;
  const SHOW_AFTER_PX = 10;

  const holder = document.createElement("div");
  holder.setAttribute("aria-hidden", "true");
  holder.style.cssText = [
    "position:fixed",
    "top:max(10px,env(safe-area-inset-top))",
    "left:50%",
    "transform:translateX(-50%) translateY(0)",
    "opacity:0",
    "pointer-events:none",
    "z-index:6",
    "transition:opacity 0.22s ease",
    "color:inherit",
  ].join(";");
  holder.innerHTML =
    '<svg width="28" height="28" viewBox="0 0 40 40" style="display:block;overflow:visible" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M 7 23.5 A 15.2 15.2 0 1 1 23.5 7.2" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>' +
    '<path d="M 23.8 7 L 26 5.2 M 23.8 7 L 25.2 9.4" fill="none" stroke="currentColor" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>' +
    "</svg>";
  document.body.appendChild(holder);

  let startY = 0;
  let startX = 0;
  let tracking = false;
  let maxPull = 0;

  function syncInk() {
    try {
      holder.style.color = getComputedStyle(document.body).color || "";
    } catch {
      /* ignore */
    }
  }

  function setIndicator(pull) {
    if (pull < SHOW_AFTER_PX) {
      holder.style.opacity = "0";
      holder.style.transform = "translateX(-50%) translateY(0)";
      return;
    }
    const t = Math.min(1, pull / THRESHOLD_PX);
    holder.style.opacity = String(0.12 + t * 0.78);
    const drift = Math.min(12, pull * 0.14);
    holder.style.transform = `translateX(-50%) translateY(${drift}px)`;
  }

  function atScrollTop() {
    if (window.scrollY > 2) return false;
    const glass = document.querySelector(".glass");
    if (glass && glass.scrollTop > 2) return false;
    return true;
  }

  function skipTarget(el) {
    if (!el || !el.closest) return true;
    return !!el.closest(
      "button, a, input, textarea, select, label, [role='button']"
    );
  }

  document.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      if (!atScrollTop()) return;
      const t = e.touches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      if (skipTarget(el)) return;
      syncInk();
      startY = t.clientY;
      startX = t.clientX;
      tracking = true;
      maxPull = 0;
      setIndicator(0);
    },
    { passive: true }
  );

  document.addEventListener(
    "touchmove",
    (e) => {
      if (!tracking || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dy = t.clientY - startY;
      const dx = t.clientX - startX;
      if (dy > 0 && dy > Math.abs(dx)) {
        maxPull = Math.max(maxPull, dy);
        setIndicator(maxPull);
      }
    },
    { passive: true }
  );

  window.addEventListener(
    "scroll",
    () => {
      if (!tracking) return;
      if (window.scrollY > 2) {
        tracking = false;
        maxPull = 0;
        setIndicator(0);
      }
    },
    { passive: true }
  );

  function endPull() {
    if (!tracking) return;
    tracking = false;
    if (maxPull >= THRESHOLD_PX && atScrollTop()) {
      location.reload();
      return;
    }
    maxPull = 0;
    setIndicator(0);
  }

  document.addEventListener("touchend", endPull, { passive: true });
  document.addEventListener("touchcancel", endPull, { passive: true });
})();

(() => {
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.has("ln_topup")) {
      u.searchParams.delete("ln_topup");
      u.searchParams.delete("_cb");
      const next = u.pathname + (u.search ? u.search : "") + u.hash;
      window.history.replaceState({}, "", next);
    }
  } catch (_) {
    /* ignore */
  }
})();

(() => {
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.has("stone_ln")) {
      u.searchParams.delete("stone_ln");
      u.searchParams.delete("_cb");
      const next = u.pathname + (u.search ? u.search : "") + u.hash;
      window.history.replaceState({}, "", next);
    }
  } catch (_) {
    /* ignore */
  }
})();

const LN_MIN_SATS = 333;

/** Prefer server-generated PNG — long BOLT11 in qrserver GET URLs can truncate. (Faucet top-up only.) */
function lnTopupInvoiceQrSrc(data) {
  if (data && typeof data.invoiceQrDataUrl === "string" && data.invoiceQrDataUrl.startsWith("data:image/")) {
    return data.invoiceQrDataUrl;
  }
  const inv = data && typeof data.invoice === "string" ? data.invoice : "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(inv)}`;
}

/** BOLT11 `expiry` is seconds of validity from invoice time (boltz-swap decodeInvoice). */
function lnTopupPayWithinMinutes(expiry) {
  if (typeof expiry !== "number" || !Number.isFinite(expiry) || expiry <= 0) return null;
  return Math.max(1, Math.round(expiry / 60));
}

function lnClaimLooksFatal(message) {
  if (!message || typeof message !== "string") return false;
  const m = message.toLowerCase();
  if (
    m.includes("not ready") ||
    m.includes("pending") ||
    m.includes("waiting") ||
    m.includes("will retry")
  ) {
    return false;
  }
  return (
    m.includes("expired") ||
    m.includes("swap not found") ||
    m.includes("unknown swap") ||
    m.includes("invalid swap") ||
    m.includes("invoice expired") ||
    m.includes("incorrect payment details") ||
    m.includes("no longer be claimed")
  );
}

/** Prior request already completed the on-chain claim; treat as success. */
function lnClaimErrorMeansAlreadyDone(message) {
  if (!message || typeof message !== "string") return false;
  const m = message.toLowerCase();
  return m.includes("already spent") || m.includes("vhtlc is already spent");
}

function lnClaimJsonSuccess(data) {
  if (!data || typeof data !== "object" || data.error) return false;
  const t = data.txid;
  if (t == null || t === "") return false;
  const s = typeof t === "string" ? t.trim() : String(t);
  return s.length > 0;
}

(() => {
  const createBtn = document.getElementById("ln-create");
  const amountInput = document.getElementById("ln-amount-input");
  const note = document.getElementById("ln-note");
  const lnAmountRow = document.getElementById("ln-amount-row");
  const invoiceWrap = document.getElementById("ln-invoice");
  const lnSuccess = document.getElementById("ln-success");
  const qrImg = document.getElementById("ln-qr-img");
  const invoiceText = document.getElementById("ln-invoice-text");
  if (!createBtn || !amountInput || !note || !invoiceWrap || !qrImg || !invoiceText) return;

  let pendingSwap = null;
  let autoClaimRunning = false;
  /** @type {ReturnType<typeof setInterval> | null} */
  let balancePollTimer = null;
  let lnTopupCompleted = false;
  /** @type {AbortController | null} */
  let claimAbort = null;
  let sawHiddenWhileClaiming = false;
  /** @type {number | null} */
  let lnPayWithinMins = null;

  const setBusy = (busy) => {
    createBtn.disabled = busy;
    amountInput.disabled = busy;
  };

  const setNote = (text) => {
    note.textContent = text;
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function redirectLnTopup(state) {
    if (balancePollTimer != null) {
      clearInterval(balancePollTimer);
      balancePollTimer = null;
    }
    const u = new URL(window.location.href);
    u.searchParams.set("ln_topup", state);
    u.searchParams.set("_cb", String(Date.now()));
    window.location.replace(u.pathname + u.search + u.hash);
  }

  /**
   * Swap completed: hide invoice/QR immediately, show appreciation, then reload so balance updates.
   * In-page update runs first so a stuck navigation still leaves the right message instead of the QR.
   */
  function showLnTopupSuccessThenReload() {
    if (lnTopupCompleted) return;
    lnTopupCompleted = true;
    if (balancePollTimer != null) {
      clearInterval(balancePollTimer);
      balancePollTimer = null;
    }
    pendingSwap = null;
    lnPayWithinMins = null;
    autoClaimRunning = false;
    invoiceWrap.hidden = true;
    invoiceWrap.setAttribute("aria-hidden", "true");
    qrImg.removeAttribute("src");
    invoiceText.textContent = "";
    invoiceText.setAttribute("data-copy", "");
    if (lnAmountRow) lnAmountRow.hidden = true;
    note.hidden = true;
    if (lnSuccess) lnSuccess.hidden = false;
    createBtn.disabled = true;
    amountInput.disabled = true;
    setBusy(false);
    /* Let the inline appreciation sit; then reload for fresh balance — no ?ln_topup= (avoids duplicate banner). */
    const ms = 4500;
    window.setTimeout(() => {
      window.location.reload();
    }, ms);
  }

  /**
   * When Lightning + Ark settle, the long POST /claim often never finishes in the browser
   * (app switch, OS sleep, dev server). Poll available sats; any increase means top-up landed.
   */
  async function startBalancePollAfterInvoice() {
    try {
      const r = await fetch("/api/faucet/balance", { cache: "no-store" });
      const j = await r.json();
      if (j.error || typeof j.available !== "number") return;
      const baseline = j.available;
      if (balancePollTimer != null) clearInterval(balancePollTimer);
      balancePollTimer = setInterval(async () => {
        if (!pendingSwap || lnTopupCompleted) return;
        try {
          const r2 = await fetch("/api/faucet/balance", { cache: "no-store" });
          const j2 = await r2.json();
          if (j2.error || typeof j2.available !== "number") return;
          if (j2.available > baseline) {
            showLnTopupSuccessThenReload();
          }
        } catch (_) {
          /* ignore */
        }
      }, 5000);
    } catch (_) {
      /* ignore */
    }
  }

  /** Must be > Flask claim subprocess timeout so the browser always gets a response or AbortError. */
  const CLAIM_FETCH_MS = 210000;

  document.addEventListener("visibilitychange", () => {
    if (!autoClaimRunning) return;
    if (document.visibilityState === "hidden") {
      sawHiddenWhileClaiming = true;
      return;
    }
    if (document.visibilityState === "visible" && sawHiddenWhileClaiming && claimAbort) {
      sawHiddenWhileClaiming = false;
      /* After paying in an external wallet app, the in-flight fetch often stalls; abort and retry. */
      claimAbort.abort();
    }
  });

  async function runAutoClaim() {
    if (autoClaimRunning || !pendingSwap) return;
    autoClaimRunning = true;
    let failures = 0;
    const maxFailures = 90;
    while (pendingSwap) {
      setNote(
        lnPayWithinMins != null
          ? `pay within ~${lnPayWithinMins} min — waiting for lightning & ark…`
          : "waiting for lightning & ark settlement…",
      );
      const ac = new AbortController();
      claimAbort = ac;
      const killTimer = setTimeout(() => ac.abort(), CLAIM_FETCH_MS);
      try {
        const res = await fetch("/api/topup/lightning/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pendingSwap }),
          signal: ac.signal,
        });
        const raw = await res.text();
        let data = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch (_) {
          data = {};
        }
        if (lnClaimJsonSuccess(data)) {
          showLnTopupSuccessThenReload();
          return;
        }
        if (res.status === 429) {
          setNote("too many requests — waiting to retry…");
          await sleep(15000);
          continue;
        }
        /* 502/503 from proxies or gunicorn worker kills — retry, do not treat as final failure */
        if (res.status >= 500) {
          failures += 1;
          if (failures >= maxFailures) {
            redirectLnTopup("obstructed");
            return;
          }
          setNote("connection hiccup — retrying settlement…");
          await sleep(4000);
          continue;
        }
        const errStr = data.error || "not ready yet — will retry";
        if (res.status === 400 && lnClaimErrorMeansAlreadyDone(errStr)) {
          showLnTopupSuccessThenReload();
          return;
        }
        if (res.status === 400 && lnClaimLooksFatal(errStr)) {
          redirectLnTopup("obstructed");
          return;
        }
        failures += 1;
        if (failures >= maxFailures) {
          redirectLnTopup("obstructed");
          return;
        }
        setNote(errStr.length > 100 ? errStr.slice(0, 100) + "…" : errStr);
      } catch (e) {
        if (e.name === "AbortError") {
          setNote("still settling — retrying…");
          await sleep(800);
          continue;
        }
        failures += 1;
        if (failures >= maxFailures) {
          redirectLnTopup("obstructed");
          return;
        }
        const msg =
          e.name === "TimeoutError"
            ? "still settling… will retry"
            : e.message || "retrying…";
        setNote(msg);
      } finally {
        clearTimeout(killTimer);
        claimAbort = null;
      }
      await sleep(7000);
    }
    autoClaimRunning = false;
    setBusy(false);
  }

  createBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (autoClaimRunning) return;
    const raw = amountInput.value.trim();
    const amount = Math.round(Number(raw));
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < LN_MIN_SATS) {
      setNote(`enter at least ${LN_MIN_SATS} sats`);
      return;
    }
    setBusy(true);
    setNote("creating lightning invoice...");
    try {
      const res = await fetch("/api/topup/lightning/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setNote(
          `server returned ${res.status} (not JSON). Reload this page from the same host/port as the faucet, or check the server log.`,
        );
        setBusy(false);
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || "could not create invoice");
      }
      pendingSwap = data.pendingSwap;
      lnPayWithinMins = lnTopupPayWithinMinutes(data.expiry);
      lnTopupCompleted = false;
      invoiceText.textContent = data.invoice;
      invoiceText.setAttribute("data-copy", data.invoice);
      qrImg.src = lnTopupInvoiceQrSrc(data);
      invoiceWrap.hidden = false;
      createBtn.disabled = true;
      amountInput.disabled = true;
      void startBalancePollAfterInvoice();
      void runAutoClaim();
    } catch (err) {
      setNote(err.message || "invoice error");
      setBusy(false);
    }
  });
})();

(() => {
  const createBtn = document.getElementById("stone-ln-create");
  const amountInput = document.getElementById("stone-ln-amount-input");
  const note = document.getElementById("stone-ln-note");
  const amountRow = document.getElementById("stone-ln-amount-row");
  const invoiceWrap = document.getElementById("stone-ln-invoice");
  const stoneSuccess = document.getElementById("stone-ln-success");
  const qrImg = document.getElementById("stone-ln-qr-img");
  const invoiceText = document.getElementById("stone-ln-invoice-text");
  if (!createBtn || !amountInput || !note || !invoiceWrap || !qrImg || !invoiceText) return;

  let pendingSwap = null;
  let autoClaimRunning = false;
  /** @type {ReturnType<typeof setInterval> | null} */
  let balancePollTimer = null;
  let stoneTipCompleted = false;
  /** @type {AbortController | null} */
  let claimAbort = null;
  let sawHiddenWhileClaiming = false;

  const setBusy = (busy) => {
    createBtn.disabled = busy;
    amountInput.disabled = busy;
  };

  const setNote = (text) => {
    note.textContent = text;
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function redirectStoneLn(state) {
    if (balancePollTimer != null) {
      clearInterval(balancePollTimer);
      balancePollTimer = null;
    }
    const u = new URL(window.location.href);
    u.searchParams.set("stone_ln", state);
    u.searchParams.set("_cb", String(Date.now()));
    window.location.replace(u.pathname + u.search + u.hash);
  }

  function showStoneTipSuccessThenReload() {
    if (stoneTipCompleted) return;
    stoneTipCompleted = true;
    if (balancePollTimer != null) {
      clearInterval(balancePollTimer);
      balancePollTimer = null;
    }
    pendingSwap = null;
    autoClaimRunning = false;
    invoiceWrap.hidden = true;
    invoiceWrap.setAttribute("aria-hidden", "true");
    qrImg.removeAttribute("src");
    invoiceText.textContent = "";
    invoiceText.setAttribute("data-copy", "");
    if (amountRow) amountRow.hidden = true;
    note.hidden = true;
    if (stoneSuccess) stoneSuccess.hidden = false;
    createBtn.disabled = true;
    amountInput.disabled = true;
    setBusy(false);
    const ms = 4500;
    window.setTimeout(() => {
      window.location.reload();
    }, ms);
  }

  async function startDonationBalancePollAfterInvoice() {
    try {
      const r = await fetch("/api/faucet/balance", { cache: "no-store" });
      const j = await r.json();
      if (j.error || typeof j.available !== "number") return;
      const baseline = j.available;
      if (balancePollTimer != null) clearInterval(balancePollTimer);
      balancePollTimer = setInterval(async () => {
        if (!pendingSwap || stoneTipCompleted) return;
        try {
          const r2 = await fetch("/api/faucet/balance", { cache: "no-store" });
          const j2 = await r2.json();
          if (j2.error || typeof j2.available !== "number") return;
          if (j2.available > baseline) {
            showStoneTipSuccessThenReload();
          }
        } catch (_) {
          /* ignore */
        }
      }, 5000);
    } catch (_) {
      /* ignore */
    }
  }

  const CLAIM_FETCH_MS = 210000;

  document.addEventListener("visibilitychange", () => {
    if (!autoClaimRunning) return;
    if (document.visibilityState === "hidden") {
      sawHiddenWhileClaiming = true;
      return;
    }
    if (document.visibilityState === "visible" && sawHiddenWhileClaiming && claimAbort) {
      sawHiddenWhileClaiming = false;
      claimAbort.abort();
    }
  });

  async function runAutoClaim() {
    if (autoClaimRunning || !pendingSwap) return;
    autoClaimRunning = true;
    let failures = 0;
    const maxFailures = 90;
    setNote("pay the invoice. settling automatically…");
    while (pendingSwap) {
      setNote("waiting for lightning & ark settlement…");
      const ac = new AbortController();
      claimAbort = ac;
      const killTimer = setTimeout(() => ac.abort(), CLAIM_FETCH_MS);
      try {
        const res = await fetch("/api/donation/lightning/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pendingSwap }),
          signal: ac.signal,
        });
        const raw = await res.text();
        let data = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch (_) {
          data = {};
        }
        if (lnClaimJsonSuccess(data)) {
          showStoneTipSuccessThenReload();
          return;
        }
        if (res.status === 429) {
          setNote("too many requests — waiting to retry…");
          await sleep(15000);
          continue;
        }
        if (res.status >= 500) {
          failures += 1;
          if (failures >= maxFailures) {
            redirectStoneLn("obstructed");
            return;
          }
          setNote("connection hiccup — retrying settlement…");
          await sleep(4000);
          continue;
        }
        const errStr = data.error || "not ready yet — will retry";
        if (res.status === 400 && lnClaimErrorMeansAlreadyDone(errStr)) {
          showStoneTipSuccessThenReload();
          return;
        }
        if (res.status === 400 && lnClaimLooksFatal(errStr)) {
          redirectStoneLn("obstructed");
          return;
        }
        failures += 1;
        if (failures >= maxFailures) {
          redirectStoneLn("obstructed");
          return;
        }
        setNote(errStr.length > 100 ? errStr.slice(0, 100) + "…" : errStr);
      } catch (e) {
        if (e.name === "AbortError") {
          setNote("still settling — retrying…");
          await sleep(800);
          continue;
        }
        failures += 1;
        if (failures >= maxFailures) {
          redirectStoneLn("obstructed");
          return;
        }
        const msg =
          e.name === "TimeoutError"
            ? "still settling… will retry"
            : e.message || "retrying…";
        setNote(msg);
      } finally {
        clearTimeout(killTimer);
        claimAbort = null;
      }
      await sleep(7000);
    }
    autoClaimRunning = false;
    setBusy(false);
  }

  createBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (autoClaimRunning) return;
    const raw = amountInput.value.trim();
    const amount = Math.round(Number(raw));
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < LN_MIN_SATS) {
      setNote(`enter at least ${LN_MIN_SATS} sats`);
      return;
    }
    setBusy(true);
    setNote("creating lightning invoice...");
    try {
      const res = await fetch("/api/donation/lightning/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setNote(
          `server returned ${res.status} (not JSON). Reload this page from the same host/port as the faucet, or check the server log.`,
        );
        setBusy(false);
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || "could not create invoice");
      }
      pendingSwap = data.pendingSwap;
      stoneTipCompleted = false;
      invoiceText.textContent = data.invoice;
      invoiceText.setAttribute("data-copy", data.invoice);
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data.invoice)}`;
      invoiceWrap.hidden = false;
      createBtn.disabled = true;
      amountInput.disabled = true;
      void startDonationBalancePollAfterInvoice();
      void runAutoClaim();
    } catch (err) {
      setNote(err.message || "invoice error");
      setBusy(false);
    }
  });
})();
