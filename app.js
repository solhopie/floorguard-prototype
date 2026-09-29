'use strict';
/* ============================================================================
   FloorGuard v1 — warehouse cycle-count prototype (app.js)
   Pure static site: no build step, no network calls, no CDNs.

   ----------------------------------------------------------------------------
   DATA LAYER SEAM (read this before integrating with Real Floors):
   Every screen reads and writes ONLY through the `DB` object below
   (DB.load / DB.save / DB.reset / DB.seed and the query helpers after it).
   To connect FloorGuard to Real Floors' warehouse software later, replace the
   internals of DB (localStorage + seed) with API calls — the screen code does
   not touch storage directly and will not need to change.
   ----------------------------------------------------------------------------

   Units: all lengths are stored as INTEGER INCHES. Input accepts feet+inches
   or decimal linear feet; display uses 150' 1" style. Cycle counts NEVER
   change the system balance — they are recorded observations with a diff.
   ============================================================================ */

var DB = {
  KEY: 'floorguard_v1',

  /* Mock database. Replace with Real Floors API later (see seam note above). */
  seed: function () {
    var now = Date.now();
    var H = 3600 * 1000, D = 24 * H;
    var at = function (msAgo) { return new Date(now - msAgo).toISOString(); };

    return {
      v: 2,
      employees: ['Marcus', 'Dana', 'Luis'],
      currentEmployee: 'Marcus',
      rolls: [
        { id: 'QH5CPHN', barcode: 'QH5CPHN', manufacturer: 'Shaw Industries',
          style: 'Venture Solid', color: 'Soft Taupe', widthIn: 144,
          beginningIn: 1801, expectedLocation: '205B' },
        { id: 'TK7M2QA', barcode: 'TK7M2QA', manufacturer: 'Mohawk Industries',
          style: 'EverStrand Soft', color: 'Harbor Gray', widthIn: 144,
          beginningIn: 1440, expectedLocation: '205A' },
        { id: 'PL9XD4R', barcode: 'PL9XD4R', manufacturer: 'DreamWeaver',
          style: 'Pure Earth', color: 'Desert Sand', widthIn: 180,
          beginningIn: 1680, expectedLocation: '206B' },
        { id: 'MN3KP8W', barcode: 'MN3KP8W', manufacturer: 'Shaw Industries',
          style: 'Tuftex Nylon', color: 'Midnight Blue', widthIn: 144,
          beginningIn: 1560, expectedLocation: '206A' },
        { id: 'QW8ZV2N', barcode: 'QW8ZV2N', manufacturer: 'Phenix Flooring',
          style: 'Karastan Wool', color: 'Ivory White', widthIn: 162,
          beginningIn: 1320, expectedLocation: '204B' },
        { id: 'ZX4LM7B', barcode: 'ZX4LM7B', manufacturer: 'Stanton Carpet',
          style: 'Atelier Wool', color: 'Charcoal', widthIn: 144,
          beginningIn: 1200, expectedLocation: '204A' }
      ],
      cuts: [
        { id: 'K1', rollId: 'QH5CPHN', barcode: 'QH5CPHN', order: 'XS024531', inches: 323, prevIn: 1801, newIn: 1478, location: '205B', at: at(3 * D + 5 * H), by: 'Marcus' }, // 26' 11"
        { id: 'K2', rollId: 'QH5CPHN', barcode: 'QH5CPHN', order: 'XS024532', inches: 444, prevIn: 1478, newIn: 1034, location: '205B', at: at(2 * D + 3 * H), by: 'Dana' },   // 37'
        { id: 'K3', rollId: 'QH5CPHN', barcode: 'QH5CPHN', order: 'XS024536', inches: 498, prevIn: 1034, newIn: 536, location: '205B', at: at(1 * D + 6 * H), by: 'Marcus' }, // 41' 6"
        { id: 'K4', rollId: 'TK7M2QA', barcode: 'TK7M2QA', order: 'XS024540', inches: 200, prevIn: 1440, newIn: 1240, location: '205A', at: at(2 * D + 8 * H), by: 'Dana' },
        { id: 'K5', rollId: 'PL9XD4R', barcode: 'PL9XD4R', order: 'XS024541', inches: 360, prevIn: 1680, newIn: 1320, location: '206B', at: at(4 * D + 2 * H), by: 'Luis' },
        { id: 'K6', rollId: 'QW8ZV2N', barcode: 'QW8ZV2N', order: 'XS024544', inches: 120, prevIn: 1320, newIn: 1200, location: '204B', at: at(5 * D + 4 * H), by: 'Marcus' }
      ],
      counts: [
        { id: 'C-SEED-1', rollId: 'QH5CPHN', style: 'Venture Solid', color: 'Soft Taupe',
          widthIn: 144, expectedLocation: '205B', scannedLocation: '205B',
          expectedIn: 536, physicalIn: 533, diffIn: -3,
          employee: 'Marcus', at: at(2 * H), status: 'SHORT', flagged: false, measured: true },
        { id: 'C-SEED-2', rollId: 'TK7M2QA', style: 'EverStrand Soft', color: 'Harbor Gray',
          widthIn: 144, expectedLocation: '205A', scannedLocation: '205A',
          expectedIn: 1240, physicalIn: 1240, diffIn: 0,
          employee: 'Dana', at: at(5 * H), status: 'MATCH', flagged: false, measured: true },
        { id: 'C-SEED-3', rollId: 'TK7M2QA', style: 'EverStrand Soft', color: 'Harbor Gray',
          widthIn: 144, expectedLocation: '205A', scannedLocation: '205A',
          expectedIn: 1240, physicalIn: 1240, diffIn: 0,
          employee: 'Luis', at: at(0.5 * H), status: 'MATCH', flagged: false, measured: true },
        { id: 'C-SEED-4', rollId: 'PL9XD4R', style: 'Pure Earth', color: 'Desert Sand',
          widthIn: 180, expectedLocation: '206B', scannedLocation: '206B',
          expectedIn: 1320, physicalIn: 1350, diffIn: 30,
          employee: 'Luis', at: at(3 * H), status: 'OVER', flagged: false, measured: true },
        { id: 'C-SEED-5', rollId: 'MN3KP8W', style: 'Tuftex Nylon', color: 'Midnight Blue',
          widthIn: 144, expectedLocation: '206A', scannedLocation: '206B',
          expectedIn: 1560, physicalIn: 1560, diffIn: 0,
          employee: 'Dana', at: at(1 * H), status: 'LOCATION_MISMATCH', flagged: false, measured: true },
        { id: 'C-SEED-6', rollId: 'QW8ZV2N', style: 'Karastan Wool', color: 'Ivory White',
          widthIn: 162, expectedLocation: '204B', scannedLocation: '204A',
          expectedIn: 1200, physicalIn: 1190, diffIn: -10,
          employee: 'Marcus', at: at(0.75 * H), status: 'NEEDS_REVIEW', flagged: true, measured: true }
      ]
    };
  },

  load: function () {
    try {
      var raw = localStorage.getItem(this.KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && d.v === 1) {
          /* Migrate phones that seeded before the location-system correction:
             rewrite the old 98-* codes to the real warehouse codes, keep every
             saved count, then persist as v2. */
          this.data = migrateV1Locations(d);
          this.save();
          return this.data;
        }
        if (d && d.v === 2) { this.data = d; return d; }
      }
    } catch (e) { /* storage unavailable -> seed in memory */ }
    this.data = this.seed();
    this.save();
    return this.data;
  },

  save: function () {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); }
    catch (e) { /* private mode etc: prototype keeps running in memory */ }
  },

  reset: function () { this.data = this.seed(); this.save(); }
};

/* One-way migration for data seeded before the location-system correction
   (v1 used 98-* location codes; v2 uses the real warehouse codes). Saved
   counts are preserved — only the location strings are rewritten. */
function migrateV1Locations(d) {
  var map = {
    '98-A-01': '205B', '98-A-02': '205A',
    '98-B-01': '206B', '98-B-02': '206A', '98-B-03': '206B',
    '98-C-01': '204B', '98-C-02': '204A'
  };
  var fix = function (loc) {
    var n = normLoc(loc);
    return map[n] || loc;
  };
  (d.rolls || []).forEach(function (r) { r.expectedLocation = fix(r.expectedLocation); });
  (d.counts || []).forEach(function (c) {
    c.expectedLocation = fix(c.expectedLocation);
    c.scannedLocation = fix(c.scannedLocation);
  });
  d.v = 2;
  return d;
}

/* ---------------- query helpers (screens use these, not raw storage) ------ */
function rollById(id) {
  return DB.data.rolls.filter(function (r) { return r.id === id; })[0] || null;
}
/* Location codes are compared case-insensitively with stray spaces trimmed:
   "205b" and " 205B " both mean 205B. The scanned barcode value is
   authoritative — no format or prefix is required. */
function normLoc(s) { return String(s || '').trim().toUpperCase(); }
function rollByBarcode(code) {
  var c = String(code || '').trim().toUpperCase();
  var rolls = DB.data.rolls;
  var i, r;
  for (i = 0; i < rolls.length; i++) {
    r = rolls[i];
    if (r.barcode.toUpperCase() === c || r.id.toUpperCase() === c) return r;
  }
  /* Manufacturer tags often prefix the roll number (e.g. "01" + roll # on the
     printed tag). Retry with common prefixes stripped before giving up. */
  var stripped = c.replace(/^01/, '');
  if (stripped !== c && stripped) {
    for (i = 0; i < rolls.length; i++) {
      r = rolls[i];
      if (r.barcode.toUpperCase() === stripped || r.id.toUpperCase() === stripped) return r;
    }
  }
  return null;
}
/* System balance = beginning length minus all recorded cuts.
   Cycle counts never change it.
   --- TEMPORARY PILOT FUNCTIONALITY ---
   A supervisor can set roll.testBalanceIn via "SET TEST SYSTEM BALANCE" to stand
   in for the Real Floors system balance during the warehouse pilot. When set,
   it is returned instead of the computed value. To integrate the Real Floors
   API/database later: delete testBalanceIn and have systemBalance() fetch the
   authoritative balance from the backend instead. */
function systemBalance(rollId) {
  var roll = rollById(rollId);
  if (!roll) return 0;
  if (roll.testBalanceIn != null) return roll.testBalanceIn; /* TEMPORARY PILOT: Real Floors API replaces this */
  var cuts = DB.data.cuts.filter(function (c) { return c.rollId === rollId; });
  var used = cuts.reduce(function (s, c) { return s + c.inches; }, 0);
  return roll.beginningIn - used;
}
function isTestBalance(roll) { return !!(roll && roll.testBalanceIn != null); }

/* A count is a physical measurement (MB) when it carries a measured balance.
   Counts recorded before the MB flag existed have no flag but are still real
   physical measurements — only mismatch-only flags (physicalIn null) are not. */
function isMeasuredCount(c) { return !!(c && (c.measured || c.physicalIn != null)); }

/* Rolls whose latest physical measurement differs from the expected balance.
   Shared by the Discrepancies screen and the dashboard badge so both agree. */
function discrepancyRolls() {
  var latest = {};
  DB.data.counts.forEach(function (c) {
    if (!isMeasuredCount(c)) return;
    if (!latest[c.rollId] || new Date(c.at) > new Date(latest[c.rollId].at)) latest[c.rollId] = c;
  });
  return Object.keys(latest).map(function (k) { return latest[k]; })
    .filter(function (c) { return c.diffIn !== 0; })
    .sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
}

