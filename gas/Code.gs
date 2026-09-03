/**
 * ASTERIA Gap-Moe Survey - Google Apps Script receiver
 *
 * Setup:
 * 1. Create a Google Spreadsheet
 * 2. Set SPREADSHEET_ID
 * 3. Run setupSheets() once
 * 4. Deploy as a web app (execute as: me / access: anyone)
 * 5. Set the /exec URL in survey/survey-config.js
 *
 * Design notes:
 * - Assignment groups are allocated server-side in strict 0 -> 1 -> 2 rotation.
 * - RawResponses is the canonical payload store.
 * - Normalized sheets are rebuilt idempotently per participant on every retry
 *   until SubmissionStatus becomes "complete".
 */
const SPREADSHEET_ID = "PUT_YOUR_SPREADSHEET_ID_HERE";
const SHEETS = {
  assignments: "Assignments",
  status: "SubmissionStatus",
  raw: "RawResponses",
  participants: "Participants",
  baseline: "BaselineRatings",
  transform: "TransformRatings",
  factors: "GarmentFactors",
  open: "OpenResponses"
};

const CHARACTER_IDS = [
  "asagiri-mio",
  "tsukishiro-rin",
  "kurose-yui",
  "haruno-sena",
  "amagi-kohaku",
  "mizuno-rei",
  "kazehaya-towa",
  "shinohara-nagi",
  "hoshizaki-ao",
  "moriya-sumire"
];
const VARIANTS = ["a", "b", "c"];
const IMPRESSION_IDS = ["I1","I2","I3","I4","I5","I6"];
const CHANGE_IDS = ["G1","G2","G3","G4","G5","G6"];
const GAP_MOE_IDS = ["GM1","GM2","GM3"];
const FACTOR_IDS = ["F1","F2","F3","F4","F5","F6","F7"];
const FACTOR_LABELS = {
  F1:"色・色調", F2:"服装ジャンル・テイスト", F3:"フォーマル度", F4:"シルエット・形状",
  F5:"装飾・小物", F6:"肌の露出・身体の見せ方", F7:"柄・素材感"
};

