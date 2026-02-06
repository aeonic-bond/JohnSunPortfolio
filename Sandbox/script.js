const countEl = document.getElementById("count");
const countBtn = document.getElementById("countBtn");

let count = 0;

countBtn?.addEventListener("click", () => {
  count += 1;
  if (countEl) countEl.textContent = String(count);
});