/* ---------------- Roll data model ------------------------------------------------
   Roll ID, Barcode, Style, Color, Width, Current Location live on the roll record.
   CURRENT EXPECTED BALANCE is never stored — it is calculated from transactions:
     starting balance (beginningIn) - sum of cuts = expected balance
   (or the temporary pilot testBalanceIn override when a supervisor set one).
   MEASURED BALANCE (MB): roll.measuredIn / measuredAt / measuredBy are stamped
   every time a worker physically measures the roll during a cycle count.
   Cut History = DB.data.cuts for the roll. Cycle Count History = DB.data.counts
   for the roll. History is append-only: records are never edited or deleted.
   A discrepancy NEVER changes the expected balance — it is recorded and queued
   for supervisor review on the Discrepancies screen. */

/* ---------------- Cut transaction service (integration seam) ----------------------
   ALL cut transactions go through CutService.recordCut() — the prototype UI and
   any future integration alike. Manual entry is the prototype path.
   FUTURE REAL FLOORS INTEGRATION: when Real Floors records an order/cut, an
   approved API/data integration calls CutService.recordCut() with the cut
   details, and FloorGuard updates the expected balance automatically — the
   employee must NOT enter the same cut twice. Keep this function separate from
   the UI so the integration can replace manual entry without touching screens.
   Do NOT attempt to access or imitate a private Real Floors system. */
var CutService = {
  /* opts: { rollId, order, cutIn, employee, location }
     Returns { ok:true, rec } or { ok:false, err }. */
  recordCut: function (opts) {
    var roll = rollById(opts.rollId);
    if (!roll) return { ok: false, err: 'Roll not found.' };
    var order = String(opts.order || '').trim().toUpperCase();
    if (!order) return { ok: false, err: 'Enter the order number.' };
    var cutIn = Math.round(Number(opts.cutIn));
    if (!isFinite(cutIn) || cutIn <= 0) return { ok: false, err: 'Cut length must be more than zero.' };
    var prevIn = systemBalance(roll.id);
    if (cutIn > prevIn) return { ok: false, err: 'Cut (' + fmtLen(cutIn) + ') exceeds the current balance (' + fmtLen(prevIn) + ').' };
    var now = new Date();
    var rec = {
      id: 'K' + Date.now().toString(36).toUpperCase(),
      rollId: roll.id, barcode: roll.barcode, order: order,
      prevIn: prevIn, inches: cutIn, newIn: prevIn - cutIn,
      location: opts.location || roll.expectedLocation,
      by: opts.employee || DB.data.currentEmployee,
      at: now.toISOString(), date: now.toLocaleDateString(), time: fmtTime(now.toISOString())
    };
    DB.data.cuts.push(rec); /* append-only: cut history is never edited or deleted */
    /* Keep a supervisor's temporary test balance in sync with recorded cuts. */
    if (roll.testBalanceIn != null) roll.testBalanceIn = Math.max(0, roll.testBalanceIn - cutIn);
    DB.save();
    return { ok: true, rec: rec };
  },
  recentOrders: function () {
    var seen = {}, out = [];
    DB.data.cuts.slice().sort(function (a, b) { return new Date(b.at) - new Date(a.at); })
      .forEach(function (c) {
        if (c.order && !seen[c.order]) { seen[c.order] = 1; out.push(c.order); }
      });
    return out.slice(0, 8);
  }
};
function countsForRoll(rollId) {
  return DB.data.counts
    .filter(function (c) { return c.rollId === rollId; })
    .sort(function (a, b) { return new Date(a.at) - new Date(b.at); });
}
function recentCountForRoll(rollId, withinMs) {
  var list = countsForRoll(rollId).filter(function (c) {
    return (Date.now() - new Date(c.at).getTime()) <= withinMs;
  });
  return list.length ? list[list.length - 1] : null;
}

/* ---------------- formatting ---------------------------------------------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
/* integer inches -> 150' 1" */
function fmtLen(inches) {
  var n = Math.round(inches);
  var ft = Math.floor(n / 12), inch = n % 12;
  return ft + "' " + inch + '"';
}
/* signed difference -> -3" / +2' 4" / 0" */
function fmtDiff(d) {
  d = Math.round(d);
  if (d === 0) return '0"';
  var s = d < 0 ? '-' : '+';
  var a = Math.abs(d);
  if (a < 12) return s + a + '"';
  return s + fmtLen(a);
}
function diffCls(d) { return d === 0 ? 'diff-zero' : (d < 0 ? 'diff-neg' : 'diff-pos'); }
function fmtWidth(wIn) {
  return (wIn % 12 === 0) ? (wIn / 12) + ' FT' : fmtLen(wIn);
}
function fmtDT(iso) {
  var d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function isToday(iso) {
  var d = new Date(iso), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

/* ---------------- status --------------------------------------------------- */
var STATUS = {
  MATCH:            { label: 'MATCH',            chip: 'st-green'  },
  SHORT:            { label: 'SHORT',            chip: 'st-red'    },
  OVER:             { label: 'OVER',             chip: 'st-yellow' },
  LOCATION_MISMATCH:{ label: 'LOCATION MISMATCH',chip: 'st-red'    },
  NEEDS_REVIEW:     { label: 'NEEDS REVIEW',     chip: 'st-yellow' }
};
function statusChip(status) {
  var m = STATUS[status] || STATUS.NEEDS_REVIEW;
  return '<span class="stchip ' + m.chip + '">' + m.label + '</span>';
}
/* Location mismatch always wins over the balance comparison. */
function computeStatus(roll, scannedLoc, physicalIn, flagged) {
  if (normLoc(scannedLoc) !== normLoc(roll.expectedLocation)) {
    return flagged ? 'NEEDS_REVIEW' : 'LOCATION_MISMATCH';
  }
  var diff = physicalIn - systemBalance(roll.id);
  if (diff === 0) return 'MATCH';
  return diff < 0 ? 'SHORT' : 'OVER';
}

/* ---------------- device feedback (guarded) -------------------------------- */
function buzz(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern || 60); } catch (e) {}
}
function beep(freq, dur) {
  try {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    var ctx = new C();
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq || 880;
    g.gain.value = 0.12;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    var d = dur || 0.12;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d);
    o.stop(ctx.currentTime + d + 0.03);
  } catch (e) {}
}
function flash(color) {
  var f = document.getElementById('flash');
  if (!f) return;
  f.className = 'show ' + color;
  setTimeout(function () { f.className = ''; }, 380);
}
function good() { beep(880, 0.12); buzz(60); flash('green'); }
function bad()  { beep(220, 0.28); buzz([90, 50, 90]); flash('red'); }
function warn() { beep(520, 0.18); buzz(140); flash('yellow'); }

function $(sel) { return document.querySelector(sel); }

/* ---------------- camera barcode scanner -----------------------------------
   Uses getUserMedia + BarcodeDetector when the device supports them.
   Camera is a convenience only: big manual entry is ALWAYS offered, because
   desktops, denied permissions, and gloves must never block a count. */
var Scanner = {
  stream: null,
  stopFlag: false,
  zxReader: null,

  cameraAvailable: function () {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  },

  /* True when ANY barcode reader exists: the built-in API or our bundled ZXing. */
  hasReader: function () {
    return ('BarcodeDetector' in window) ||
      !!(window.ZXing && ZXing.BrowserMultiFormatReader);
  },

  start: function (videoEl, onCode) {
    var self = this;
    self.stop();
    self.stopFlag = false;
    if (!self.cameraAvailable()) return Promise.resolve({ ok: false, reason: 'no-camera-api' });
    /* Check for a barcode-reader API BEFORE asking for the camera: without one
       the preview can't scan anything, so skip the permission prompt entirely
       instead of flashing the user's own video and then failing. */
    if (!self.hasReader()) return Promise.resolve({ ok: false, reason: 'no-detector' });
    /* No built-in reader (older iOS) but our bundled ZXing is present. */
    if (!('BarcodeDetector' in window)) return self.startZxing(videoEl, onCode);
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(function (stream) {
        self.stream = stream;
        videoEl.srcObject = stream;
        return videoEl.play().catch(function () {});
      })
      .then(function () {
        var det = null;
        try {
          det = new BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf', 'codabar'] });
        } catch (e1) {
          try { det = new BarcodeDetector(); }
          catch (e2) { self.stop(); return { ok: false, reason: 'detector-init' }; }
        }
        var fails = 0, hintShown = false;
        var tick = function () {
          if (self.stopFlag) return;
          var p;
          try { p = det.detect(videoEl); }
          catch (e) { requestAnimationFrame(tick); return; }
          p.then(function (codes) {
            if (self.stopFlag) return;
            fails = 0;
            if (codes && codes.length && codes[0].rawValue) {
              self.stop();
              onCode(codes[0].rawValue);
            } else {
              requestAnimationFrame(tick);
            }
          }).catch(function () {
            if (self.stopFlag) return;
            fails++;
            if (fails >= 25 && !hintShown) {
              hintShown = true;
              var box = videoEl.parentNode;
              if (box) {
                var d = document.createElement('div');
                d.className = 'camnote';
                d.innerHTML = 'Having trouble reading &mdash; you can type the code or tap a DEMO chip below.';
                box.appendChild(d);
              }
            }
            requestAnimationFrame(tick);
          });
        };
        tick();
        return { ok: true, mode: 'camera' };
      })
      .catch(function () { self.stop(); return { ok: false, reason: 'denied' }; });
  },

  /* Fallback path for devices without the built-in BarcodeDetector (older iOS):
     decode with the bundled ZXing library instead. */
  startZxing: function (videoEl, onCode) {
    var self = this;
    self.stop();
    self.stopFlag = false;
    var reader;
    try {
      reader = new ZXing.BrowserMultiFormatReader();
    } catch (e) {
      return Promise.resolve({ ok: false, reason: 'detector-init' });
    }
    self.zxReader = reader;
    var p;
    try {
      p = reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        videoEl,
        function (result, err) {
          if (self.stopFlag) return;
          if (result && result.getText) {
            var txt = result.getText();
            if (txt) { self.stop(); onCode(txt); }
          }
          /* err is routine (no barcode in this frame); ignore it. */
        }
      );
    } catch (e) {
      self.stop();
      return Promise.resolve({ ok: false, reason: 'detector-init' });
    }
    return Promise.resolve(p).then(
      function () { return { ok: true, mode: 'camera-zxing' }; },
      function (e) {
        self.stop();
        var denied = e && (e.name === 'NotAllowedError' || e.name === 'NotFoundError' || e.name === 'OverconstrainedError');
        return { ok: false, reason: denied ? 'denied' : 'detector-init' };
      }
    );
  },

  stop: function () {
    this.stopFlag = true;
    if (this.zxReader) {
      try { this.zxReader.reset(); } catch (e) {}
      this.zxReader = null;
    }
    if (this.stream) {
      try { this.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      this.stream = null;
    }
  }
};

/* ---------------- router ---------------------------------------------------- */
var S = null;          /* active count session */
var lastSavedId = null;

function newSession() {
  S = { roll: null, scannedLoc: null, physicalIn: null, flagged: false };
}
/* Cut-transaction session. */
var C = null;
function newCutSession() {
  C = { roll: null, order: '', cutIn: null };
}
/* Rapid cycle-count session: one active location, then roll after roll. */
var R = null;
function newRapid() {
  R = { activeLoc: null, scan: null, lastMsg: null };
}