function doGet(e) {
  const action = e && e.parameter && String(e.parameter.action || "");
  if (action !== "assign") {
    return ContentService.createTextOutput("ASTERIA survey endpoint is running.").setMimeType(ContentService.MimeType.TEXT);
  }

  const nonce = (e && e.parameter && e.parameter.nonce) || "";
  const participantId = (e && e.parameter && e.parameter.participant_id) || "";
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    validateParticipantId_(participantId);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    ensureSheets_(ss);
    const group = getOrAllocateGroup_(ss, participantId);
    return assignmentMessageResponse_(nonce, true, group, "ok");
  } catch (err) {
    console.error(err);
    return assignmentMessageResponse_(nonce, false, null, err.message || "assignment error");
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  const nonce = (e && e.parameter && e.parameter.nonce) || "";
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  let ss = null;
  let participantId = "";
  let payloadHash = "";
  let statusStarted = false;
  try {
    const payloadText = e && e.parameter && e.parameter.payload;
    if (!payloadText) throw new Error("payload is missing");
    const payload = JSON.parse(payloadText);
    validatePayload_(payload);

    participantId = payload.participant_id;
    payloadHash = sha256_(payloadText);
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    ensureSheets_(ss);
    validateServerAssignment_(ss, payload);

    const existingStatus = getSubmissionStatus_(ss, participantId);
    if (existingStatus && existingStatus.status === "complete") {
      if (existingStatus.payload_sha256 === payloadHash) return postMessageResponse_(nonce, true, "duplicate-ok");
      throw new Error("participant_id has already been submitted with a different payload");
    }

    setSubmissionStatus_(ss, participantId, payloadHash, "normalizing", "");
    statusStarted = true;
    upsertRaw_(ss, payload, payloadText);
    replaceNormalizedSubmission_(ss, payload);
    setSubmissionStatus_(ss, participantId, payloadHash, "complete", "");
    return postMessageResponse_(nonce, true, "ok");
  } catch (err) {
    console.error(err);
    if (ss && participantId && payloadHash && statusStarted) {
      try { setSubmissionStatus_(ss, participantId, payloadHash, "error", err.message || "unknown error"); } catch (_) {}
    }
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
  validateParticipantId_(p.participant_id);
  if (![0,1,2].includes(Number(p.assignment_group))) throw new Error("assignment_group must be 0, 1, or 2");
  if (!p.demographics || typeof p.demographics !== "object") throw new Error("demographics is missing");
  validateIntegerRange_(p.demographics.age, 1, 100, "age");
  if (["男性","女性","その他","回答しない"].indexOf(String(p.demographics.gender || "")) === -1) throw new Error("invalid gender");
  validateIntegerRange_(p.demographics.character_content_interest, 1, 7, "character_content_interest");
  validateIntegerRange_(p.demographics.character_design_interest, 1, 7, "character_design_interest");
  validateIntegerRange_(p.demographics.fashion_interest, 1, 7, "fashion_interest");
  validateIntegerRange_(p.demographics.gap_moe_familiarity, 1, 4, "gap_moe_familiarity");

  validateOrder_(p.baseline_order, "baseline_order");
  validateOrder_(p.transform_order, "transform_order");
  if (!Array.isArray(p.baseline) || p.baseline.length !== CHARACTER_IDS.length) throw new Error("baseline must have 10 records");
  if (!Array.isArray(p.transform) || p.transform.length !== CHARACTER_IDS.length) throw new Error("transform must have 10 records");

  validateRecordCharacters_(p.baseline, "baseline");
  validateRecordCharacters_(p.transform, "transform");

  p.baseline.forEach(function(r) {
    if (!r || typeof r !== "object") throw new Error("invalid baseline record");
    validateIntegerRange_(r.order_index, 0, CHARACTER_IDS.length - 1, "baseline.order_index");
    validateRatingObject_(r.ratings, IMPRESSION_IDS, "baseline.ratings");
  });

  p.transform.forEach(function(r) {
    if (!r || typeof r !== "object") throw new Error("invalid transform record");
    if (VARIANTS.indexOf(String(r.variant_id || "")) === -1) throw new Error("invalid variant_id");
    validateIntegerRange_(r.order_index, 0, CHARACTER_IDS.length - 1, "transform.order_index");
    validateRatingObject_(r.impressions, IMPRESSION_IDS, "transform.impressions");
    validateRatingObject_(r.changes, CHANGE_IDS, "transform.changes");
    validateRatingObject_(r.gap_moe, GAP_MOE_IDS, "transform.gap_moe");
    validateGarmentFactors_(r.garment_factors);

    const characterIndex = CHARACTER_IDS.indexOf(r.character_id);
    const expectedVariant = VARIANTS[(characterIndex + Number(p.assignment_group)) % 3];
    if (r.variant_id !== expectedVariant) throw new Error("variant_id does not match assignment_group for " + r.character_id);
  });

  validateOpenResponse_(p.open_response || {});
}

function validateParticipantId_(value) {
  const id = String(value || "");
  if (!/^[0-9a-fA-F-]{16,64}$/.test(id)) throw new Error("invalid participant_id");
}

function validateIntegerRange_(value, min, max, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(label + " is out of range");
}

function validateOrder_(values, label) {
  if (!Array.isArray(values) || values.length !== CHARACTER_IDS.length) throw new Error(label + " must contain 10 character IDs");
  const unique = Array.from(new Set(values));
  if (unique.length !== CHARACTER_IDS.length || unique.some(function(id) { return CHARACTER_IDS.indexOf(id) === -1; })) throw new Error("invalid " + label);
}

function validateRecordCharacters_(records, label) {
  const ids = records.map(function(r) { return r && r.character_id; });
  const unique = Array.from(new Set(ids));
  if (unique.length !== CHARACTER_IDS.length || unique.some(function(id) { return CHARACTER_IDS.indexOf(id) === -1; })) throw new Error(label + " contains invalid or duplicate character_id");
}

function validateRatingObject_(obj, ids, label) {
  if (!obj || typeof obj !== "object") throw new Error(label + " is missing");
  ids.forEach(function(id) { validateIntegerRange_(obj[id], 1, 7, label + "." + id); });
}

function validateGarmentFactors_(f) {
  if (!f || typeof f !== "object") throw new Error("garment_factors is missing");
  if (!Array.isArray(f.selected)) throw new Error("garment_factors.selected must be an array");
  if (typeof f.none_selected !== "boolean") throw new Error("garment_factors.none_selected must be boolean");
  if (!f.effects || typeof f.effects !== "object" || Array.isArray(f.effects)) throw new Error("garment_factors.effects must be an object");

  const selected = f.selected.map(String);
  if (new Set(selected).size !== selected.length) throw new Error("garment_factors.selected contains duplicates");
  if (selected.some(function(id) { return FACTOR_IDS.indexOf(id) === -1; })) throw new Error("garment_factors.selected contains an invalid factor");
  const effectKeys = Object.keys(f.effects);

  if (f.none_selected) {
    if (selected.length !== 0 || effectKeys.length !== 0) throw new Error("none_selected requires empty selected/effects");
    return;
  }
  if (selected.length === 0) throw new Error("select at least one garment factor or set none_selected=true");
  if (effectKeys.length !== selected.length || effectKeys.some(function(id) { return selected.indexOf(id) === -1; })) throw new Error("garment factor effects must exactly match selected factors");
  selected.forEach(function(id) { validateIntegerRange_(f.effects[id], -2, 2, "garment_factors.effects." + id); });
}

function validateOpenResponse_(o) {
  ["strongest_character", "nongap_character"].forEach(function(key) {
    const value = o[key];
    if (value !== null && value !== undefined && value !== "" && value !== "none" && CHARACTER_IDS.indexOf(String(value)) === -1) throw new Error("invalid " + key);
  });
  ["strongest_reason", "nongap_reason"].forEach(function(key) {
    if (String(o[key] || "").length > 5000) throw new Error(key + " is too long");
  });
}

function validateServerAssignment_(ss, p) {
  const allocated = findAssignmentGroup_(ss, p.participant_id);
  if (allocated === null) throw new Error("participant assignment was not allocated by the server");
  if (allocated !== Number(p.assignment_group)) throw new Error("assignment_group does not match server allocation");
}

function getOrAllocateGroup_(ss, participantId) {
  const existing = findAssignmentGroup_(ss, participantId);
  if (existing !== null) return existing;
  const sheet = ss.getSheetByName(SHEETS.assignments);
  const allocatedCount = Math.max(0, sheet.getLastRow() - 1);
  const group = allocatedCount % 3;
  sheet.appendRow([new Date(), participantId, group]);
  return group;
}

function findAssignmentGroup_(ss, participantId) {
  const sheet = ss.getSheetByName(SHEETS.assignments);
  if (!sheet || sheet.getLastRow() < 2) return null;
  const ids = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues().flat();
  const index = ids.indexOf(participantId);
  if (index === -1) return null;
  const group = Number(sheet.getRange(index + 2, 3).getValue());
  return [0,1,2].includes(group) ? group : null;
}

function replaceNormalizedSubmission_(ss, p) {
  [SHEETS.participants, SHEETS.baseline, SHEETS.transform, SHEETS.factors, SHEETS.open].forEach(function(name) {
    deleteParticipantRows_(ss.getSheetByName(name), p.participant_id, 2);
  });
  appendParticipant_(ss, p);
  appendBaseline_(ss, p);
  appendTransform_(ss, p);
  appendFactors_(ss, p);
  appendOpen_(ss, p);
}

function deleteParticipantRows_(sheet, participantId, participantColumn) {
  if (!sheet || sheet.getLastRow() < 2) return;
  const values = sheet.getRange(2, participantColumn, sheet.getLastRow() - 1, 1).getValues().flat();
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (values[i] === participantId) sheet.deleteRow(i + 2);
  }
}

