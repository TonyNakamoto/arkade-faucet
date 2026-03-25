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
      }, 1600);
    } catch {
      btn.textContent = "select & copy";
    }
  });
});

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