function parseHash() {
  var h = (location.hash || '').replace(/^#\/?/, '');
  var parts = h.split('/');
  return { name: parts[0] || 'home', param: decodeURIComponent(parts[1] || '') };
}
function go(name, param) {
  location.hash = '#/' + name + (param ? '/' + encodeURIComponent(param) : '');
}

var TITLES = {
  home: 'FloorGuard', 'scan-roll': 'Scan Roll', 'scan-loc': 'Scan Location',
  dup: 'Duplicate Check', balance: 'Enter Balance', confirm: 'Confirm Count',
  mismatch: 'Location Mismatch', saved: 'Count Saved', search: 'Search Roll',
  roll: 'Roll History', recent: 'Recent Counts', count: 'Count Detail',
  dashboard: 'Supervisor Dashboard', employee: 'Who Is Counting?',
  testbal: 'Set Test Balance', testbaledit: 'Edit Test Balance',
  'cut-scan': 'Cut — Scan Roll', 'cut-entry': 'Cut — Enter Cut', 'cut-saved': 'Cut Saved',
  'rapid-loc': 'Rapid — Scan Location', 'rapid-scan': 'Rapid Cycle Count',
  'rapid-balance': 'Rapid — Enter Balance', 'rapid-mismatch': 'Location Mismatch',
  discrepancies: 'Cycle Count Discrepancies'
};

function render() {
  Scanner.stop(); /* never leave the camera running between screens */
  var r = parseHash();
  var scr = Screens[r.name] || Screens.home;
  document.getElementById('tb-title').textContent = TITLES[r.name] || 'FloorGuard';
  document.getElementById('tb-emp').textContent = DB.data.currentEmployee || '';
  var back = document.getElementById('backbtn');
  if (r.name === 'home') back.hidden = true;
  else { back.hidden = false; back.onclick = function () { history.back(); }; }
  var out = scr(r.param);
  document.getElementById('app').innerHTML = out.html;
  if (out.mount) out.mount();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', render);

/* Count-flow guards: deep links into the middle of a count bounce home. */
function needRoll()   { if (!S || !S.roll) { go('home'); return false; } return true; }
function needLoc()    { if (!needRoll() || !S.scannedLoc) { go('home'); return false; } return true; }
function needBalance(){ if (!needLoc() || S.physicalIn == null) { go('home'); return false; } return true; }

var Screens = {};

/* ---------------- HOME ------------------------------------------------------ */
Screens.home = function () {
  var emp = esc(DB.data.currentEmployee || '—');
  var html =
    '<div class="screen">' +
    '<div class="brand-hero">' +
      '<div class="logo-mark">FG</div>' +
      '<h1>FLOORGUARD</h1>' +
      '<div class="tag">WAREHOUSE CYCLE COUNT</div>' +
    '</div>' +
    '<button class="btn" id="empchip">&#128100; ' + emp + ' &#9662;</button>' +
    '<button class="btn btn-primary btn-home" id="b-start">&#9654; START CYCLE COUNT</button>' +
    '<button class="btn btn-home" id="b-rapid">&#9889; RAPID CYCLE COUNT</button>' +
    '<button class="btn btn-home" id="b-cut">&#9986; CUT / UPDATE ROLL</button>' +
    '<button class="btn btn-home" id="b-search">&#128269; SEARCH ROLL</button>' +
    '<button class="btn btn-home" id="b-recent">&#9776; RECENT COUNTS</button>' +
    '<button class="btn btn-home" id="b-dash">&#128202; SUPERVISOR DASHBOARD</button>' +
    '<div class="foot">Prototype v1 &middot; mock data &middot; works offline</div>' +
    '</div>';
  return { html: html, mount: function () {
    $('#empchip').onclick = function () { go('employee'); };
    $('#b-start').onclick = function () { newSession(); go('scan-roll'); };
    $('#b-rapid').onclick = function () { newRapid(); go('rapid-loc'); };
    $('#b-cut').onclick = function () { newCutSession(); go('cut-scan'); };
    $('#b-search').onclick = function () { go('search'); };
    $('#b-recent').onclick = function () { go('recent'); };
    $('#b-dash').onclick = function () { go('dashboard'); };
  }};
};

/* ---------------- EMPLOYEE PICKER ------------------------------------------- */
Screens.employee = function () {
  var btns = DB.data.employees.map(function (e) {
    var cur = (e === DB.data.currentEmployee) ? ' &#10003;' : '';
    return '<button class="btn btn-home" data-emp="' + esc(e) + '">&#128100; ' + esc(e) + cur + '</button>';
  }).join('');
  var html =
    '<div class="screen">' +
    '<div class="step-head">WHO IS COUNTING?</div>' +
    '<h1>Select employee</h1>' +
    btns +
    '<div class="card"><div class="label">OR ENTER A NAME</div>' +
    '<div class="field"><input class="input" id="empname" autocomplete="off" placeholder="Your name"></div>' +
    '<button class="btn btn-primary" id="empset">USE THIS NAME</button></div>' +
    '</div>';
  return { html: html, mount: function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-emp]'), function (b) {
      b.onclick = function () { setEmployee(b.getAttribute('data-emp')); };
    });
    $('#empset').onclick = function () {
      var v = $('#empname').value.trim();
      if (!v) { bad(); return; }
      setEmployee(v);
    };
  }};
  function setEmployee(name) {
    if (DB.data.employees.indexOf(name) < 0) DB.data.employees.push(name);
    DB.data.currentEmployee = name;
    DB.save(); good(); go('home');
  }
};

/* ---------------- SCAN ROLL (step 1) ---------------------------------------- */
Screens['scan-roll'] = function () {
  if (!S) newSession();
  var chips = DB.data.rolls.map(function (r) {
    return '<button class="demochip" data-code="' + esc(r.barcode) + '">' + esc(r.barcode) + '</button>';
  }).join('');
  var html =
    '<div class="screen">' +
    '<div class="step-head">STEP 1 OF 4 &mdash; SCAN ROLL</div>' +
    '<h1>Scan roll barcode</h1>' +
    '<div class="cambox" id="cambox"><div class="camnote">Starting camera&hellip;</div></div>' +
    '<form id="manualform"><div class="field">' +
      '<label class="label" for="manual">OR TYPE / WEDGE THE BARCODE</label>' +
      '<input class="input mono" id="manual" autocomplete="off" autocapitalize="characters" placeholder="e.g. QH5CPHN">' +
    '</div>' +
    '<button class="btn btn-primary btn-huge" type="submit">ENTER CODE</button></form>' +
    '<div class="demolabel">DEMO &mdash; TAP TO SIMULATE A SCAN</div>' +
    '<div class="demochips">' + chips + '</div>' +
    '<div id="result"></div>' +
    '</div>';
  return { html: html, mount: function () {
    mountScannerBox('cambox', onCode);
    $('#manualform').onsubmit = function (e) { e.preventDefault(); onCode($('#manual').value); };
    Array.prototype.forEach.call(document.querySelectorAll('.demochip'), function (c) {
      c.onclick = function () { onCode(c.getAttribute('data-code')); };
    });
  }};

  function onCode(code) {
    var roll = rollByBarcode(code);
    if (!roll) {
      bad();
      $('#result').innerHTML = '<div class="err center" style="font-size:1.3rem">&#10060; ROLL NOT FOUND<br><span style="font-size:1rem">"' +
        esc(code) + '" is not in the system. Try again.</span></div>';
      return;
    }
    good();
    S.roll = roll;
    var scanned = String(code || '').trim().toUpperCase();
    var scannedRow = (scanned && scanned !== roll.barcode.toUpperCase() && scanned !== roll.id.toUpperCase())
      ? '<div class="kv"><span class="k">Scanned code</span><span class="v mono">' + esc(scanned) + '</span></div>'
      : '';
    $('#result').innerHTML =
      '<div class="ok-panel"><div class="big-ok">&#9989; ROLL IDENTIFIED</div>' +
      scannedRow +
      '<div class="kv"><span class="k">Roll #</span><span class="v mono">' + esc(roll.id) + '</span></div>' +
      '<div class="kv"><span class="k">Style</span><span class="v">' + esc(roll.style) + '</span></div>' +
      '<div class="kv"><span class="k">Color</span><span class="v">' + esc(roll.color) + '</span></div>' +
      '<div class="kv"><span class="k">Current Balance</span><span class="v num">' + fmtLen(systemBalance(roll.id)) + '</span></div>' +
      '</div>' +
      '<button class="btn btn-primary btn-huge" id="cont">CONTINUE &rarr; SCAN LOCATION</button>';
    $('#cont').onclick = function () { go('scan-loc'); };
    $('#cont').scrollIntoView(false);
  }
};

/* Shared camera-box wiring used by both scan steps. */
function mountScannerBox(boxId, onCode) {
  var box = document.getElementById(boxId);
  if (!Scanner.cameraAvailable()) {
    box.innerHTML = '<div class="camnote">This device has no camera.<br>Type the code or tap a DEMO chip below.</div>';
    return;
  }
  if (!Scanner.hasReader()) {
    /* No barcode-reader API on this device and the bundled fallback failed to
       load: don't prompt for the camera — it couldn't scan anyway. Manual
       entry and the DEMO chips are the way through. */
    box.innerHTML = '<div class="camnote">&#9888;&#65039; Auto-scan isn\'t supported on this iPhone\'s iOS version.<br>Type the code or tap a DEMO chip below &mdash; no camera needed.</div>';
    return;
  }
  box.innerHTML = '<video id="scanvideo" playsinline muted></video><div class="scanline"></div>';
  var video = document.getElementById('scanvideo');
  Scanner.start(video, onCode).then(function (res) {
    if (!res.ok) {
      var msg = res.reason === 'denied'
        ? 'Camera permission was denied. Allow camera access in Settings,<br>or type the code / tap a DEMO chip below.'
        : 'The barcode reader failed to start on this device.<br>Type the code or tap a DEMO chip below.';
      box.innerHTML = '<div class="camnote">' + msg + '</div>';
    }
  });
}

/* ---------------- SCAN LOCATION (step 2) ------------------------------------- */
Screens['scan-loc'] = function () {
  if (!needRoll()) return { html: '' };
  S.scannedLoc = null;
  /* Demo/test values only — real locations come from the scanned barcode. */
  var chips = ['205A', '205B', '206A', '206B', '204A', '204B'].map(function (l) {
    return '<button class="demochip" data-code="' + esc(l) + '">' + esc(l) + '</button>';
  }).join('');
  var html =
    '<div class="screen">' +
    '<div class="step-head">STEP 2 OF 4 &mdash; SCAN LOCATION</div>' +
    '<h1>Scan the location barcode</h1>' +
    '<p class="hint">Roll <b class="mono">' + esc(S.roll.id) + '</b> &mdash; scan the location tag where it sits.</p>' +
    '<div class="cambox" id="cambox"><div class="camnote">Starting camera&hellip;</div></div>' +
    '<form id="manualform"><div class="field">' +
      '<label class="label" for="manual">OR TYPE / WEDGE THE LOCATION CODE</label>' +
      '<input class="input mono" id="manual" autocomplete="off" autocapitalize="characters" placeholder="e.g. 205B">' +
    '</div>' +
    '<button class="btn btn-primary btn-huge" type="submit">ENTER CODE</button></form>' +
    '<div class="demolabel">DEMO &mdash; TAP TO SIMULATE A SCAN</div>' +
    '<div class="demochips">' + chips + '</div>' +
    '<div id="result"></div>' +
    '</div>';
  return { html: html, mount: function () {
    mountScannerBox('cambox', onCode);
    $('#manualform').onsubmit = function (e) { e.preventDefault(); onCode($('#manual').value); };
    Array.prototype.forEach.call(document.querySelectorAll('.demochip'), function (c) {
      c.onclick = function () { onCode(c.getAttribute('data-code')); };
    });
  }};

  function onCode(code) {
    var loc = normLoc(code);
    if (!loc) {
      bad();
      $('#result').innerHTML = '<div class="err center" style="font-size:1.3rem">&#10060; EMPTY SCAN &mdash; try again.</div>';
      return;
    }
    good();
    S.scannedLoc = loc;
    $('#result').innerHTML =
      '<div class="ok-panel"><div class="big-ok">&#9989; LOCATION VERIFIED</div>' +
      '<div class="kv"><span class="k">Scanned</span><span class="v mono" style="font-size:1.5rem">' + esc(loc) + '</span></div>' +
      '</div>' +
      '<button class="btn btn-primary btn-huge" id="cont">CONTINUE &rarr; ENTER BALANCE</button>';
    $('#cont').onclick = function () {
      var dup = recentCountForRoll(S.roll.id, 24 * 3600 * 1000);
      go(dup ? 'dup' : 'balance');
    };
    $('#cont').scrollIntoView(false);
  }
};