function upsertRaw_(ss, p, raw) {
  const sheet = ss.getSheetByName(SHEETS.raw);
  if (sheet.getLastRow() >= 2) {
    const ids = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues().flat();
    const index = ids.indexOf(p.participant_id);
    if (index !== -1) {
      sheet.getRange(index + 2, 1, 1, 4).setValues([[new Date(), p.participant_id, p.survey_version, raw]]);
      return;
    }
  }
  sheet.appendRow([new Date(), p.participant_id, p.survey_version, raw]);
}

function getSubmissionStatus_(ss, participantId) {
  const sheet = ss.getSheetByName(SHEETS.status);
  if (!sheet || sheet.getLastRow() < 2) return null;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
  const index = ids.indexOf(participantId);
  if (index === -1) return null;
  const row = sheet.getRange(index + 2, 1, 1, 5).getValues()[0];
  return { participant_id: row[0], payload_sha256: row[1], status: row[2], updated_at: row[3], last_error: row[4] };
}

function setSubmissionStatus_(ss, participantId, payloadHash, status, lastError) {
  const sheet = ss.getSheetByName(SHEETS.status);
  const row = [participantId, payloadHash, status, new Date(), safeCellText_(lastError || "")];
  if (sheet.getLastRow() >= 2) {
    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
    const index = ids.indexOf(participantId);
    if (index !== -1) { sheet.getRange(index + 2, 1, 1, row.length).setValues([row]); return; }
  }
  sheet.appendRow(row);
}

function sha256_(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytes.map(function(b) { const v = b < 0 ? b + 256 : b; return ("0" + v.toString(16)).slice(-2); }).join("");
}

function postMessageResponse_(nonce, ok, message) {
  return messageResponse_("asteria-gas-submit", nonce, { ok: Boolean(ok), message: String(message || "") });
}

function assignmentMessageResponse_(nonce, ok, group, message) {
  return messageResponse_("asteria-gas-assignment", nonce, { ok: Boolean(ok), assignment_group: group, message: String(message || "") });
}

