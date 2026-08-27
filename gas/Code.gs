/**
 * ASTERIA Research Survey - Google Apps Script receiver
 *
 * 使い方:
 * 1. Google Spreadsheet を1つ作る。
 * 2. このコードを Apps Script に貼り付ける。
 * 3. SPREADSHEET_ID に対象スプレッドシートIDを設定する。
 * 4. setupSheets() を一度実行して権限承認・シート初期化する。
 * 5. 「デプロイ」→「新しいデプロイ」→「ウェブアプリ」。
 *    実行ユーザー: 自分 / アクセスできるユーザー: 全員
 * 6. /exec URL を survey/survey-config.js の gasEndpoint に設定する。
 */

const SPREADSHEET_ID = "PUT_YOUR_SPREADSHEET_ID_HERE";

const SHEETS = {
  raw: "RawResponses",
  participants: "Participants",
  baseline: "BaselineRatings",
  transform: "TransformRatings",
  open: "OpenResponses"
};

function doGet() {
  return ContentService.createTextOutput("ASTERIA survey endpoint is running.")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  const nonce = (e && e.parameter && e.parameter.nonce) || "";
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const payloadText = e && e.parameter && e.parameter.payload;
    if (!payloadText) throw new Error("payload is missing");
    const payload = JSON.parse(payloadText);
    validatePayload_(payload);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    ensureSheets_(ss);

    // participant_id をキーにして重複送信を防ぐ。
    if (participantExists_(ss, payload.participant_id)) {
      return postMessageResponse_(nonce, true, "duplicate-ok");
    }

    appendRaw_(ss, payload, payloadText);
    appendParticipant_(ss, payload);
    appendBaseline_(ss, payload);
    appendTransform_(ss, payload);
    appendOpen_(ss, payload);
    return postMessageResponse_(nonce, true, "ok");
  } catch (err) {
    console.error(err);
    return postMessageResponse_(nonce, false, err.message || "unknown error");
  } finally {
    lock.releaseLock();
  }
}

function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  ensureSheets_(ss);
}

function validatePayload_(p) {
  if (!p || typeof p !== "object") throw new Error("invalid payload");
  if (!p.participant_id) throw new Error("participant_id is missing");
  if (!Array.isArray(p.baseline) || p.baseline.length !== 10) throw new Error("baseline must have 10 records");
  if (!Array.isArray(p.transform) || p.transform.length !== 10) throw new Error("transform must have 10 records");
}

function postMessageResponse_(nonce, ok, message) {
  const data = JSON.stringify({
    type: "asteria-gas-submit",
    nonce: String(nonce || ""),
    ok: Boolean(ok),
    message: String(message || "")
  });
  return HtmlService.createHtmlOutput(
    "<!doctype html><meta charset='utf-8'><script>" +
    "window.parent.postMessage(" + data + ", '*');" +
    "</script>"
  );
}

function ensureSheets_(ss) {
  ensureSheet_(ss, SHEETS.raw, ["received_at","participant_id","survey_version","payload_json"]);
  ensureSheet_(ss, SHEETS.participants, ["received_at","participant_id","survey_version","assignment_group","started_at","completed_at","age","gender","character_content_interest","character_design_interest","fashion_interest","gap_moe_familiarity","user_agent"]);
  ensureSheet_(ss, SHEETS.baseline, ["received_at","participant_id","character_id","order_index","I1","I2","I3","I4","I5","I6","shown_at","answered_at","duration_ms"]);
  ensureSheet_(ss, SHEETS.transform, ["received_at","participant_id","character_id","variant_id","order_index","I1","I2","I3","I4","I5","I6","G1","G2","G3","G4","G5","G6","GM1","GM2","GM3","shown_at","answered_at","duration_ms"]);
  ensureSheet_(ss, SHEETS.open, ["received_at","participant_id","strongest_character","strongest_reason","nongap_character","nongap_reason"]);
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  sheet.setFrozenRows(1);
  return sheet;
}

function participantExists_(ss, participantId) {
  const sheet = ss.getSheetByName(SHEETS.participants);
  if (!sheet || sheet.getLastRow() < 2) return false;
  const values = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues().flat();
  return values.indexOf(participantId) !== -1;
}

function appendRaw_(ss, p, raw) {
  ss.getSheetByName(SHEETS.raw).appendRow([new Date(), p.participant_id, p.survey_version, raw]);
}

function appendParticipant_(ss, p) {
  const d = p.demographics || {};
  ss.getSheetByName(SHEETS.participants).appendRow([
    new Date(), p.participant_id, p.survey_version, p.assignment_group,
    p.started_at, p.completed_at, d.age, d.gender,
    d.character_content_interest, d.character_design_interest,
    d.fashion_interest, d.gap_moe_familiarity, p.user_agent || ""
  ]);
}

function appendBaseline_(ss, p) {
  const sheet = ss.getSheetByName(SHEETS.baseline);
  const rows = p.baseline.map(function (r) {
    const q = r.ratings || {};
    return [new Date(), p.participant_id, r.character_id, r.order_index, q.I1,q.I2,q.I3,q.I4,q.I5,q.I6,r.shown_at,r.answered_at,r.duration_ms];
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function appendTransform_(ss, p) {
  const sheet = ss.getSheetByName(SHEETS.transform);
  const rows = p.transform.map(function (r) {
    const i = r.impressions || {}, g = r.changes || {}, m = r.gap_moe || {};
    return [new Date(), p.participant_id, r.character_id, r.variant_id, r.order_index,
      i.I1,i.I2,i.I3,i.I4,i.I5,i.I6,
      g.G1,g.G2,g.G3,g.G4,g.G5,g.G6,
      m.GM1,m.GM2,m.GM3,r.shown_at,r.answered_at,r.duration_ms];
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function appendOpen_(ss, p) {
  const o = p.open_response || {};
  ss.getSheetByName(SHEETS.open).appendRow([new Date(), p.participant_id,o.strongest_character || "",o.strongest_reason || "",o.nongap_character || "",o.nongap_reason || ""]);
}
