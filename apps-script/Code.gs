// Private configuration belongs in Script Properties, never in the public repository.
const LOG_HEADERS = ['Event ID', 'Decision ID', 'Previous event ID', 'Action', 'Recorded at (UTC)', 'Recorded by', 'Teen ID', 'Teen name', 'Mentor email', 'Mentor name', 'Required reason', 'Status', 'Suggestions and scores', 'Weights', 'Points possible'];
const LOG_TAB = 'Decisions';

function access_() {
  const properties = PropertiesService.getScriptProperties();
  const email = (Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const allowed = (properties.getProperty('MATCH_LOG_ALLOWED_EMAILS') || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
  if (!email || !allowed.includes(email)) throw new Error('This Google account is not authorized for the match log. Ask Cindy to check staff access.');
  const id = properties.getProperty('MATCH_LOG_SHEET_ID');
  if (!id) throw new Error('The match log has not been configured.');
  return {email, book: SpreadsheetApp.openById(id)};
}

// Run only from the editor bound to the existing log spreadsheet.
function setupMatchLog() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  if (!book) throw new Error('Run setup from the editor opened through the log spreadsheet, not from the webpage.');
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty('MATCH_LOG_SHEET_ID') !== book.getId()) throw new Error('Set MATCH_LOG_SHEET_ID to this existing spreadsheet before setup.');
  access_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    let sheet = book.getSheetByName(LOG_TAB);
    if (!sheet) sheet = book.insertSheet(LOG_TAB);
    if (sheet.getLastRow() > 0) { sheet_({book}); return 'Existing log verified; no records changed.'; }
    sheet.getRange(1, 1, 1, LOG_HEADERS.length).setValues([LOG_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, LOG_HEADERS.length).setBackground('#D2E9ED').setFontWeight('bold').setWrap(true);
    sheet.setColumnWidths(1, LOG_HEADERS.length, 160);
    sheet.setColumnWidth(8, 200);
    sheet.setColumnWidth(11, 340);
    sheet.setColumnWidth(13, 360);
    return 'Match log initialized. No participant records added.';
  } finally { lock.releaseLock(); }
}

function doGet() {
  access_();
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('Vescent Staff Matching Tool');
}

