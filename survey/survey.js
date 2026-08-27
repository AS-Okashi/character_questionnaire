(function () {
  "use strict";

  const CONFIG = window.SURVEY_CONFIG || {};
  const CHARACTERS = window.CHARACTERS || [];
  const STORAGE_KEY = `asteria-survey:${CONFIG.surveyVersion || "v1"}`;
  const app = document.getElementById("survey-app");
  const progressPart = document.getElementById("progress-part");
  const progressCount = document.getElementById("progress-count");
  const progressBar = document.getElementById("progress-bar");

  const IMPRESSION_ITEMS = [
    ["I1", "このキャラクターは「かわいい」と感じる"],
    ["I2", "このキャラクターは「かっこいい」と感じる"],
    ["I3", "このキャラクターは「落ち着いている」と感じる"],
    ["I4", "このキャラクターは「活発である」と感じる"],
    ["I5", "このキャラクターは「大人っぽい」と感じる"],
    ["I6", "このキャラクターは「親しみやすい」と感じる"]
  ];

  const CHANGE_ITEMS = [
    ["G1", "衣装変更後の姿は、最初に抱いたこのキャラクターの印象と異なると感じた"],
    ["G2", "この衣装変化を意外だと感じた"],
    ["G3", "衣装が変わっても、同じキャラクターらしさが保たれていると感じた"],
    ["G4", "この衣装は、このキャラクターに似合っていると感じた"],
    ["G5", "衣装変更によって、このキャラクターの魅力が増したと感じた"],
    ["G6", "衣装変更後の姿に違和感を感じた"]
  ];

  const GAP_MOE_ITEMS = [
    ["GM1", "この衣装変化にギャップ萌えを感じた"],
    ["GM2", "元の印象との違いそのものに魅力を感じた"],
    ["GM3", "このキャラクターの意外な一面に惹かれた"]
  ];

  const VARIANTS = ["a", "b", "c"];

  function nowIso() { return new Date().toISOString(); }

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return [...bytes].map((b, i) => `${[4,6,8,10].includes(i) ? "-" : ""}${b.toString(16).padStart(2, "0")}`).join("");
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function shuffled(values) {
    const a = [...values];
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildAssignment(group) {
    const result = {};
    CHARACTERS.forEach((character, index) => {
      result[character.id] = VARIANTS[(index + group) % VARIANTS.length];
    });
    return result;
  }

  function newState() {
    const participantId = uuid();
    const assignmentGroup = hashString(participantId) % 3;
    const baselineOrder = shuffled(CHARACTERS.map((c) => c.id));
    let transformOrder = shuffled(CHARACTERS.map((c) => c.id));
    if (transformOrder[0] === baselineOrder[baselineOrder.length - 1] && transformOrder.length > 1) {
      [transformOrder[0], transformOrder[1]] = [transformOrder[1], transformOrder[0]];
    }
    return {
      schema_version: "1.0",
      survey_version: CONFIG.surveyVersion || "v1",
      participant_id: participantId,
      assignment_group: assignmentGroup,
      assignment: buildAssignment(assignmentGroup),
      started_at: nowIso(),
      completed_at: null,
      current_screen: "consent",
      baseline_index: 0,
      transform_index: 0,
      baseline_order: baselineOrder,
      transform_order: transformOrder,
      demographics: {},
      baseline: {},
      transform: {},
      open_response: {},
      screen_events: [],
      submitted_at: null
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    const state = newState();
    saveState(state);
    return state;
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  let state = loadState();
  let screenShownAt = Date.now();

  function recordScreenExit(name) {
    state.screen_events.push({ screen: name, shown_at: new Date(screenShownAt).toISOString(), answered_at: nowIso(), duration_ms: Date.now() - screenShownAt });
    if (state.screen_events.length > 120) state.screen_events = state.screen_events.slice(-120);
    screenShownAt = Date.now();
  }

  function characterById(id) { return CHARACTERS.find((c) => c.id === id); }
  function detailValue(character, label) { return character.details?.find(([key]) => key === label)?.[1] || "—"; }
  function ageValue(character) { return character.stats?.find(([key]) => key === "AGE")?.[1] || "—"; }

  function setProgress(part, count, value) {
    progressPart.textContent = part;
    progressCount.textContent = count || "";
    progressBar.style.width = `${Math.max(0, Math.min(100, value))}%`;
  }

  function card(inner) { app.innerHTML = `<section class="survey-card">${inner}</section>`; window.scrollTo(0, 0); }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
  }

  function likertHtml(items, prefix, anchors = ["1 まったくそう思わない", "4 どちらともいえない", "7 非常にそう思う"]) {
    return items.map(([id, text]) => `
      <div class="likert-item" data-question="${id}">
        <p class="likert-question">${escapeHtml(text)}</p>
        <div class="likert-scale" role="radiogroup" aria-label="${escapeHtml(text)}">
          ${[1,2,3,4,5,6,7].map((value) => `
            <div class="likert-option">
              <input type="radio" id="${prefix}-${id}-${value}" name="${prefix}-${id}" value="${value}" />
              <label for="${prefix}-${id}-${value}">${value}</label>
            </div>`).join("")}
        </div>
        <div class="likert-anchors"><span>${escapeHtml(anchors[0])}</span><span>${escapeHtml(anchors[1])}</span><span>${escapeHtml(anchors[2])}</span></div>
      </div>`).join("");
  }

  function collectLikert(items, prefix) {
    const result = {};
    for (const [id] of items) {
      const checked = document.querySelector(`input[name="${prefix}-${id}"]:checked`);
      if (!checked) return null;
      result[id] = Number(checked.value);
    }
    return result;
  }

  function imageWithFallback(src, alt, missingText, className) {
    return `<div class="${className || "character-visual"}" data-image-wrap>
      <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" data-fallback-image />
      <div class="image-missing">${escapeHtml(missingText)}</div>
    </div>`;
  }

  function bindImageFallbacks() {
    document.querySelectorAll("[data-fallback-image]").forEach((img) => {
      img.addEventListener("error", () => {
        img.closest("[data-image-wrap]")?.classList.add("is-missing");
        const next = document.getElementById("next");
        if (next) {
          next.disabled = true;
          next.textContent = "画像の配置を確認してください";
        }
      }, { once: true });
    });
  }

  function renderConsent() {
    state.current_screen = "consent"; saveState(state); setProgress("INTRO", "", 2);
    card(`
      <p class="survey-kicker">RESEARCH SURVEY / 2026</p>
      <h1 class="survey-title">キャラクター衣装変化に関する<br />印象評価アンケート</h1>
      <p class="survey-lead">本調査では、オリジナルキャラクターの外見や衣装に対して抱く印象について調査します。複数のキャラクターを閲覧し、それぞれについて感じた印象を回答してください。正解・不正解はありません。ご自身が感じた印象に基づいて回答してください。</p>
      <div class="survey-note">回答時間の目安は20〜30分です。回答は研究目的の分析に使用します。氏名・メールアドレス等の直接個人を特定する情報は収集しません。途中でページを再読み込みした場合は、この端末のブラウザに保存された進捗から再開します。</div>
      <label class="consent-row"><input type="checkbox" id="consent" /><span>上記を確認し、研究への参加に同意します。</span></label>
      <div class="survey-actions"><button class="survey-button" id="next" disabled>アンケートを開始</button></div>
    `);
    const check = document.getElementById("consent");
    const next = document.getElementById("next");
    check.addEventListener("change", () => next.disabled = !check.checked);
    next.addEventListener("click", () => { recordScreenExit("consent"); state.current_screen = "demographics"; saveState(state); render(); });
  }

  function renderDemographics() {
    state.current_screen = "demographics"; saveState(state); setProgress("PROFILE", "PARTICIPANT", 6);
    card(`
      <p class="survey-kicker">PARTICIPANT PROFILE</p>
      <h1 class="survey-title">はじめに、あなたについて</h1>
      <p class="survey-lead">分析のため、以下の項目に回答してください。</p>
      <div class="form-section field-grid">
        <label class="field"><span>年齢を教えてください</span><input id="age" type="number" min="1" max="100" inputmode="numeric" required /></label>
        <label class="field"><span>性別を教えてください</span><select id="gender" required><option value="">選択してください</option><option>男性</option><option>女性</option><option>その他</option><option>回答しない</option></select></label>
      </div>
      <div class="form-section">
        <h2>関心度</h2>
        ${likertHtml([
          ["D3", "アニメ・漫画・ゲーム等のキャラクターコンテンツにどの程度関心がありますか"],
          ["D4", "キャラクターの衣装や外見デザインにどの程度関心がありますか"],
          ["D5", "ファッションにどの程度関心がありますか"]
        ], "demo", ["1 まったく関心がない", "4 どちらともいえない", "7 非常に関心がある"])}
      </div>
      <div class="form-section">
        <h2>「ギャップ萌え」という言葉について</h2>
        <div class="inline-radios" id="familiarity">
          ${[
            [1,"知らない"], [2,"聞いたことはあるが、意味はよく知らない"], [3,"意味を知っている"], [4,"よく知っており、普段から使うことがある"]
          ].map(([v,t]) => `<label><input type="radio" name="gap-familiarity" value="${v}" /><span>${v}. ${t}</span></label>`).join("")}
        </div>
      </div>
      <div class="survey-actions"><button class="survey-button" id="next">次へ</button></div>
    `);
    if (state.demographics.age) document.getElementById("age").value = state.demographics.age;
    if (state.demographics.gender) document.getElementById("gender").value = state.demographics.gender;
    document.getElementById("next").addEventListener("click", () => {
      const age = Number(document.getElementById("age").value);
      const gender = document.getElementById("gender").value;
      const interests = collectLikert([["D3"],["D4"],["D5"]], "demo");
      const familiarity = document.querySelector('input[name="gap-familiarity"]:checked');
      if (!age || age < 1 || age > 100 || !gender || !interests || !familiarity) { alert("すべての必須項目に回答してください。"); return; }
      state.demographics = { age, gender, character_content_interest: interests.D3, character_design_interest: interests.D4, fashion_interest: interests.D5, gap_moe_familiarity: Number(familiarity.value) };
      recordScreenExit("demographics"); state.current_screen = "part1-intro"; saveState(state); render();
    });
  }

  function renderPart1Intro() {
    state.current_screen = "part1-intro"; saveState(state); setProgress("PART 1", "CHARACTER IMPRESSION", 9);
    card(`
      <p class="survey-kicker">PART 1 / CHARACTER IMPRESSION</p>
      <h1 class="survey-title">10人のキャラクターを<br />紹介します</h1>
      <p class="survey-lead">これから10人のキャラクターを順番に紹介します。キャラクターの画像とプロフィールを確認した後、そのキャラクターから受けた印象について回答してください。</p>
      <div class="survey-note">後から正解を確認する問題ではありません。表示された情報から、現在感じた印象をそのまま回答してください。回答確定後は前のキャラクターへ戻れません。</div>
      <div class="survey-actions"><button class="survey-button" id="next">PART 1 を開始</button></div>
    `);
    document.getElementById("next").addEventListener("click", () => { recordScreenExit("part1-intro"); state.current_screen = "baseline"; saveState(state); render(); });
  }

  function renderBaseline() {
    const index = state.baseline_index;
    if (index >= state.baseline_order.length) { state.current_screen = "part2-intro"; saveState(state); render(); return; }
    const character = characterById(state.baseline_order[index]);
    setProgress("PART 1", `${String(index + 1).padStart(2,"0")} / 10`, 10 + ((index + 1) / 10) * 30);
    card(`
      <div class="character-stage">
        <div class="character-panel">
          ${imageWithFallback(`../${character.image}`, `${character.name}の基準画像`, "基準画像が見つかりません。assets/characters/ の画像配置を確認してください。")}
          <div class="character-idline"><span>FILE ${character.number}</span><span>${character.unit}</span></div>
          <h1 class="character-name">${escapeHtml(character.name)}</h1>
          <p class="character-kana">${escapeHtml(character.kana)} / ${escapeHtml(character.roman)}</p>
          <div class="character-profile">
            <p>${escapeHtml(character.intro)}</p>
            <div class="profile-tags">
              <div><span>AGE</span><strong>${escapeHtml(ageValue(character))}</strong></div>
              <div><span>HOBBY</span><strong>${escapeHtml(detailValue(character, "HOBBY"))}</strong></div>
              <div><span>SPECIALTY</span><strong>${escapeHtml(detailValue(character, "SPECIALTY"))}</strong></div>
              <div><span>LIKES</span><strong>${escapeHtml(detailValue(character, "LIKES"))}</strong></div>
            </div>
          </div>
        </div>
        <div>
          <p class="survey-kicker">BASELINE IMPRESSION / ${character.number}</p>
          <div class="question-block">
            <h2>このキャラクターについて、現在感じている印象を回答してください。</h2>
            <p>1〜7の中から、最も近いものを選択してください。</p>
            ${likertHtml(IMPRESSION_ITEMS, `base-${character.id}`)}
          </div>
          <div class="survey-actions"><button class="survey-button" id="next">回答を確定して次へ</button></div>
        </div>
      </div>
    `);
    bindImageFallbacks();
    document.getElementById("next").addEventListener("click", () => {
      const ratings = collectLikert(IMPRESSION_ITEMS, `base-${character.id}`);
      if (!ratings) { alert("6項目すべてに回答してください。"); return; }
      const exited = nowIso();
      state.baseline[character.id] = { character_id: character.id, ratings, order_index: index, shown_at: new Date(screenShownAt).toISOString(), answered_at: exited, duration_ms: Date.now() - screenShownAt };
      recordScreenExit(`baseline:${character.id}`);
      state.baseline_index += 1; saveState(state); render();
    });
  }

  function renderPart2Intro() {
    state.current_screen = "part2-intro"; saveState(state); setProgress("PART 2", "OUTFIT TRANSFORMATION", 43);
    card(`
      <p class="survey-kicker">PART 2 / OUTFIT TRANSFORMATION</p>
      <h1 class="survey-title">衣装変更後の印象を<br />評価してください</h1>
      <p class="survey-lead">続いて、先ほど紹介したキャラクターが異なる衣装を着た姿を提示します。元の姿と衣装変更後の姿を見比べ、衣装変更後のキャラクターから受ける印象と、その変化について回答してください。</p>
      <div class="survey-note"><strong>「ギャップ萌え」について：</strong><br />本調査では、先に抱いたキャラクターの印象とは異なる一面に対して魅力を感じること、という意味で用います。衣装の変化が大きいほどギャップ萌えである、という意味ではありません。ご自身が実際に感じた程度を回答してください。</div>
      <div class="survey-actions"><button class="survey-button" id="next">PART 2 を開始</button></div>
    `);
    document.getElementById("next").addEventListener("click", () => { recordScreenExit("part2-intro"); state.current_screen = "transform"; saveState(state); render(); });
  }

  function renderTransform() {
    const index = state.transform_index;
    if (index >= state.transform_order.length) { state.current_screen = "open-response"; saveState(state); render(); return; }
    const character = characterById(state.transform_order[index]);
    const variant = state.assignment[character.id];
    const transformedSrc = CONFIG.transformImagePath ? CONFIG.transformImagePath(character.id, variant) : `../assets/survey/transforms/${character.id}/${variant}.png`;
    setProgress("PART 2", `${String(index + 1).padStart(2,"0")} / 10`, 45 + ((index + 1) / 10) * 43);
    card(`
      <p class="survey-kicker">OUTFIT EVALUATION / ${character.number}</p>
      <h1 class="character-name">${escapeHtml(character.name)}</h1>
      <p class="character-kana">${escapeHtml(character.kana)} / ${escapeHtml(character.roman)}</p>
      <div class="compare-stage" style="margin-top:26px">
        <div class="compare-figure"><div class="compare-label"><span>REFERENCE</span><span>元の姿</span></div>${imageWithFallback(`../${character.image}`, `${character.name}の元画像`, "元画像が見つかりません。", "compare-image")}</div>
        <div class="compare-figure"><div class="compare-label"><span>OUTFIT CHANGE</span><span>衣装変更後</span></div>${imageWithFallback(transformedSrc, `${character.name}の衣装変更後画像`, "衣装変更後画像が未配置です。公開前に assets/survey/transforms/ の画像を設定してください。", "compare-image")}</div>
      </div>

      <div class="question-block">
        <h2>衣装変更後のキャラクターについて回答してください。</h2>
        <p>元の姿との比較だけでなく、衣装変更後の姿から現在受ける印象として回答してください。</p>
        ${likertHtml(IMPRESSION_ITEMS, `tr-imp-${character.id}`)}
      </div>
      <div class="question-block">
        <h2>衣装の変化について回答してください。</h2>
        ${likertHtml(CHANGE_ITEMS, `tr-change-${character.id}`)}
      </div>
      <div class="question-block">
        <h2>この衣装変化から感じた魅力について回答してください。</h2>
        ${likertHtml(GAP_MOE_ITEMS, `tr-gap-${character.id}`)}
      </div>
      <div class="survey-actions"><button class="survey-button" id="next">回答を確定して次へ</button></div>
    `);
    bindImageFallbacks();
    document.getElementById("next").addEventListener("click", () => {
      const impressions = collectLikert(IMPRESSION_ITEMS, `tr-imp-${character.id}`);
      const changes = collectLikert(CHANGE_ITEMS, `tr-change-${character.id}`);
      const gapMoe = collectLikert(GAP_MOE_ITEMS, `tr-gap-${character.id}`);
      if (!impressions || !changes || !gapMoe) { alert("すべての項目に回答してください。"); return; }
      state.transform[character.id] = { character_id: character.id, variant_id: variant, order_index: index, impressions, changes, gap_moe: gapMoe, shown_at: new Date(screenShownAt).toISOString(), answered_at: nowIso(), duration_ms: Date.now() - screenShownAt };
      recordScreenExit(`transform:${character.id}`);
      state.transform_index += 1; saveState(state); render();
    });
  }

  function characterOptions(selected) {
    return `<option value="">選択してください</option>${CHARACTERS.map((c) => `<option value="${c.id}" ${selected === c.id ? "selected" : ""}>${c.name}</option>`).join("")}<option value="none" ${selected === "none" ? "selected" : ""}>特になし</option>`;
  }

  function renderOpenResponse() {
    state.current_screen = "open-response"; saveState(state); setProgress("FINAL", "FREE RESPONSE", 91);
    card(`
      <p class="survey-kicker">OPTIONAL / FREE RESPONSE</p>
      <h1 class="survey-title">最後に、感じたことを<br />自由に教えてください</h1>
      <p class="survey-lead">以下は任意回答です。印象に残った点があればご記入ください。</p>
      <div class="form-section field-grid">
        <label class="field"><span>今回見た中で、最も「ギャップ萌え」を感じたキャラクターがあれば選択してください。</span><select id="strongest">${characterOptions(state.open_response.strongest_character)}</select><textarea id="strongest-reason" placeholder="どのような点にギャップ萌えを感じたか、よければ教えてください。">${escapeHtml(state.open_response.strongest_reason || "")}</textarea></label>
        <label class="field"><span>印象の違いは感じたものの、「ギャップ萌え」にはつながらなかったキャラクターがあれば選択してください。</span><select id="nongap">${characterOptions(state.open_response.nongap_character)}</select><textarea id="nongap-reason" placeholder="なぜギャップ萌えにはつながらなかったと感じたか、よければ教えてください。">${escapeHtml(state.open_response.nongap_reason || "")}</textarea></label>
      </div>
      <div class="survey-actions"><button class="survey-button" id="next">回答内容を確定</button></div>
    `);
    document.getElementById("next").addEventListener("click", () => {
      state.open_response = {
        strongest_character: document.getElementById("strongest").value || null,
        strongest_reason: document.getElementById("strongest-reason").value.trim(),
        nongap_character: document.getElementById("nongap").value || null,
        nongap_reason: document.getElementById("nongap-reason").value.trim()
      };
      recordScreenExit("open-response"); state.current_screen = "review"; saveState(state); render();
    });
  }

  function buildPayload() {
    return {
      schema_version: state.schema_version,
      survey_version: state.survey_version,
      participant_id: state.participant_id,
      assignment_group: state.assignment_group,
      started_at: state.started_at,
      completed_at: state.completed_at || nowIso(),
      demographics: state.demographics,
      baseline_order: state.baseline_order,
      transform_order: state.transform_order,
      baseline: state.baseline_order.map((id) => state.baseline[id]),
      transform: state.transform_order.map((id) => state.transform[id]),
      open_response: state.open_response,
      screen_events: state.screen_events,
      user_agent: navigator.userAgent
    };
  }

  function createLocalDownload(payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asteria-survey-${state.participant_id}.json`;
    a.textContent = "回答JSONをこの端末に保存する";
    a.className = "download-link";
    return a;
  }

  function submitToGas(payload) {
    return new Promise((resolve, reject) => {
      const endpoint = String(CONFIG.gasEndpoint || "").trim();
      if (!endpoint) { reject(new Error("GAS_ENDPOINT_NOT_CONFIGURED")); return; }
      const iframe = document.getElementById("gas-submit-target");
      const form = document.createElement("form");
      const nonce = uuid();
      form.method = "POST";
      form.action = endpoint;
      form.target = "gas-submit-target";
      form.style.display = "none";

      const payloadInput = document.createElement("input");
      payloadInput.type = "hidden";
      payloadInput.name = "payload";
      payloadInput.value = JSON.stringify(payload);
      form.appendChild(payloadInput);

      const nonceInput = document.createElement("input");
      nonceInput.type = "hidden";
      nonceInput.name = "nonce";
      nonceInput.value = nonce;
      form.appendChild(nonceInput);
      document.body.appendChild(form);

      let done = false;
      const cleanup = () => {
        window.removeEventListener("message", onMessage);
        form.remove();
      };
      const timeout = setTimeout(() => {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error("GAS_SUBMIT_TIMEOUT"));
      }, 20000);
      const onMessage = (event) => {
        const data = event.data;
        if (!data || data.type !== "asteria-gas-submit" || data.nonce !== nonce || done) return;
        done = true;
        clearTimeout(timeout);
        cleanup();
        if (data.ok) resolve();
        else reject(new Error(data.message || "GAS_SUBMIT_FAILED"));
      };
      window.addEventListener("message", onMessage);
      try { form.submit(); } catch (error) { clearTimeout(timeout); cleanup(); reject(error); }
    });
  }

  function renderReview() {
    state.current_screen = "review"; saveState(state); setProgress("FINAL", "SUBMIT", 96);
    const endpointReady = Boolean(String(CONFIG.gasEndpoint || "").trim());
    card(`
      <p class="survey-kicker">FINAL CHECK</p>
      <h1 class="survey-title">回答の送信</h1>
      <p class="survey-lead">すべての必須回答が完了しました。「回答を送信」を押すと回答が確定します。PART 1 / PART 2 の回答内容は、この画面から変更できません。</p>
      <div class="review-grid">
        <div class="review-card"><span>PARTICIPANT ID</span><strong>${escapeHtml(state.participant_id.slice(0, 8))}…</strong></div>
        <div class="review-card"><span>BASELINE</span><strong>${Object.keys(state.baseline).length} / 10 完了</strong></div>
        <div class="review-card"><span>OUTFIT</span><strong>${Object.keys(state.transform).length} / 10 完了</strong></div>
        <div class="review-card"><span>SURVEY VERSION</span><strong>${escapeHtml(state.survey_version)}</strong></div>
      </div>
      ${endpointReady ? "" : `<p class="submit-warning">GAS送信先URLが未設定です。公開前に <code>survey/survey-config.js</code> の <code>gasEndpoint</code> を設定してください。</p>`}
      <div id="fallback-download"></div>
      <div class="survey-actions"><button class="survey-button" id="submit" ${(!endpointReady && CONFIG.requireGasEndpointForFinalSubmit) ? "disabled" : ""}>回答を送信</button></div>
    `);
    if (!endpointReady) document.getElementById("fallback-download").appendChild(createLocalDownload(buildPayload()));
    document.getElementById("submit").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      if (Object.keys(state.baseline).length !== 10 || Object.keys(state.transform).length !== 10) { alert("必須回答が不足しています。"); return; }
      button.disabled = true; button.textContent = "送信中…";
      state.completed_at = nowIso(); saveState(state);
      const payload = buildPayload();
      try {
        await submitToGas(payload);
        state.submitted_at = nowIso(); state.current_screen = "complete"; saveState(state); render();
      } catch (error) {
        button.disabled = false; button.textContent = "回答を送信";
        const holder = document.getElementById("fallback-download");
        holder.innerHTML = `<p class="submit-warning">送信を確認できませんでした。通信環境またはGAS設定を確認して再度送信してください。</p>`;
        holder.appendChild(createLocalDownload(payload));
      }
    });
  }

  function renderComplete() {
    setProgress("COMPLETE", "THANK YOU", 100);
    card(`
      <p class="survey-kicker">SURVEY COMPLETE</p>
      <h1 class="survey-title">ご協力<br />ありがとうございました</h1>
      <p class="survey-lead">回答の送信が完了しました。本調査では、キャラクターについて形成された印象と衣装変化との関係が、ギャップ萌えの評価にどのように関係するかを研究します。</p>
      <div class="survey-note">このブラウザには送信済みの状態が保存されています。同じ端末・ブラウザで再度アクセスしても重複回答は開始しません。</div>
    `);
  }

  function render() {
    screenShownAt = Date.now();
    switch (state.current_screen) {
      case "consent": renderConsent(); break;
      case "demographics": renderDemographics(); break;
      case "part1-intro": renderPart1Intro(); break;
      case "baseline": renderBaseline(); break;
      case "part2-intro": renderPart2Intro(); break;
      case "transform": renderTransform(); break;
      case "open-response": renderOpenResponse(); break;
      case "review": renderReview(); break;
      case "complete": renderComplete(); break;
      default: state = newState(); saveState(state); renderConsent();
    }
  }

  render();
})();