/* ---------------- SEARCH ROLL ------------------------------------------------- */
Screens.search = function () {
  var html =
    '<div class="screen">' +
    '<div class="step-head">FIND A ROLL</div>' +
    '<h1>Search rolls</h1>' +
    '<div class="field"><input class="input" id="q" autocomplete="off" placeholder="Roll #, style, color, location&hellip;"></div>' +
    '<div id="results"></div>' +
    '</div>';
  return { html: html, mount: function () {
    var renderResults = function () {
      var q = $('#q').value.trim().toLowerCase();
      var list = DB.data.rolls.filter(function (r) {
        if (!q) return true;
        return (r.id + ' ' + r.style + ' ' + r.color + ' ' + r.expectedLocation + ' ' + r.manufacturer)
          .toLowerCase().indexOf(q) >= 0;
      });
      $('#results').innerHTML = list.length ? list.map(function (r) {
        return '<button class="rowbtn" data-roll="' + esc(r.id) + '">' +
          '<div class="rhead"><b class="mono">' + esc(r.id) + '</b>' + lastCountChip(r.id) + '</div>' +
          '<div class="sub">' + esc(r.style) + ' &middot; ' + esc(r.color) + ' &middot; ' + esc(r.expectedLocation) +
          ' &middot; bal ' + fmtLen(systemBalance(r.id)) + '</div></button>';
      }).join('') : '<p class="hint center">No rolls match.</p>';
      Array.prototype.forEach.call(document.querySelectorAll('[data-roll]'), function (b) {
        b.onclick = function () { go('roll', b.getAttribute('data-roll')); };
      });
    };
    $('#q').addEventListener('input', renderResults);
    renderResults();
    $('#q').focus();
  }};
  function lastCountChip(rollId) {
    var c = countsForRoll(rollId);
    if (!c.length) return '<span class="stchip" style="background:var(--line);color:var(--muted)">NOT COUNTED</span>';
    return statusChip(c[c.length - 1].status);
  }
};

/* ---------------- DUPLICATE COUNT PROTECTION ---------------------------------- */
Screens.dup = function () {
  if (!needLoc()) return { html: '' };
  var dup = recentCountForRoll(S.roll.id, 24 * 3600 * 1000);
  if (!dup) { setTimeout(function () { go('balance'); }, 0); return { html: '' }; }
  var html =
    '<div class="screen">' +
    '<div class="warn-panel" style="background:var(--yellow-dark);border-color:var(--yellow)">' +
      '<h1>&#9888; THIS ROLL WAS<br>ALREADY COUNTED</h1>' +
      '<div class="kv"><span class="k">Last Count</span><span class="v">' + fmtDT(dup.at) + '</span></div>' +
      '<div class="kv"><span class="k">By</span><span class="v">' + esc(dup.employee) + '</span></div>' +
      '<div class="kv"><span class="k">Status</span><span class="v">' + statusChip(dup.status) + '</span></div>' +
    '</div>' +
    '<h2 class="center">Count again?</h2>' +
    '<div class="btn-row">' +
      '<button class="btn btn-green btn-huge" id="yes">YES</button>' +
      '<button class="btn btn-red btn-huge" id="cancel">CANCEL</button>' +
    '</div></div>';
  return { html: html, mount: function () {
    warn();
    $('#yes').onclick = function () { go('balance'); };
    $('#cancel').onclick = function () { S = null; go('home'); };
  }};
};

/* ---------------- ENTER PHYSICAL BALANCE (step 3) ------------------------------ */
Screens.balance = function () {
  if (!needLoc()) return { html: '' };
  var roll = S.roll, sys = systemBalance(roll.id);
  var html =
    '<div class="screen">' +
    '<div class="step-head">STEP 3 OF 4 &mdash; PHYSICAL BALANCE</div>' +
    '<h1>Physical balance</h1>' +
    '<div class="card">' +
      '<div class="kv"><span class="k">Roll #</span><span class="v mono">' + esc(roll.id) + '</span></div>' +
      '<div class="kv"><span class="k">Style</span><span class="v">' + esc(roll.style) + '</span></div>' +
      '<div class="kv"><span class="k">Color</span><span class="v">' + esc(roll.color) + '</span></div>' +
      '<div class="kv"><span class="k">Location</span><span class="v mono">' + esc(normLoc(S.scannedLoc)) + '</span></div>' +
      '<div class="kv"><span class="k">System Balance' +
        (isTestBalance(roll) ? ' <span class="stchip st-yellow">TEST</span>' : '') +
        '</span><span class="v num" style="font-size:1.5rem">' + fmtLen(sys) + '</span></div>' +
    '</div>' +
    '<div class="field"><label class="label">AMOUNT OF CARPET PHYSICALLY ON THE ROLL</label></div>' +
    '<div class="btn-row">' +
      '<div class="field" style="flex:1"><label class="label">FEET</label>' +
      '<input class="input num balfield" id="ft" inputmode="numeric" autocomplete="off" placeholder="0"></div>' +
      '<div class="field" style="flex:1"><label class="label">INCHES</label>' +
      '<input class="input num balfield" id="inch" inputmode="decimal" autocomplete="off" placeholder="0"></div>' +
    '</div>' +
    '<div class="big-readout num" id="combined">= 0\' 0"</div>' +
    '<div class="err" id="balerr" hidden></div>' +
    '<button class="btn btn-primary btn-huge" id="cont">CONTINUE &rarr; REVIEW</button>' +
    '</div>';
  return { html: html, mount: function () {
    var update = function () {
      var ft = parseFloat($('#ft').value) || 0, inch = parseFloat($('#inch').value) || 0;
      if (ft < 0 || inch < 0 || isNaN(ft) || isNaN(inch)) { $('#combined').textContent = '= —'; return; }
      $('#combined').textContent = '= ' + fmtLen(Math.round(ft * 12 + inch));
    };
    $('#ft').addEventListener('input', update);
    $('#inch').addEventListener('input', update);
    $('#cont').onclick = function () {
      var ft = parseFloat($('#ft').value), inch = parseFloat($('#inch').value);
      var err = '';
      if ($('#ft').value.trim() === '' && $('#inch').value.trim() === '') err = 'Enter feet and/or inches.';
      else if (isNaN(ft) || isNaN(inch) || ft < 0 || inch < 0) err = 'Numbers must be zero or more.';
      if (err) { bad(); var e = $('#balerr'); e.textContent = err; e.hidden = false; return; }
      S.physicalIn = Math.round(ft * 12 + inch);
      good();
      go(normLoc(S.scannedLoc) !== normLoc(S.roll.expectedLocation) ? 'mismatch' : 'confirm');
    };
  }};
};

