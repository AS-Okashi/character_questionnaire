(function () {
  const character = window.CHARACTERS?.find((item) => item.id === document.body.dataset.characterId);
  if (!character) return;

  document.documentElement.style.setProperty("--accent", character.color);
  document.title = `${character.name} | ASTERIA FILES`;

  const currentIndex = window.CHARACTERS.findIndex((item) => item.id === character.id);
  const previous = window.CHARACTERS[(currentIndex - 1 + window.CHARACTERS.length) % window.CHARACTERS.length];
  const next = window.CHARACTERS[(currentIndex + 1) % window.CHARACTERS.length];
  const linkFor = (item) => `./${item.id}.html`;

  document.body.innerHTML = `
    <header class="site-header detail-header">
      <a class="brand" href="../index.html" aria-label="ASTERIA FILES ホーム">
        <span class="brand-mark" aria-hidden="true">✦</span>
        <span class="brand-copy"><strong>ASTERIA</strong><small>CHARACTER FILES</small></span>
      </a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-menu">MENU <span>＋</span></button>
      <nav class="site-menu" id="site-menu" aria-label="メインメニュー">
        <a href="../index.html#about">ABOUT</a>
        <a href="../index.html#characters">CHARACTERS</a>
      </nav>
    </header>

    <main>
      <div class="detail-topbar section-shell">
        <a class="back-link" href="../index.html#characters">← ALL CHARACTERS</a>
        <span>FILE ${character.number} <i></i> ${character.unit}</span>
      </div>

      <section class="detail-hero section-shell">
        <div class="detail-image-column">
          <div class="detail-image-frame">
            <span class="image-corner corner-tl"></span><span class="image-corner corner-br"></span>
            <div class="image-vertical-label">ASTERIA / ${character.number}</div>
            <img src="../${character.image}?v=20260810-costume1" alt="${character.name}のイメージビジュアル" />
          </div>
          <p class="image-caption">※ VISUAL IMAGE / TEMPORARY MOCKUP</p>
        </div>
        <div class="detail-intro">
          <p class="detail-eyebrow"><span style="background:${character.color}"></span>${character.unit} / ${character.unitJa}</p>
          <p class="detail-number">${character.number}</p>
          <h1>${character.name}<small>${character.kana}</small></h1>
          <p class="roman">${character.roman}</p>
          <p class="detail-catch">${character.catch}</p>
          <p class="detail-short">${character.short}</p>
          <div class="detail-line"></div>
          <p class="detail-quote">“${character.quote}”</p>
          <div class="detail-side-profile">
            <div class="side-profile-heading">
              <p class="section-kicker">PROFILE / ${character.number} — 10</p>
              <span class="side-profile-mark" style="background:${character.color}">✦</span>
            </div>
            <p class="side-profile-story">${character.intro}</p>
            <div class="stat-grid">
              ${character.stats.map(([label, value]) => `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`).join("")}
            </div>
            <div class="detail-list">
              ${character.details.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("")}
            </div>
          </div>
        </div>
      </section>

      <section class="other-members section-shell">
        <div class="section-heading compact-heading">
          <div><div class="section-label"><span>FILES</span><i></i><span>01 — 10</span></div><h2>More<br /><em>stories.</em></h2></div>
          <a class="text-link" href="../index.html#characters">VIEW ALL FILES <span>↗</span></a>
        </div>
        <div class="related-grid">
          ${window.CHARACTERS.map((item) => `
            <a class="related-card" href="${linkFor(item)}" style="--card-accent:${item.color}">
              <span>${item.number}</span><div><small>${item.unit}</small><strong>${item.name}</strong></div><b>↗</b>
            </a>
          `).join("")}
        </div>
      </section>

      <nav class="prev-next section-shell" aria-label="キャラクター移動">
        <a href="${linkFor(previous)}"><small>PREVIOUS FILE</small><span>←</span><strong>${previous.name}</strong></a>
        <a href="${linkFor(next)}"><small>NEXT FILE</small><strong>${next.name}</strong><span>→</span></a>
      </nav>
    </main>

    <footer class="site-footer section-shell">
      <div class="footer-brand"><span class="brand-mark">✦</span><span>ASTERIA FILES</span></div>
      <p>AN ORIGINAL CHARACTER ARCHIVE</p>
      <small>© 2026 ASTERIA FILES. Mockup project.</small>
    </footer>
  `;

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
