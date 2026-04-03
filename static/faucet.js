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

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const saved = localStorage.getItem(storageKey);

  const applyTheme = (theme) => {
    const dark = theme === "dark";
    document.body.classList.toggle("theme-dark", dark);
    toggle.setAttribute("aria-pressed", dark ? "true" : "false");
    toggle.setAttribute("aria-label", dark ? "switch to light mode" : "switch to dark mode");
  };

  if (saved === "dark" || saved === "light") {
    applyTheme(saved);
  } else {
    applyTheme(media.matches ? "dark" : "light");
  }

  toggle.addEventListener("click", () => {
    const dark = !document.body.classList.contains("theme-dark");
    const next = dark ? "dark" : "light";
    localStorage.setItem(storageKey, next);
    applyTheme(next);
  });

  media.addEventListener("change", (e) => {
    const pinned = localStorage.getItem(storageKey);
    if (pinned === "dark" || pinned === "light") return;
    applyTheme(e.matches ? "dark" : "light");
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

  if (!document.getElementById("zen-ptr-style")) {
    const st = document.createElement("style");
    st.id = "zen-ptr-style";
    st.textContent =
      "@keyframes zen-ptr-spin{to{transform:rotate(360deg)}}" +
      "#zen-ptr-holder.zen-ptr-active .zen-ptr-glyph{" +
      "animation:zen-ptr-spin 0.68s linear infinite;" +
      "will-change:transform;" +
      "}" +
      "@media (prefers-reduced-motion:reduce){" +
      "#zen-ptr-holder.zen-ptr-active .zen-ptr-glyph{animation:none}" +
      "}";
    document.head.appendChild(st);
  }

  const holder = document.createElement("div");
  holder.id = "zen-ptr-holder";
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
    '<div class="zen-ptr-glyph" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;transform-origin:50% 50%">' +
    '<svg width="30" height="30" viewBox="0 0 40 40" style="display:block;overflow:visible" xmlns="http://www.w3.org/2000/svg">' +
    '<g fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round" opacity="0.9">' +
    '<path d="M9.4 23.2A10.6 10.6 0 1 1 28.8 15.8"/>' +
    '<path d="M26.6 12.4l5.2 4.6-6.4 1.2"/>' +
    "</g></svg></div>";
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
      holder.classList.remove("zen-ptr-active");
      holder.style.opacity = "0";
      holder.style.transform = "translateX(-50%) translateY(0)";
      return;
    }
    holder.classList.add("zen-ptr-active");
    const t = Math.min(1, pull / THRESHOLD_PX);
    holder.style.opacity = String(0.14 + t * 0.8);
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
  const amountButtons = Array.from(document.querySelectorAll("[data-ln-amount]"));
  const note = document.getElementById("ln-note");
  const invoiceWrap = document.getElementById("ln-invoice");
  const qrImg = document.getElementById("ln-qr-img");
  const invoiceText = document.getElementById("ln-invoice-text");
  const copyBtn = document.getElementById("ln-copy");
  const claimBtn = document.getElementById("ln-claim");
  if (!amountButtons.length || !note || !invoiceWrap || !qrImg || !invoiceText || !copyBtn || !claimBtn) return;

  let pendingSwap = null;

  const setBusy = (busy) => {
    amountButtons.forEach((btn) => (btn.disabled = busy));
    claimBtn.disabled = busy || !pendingSwap;
  };

  const setNote = (text) => {
    note.textContent = text;
  };

  amountButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const amount = Number(btn.getAttribute("data-ln-amount"));
      if (!Number.isInteger(amount) || amount <= 0) return;
      setBusy(true);
      setNote("creating lightning invoice...");
      try {
        const res = await fetch("/api/topup/lightning/invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "could not create invoice");
        }
        pendingSwap = data.pendingSwap;
        invoiceText.textContent = data.invoice;
        copyBtn.setAttribute("data-copy", data.invoice);
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data.invoice)}`;
        invoiceWrap.hidden = false;
        setNote("scan invoice. then tap confirm paid.");
      } catch (err) {
        setNote(err.message || "invoice error");
      } finally {
        setBusy(false);
      }
    });
  });

  claimBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!pendingSwap) return;
    setBusy(true);
    setNote("checking payment...");
    try {
      const res = await fetch("/api/topup/lightning/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingSwap }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "payment not ready yet");
      }
      setNote("top up received. refresh to see new balance.");
      pendingSwap = null;
      claimBtn.disabled = true;
    } catch (err) {
      setNote(err.message || "not paid yet");
    } finally {
      setBusy(false);
    }
  });
})();