/* ---------------- CONFIRM (step 4, location matches) -------------------------- */
Screens.confirm = function () {
  if (!needBalance()) return { html: '' };
  var roll = S.roll, sys = systemBalance(roll.id), diff = S.physicalIn - sys;
  var status = computeStatus(roll, S.scannedLoc, S.physicalIn, false);
  var html =
    '<div class="screen">' +
    '<div class="step-head">STEP 4 OF 4 &mdash; CONFIRM COUNT</div>' +
    '<h1>Review before saving</h1>' +
    '<div class="card">' +
      kv('Roll #', '<span class="mono">' + esc(roll.id) + '</span>') +
      kv('Style', esc(roll.style)) +
      kv('Color', esc(roll.color)) +
      kv('Width', fmtWidth(roll.widthIn)) +
      kv('System Balance', '<span class="num">' + fmtLen(sys) + '</span>') +
      kv('Physical Balance', '<span class="num">' + fmtLen(S.physicalIn) + '</span>') +
      kv('Difference', '<span class="' + diffCls(diff) + ' num">' + fmtDiff(diff) + '</span>') +
      kv('Expected Location', '<span class="mono">' + esc(roll.expectedLocation) + '</span>') +
      kv('Scanned Location', '<span class="mono">' + esc(S.scannedLoc) + '</span>') +
      kv('Status', statusChip(status)) +
      kv('Employee', esc(DB.data.currentEmployee)) +
    '</div>' +
    '<button class="btn btn-green btn-huge" id="submit">SUBMIT COUNT</button>' +
    '<button class="linklike" id="back">&larr; go back and re-measure</button>' +
    '</div>';
  return { html: html, mount: function () {
    $('#submit').onclick = function () { submitCount(false); };
    $('#back').onclick = function () { go('balance'); };
  }};
  function kv(k, v) { return '<div class="kv"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; }
};

/* ---------------- LOCATION MISMATCH warning ----------------------------------- */
Screens.mismatch = function () {
  if (!needBalance()) return { html: '' };
  if (normLoc(S.scannedLoc) === normLoc(S.roll.expectedLocation)) { setTimeout(function () { go('confirm'); }, 0); return { html: '' }; }
  var roll = S.roll;
  var html =
    '<div class="screen">' +
    '<div class="warn-panel">' +
      '<h1>&#9888; LOCATION<br>MISMATCH</h1>' +
      '<p style="color:#fecaca">This roll is <b>not</b> where the system expects it.<br>The location will <b>NOT</b> be changed automatically.</p>' +
      '<div class="vs">' +
        '<div><div class="k">EXPECTED LOCATION</div><div class="v mono">' + esc(roll.expectedLocation) + '</div></div>' +
        '<div><div class="k">SCANNED LOCATION</div><div class="v mono">' + esc(S.scannedLoc) + '</div></div>' +
      '</div>' +
      '<div class="kv"><span class="k">Roll #</span><span class="v mono">' + esc(roll.id) + '</span></div>' +
      '<div class="kv"><span class="k">Style</span><span class="v">' + esc(roll.style) + '</span></div>' +
    '</div>' +
    '<button class="btn btn-red btn-huge" id="save-mismatch">SAVE AS LOCATION MISMATCH</button>' +
    '<button class="btn btn-yellow btn-huge" id="flag">&#9888; FLAG FOR SUPERVISOR REVIEW</button>' +
    '<button class="linklike" id="goback">&larr; go back and re-scan the location</button>' +
    '</div>';
  return { html: html, mount: function () {
    bad();
    $('#save-mismatch').onclick = function () { submitCount(false); };
    $('#flag').onclick = function () { submitCount(true); };
    $('#goback').onclick = function () { S.scannedLoc = null; go('scan-loc'); };
  }};
};

/* ---------------- submit + saved --------------------------------------------- */
function submitCount(flagged) {
  var roll = S.roll;
  var sys = systemBalance(roll.id);
  var diff = S.physicalIn - sys;
  var status = computeStatus(roll, S.scannedLoc, S.physicalIn, flagged);
  var now = new Date();
  var rec = {
    id: 'C' + Date.now().toString(36).toUpperCase(),
    rollId: roll.id, barcode: roll.barcode, style: roll.style, color: roll.color, widthIn: roll.widthIn,
    expectedLocation: roll.expectedLocation, scannedLocation: S.scannedLoc,
    expectedIn: sys, physicalIn: S.physicalIn, diffIn: diff,
    measured: true, /* MB: worker physically measured this roll */
    employee: DB.data.currentEmployee, at: now.toISOString(),
    date: now.toLocaleDateString(), time: fmtTime(now.toISOString()),
    status: status, flagged: !!flagged
  };
  DB.data.counts.push(rec); /* append-only: records are never edited or deleted */
  /* Stamp the roll's measured-balance fields so supervisors can distinguish
     the calculated/system balance from the last physical measurement. */
  roll.measuredIn = S.physicalIn;
  roll.measuredAt = rec.at;
  roll.measuredBy = rec.employee;
  DB.save();
  S = null;
  lastSavedId = rec.id;
  if (status === 'MATCH') good(); else if (status === 'NEEDS_REVIEW') warn(); else bad();
  go('saved', rec.id);
}

/* ---------------- CUT TRANSACTION MODE -------------------------------------------
   SCAN ROLL -> SHOW CURRENT BALANCE -> ORDER NUMBER -> CUT LENGTH ->
   NEW BALANCE -> SAVE CUT -> READY STATE.
   The barcode identifies the ROLL only; the balance lives in the database and is
   recalculated from the cut history, so the same barcode stays on the roll for
   its whole life. All writes go through CutService.recordCut() (the Real Floors
   integration seam). The scanner implementation below is untouched — the shared
   mountScannerBox wiring is reused, not rebuilt. */
Screens['cut-scan'] = function () {
  if (!C) newCutSession();
  var chips = DB.data.rolls.map(function (r) {
    return '<button class="demochip" data-code="' + esc(r.barcode) + '">' + esc(r.barcode) + '</button>';
  }).join('');
  var html =
    '<div class="screen">' +
    '<div class="step-head">CUT TRANSACTION &mdash; SCAN ROLL</div>' +
    '<h1>Scan roll barcode</h1>' +
    '<p class="hint">Scan the roll to cut. The barcode identifies the roll &mdash; the current balance comes from the database.</p>' +
    '<div class="cambox" id="cambox"><div class="camnote">Starting camera&hellip;</div></div>' +
    '<form id="manualform"><div class="field">' +
      '<label class="label" for="manual">OR TYPE / WEDGE THE BARCODE</label>' +
      '<input class="input mono" id="manual" autocomplete="off" autocapitalize="characters" placeholder="e.g. QH5CPHN">' +
    '</div>' +
    '<button class="btn btn-primary btn-huge" type="submit">ENTER CODE</button></form>' +
    '<div class="demolabel">DEMO &mdash; TAP TO SIMULATE A SCAN</div>' +
    '<div class="demochips">' + chips + '</div>' +
    '<div id="result"></div>' +
    '</div>';
  return { html: html, mount: function () {
    mountScannerBox('cambox', onCode);
    $('#manualform').onsubmit = function (e) { e.preventDefault(); onCode($('#manual').value); };
    Array.prototype.forEach.call(document.querySelectorAll('.demochip'), function (c) {
      c.onclick = function () { onCode(c.getAttribute('data-code')); };
    });
  }};

  function onCode(code) {
    var roll = rollByBarcode(code);
    if (!roll) {
      bad();
      $('#result').innerHTML = '<div class="err center" style="font-size:1.3rem">&#10060; ROLL NOT FOUND<br><span style="font-size:1rem">"' +
        esc(code) + '" is not in the system. Try again.</span></div>';
      return;
    }
    good();
    C.roll = roll;
    $('#result').innerHTML =
      '<div class="ok-panel"><div class="big-ok">&#9989; ROLL IDENTIFIED</div>' +
      '<div class="kv"><span class="k">Roll #</span><span class="v mono">' + esc(roll.id) + '</span></div>' +
      '<div class="kv"><span class="k">Style</span><span class="v">' + esc(roll.style) + '</span></div>' +
      '<div class="kv"><span class="k">Color</span><span class="v">' + esc(roll.color) + '</span></div>' +
      '<div class="kv"><span class="k">Current Balance</span><span class="v num" style="font-size:1.5rem">' + fmtLen(systemBalance(roll.id)) + '</span></div>' +
      '</div>' +
      '<button class="btn btn-primary btn-huge" id="cont">CONTINUE &rarr; ENTER CUT</button>';
    $('#cont').onclick = function () { go('cut-entry'); };
    $('#cont').scrollIntoView(false);
  }
};

Screens['cut-entry'] = function () {
  if (!C || !C.roll) { setTimeout(function () { go('cut-scan'); }, 0); return { html: '' }; }
  var roll = C.roll, bal = systemBalance(roll.id);
  var orderOpts = CutService.recentOrders().map(function (o) {
    return '<option value="' + esc(o) + '">';
  }).join('');
  var html =
    '<div class="screen">' +
    '<div class="step-head">CUT TRANSACTION &mdash; ENTER CUT</div>' +
    '<h1>Record a cut</h1>' +
    '<div class="card">' +
      '<div class="kv"><span class="k">Roll #</span><span class="v mono">' + esc(roll.id) + '</span></div>' +
      '<div class="kv"><span class="k">Style</span><span class="v">' + esc(roll.style) + '</span></div>' +
      '<div class="kv"><span class="k">Color</span><span class="v">' + esc(roll.color) + '</span></div>' +
      '<div class="kv"><span class="k">Location</span><span class="v mono">' + esc(roll.expectedLocation) + '</span></div>' +
      '<div class="kv"><span class="k">Current Balance' +
        (isTestBalance(roll) ? ' <span class="stchip st-yellow">TEST</span>' : '') +
        '</span><span class="v num" style="font-size:1.5rem">' + fmtLen(bal) + '</span></div>' +
    '</div>' +
    '<div class="field"><label class="label" for="order">ORDER NUMBER</label>' +
      '<input class="input mono" id="order" list="orders" autocomplete="off" autocapitalize="characters" placeholder="e.g. XS024536">' +
      '<datalist id="orders">' + orderOpts + '</datalist></div>' +
    '<div class="field"><label class="label">CUT LENGTH</label></div>' +
    '<div class="btn-row">' +
      '<div class="field" style="flex:1"><label class="label">FEET</label>' +
      '<input class="input num" id="cft" inputmode="numeric" autocomplete="off" placeholder="0"></div>' +
      '<div class="field" style="flex:1"><label class="label">INCHES</label>' +
      '<input class="input num" id="cin" inputmode="decimal" autocomplete="off" placeholder="0"></div>' +
    '</div>' +
    '<div class="card"><div class="kv"><span class="k">NEW EXPECTED BALANCE</span>' +
      '<span class="v num" id="newbal" style="font-size:1.5rem">= ' + fmtLen(bal) + '</span></div></div>' +
    '<div class="err" id="cuterr" hidden></div>' +
    '<button class="btn btn-primary btn-huge" id="savecut">&#9986; SAVE CUT</button>' +
    '<button class="btn" id="cutcancel">CANCEL</button>' +
    '</div>';
  return { html: html, mount: function () {
    var update = function () {
      var ft = parseFloat($('#cft').value) || 0, inch = parseFloat($('#cin').value) || 0;
      if (ft < 0 || inch < 0 || isNaN(ft) || isNaN(inch)) { $('#newbal').textContent = '= —'; return; }
      var cut = Math.round(ft * 12 + inch);
      $('#newbal').textContent = '= ' + fmtLen(Math.max(0, bal - cut));
      $('#newbal').style.color = cut > bal ? 'var(--red)' : '';
    };
    $('#cft').addEventListener('input', update);
    $('#cin').addEventListener('input', update);
    $('#cutcancel').onclick = function () { newCutSession(); go('home'); };
    $('#savecut').onclick = function () {
      var ft = $('#cft').value.trim(), inch = $('#cin').value.trim();
      var cutIn = Math.round((parseFloat(ft || '0')) * 12 + parseFloat(inch || '0'));
      var res = CutService.recordCut({
        rollId: roll.id, order: $('#order').value,
        cutIn: (ft === '' && inch === '') ? 0 : cutIn,
        employee: DB.data.currentEmployee, location: roll.expectedLocation
      });
      if (!res.ok) { bad(); var e = $('#cuterr'); e.textContent = res.err; e.hidden = false; return; }
      good();
      go('cut-saved', res.rec.id);
    };
  }};
};

Screens['cut-saved'] = function (param) {
  var rec = DB.data.cuts.filter(function (c) { return c.id === param; })[0];
  if (!rec) { setTimeout(function () { go('home'); }, 0); return { html: '' }; }
  var html =
    '<div class="screen">' +
    '<div class="ok-panel"><h1>&#9986; CUT SAVED</h1>' +
    '<div class="kv"><span class="k">NEW EXPECTED BALANCE</span>' +
    '<span class="v num" style="font-size:2rem">' + fmtLen(rec.newIn) + '</span></div></div>' +
    '<div class="card">' +
      '<div class="kv"><span class="k">Roll #</span><span class="v mono">' + esc(rec.rollId) + '</span></div>' +
      '<div class="kv"><span class="k">Order</span><span class="v mono">' + esc(rec.order || '—') + '</span></div>' +
      '<div class="kv"><span class="k">Previous Balance</span><span class="v num">' + fmtLen(rec.prevIn) + '</span></div>' +
      '<div class="kv"><span class="k">Cut</span><span class="v num">' + fmtLen(rec.inches) + '</span></div>' +
      '<div class="kv"><span class="k">New Balance</span><span class="v num">' + fmtLen(rec.newIn) + '</span></div>' +
      '<div class="kv"><span class="k">By</span><span class="v">' + esc(rec.by) + ' &middot; ' + fmtDT(rec.at) + '</span></div>' +
    '</div>' +
    '<button class="btn btn-primary btn-huge" id="another">&#9986; CUT ANOTHER ROLL</button>' +
    '<button class="btn btn-huge" id="done">DONE &rarr; HOME</button>' +
    '</div>';
  return { html: html, mount: function () {
    $('#another').onclick = function () { newCutSession(); go('cut-scan'); };
    $('#done').onclick = function () { newCutSession(); go('home'); };
  }};
};

Screens.saved = function (param) {
  var rec = DB.data.counts.filter(function (c) { return c.id === (param || lastSavedId); })[0];
  if (!rec) { setTimeout(function () { go('home'); }, 0); return { html: '' }; }
  var panel = { MATCH: 'ok-panel', SHORT: 'warn-panel', OVER: 'over-panel',
                LOCATION_MISMATCH: 'warn-panel', NEEDS_REVIEW: 'over-panel' }[rec.status] || 'over-panel';
  var statusColor = { MATCH: 'var(--green)', SHORT: 'var(--red)', OVER: 'var(--yellow)',
                      LOCATION_MISMATCH: 'var(--red)', NEEDS_REVIEW: 'var(--yellow)' }[rec.status] || 'var(--yellow)';
  var html =
    '<div class="screen">' +
    '<div class="' + panel + '"><h1>CYCLE COUNT RESULT</h1>' +
    '<div class="result-status" style="color:' + statusColor + '">' + STATUS[rec.status].label + '</div></div>' +
    '<div class="card">' +
      '<div class="kv"><span class="k">Roll</span><span class="v mono result-num">' + esc(rec.rollId) + '</span></div>' +
      '<div class="kv"><span class="k">Location</span><span class="v mono result-num">' + esc(rec.scannedLocation) + '</span></div>' +
      '<div class="kv"><span class="k">System Balance</span><span class="v num result-num">' + fmtLen(rec.expectedIn) + '</span></div>' +
      '<div class="kv"><span class="k">Physical Balance</span><span class="v num result-num">' + fmtLen(rec.physicalIn) + '</span></div>' +
      '<div class="kv"><span class="k">Difference</span><span class="v ' + diffCls(rec.diffIn) + ' num result-num">' + fmtDiff(rec.diffIn) + '</span></div>' +
      '<div class="kv"><span class="k">By</span><span class="v">' + esc(rec.employee) + ' &middot; ' + fmtDT(rec.at) + '</span></div>' +
    '</div>' +
    '<button class="btn btn-primary btn-huge" id="another">&#9654; COUNT ANOTHER ROLL</button>' +
    '<button class="btn btn-huge" id="done">DONE &rarr; HOME</button>' +
    '</div>';
  return { html: html, mount: function () {
    $('#another').onclick = function () { newSession(); go('scan-roll'); };
    $('#done').onclick = function () { go('home'); };
  }};
};

/* ---------------- ROLL HISTORY ------------------------------------------------- */
Screens.roll = function (param) {
  var roll = rollById(param);
  if (!roll) { setTimeout(function () { go('search'); }, 0); return { html: '' }; }
  var sys = systemBalance(roll.id);
  var html =
    '<div class="screen">' +
    '<div class="step-head">ROLL HISTORY</div>' +
    '<h1 class="mono">' + esc(roll.id) + '</h1>' +
    '<div class="card">' +
      '<div class="kv"><span class="k">Manufacturer</span><span class="v">' + esc(roll.manufacturer) + '</span></div>' +
      '<div class="kv"><span class="k">Style</span><span class="v">' + esc(roll.style) + '</span></div>' +
      '<div class="kv"><span class="k">Color</span><span class="v">' + esc(roll.color) + '</span></div>' +
      '<div class="kv"><span class="k">Width</span><span class="v">' + fmtWidth(roll.widthIn) + '</span></div>' +
      '<div class="kv"><span class="k">Beginning Length</span><span class="v num">' + fmtLen(roll.beginningIn) + '</span></div>' +
      '<div class="kv"><span class="k">Current Balance</span><span class="v num">' + fmtLen(sys) + '</span></div>' +
      '<div class="kv"><span class="k">Current Location</span><span class="v mono">' + esc(roll.expectedLocation) + '</span></div>' +
      (roll.measuredIn != null
        ? '<div class="kv"><span class="k">Measured Balance <span class="stchip st-green">MB ✓</span></span><span class="v num">' + fmtLen(roll.measuredIn) + '</span></div>' +
          '<div class="kv"><span class="k">Last Measured</span><span class="v">' + fmtDT(roll.measuredAt) + ' &middot; ' + esc(roll.measuredBy || '') + '</span></div>'
        : '<div class="kv"><span class="k">Measured Balance</span><span class="v">Not measured yet</span></div>') +
    '</div>' +
    '<h2>History</h2>' +
    '<div class="ledger">' + ledgerHtml(roll) + '</div>' +
    '<button class="btn btn-primary btn-huge" id="countthis">&#9654; COUNT THIS ROLL</button>' +
    '</div>';
  return { html: html, mount: function () {
    $('#countthis').onclick = function () { newSession(); S.roll = roll; go('scan-loc'); };
  }};
};

function ledgerHtml(roll) {
  var ev = [];
  DB.data.cuts.forEach(function (c) {
    if (c.rollId === roll.id) ev.push({ kind: 'cut', at: c.at, inches: c.inches, by: c.by, order: c.order, newIn: c.newIn });
  });
  DB.data.counts.forEach(function (c) {
    if (c.rollId === roll.id) ev.push({ kind: 'count', at: c.at, rec: c });
  });
  ev.sort(function (a, b) { return new Date(a.at) - new Date(b.at); });
  var out = '<div class="ledger-row"><span class="dot" style="background:var(--muted)"></span>' +
    '<div class="what"><b>Beginning Balance</b></div>' +
    '<div class="bal num">' + fmtLen(roll.beginningIn) + '</div></div>';
  var bal = roll.beginningIn;
  ev.forEach(function (e) {
    if (e.kind === 'cut') {
      /* Prefer the balance stored on the cut record (exact at cut time, and it
         already accounts for any test-balance adjustment); fall back to the
         running calculation only for legacy records that lack it. */
      var newBal = (e.newIn != null) ? e.newIn : (bal - e.inches);
      bal = newBal;
      var orderTag = e.order ? ' <span class="mono">Order ' + esc(e.order) + '</span>' : '';
      out += '<div class="ledger-row"><span class="dot" style="background:var(--blue)"></span>' +
        '<div class="what"><b>Cut</b> <span class="num">' + fmtLen(e.inches) + '</span>' + orderTag +
        '<div class="sub">' + fmtDT(e.at) + ' &middot; ' + esc(e.by) + '</div></div>' +
        '<div class="bal"><div class="sub">New Balance</div><span class="num">' + fmtLen(newBal) + '</span></div></div>';
    } else {
      var r = e.rec;
      var phys = (r.physicalIn == null) ? '—' : fmtLen(r.physicalIn);
      var ddiff = (r.diffIn == null) ? '—' : fmtDiff(r.diffIn);
      var dcls = (r.diffIn == null) ? '' : diffCls(r.diffIn);
      var mb = isMeasuredCount(r) ? ' <span class="stchip st-green">MB ✓</span>' : '';
      out += '<div class="ledger-row"><span class="dot" style="background:' +
        (r.status === 'MATCH' ? 'var(--green)' : r.status === 'NEEDS_REVIEW' ? 'var(--yellow)' : 'var(--red)') + '"></span>' +
        '<div class="what"><b>Physical Cycle Count</b> <span class="num">' + phys + '</span> ' + statusChip(r.status) + mb +
        '<div class="sub">' + fmtDT(r.at) + ' &middot; ' + esc(r.employee) + ' &middot; loc <span class="mono">' + esc(r.scannedLocation) + '</span></div></div>' +
        '<div class="bal"><div class="sub">Difference</div><span class="' + dcls + ' num">' + ddiff + '</span></div></div>';
    }
  });
  return out;
}

/* ---------------- RECENT COUNTS + COUNT DETAIL (audit) -------------------------- */
Screens.recent = function () {
  var list = DB.data.counts.slice().sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
  var html =
    '<div class="screen">' +
    '<div class="step-head">AUDIT LOG &mdash; APPEND ONLY</div>' +
    '<h1>Recent counts</h1>' +
    (list.length ? list.map(countRow).join('') : '<p class="hint center">No counts yet.</p>') +
    '</div>';
  return { html: html, mount: function () { wireCountRows(); } };
};

function countRow(c) {
  var date = c.date || new Date(c.at).toLocaleDateString();
  var time = c.time || fmtTime(c.at);
  var mb = isMeasuredCount(c) ? ' <span class="stchip st-green">MB ✓</span>' : '';
  var balLine = (c.physicalIn == null)
    ? '<div class="sub">mismatch flagged — not measured</div>'
    : '<div class="sub num">Sys <b>' + fmtLen(c.expectedIn) + '</b> &middot; Phys <b>' + fmtLen(c.physicalIn) + '</b>' +
      ' &middot; Diff <b class="' + diffCls(c.diffIn) + '">' + fmtDiff(c.diffIn) + '</b></div>';
  return '<button class="rowbtn" data-count="' + esc(c.id) + '">' +
    '<div class="rhead"><b class="mono">' + esc(c.rollId) + '</b>' + statusChip(c.status) + mb + '</div>' +
    '<div class="sub"><b>' + esc(time) + '</b> &middot; loc <b class="mono">' + esc(c.scannedLocation) + '</b></div>' +
    balLine +
    '<div class="sub">' + esc(date) + ' &middot; ' + esc(c.employee) + '</div></button>';
}
function wireCountRows() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-count]'), function (b) {
    b.onclick = function () { go('count', b.getAttribute('data-count')); };
  });
}

