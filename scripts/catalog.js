(function () {
  const grid = document.querySelector("#character-grid");
  if (!grid || !window.CHARACTERS) return;

  grid.innerHTML = window.CHARACTERS.map((character) => `
    <a class="character-card" href="characters/${character.id}.html" style="--card-accent: ${character.color}">
      <div class="card-index">${character.number}</div>
      <div class="card-image-wrap">
        <img src="${character.image}?v=20260810-costume1" alt="${character.name}のイメージビジュアル" loading="lazy" />
        <span class="card-arrow">↗</span>
      </div>
      <div class="card-info">
        <p class="card-unit">${character.unit} <span>${character.unitJa}</span></p>
        <h3>${character.name}</h3>
        <p class="card-kana">${character.kana}</p>
        <p class="card-catch">${character.catch}</p>
      </div>
    </a>
  `).join("");

  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector(".site-menu");
  toggle?.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector("span").textContent = open ? "×" : "＋";
  });
  menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    document.body.classList.remove("menu-open");
    toggle?.setAttribute("aria-expanded", "false");
    if (toggle) toggle.querySelector("span").textContent = "＋";
  }));
})();
