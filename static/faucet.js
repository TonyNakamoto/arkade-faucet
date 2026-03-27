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