Screens.count = function (param) {
  var c = DB.data.counts.filter(function (x) { return x.id === param; })[0];
  if (!c) { setTimeout(function () { go('recent'); }, 0); return { html: '' }; }
  var roll = rollById(c.rollId);
  var barcode = c.barcode || (roll ? roll.barcode : c.rollId);
  var date = c.date || new Date(c.at).toLocaleDateString();
  var time = c.time || fmtTime(c.at);
  var html =
    '<div class="screen">' +
    '<div class="step-head">COUNT DETAIL</div>' +
    '<h1 class="mono">' + esc(c.rollId) + '</h1>' +
    '<div style="margin-bottom:8px">' + statusChip(c.status) + '</div>' +
    '<div class="card">' +
      '<div class="kv"><span class="k">Roll Number</span><span class="v mono">' + esc(c.rollId) + '</span></div>' +
      '<div class="kv"><span class="k">Roll Barcode</span><span class="v mono">' + esc(barcode) + '</span></div>' +
      '<div class="kv"><span class="k">Product / Style</span><span class="v">' + esc(c.style) + '</span></div>' +
      '<div class="kv"><span class="k">Color</span><span class="v">' + esc(c.color) + '</span></div>' +
      '<div class="kv"><span class="k">Width</span><span class="v">' + fmtWidth(c.widthIn) + '</span></div>' +
      '<div class="kv"><span class="k">Location Barcode</span><span class="v mono">' + esc(c.scannedLocation) + '</span></div>' +
      '<div class="kv"><span class="k">Expected Location</span><span class="v mono">' + esc(c.expectedLocation) + '</span></div>' +
      '<div class="kv"><span class="k">Scanned Location</span><span class="v mono">' + esc(c.scannedLocation) + '</span></div>' +
      '<div class="kv"><span class="k">Expected Balance</span><span class="v num">' + fmtLen(c.expectedIn) + '</span></div>' +
      '<div class="kv"><span class="k">Physical Balance' + (c.measured ? ' <span class="stchip st-green">MB ✓</span>' : '') + '</span><span class="v num">' +
        (c.physicalIn == null ? '— (not measured)' : fmtLen(c.physicalIn)) + '</span></div>' +
      '<div class="kv"><span class="k">Difference</span><span class="v ' + (c.diffIn == null ? '' : diffCls(c.diffIn)) + ' num">' +
        (c.diffIn == null ? '—' : fmtDiff(c.diffIn)) + '</span></div>' +
      '<div class="kv"><span class="k">Employee</span><span class="v">' + esc(c.employee) + '</span></div>' +
      '<div class="kv"><span class="k">Date</span><span class="v">' + esc(date) + '</span></div>' +
      '<div class="kv"><span class="k">Time</span><span class="v">' + esc(time) + '</span></div>' +
      '<div class="kv"><span class="k">Count Status</span><span class="v">' + statusChip(c.status) + '</span></div>' +
    '</div>' +
    '<button class="btn" id="goroll">VIEW ROLL HISTORY</button>' +
    '</div>';
  return { html: html, mount: function () {
    $('#goroll').onclick = function () { go('roll', c.rollId); };
  }};
};

/* ---------------- SET TEST SYSTEM BALANCE (supervisor / pilot only) -------------
   TEMPORARY PILOT FUNCTIONALITY: the prototype is not connected to the Real
   Floors database yet, so a supervisor can type in the balance the Real Floors
   system currently shows for a roll. Stored as roll.testBalanceIn (integer
   inches); systemBalance() returns it when set, and it appears automatically
   when a worker scans the roll. To integrate the Real Floors API/database
   later: delete these two screens and the testBalanceIn field, and have
   systemBalance() fetch the authoritative balance from the backend. */