function sheet_(access) {
  const sheet = access.book.getSheetByName(LOG_TAB);
  if (!sheet || sheet.getLastRow() < 1) throw new Error('Run setupMatchLog before using the log.');
  const headers = sheet.getRange(1, 1, 1, LOG_HEADERS.length).getValues()[0];
  if (headers.some((v, i) => v !== LOG_HEADERS[i])) throw new Error('Log columns have changed. No records were written. Ask Cindy to check the sheet.');
  return sheet;
}
function events_(sheet) {
  const count = sheet.getLastRow() - 1;
  if (!count) return [];
  return sheet.getRange(2, 1, count, LOG_HEADERS.length).getValues().map(row => ({
    eventId: String(row[0]), decisionId: String(row[1]), previousEventId: String(row[2]), action: String(row[3]),
    at: String(row[4]), by: String(row[5]), teenId: String(row[6]), teenName: String(row[7]),
    mentorEmail: String(row[8]), mentorName: String(row[9]), reason: String(row[10]), status: String(row[11]),
    suggestions: JSON.parse(row[12]), weights: JSON.parse(row[13]), possible: Number(row[14]),
  }));
}
function loadMatchLog() {
  const access = access_();
  return {email: access.email, events: events_(sheet_(access))};
}
function text_(value, label, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(label + ' is required and must be at most ' + max + ' characters.');
  return value.trim();
}
function uuid_(value) {
  const id = text_(value, 'Record ID', 36);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) throw new Error('Invalid record ID.');
  return id;
}
function number_(value, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) throw new Error('Invalid score or weight.');
  return value;
}
function decision_(input) {
  const d = {
    teenId: text_(input.teenId, 'Teen account ID', 160), teenName: text_(input.teenName, 'Teen name', 200),
    mentorEmail: text_(input.mentorEmail, 'Mentor email', 254).toLowerCase(), mentorName: text_(input.mentorName, 'Mentor name', 200),
    reason: text_(input.reason, 'Decision reason', 1000), possible: number_(input.possible, 10000), weights: {},
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.mentorEmail)) throw new Error('A valid mentor email is required.');
  if (!input.weights || typeof input.weights !== 'object') throw new Error('Weights are required.');
  for (const key of ['interests', 'lived', 'personality', 'lightning']) d.weights[key] = number_(input.weights[key], 1000);
  if (d.possible !== d.weights.interests + d.weights.lived + d.weights.personality) throw new Error('Points possible do not match the scoring weights.');
  if (!Array.isArray(input.suggestions) || !input.suggestions.length || input.suggestions.length > 100) throw new Error('Suggested mentors are required.');
  d.suggestions = input.suggestions.map(m => ({name: text_(m.name, 'Suggested mentor name', 200), email: text_(m.email, 'Suggested mentor email', 254).toLowerCase(), total: number_(m.total, d.possible), percent: number_(m.percent, 100)}));
  if (!d.suggestions.some(m => m.email === d.mentorEmail)) throw new Error('The selected mentor must be included in the recorded score snapshot.');
  return d;
}
// Literal values starting with '=' must not become spreadsheet formulas.
function literal_(value) { return typeof value === 'string' && /^[=+\-@']/.test(value) ? "'" + value : value; }
function saveMatchEvent(input) {
  const access = access_();
  if (!input || typeof input !== 'object') throw new Error('Missing decision.');
  const eventId = uuid_(input.eventId);
  const decisionId = uuid_(input.decisionId);
  if (!['record', 'correct', 'confirm'].includes(input.action)) throw new Error('Invalid decision action.');
  const previous = input.previousEventId ? uuid_(input.previousEventId) : '';
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = sheet_(access);
    const events = events_(sheet);
    const existing = events.find(e => e.eventId === eventId);
    if (existing) {
      if (existing.by !== access.email || existing.decisionId !== decisionId || existing.action !== input.action) throw new Error('This save identifier is already in use.');
      return {saved: true, event: existing, retried: true};
    }
    const related = events.filter(e => e.decisionId === decisionId);
    const latest = related[related.length - 1];
    let d;
    if (input.action === 'record') {
      if (latest || previous) throw new Error('This decision already exists. Refresh the log.');
      d = decision_(input);
      if (events.some(e => e.teenId === d.teenId)) throw new Error('This teen already has a decision history. Use Correct decision instead.');
    } else {
      if (!latest || latest.eventId !== previous) throw new Error('Someone updated this decision. Refresh the log before continuing.');
      if (input.action === 'confirm') {
        if (latest.status !== 'Pending assignment') throw new Error('This assignment is already confirmed.');
        d = latest;
      } else {
        d = decision_(input);
        if (d.teenId !== latest.teenId) throw new Error('A correction cannot change the teen account ID.');
      }
    }
    const event = { ...d, eventId, decisionId, previousEventId: previous, action: input.action,
      at: new Date().toISOString(), by: access.email,
      status: input.action === 'confirm' ? 'Confirmed in admin' : 'Pending assignment'};
    const row = [event.eventId, event.decisionId, event.previousEventId, event.action, event.at, event.by,
      event.teenId, event.teenName, event.mentorEmail, event.mentorName, event.reason, event.status,
      JSON.stringify(event.suggestions), JSON.stringify(event.weights), event.possible];
    if (row.some(v => typeof v === 'string' && v.length > 40000)) throw new Error('This score snapshot is too large to save.');
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row.map(literal_)]);
    SpreadsheetApp.flush();
    return {saved: true, event};
  } finally { lock.releaseLock(); }
}
