/* FloorGuard prototype — Pilot Session & Manager Report logic assertions.
   Run: node tests/pilot-session.test.js
   Stubs the browser surface so app.js loads in Node; exercises only the
   pure/reporting functions. Does NOT touch the scanners, cuts, or counts. */
var fs = require('fs');
var path = require('path');
var vm = require('vm');

/* ---------- minimal DOM/browser stubs in a vm sandbox ----------
   (app.js is strict-mode, so plain eval() would trap its declarations) */
var store = {};
function fakeEl() {
  return {
    innerHTML: '', textContent: '', value: '', hidden: false, className: '',
    onclick: null, onsubmit: null, style: {},
    addEventListener: function () {}, appendChild: function () {},
    setAttribute: function () {}, getAttribute: function () { return null; },
    querySelectorAll: function () { return []; }, focus: function () {}, click: function () {}, remove: function () {}
  };
}
var sandbox = {
  console: console,
  localStorage: {
    getItem: function (k) { return (k in store) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  },
  document: {
    addEventListener: function () {},
    getElementById: function () { return fakeEl(); },
    querySelector: function () { return fakeEl(); },
    querySelectorAll: function () { return []; },
    createElement: function () { return fakeEl(); },
    body: fakeEl()
  },
  window: { addEventListener: function () {}, scrollTo: function () {}, print: function () {} },
  navigator: { vibrate: function () {}, mediaDevices: null },
  URL: { createObjectURL: function () { return 'blob:x'; }, revokeObjectURL: function () {} },
  Blob: function () {}
};
vm.createContext(sandbox);

/* ---------- load the app ---------- */
var src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
/* Strip the boot block: it calls DB.load()/render() which need a real DOM. */
var bootIdx = src.indexOf('/* ---------------- boot');
if (bootIdx >= 0) src = src.slice(0, bootIdx);
vm.runInContext(src, sandbox, { filename: 'app.js' });
/* Pull the app's top-level names into this module's scope. */
var DB = sandbox.DB, F;
function syncF(v) { sandbox.F = v; }
var fmtDur = sandbox.fmtDur, freeCountStatus = sandbox.freeCountStatus,
    freeCountDiff = sandbox.freeCountDiff, isDiscrepancy = sandbox.isDiscrepancy,
    reportRows = sandbox.reportRows, sessionMetrics = sandbox.sessionMetrics,
    freeSessionBar = sandbox.freeSessionBar, filterReportRows = sandbox.filterReportRows,
    sessionExportRows = sandbox.sessionExportRows, sessionExportJson = sandbox.sessionExportJson,
    reportTableHtml = sandbox.reportTableHtml, statusChip = sandbox.statusChip,
    csvEsc = sandbox.csvEsc, STATUS = sandbox.STATUS;

/* ---------- fixture data ---------- */
DB.data = DB.seed();
DB.data.rolls = [
  { id: 'QH5CPHN', barcode: 'QH5CPHN', style: 'Oak', color: 'Natural', widthIn: 144, manufacturer: 'MFR', expectedLocation: '205B', beginningIn: 450, measuredIn: null }
];
DB.data.employees = ['Marcus'];
DB.data.currentEmployee = 'Marcus';
DB.data.freeSessions = [
  { id: 'FRTEST1', startedAt: '2026-09-29T18:00:00.000Z', startedBy: 'Marcus', endedAt: '2026-09-29T19:30:00.000Z' }
];
DB.data.freeCounts = [
  { id: 'FC1', sessionId: 'FRTEST1', rollId: 'QH5CPHN', barcode: 'QH5CPHN', raw: '01QH5CPHN',
    discovered: false, location: '205B', measuredFt: 37, measuredInch: 5, physicalIn: 449,
    expectedIn: 450, status: 'COLLECTED', measured: true,
    employee: 'Marcus', at: '2026-09-29T18:10:00.000Z', date: '9/29/2026', time: '2:10 PM' },
  { id: 'FC2', sessionId: 'FRTEST1', rollId: 'ZZ702', barcode: 'ZZ702', raw: 'ZZ702',
    discovered: true, location: '205B', measuredFt: 10, measuredInch: 0, physicalIn: 120,
    expectedIn: null, status: 'COLLECTED', measured: true,
    employee: 'Marcus', at: '2026-09-29T18:20:00.000Z', date: '9/29/2026', time: '2:20 PM' },
  { id: 'FC3', sessionId: 'FRTEST1', rollId: 'QH5CPHN', barcode: 'QH5CPHN', raw: 'QH5CPHN',
    discovered: false, location: '206A', measuredFt: 37, measuredInch: 5, physicalIn: 449,
    expectedIn: 450, status: 'COLLECTED', measured: true, locationIssue: true,
    needsReview: true, note: 'move pending',
    employee: 'Marcus', at: '2026-09-29T18:40:00.000Z', date: '9/29/2026', time: '2:40 PM' }
];
DB.data.documents = [
  { id: 'D1', rollId: 'QH5CPHN', barcode: 'QH5CPHN', raw: 'QH5CPHN', discovered: false,
    kind: 'HISTORY_CARD', docType: 'HISTORY CARD', image: 'x', thumb: 'y',
    employee: 'Marcus', at: '2026-09-29T18:15:00.000Z', date: '9/29/2026', time: '2:15 PM',
    location: '205B', source: 'PAPER CARD', num: 1, imports: [], sessionId: 'FRTEST1' }
];

/* ---------- assertions ---------- */
var pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}
function eq(a, b, name) { ok(a === b, name + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }

/* fmtDur */
eq(fmtDur(5000), '5s', 'fmtDur seconds');
eq(fmtDur(125000), '2m 5s', 'fmtDur minutes');
eq(fmtDur(3720000), '1h 2m', 'fmtDur hours');
eq(fmtDur(null), '—', 'fmtDur null');

/* freeCountStatus priority */
eq(freeCountStatus(DB.data.freeCounts[2]), 'NEEDS REVIEW', 'status: needsReview wins');
eq(freeCountStatus({ needsReview: false, locationIssue: true, discovered: false, expectedIn: 10, physicalIn: 10 }),
  'LOCATION ISSUE', 'status: locationIssue beats MATCH');
eq(freeCountStatus(DB.data.freeCounts[1]), 'NEWLY DISCOVERED', 'status: discovered');
eq(freeCountStatus(DB.data.freeCounts[0]), 'SHORT', 'status: 449 vs 450 = SHORT');
eq(freeCountStatus({ expectedIn: 100, physicalIn: 100 }), 'MATCH', 'status: equal = MATCH');
eq(freeCountStatus({ expectedIn: 100, physicalIn: 110 }), 'OVER', 'status: over');
eq(freeCountStatus({ expectedIn: null, physicalIn: 50 }), 'COLLECTED', 'status: no expected = COLLECTED');

/* freeCountDiff */
eq(freeCountDiff(DB.data.freeCounts[0]), -1, 'diff computed');
eq(freeCountDiff(DB.data.freeCounts[1]), null, 'diff null when no expected');

/* STATUS chips registered */
ok(STATUS.LOCATION_ISSUE && STATUS.NEWLY_DISCOVERED, 'STATUS has LOCATION_ISSUE + NEWLY_DISCOVERED');
ok(statusChip('LOCATION ISSUE').indexOf('LOCATION ISSUE') >= 0, 'statusChip renders LOCATION ISSUE');

/* reportRows */
var rows = reportRows('FRTEST1');
eq(rows.length, 3, 'reportRows count');
eq(rows[0].rollId, 'QH5CPHN', 'reportRows sorted by time');
eq(rows[0].status, 'SHORT', 'reportRows row0 status');
eq(rows[0].diffIn, -1, 'reportRows row0 diff');
eq(rows[0].docs, 1, 'reportRows row0 session docs');
eq(rows[1].status, 'NEWLY DISCOVERED', 'reportRows row1 status');
eq(rows[1].style, '—', 'reportRows discovered style unknown');
eq(rows[2].status, 'NEEDS REVIEW', 'reportRows row2 status');
eq(rows[2].note, 'move pending', 'reportRows row2 note');
eq(rows[0].style, 'Oak', 'reportRows known style');
ok(rows.every(function (r) { return r.mb === true; }), 'reportRows all MB');

/* sessionMetrics */
var m = sessionMetrics('FRTEST1');
eq(m.rolls, 3, 'metrics rolls');
eq(m.locations, 2, 'metrics locations');
eq(m.discrepancies, 2, 'metrics discrepancies (SHORT + NEEDS REVIEW)');
eq(m.needsReview, 1, 'metrics needsReview');
eq(m.historyCards, 1, 'metrics history cards');
eq(m.totalMs, 90 * 60 * 1000, 'metrics total session ms');
eq(m.avgMs, 15 * 60 * 1000, 'metrics avg ms per roll (30min span / 2 gaps)');

/* freeSessionBar */
syncF({ id: 'FRTEST1', startedAt: '2026-09-29T18:00:00.000Z', startedBy: 'Marcus' });
var bar = freeSessionBar();
ok(bar.indexOf('SESSION IN PROGRESS') >= 0, 'bar shows SESSION IN PROGRESS');
ok(bar.indexOf('FRTEST1') >= 0, 'bar shows session id');
ok(bar.indexOf('Rolls Counted <b>3</b>') >= 0, 'bar rolls count');
ok(bar.indexOf('Needs Review <b>2</b>') >= 0, 'bar needs review count');
syncF(null);
eq(sandbox.freeSessionBar(), '', 'bar empty without session');

/* filterReportRows */
eq(filterReportRows(rows, 'ALL').length, 3, 'filter ALL');
eq(filterReportRows(rows, 'SHORT').length, 1, 'filter SHORT');
eq(filterReportRows(rows, 'NEEDS REVIEW').length, 1, 'filter NEEDS REVIEW');
eq(filterReportRows(rows, 'NEWLY DISCOVERED').length, 1, 'filter NEWLY DISCOVERED');
eq(filterReportRows(rows, 'MATCH').length, 0, 'filter MATCH empty');

/* export */
var csv = sessionExportRows('FRTEST1');
var lines = csv.split('\r\n');
eq(lines.length, 4, 'csv header + 3 rows');
ok(lines[0].indexOf('difference_in') >= 0 && lines[0].indexOf('history_cards') >= 0, 'csv header columns');
ok(lines[1].indexOf('QH5CPHN') >= 0 && lines[1].indexOf('SHORT') >= 0, 'csv row content');
eq(csvEsc('a"b'), '"a""b"', 'csvEsc quotes');
var j = JSON.parse(sessionExportJson('FRTEST1'));
eq(j.session.id, 'FRTEST1', 'json session id');
eq(j.rows.length, 3, 'json rows');
eq(j.documents.length, 1, 'json documents');
eq(j.documents[0].rollId, 'QH5CPHN', 'json document roll link');
eq(j.session.metrics.historyCards, 1, 'json metrics cards');
ok(j.rows[2].note === 'move pending', 'json note preserved');

/* report table html sanity */
var t = reportTableHtml(rows);
ok(t.indexOf('<table') >= 0 && t.indexOf('EXPECTED BALANCE') >= 0, 'report table headers');
ok(t.indexOf('data-goto="disc-roll"') >= 0, 'discovered row links to disc-roll');
ok(t.indexOf('data-goto="roll"') >= 0, 'known row links to roll');

/* old records without new fields still work */
eq(freeCountStatus({ expectedIn: 50, physicalIn: 50 }), 'MATCH', 'legacy record no new fields');
ok(!isDiscrepancy({ expectedIn: 50, physicalIn: 50 }), 'legacy MATCH not discrepancy');
ok(isDiscrepancy({ expectedIn: 50, physicalIn: 40 }), 'legacy SHORT is discrepancy');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