Screens.testbal = function () {
  var rows = DB.data.rolls.map(function (r) {
    var sys = systemBalance(r.id);
    var tag = isTestBalance(r) ? ' <span class="stchip st-yellow">TEST</span>' : '';
    return '<button class="rowbtn" data-tb="' + esc(r.id) + '">' +
      '<div class="rhead"><b class="mono">' + esc(r.id) + '</b>' + tag + '</div>' +
      '<div class="sub">' + esc(r.style) + ' &middot; ' + esc(r.color) + ' &middot; loc <b class="mono">' + esc(r.expectedLocation) + '</b></div>' +
      '<div class="sub num">System Balance: <b>' + fmtLen(sys) + '</b></div></button>';
  }).join('');
  return { html:
    '<div class="screen">' +
    '<div class="step-head">SUPERVISOR &mdash; PILOT SETUP</div>' +
    '<h1>Set test system balance</h1>' +
    '<p class="hint"><b>Temporary pilot feature.</b> Enter the balance the Real Floors system shows for each roll. ' +
    'It appears automatically when a worker scans that roll. This is replaced by the Real Floors API later.</p>' +
    rows +
    '</div>',
    mount: function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-tb]'), function (b) {
        b.onclick = function () { go('testbaledit', b.getAttribute('data-tb')); };
      });
    }};
};

Screens.testbaledit = function (param) {
  var roll = rollById(param);
  if (!roll) { setTimeout(function () { go('testbal'); }, 0); return { html: '' }; }
  var cur = roll.testBalanceIn;
  var html =
    '<div class="screen">' +
    '<div class="step-head">SUPERVISOR &mdash; PILOT SETUP</div>' +
    '<h1 class="mono">' + esc(roll.id) + '</h1>' +
    '<p class="hint">Enter the balance the <b>Real Floors system</b> currently shows for this roll.</p>' +
    (cur != null
      ? '<p class="hint">Current test balance: <b class="num">' + fmtLen(cur) + '</b></p>'
      : '<p class="hint">No test balance set &mdash; workers see the computed balance <b class="num">' + fmtLen(systemBalance(roll.id)) + '</b>.</p>') +
    '<div class="btn-row">' +
      '<div class="field" style="flex:1"><label class="label">FEET</label>' +
      '<input class="input num" id="tft" inputmode="numeric" autocomplete="off" placeholder="0"></div>' +
      '<div class="field" style="flex:1"><label class="label">INCHES</label>' +
      '<input class="input num" id="tin" inputmode="decimal" autocomplete="off" placeholder="0"></div>' +
    '</div>' +
    '<div class="err" id="tberr" hidden></div>' +
    '<button class="btn btn-primary btn-huge" id="tbsave">SAVE TEST BALANCE</button>' +
    (cur != null ? '<button class="btn btn-huge" id="tbclear">CLEAR &mdash; USE COMPUTED BALANCE</button>' : '') +
    '<button class="btn" id="tbcancel">CANCEL</button>' +
    '</div>';
  return { html: html, mount: function () {
    if (cur != null) { $('#tft').value = Math.floor(cur / 12); $('#tin').value = cur % 12; }
    $('#tbsave').onclick = function () {
      var ft = $('#tft').value.trim(), inch = $('#tin').value.trim();
      if (ft === '' && inch === '') { bad(); var e = $('#tberr'); e.textContent = 'Enter feet and inches.'; e.hidden = false; return; }
      var f = parseFloat(ft || '0'), i = parseFloat(inch || '0');
      if (isNaN(f) || isNaN(i) || f < 0 || i < 0) { bad(); var e2 = $('#tberr'); e2.textContent = 'Numbers must be zero or more.'; e2.hidden = false; return; }
      roll.testBalanceIn = Math.round(f * 12 + i);
      DB.save(); good(); go('testbal');
    };
    var clr = $('#tbclear');
    if (clr) clr.onclick = function () { roll.testBalanceIn = null; DB.save(); good(); go('testbal'); };
    $('#tbcancel').onclick = function () { go('testbal'); };
  }};
};

/* ---------------- RAPID CYCLE COUNT ----------------------------------------------
   Built for walking the rows: SCAN LOCATION once, then SCAN -> TYPE BALANCE ->
   SAVE & NEXT -> SCAN ... The worker never returns to home between rolls.
   The active location is remembered for the whole session; a roll whose
   expected location differs raises LOCATION MISMATCH immediately.
   Scanner implementation untouched — shared mountScannerBox wiring reused. */
Screens['rapid-loc'] = function () {
  if (!R) newRapid();
  var chips = ['205A', '205B', '206A', '206B', '204A', '204B'].map(function (l) {
    return '<button class="demochip" data-code="' + esc(l) + '">' + esc(l) + '</button>';
  }).join('');
  var html =
    '<div class="screen">' +
    '<div class="step-head">RAPID CYCLE COUNT &mdash; STEP 1</div>' +
    '<h1>Scan location</h1>' +
    '<p class="hint">Scan the rack location tag. Every roll you scan after this is counted at that location until you change it.</p>' +
    '<div class="cambox" id="cambox"><div class="camnote">Starting camera&hellip;</div></div>' +
    '<form id="manualform"><div class="field">' +
      '<label class="label" for="manual">OR TYPE / WEDGE THE LOCATION CODE</label>' +
      '<input class="input mono" id="manual" autocomplete="off" autocapitalize="characters" placeholder="e.g. 205B">' +
    '</div>' +
    '<button class="btn btn-primary btn-huge" type="submit">ENTER CODE</button></form>' +
    '<div class="demolabel">DEMO &mdash; TAP TO SIMULATE A SCAN</div>' +
    '<div class="demochips">' + chips + '</div>' +
    '<div id="result"></div>' +
    '</div>';
  return { html: html, mount: function () {
    mountScannerBox('cambox', onCode);
    $('#manualform').onsubmit = function (e) { e.preventDefault(); onCode($('#manual').value); };
    Array.prototype.forEach.call(document.querySelectorAll('.demochip'), function (c) {
      c.onclick = function () { onCode(c.getAttribute('data-code')); };
    });
  }};
  function onCode(code) {
    var loc = normLoc(code);
    if (!loc) {
      bad();
      $('#result').innerHTML = '<div class="err center" style="font-size:1.3rem">&#10060; EMPTY SCAN &mdash; try again.</div>';
      return;
    }
    good();
    R.activeLoc = loc;
    R.lastMsg = null;
    go('rapid-scan');
  }
};

function rapidBanner() {
  var m = R && R.lastMsg;
  if (!m) return '';
  var color = { MATCH: 'var(--green)', SHORT: 'var(--red)', OVER: 'var(--yellow)',
                LOCATION_MISMATCH: 'var(--red)', NEEDS_REVIEW: 'var(--yellow)' }[m.status] || 'var(--yellow)';
  return '<div class="card" style="border:2px solid ' + color + ';text-align:center">' +
    '<div style="font-size:1.4rem;font-weight:900;color:' + color + '">' + esc(m.text) + '</div></div>';
}

Screens['rapid-scan'] = function () {
  if (!R || !R.activeLoc) { setTimeout(function () { go('rapid-loc'); }, 0); return { html: '' }; }
  var chips = DB.data.rolls.map(function (r) {
    return '<button class="demochip" data-code="' + esc(r.barcode) + '">' + esc(r.barcode) + '</button>';
  }).join('');
  var html =
    '<div class="screen">' +
    '<div class="step-head">RAPID CYCLE COUNT</div>' +
    '<div class="card" style="text-align:center">' +
      '<div class="label">COUNTING LOCATION</div>' +
      '<div class="mono" style="font-size:2.4rem;font-weight:900">' + esc(R.activeLoc) + '</div>' +
    '</div>' +
    rapidBanner() +
    '<h1>Scan roll</h1>' +
    '<div class="cambox" id="cambox"><div class="camnote">Starting camera&hellip;</div></div>' +
    '<form id="manualform"><div class="field">' +
      '<label class="label" for="manual">OR TYPE / WEDGE THE BARCODE</label>' +
      '<input class="input mono" id="manual" autocomplete="off" autocapitalize="characters" placeholder="e.g. QH5CPHN">' +
    '</div>' +
    '<button class="btn btn-primary btn-huge" type="submit">ENTER CODE</button></form>' +
    '<div class="demolabel">DEMO &mdash; TAP TO SIMULATE A SCAN</div>' +
    '<div class="demochips">' + chips + '</div>' +
    '<div id="result"></div>' +
    '<div class="btn-row">' +
      '<button class="btn" id="changeloc" style="flex:1">&#8646; CHANGE LOCATION</button>' +
      '<button class="btn" id="rapiddone" style="flex:1">DONE</button>' +
    '</div>' +
    '</div>';
  return { html: html, mount: function () {
    mountScannerBox('cambox', onCode);
    $('#manualform').onsubmit = function (e) { e.preventDefault(); onCode($('#manual').value); };
    Array.prototype.forEach.call(document.querySelectorAll('.demochip'), function (c) {
      c.onclick = function () { onCode(c.getAttribute('data-code')); };
    });
    $('#changeloc').onclick = function () { go('rapid-loc'); };
    $('#rapiddone').onclick = function () { R = null; go('home'); };
  }};
  function onCode(code) {
    var roll = rollByBarcode(code);
    if (!roll) {
      bad();
      $('#result').innerHTML = '<div class="err center" style="font-size:1.3rem">&#10060; ROLL NOT FOUND<br><span style="font-size:1rem">"' +
        esc(code) + '" is not in the system. Try again.</span></div>';
      return;
    }
    good();
    R.scan = { roll: roll };
    if (normLoc(roll.expectedLocation) !== normLoc(R.activeLoc)) go('rapid-mismatch');
    else go('rapid-balance');
  }
};

Screens['rapid-mismatch'] = function () {
  if (!R || !R.scan || !R.scan.roll) { setTimeout(function () { go('rapid-scan'); }, 0); return { html: '' }; }
  var roll = R.scan.roll;
  var html =
    '<div class="screen">' +
    '<div class="warn-panel"><h1>&#9888; LOCATION MISMATCH</h1>' +
    '<div class="vs"><div><div class="k">EXPECTED</div><div class="v mono">' + esc(roll.expectedLocation) + '</div></div>' +
    '<div><div class="k">COUNT LOCATION</div><div class="v mono">' + esc(R.activeLoc) + '</div></div></div></div>' +
    '<div class="card">' +
      '<div class="kv"><span class="k">Roll #</span><span class="v mono">' + esc(roll.id) + '</span></div>' +
      '<div class="kv"><span class="k">Style</span><span class="v">' + esc(roll.style) + '</span></div>' +
      '<div class="kv"><span class="k">Color</span><span class="v">' + esc(roll.color) + '</span></div>' +
    '</div>' +
    '<p class="hint">This roll does not belong at <b class="mono">' + esc(R.activeLoc) + '</b>. Flag it for supervisor review, or cancel and keep counting.</p>' +
    '<button class="btn btn-red btn-huge" id="flag">&#9888; FLAG FOR REVIEW</button>' +
    '<button class="btn btn-huge" id="cancel">CANCEL &rarr; KEEP COUNTING</button>' +
    '</div>';
  return { html: html, mount: function () {
    $('#flag').onclick = function () {
      var now = new Date();
      DB.data.counts.push({
        id: 'C' + Date.now().toString(36).toUpperCase(),
        rollId: roll.id, barcode: roll.barcode, style: roll.style, color: roll.color, widthIn: roll.widthIn,
        expectedLocation: roll.expectedLocation, scannedLocation: R.activeLoc,
        expectedIn: systemBalance(roll.id), physicalIn: null, diffIn: null,
        measured: false, /* no physical measurement taken — mismatch flagged only */
        employee: DB.data.currentEmployee, at: now.toISOString(),
        date: now.toLocaleDateString(), time: fmtTime(now.toISOString()),
        status: 'LOCATION_MISMATCH', flagged: true
      });
      DB.save();
      bad();
      R.lastMsg = { status: 'LOCATION_MISMATCH', text: '⚠ MISMATCH — ' + roll.id + ' flagged for review' };
      R.scan = null;
      go('rapid-scan');
    };
    $('#cancel').onclick = function () { R.scan = null; go('rapid-scan'); };
  }};
};