function messageResponse_(type, nonce, values) {
  const data = Object.assign({ type: type, nonce: String(nonce || "") }, values || {});
  return HtmlService
    .createHtmlOutput("<!doctype html><meta charset='utf-8'><script>window.top.postMessage(" + JSON.stringify(data) + ", '*');<\/script>")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function ensureSheets_(ss) {
  ensureSheet_(ss, SHEETS.assignments, ["allocated_at","participant_id","assignment_group"]);
  ensureSheet_(ss, SHEETS.status, ["participant_id","payload_sha256","status","updated_at","last_error"]);
  ensureSheet_(ss, SHEETS.raw, ["received_at","participant_id","survey_version","payload_json"]);
  ensureSheet_(ss, SHEETS.participants, ["received_at","participant_id","survey_version","assignment_group","started_at","completed_at","age","gender","character_content_interest","character_design_interest","fashion_interest","gap_moe_familiarity","user_agent"]);
  ensureSheet_(ss, SHEETS.baseline, ["received_at","participant_id","character_id","order_index","I1","I2","I3","I4","I5","I6","shown_at","answered_at","duration_ms"]);
  ensureSheet_(ss, SHEETS.transform, ["received_at","participant_id","character_id","variant_id","order_index","I1","I2","I3","I4","I5","I6","G1","G2","G3","G4","G5","G6","GM1","GM2","GM3","core_shown_at","core_answered_at","core_duration_ms","factor_shown_at","factor_answered_at","factor_duration_ms","factor_none_selected","gm1_shown_at","gm1_answered_at","gm1_duration_ms"]);
  ensureSheet_(ss, SHEETS.factors, ["received_at","participant_id","character_id","variant_id","factor_id","factor_label","selected","effect"]);
  ensureSheet_(ss, SHEETS.open, ["received_at","participant_id","strongest_character","strongest_reason","nongap_character","nongap_reason"]);
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const existingWidth = Math.max(1, sheet.getLastColumn());
    const existing = sheet.getRange(1, 1, 1, existingWidth).getValues()[0];
    for (let i = 0; i < existing.length; i += 1) {
      if (existing[i] && headers[i] !== existing[i]) throw new Error("header mismatch in " + name + " at column " + (i + 1));
    }
    if (existing.length < headers.length) sheet.getRange(1, existing.length + 1, 1, headers.length - existing.length).setValues([headers.slice(existing.length)]);
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function appendParticipant_(ss, p) {
  const d = p.demographics || {};
  ss.getSheetByName(SHEETS.participants).appendRow([new Date(), p.participant_id, p.survey_version, p.assignment_group, p.started_at, p.completed_at, d.age, d.gender, d.character_content_interest, d.character_design_interest, d.fashion_interest, d.gap_moe_familiarity, safeCellText_(p.user_agent || "")]);
}

function appendBaseline_(ss, p) {
  const sheet = ss.getSheetByName(SHEETS.baseline);
  const rows = p.baseline.map(function(r) {
    const q = r.ratings || {};
    return [new Date(), p.participant_id, r.character_id, r.order_index, q.I1,q.I2,q.I3,q.I4,q.I5,q.I6,r.shown_at,r.answered_at,r.duration_ms];
  });
  sheet.getRange(sheet.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);
}

function appendTransform_(ss, p) {
  const sheet = ss.getSheetByName(SHEETS.transform);
  const rows = p.transform.map(function(r) {
    const i=r.impressions||{}, g=r.changes||{}, m=r.gap_moe||{}, f=r.garment_factors||{};
    return [new Date(),p.participant_id,r.character_id,r.variant_id,r.order_index,
      i.I1,i.I2,i.I3,i.I4,i.I5,i.I6,
      g.G1,g.G2,g.G3,g.G4,g.G5,g.G6,
      m.GM1,m.GM2,m.GM3,
      r.core_shown_at,r.core_answered_at,r.core_duration_ms,
      f.factor_shown_at,f.factor_answered_at,f.factor_duration_ms,Boolean(f.none_selected),
      r.gm1_shown_at,r.gm1_answered_at,r.gm1_duration_ms];
  });
  sheet.getRange(sheet.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);
}

function appendFactors_(ss, p) {
  const rows = [];
  p.transform.forEach(function(r) {
    const f = r.garment_factors || {};
    const selected = f.selected || [];
    FACTOR_IDS.forEach(function(id) {
      const isSelected = selected.indexOf(id) !== -1;
      rows.push([new Date(),p.participant_id,r.character_id,r.variant_id,id,FACTOR_LABELS[id],isSelected,isSelected ? f.effects[id] : ""]);
    });
  });
  if (!rows.length) return;
  const sheet = ss.getSheetByName(SHEETS.factors);
  sheet.getRange(sheet.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);
}

function appendOpen_(ss, p) {
  const o=p.open_response||{};
  ss.getSheetByName(SHEETS.open).appendRow([new Date(),p.participant_id,o.strongest_character||"",safeCellText_(o.strongest_reason||""),o.nongap_character||"",safeCellText_(o.nongap_reason||"")]);
}

function safeCellText_(value) {
  const text = String(value == null ? "" : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}