Screens['rapid-balance'] = function () {
  if (!R || !R.scan || !R.scan.roll) { setTimeout(function () { go('rapid-scan'); }, 0); return { html: '' }; }
  var roll = R.scan.roll, sys = systemBalance(roll.id);
  var html =
    '<div class="screen">' +
    '<div class="step-head">RAPID CYCLE COUNT &mdash; ' + esc(R.activeLoc) + '</div>' +
    '<div class="card">' +
      '<div class="kv"><span class="k">Roll #</span><span class="v mono">' + esc(roll.id) + '</span></div>' +
      '<div class="kv"><span class="k">Style</span><span class="v">' + esc(roll.style) + '</span></div>' +
      '<div class="kv"><span class="k">Color</span><span class="v">' + esc(roll.color) + '</span></div>' +
      '<div class="kv"><span class="k">Location</span><span class="v mono">' + esc(R.activeLoc) + '</span></div>' +
      '<div class="kv"><span class="k">EXPECTED BALANCE' +
        (isTestBalance(roll) ? ' <span class="stchip st-yellow">TEST</span>' : '') +
        '</span><span class="v num" style="font-size:2rem">' + fmtLen(sys) + '</span></div>' +
    '</div>' +
    '<div class="btn-row">' +
      '<div class="field" style="flex:1"><label class="label">FEET</label>' +
      '<input class="input num" id="rft" inputmode="numeric" autocomplete="off" placeholder="0" style="font-size:2.2rem;min-height:84px;text-align:center"></div>' +
      '<div class="field" style="flex:1"><label class="label">INCHES</label>' +
      '<input class="input num" id="rin" inputmode="decimal" autocomplete="off" placeholder="0" style="font-size:2.2rem;min-height:84px;text-align:center"></div>' +
    '</div>' +
    '<div class="err" id="rerr" hidden></div>' +
    '<button class="btn btn-primary btn-huge" id="savenext">&#10003; SAVE &amp; NEXT</button>' +
    '<button class="btn" id="rback">&larr; BACK TO SCANNER</button>' +
    '</div>';
  return { html: html, mount: function () {
    $('#rback').onclick = function () { R.scan = null; go('rapid-scan'); };
    $('#savenext').onclick = function () {
      var ft = parseFloat($('#rft').value), inch = parseFloat($('#rin').value);
      var err = '';
      if ($('#rft').value.trim() === '' && $('#rin').value.trim() === '') err = 'Enter feet and/or inches.';
      else if (isNaN(ft) || isNaN(inch) || ft < 0 || inch < 0) err = 'Numbers must be zero or more.';
      if (err) { bad(); var e = $('#rerr'); e.textContent = err; e.hidden = false; return; }
      var physicalIn = Math.round(ft * 12 + inch);
      var diff = physicalIn - sys;
      var status = computeStatus(roll, R.activeLoc, physicalIn, false);
      var now = new Date();
      DB.data.counts.push({
        id: 'C' + Date.now().toString(36).toUpperCase(),
        rollId: roll.id, barcode: roll.barcode, style: roll.style, color: roll.color, widthIn: roll.widthIn,
        expectedLocation: roll.expectedLocation, scannedLocation: R.activeLoc,
        expectedIn: sys, physicalIn: physicalIn, diffIn: diff,
        measured: true, /* MB: worker physically measured this roll */
        employee: DB.data.currentEmployee, at: now.toISOString(),
        date: now.toLocaleDateString(), time: fmtTime(now.toISOString()),
        status: status, flagged: false
      });
      roll.measuredIn = physicalIn;
      roll.measuredAt = now.toISOString();
      roll.measuredBy = DB.data.currentEmployee;
      DB.save();
      if (status === 'MATCH') good(); else bad();
      var sym = status === 'MATCH' ? '✓' : (status === 'SHORT' ? '▼' : '▲');
      R.lastMsg = { status: status, text: sym + ' ' + status + ' ' + fmtDiff(diff) + ' — ' + roll.id };
      R.scan = null;
      go('rapid-scan'); /* straight back to the scanner — never home */
    };
  }};
};

/* ---------------- SUPERVISOR DASHBOARD ------------------------------------------- */
Screens.dashboard = function () {
  var today = DB.data.counts.filter(function (c) { return isToday(c.at); });
  var n = function (s) { return today.filter(function (c) { return c.status === s; }).length; };
  var seen = {}, recounts = 0;
  today.forEach(function (c) {
    if (seen[c.rollId]) { if (seen[c.rollId] === 1) recounts++; seen[c.rollId]++; }
    else seen[c.rollId] = 1;
  });
  var last = today.slice().sort(function (a, b) { return new Date(b.at) - new Date(a.at); })[0];
  var byEmp = {};
  today.forEach(function (c) { byEmp[c.employee] = (byEmp[c.employee] || 0) + 1; });
  var empRows = Object.keys(byEmp).sort().map(function (e) {
    return '<div class="kv"><span class="k">' + esc(e) + '</span><span class="v num">' + byEmp[e] + '</span></div>';
  }).join('') || '<p class="hint">No counts today.</p>';

  var chips = ['MATCH', 'SHORT', 'OVER', 'LOCATION_MISMATCH', 'NEEDS_REVIEW'].map(function (s) {
    return '<button class="fchip" data-f="' + s + '">' + STATUS[s].label + '</button>';
  }).join('');

  var html =
    '<div class="screen">' +
    '<div class="step-head">SUPERVISOR</div>' +
    '<h1>Dashboard &mdash; today</h1>' +
    '<div class="metric-grid">' +
      metric(today.length, 'ROLLS COUNTED') +
      metric(n('MATCH'), 'MATCHES') +
      metric(n('SHORT'), 'SHORTAGES', today.length && n('SHORT') ? 'alert' : '') +
      metric(n('OVER'), 'OVERAGES') +
      metric(n('LOCATION_MISMATCH'), 'LOCATION MISMATCH', n('LOCATION_MISMATCH') ? 'alert' : '') +
      metric(n('NEEDS_REVIEW'), 'NEEDS REVIEW', n('NEEDS_REVIEW') ? 'warnb' : '') +
      metric(recounts, 'RECOUNTS') +
      '<div class="metric"><div class="n" style="font-size:1.2rem">' + (last ? fmtTime(last.at) : '&mdash;') + '</div><div class="l">LAST COUNT TIME</div></div>' +
    '</div>' +
    '<h2>Counts by employee</h2><div class="card">' + empRows + '</div>' +
    '<button class="btn btn-huge" id="godisc">&#9888; CYCLE COUNT DISCREPANCIES' +
    (discrepancyRolls().length ? ' (' + discrepancyRolls().length + ')' : '') + '</button>' +
    '<h2>Search &amp; filter</h2>' +
    '<div class="field"><input class="input" id="dq" autocomplete="off" placeholder="Roll, location, style, color, employee, date&hellip;"></div>' +
    '<div class="chiprow" id="dchips"><button class="fchip on" data-f="">ALL</button>' + chips + '</div>' +
    '<div id="dresults"></div>' +
    '<h2>Pilot setup</h2>' +
    '<div class="card">' +
      '<button class="btn btn-huge" id="gotestbal">&#9874; SET TEST SYSTEM BALANCE</button>' +
      '<button class="btn btn-red btn-huge" id="resetcounts">RESET TEST DATA</button>' +
      '<p class="hint">Reset test data clears <b>cycle counts and measured-balance (MB) markers</b> &mdash; rolls, cuts, test balances, and the barcode scanner are untouched.</p>' +
    '</div>' +
    '<div class="foot"><button class="linklike" id="resetdemo">Reset demo data</button></div>' +
    '</div>';
  return { html: html, mount: function () {
    var f = '';
    var apply = function () {
      var q = $('#dq').value.trim().toLowerCase();
      var list = today.filter(function (c) {
        if (f && c.status !== f) return false;
        if (!q) return true;
        return (c.rollId + ' ' + c.scannedLocation + ' ' + c.expectedLocation + ' ' +
                c.style + ' ' + c.color + ' ' + c.employee + ' ' + fmtDT(c.at)).toLowerCase().indexOf(q) >= 0;
      }).sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
      $('#dresults').innerHTML = list.length ? list.map(countRow).join('') : '<p class="hint center">No matching counts today.</p>';
      wireCountRows();
    };
    $('#dq').addEventListener('input', apply);
    Array.prototype.forEach.call(document.querySelectorAll('#dchips .fchip'), function (b) {
      b.onclick = function () {
        f = b.getAttribute('data-f');
        Array.prototype.forEach.call(document.querySelectorAll('#dchips .fchip'), function (x) {
          x.classList.toggle('on', x === b);
        });
        apply();
      };
    });
    $('#resetdemo').onclick = function () {
      if (confirm('Reset all demo data to the seeded sample?')) { DB.reset(); good(); render(); }
    };
    $('#gotestbal').onclick = function () { go('testbal'); };
    $('#godisc').onclick = function () { go('discrepancies'); };
    $('#resetcounts').onclick = function () {
      var n = DB.data.counts.length;
      if (n === 0) { alert('No cycle counts to clear.'); return; }
      if (confirm('RESET TEST DATA?\n\nThis clears ' + n + ' saved cycle count' + (n === 1 ? '' : 's') + ' and all measured-balance (MB) markers.\n\nRoll data, cuts, test system balances, and the barcode scanner are NOT affected.\nThis cannot be undone.')) {
        DB.data.counts = [];
        DB.data.rolls.forEach(function (r) { r.measuredIn = null; r.measuredAt = null; r.measuredBy = null; });
        DB.save();
        good(); render();
      }
    };
    apply();
  }};
  function metric(num, label, cls) {
    return '<div class="metric ' + (cls || '') + '"><div class="n num">' + num + '</div><div class="l">' + label + '</div></div>';
  }
};

/* ---------------- CYCLE COUNT DISCREPANCIES (supervisor) ---------------------------
   Shows only rolls whose latest physically-measured balance differs from the
   expected balance. Discrepancies are recorded for review — reviewing never
   changes the expected balance; that only happens through cut transactions. */
Screens.discrepancies = function () {
  var rows = discrepancyRolls();
  var html =
    '<div class="screen">' +
    '<div class="step-head">SUPERVISOR</div>' +
    '<h1>Cycle count discrepancies</h1>' +
    '<p class="hint">Rolls where the last <b>measured</b> balance (MB ✓) differs from the expected balance. ' +
    'Review only &mdash; expected balances change through cut transactions, never here.</p>' +
    (rows.length ? rows.map(function (c) {
      return '<button class="rowbtn" data-count="' + esc(c.id) + '">' +
        '<div class="rhead"><b class="mono">' + esc(c.rollId) + '</b>' + statusChip(c.status) +
        ' <span class="stchip st-green">MB ✓</span></div>' +
        '<div class="sub">loc <b class="mono">' + esc(c.scannedLocation) + '</b> &middot; ' + esc(c.employee) + ' &middot; ' + esc(c.time || fmtTime(c.at)) + '</div>' +
        '<div class="sub num">Exp <b>' + fmtLen(c.expectedIn) + '</b> &middot; Meas <b>' + fmtLen(c.physicalIn) + '</b>' +
        ' &middot; Diff <b class="' + diffCls(c.diffIn) + '">' + fmtDiff(c.diffIn) + '</b></div></button>';
    }).join('') : '<p class="hint center">No discrepancies &mdash; every measured roll matches.</p>') +
    '</div>';
  return { html: html, mount: function () { wireCountRows(); } };
};

/* ---------------- boot ---------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
  DB.load();
  render();
});
