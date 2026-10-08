/**
 * Classroom Display — write-back endpoint
 * ---------------------------------------
 * Lets the classroom screen write to this sheet: items typed in on the screen are
 * appended as rows, and check-offs set the Done / Done On columns.
 *
 * SETUP (once per sheet):
 *   1. In the sheet: Extensions → Apps Script. Delete anything in Code.gs and paste this file.
 *   2. Click Deploy → New deployment → gear icon → Web app.
 *        Description: Classroom display
 *        Execute as:   Me
 *        Who has access: Anyone
 *      Click Deploy, approve the permissions, copy the Web app URL.
 *   3. Paste that URL into the Settings tab → "Write-back URL".
 *   (If you ever change this code: Deploy → Manage deployments → pencil → Version: New → Deploy.
 *    The URL stays the same.)
 *
 * What it does:
 *   add     → appends a row to Tasks or Cleanup (Class, Date=today, Section "Added on screen",
 *             Task, Show=TRUE, Source "screen:<id>")
 *   done    → sets Done = TRUE/FALSE and Done On = today on the matching row
 *   remove  → deletes a row, but only one the screen created (Source starts with "screen:")
 *   tidy    → runs on every call: a Done from a previous day is cleared, so each session
 *             starts with nothing checked. Tick Done by hand on your phone and it's treated
 *             the same way — it clears the next day.
 */

var TABS = { tasks: 'Tasks', cleanup: 'Cleanup' };

function doPost(e) {
  var p = {};
  try { p = JSON.parse(e.postData.contents || '{}'); } catch (err) { return out({ ok: false, error: 'bad json' }); }
  return out(handle(p));
}
function doGet(e) {
  var p = e && e.parameter ? e.parameter : {};
  if (!p.action) p.action = 'tidy';
  return out(handle(p));
}
function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function handle(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var touched = tidy(ss);
    var res = { ok: true, tidied: touched };
    switch (p.action) {
      case 'add':    res.id = addRow(ss, p); break;
      case 'done':   res.found = setDone(ss, p); break;
      case 'remove': res.removed = removeRow(ss, p); break;
      case 'tidy':   break;
      default:       res = { ok: false, error: 'unknown action' };
    }
    return res;
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- helpers ---------- */
function sheetFor(ss, tab) {
  var name = TABS[String(tab || '').toLowerCase()];
  if (!name) throw new Error('unknown tab ' + tab);
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('missing sheet ' + name);
  return sh;
}
function headers(sh) {
  var row = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var map = {};
  row.forEach(function (h, i) { if (h !== '') map[String(h).trim()] = i; });
  return map;
}
function today() {
  var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  var s = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd').split('-');
  return new Date(+s[0], +s[1] - 1, +s[2]);
}
function sameDay(a, b) {
  return a instanceof Date && b instanceof Date &&
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function norm(v) { return String(v == null ? '' : v).trim().toLowerCase(); }

/* Clear Done marks from earlier days; stamp Done On for ticks made by hand in the sheet. */
function tidy(ss) {
  var count = 0, t = today();
  Object.keys(TABS).forEach(function (k) {
    var sh = ss.getSheetByName(TABS[k]); if (!sh) return;
    var h = headers(sh);
    if (h['Done'] == null) return;
    var last = sh.getLastRow(); if (last < 2) return;
    var n = last - 1;
    var done = sh.getRange(2, h['Done'] + 1, n, 1).getValues();
    var doneOn = h['Done On'] != null ? sh.getRange(2, h['Done On'] + 1, n, 1).getValues() : null;
    var changed = false;
    for (var i = 0; i < n; i++) {
      var isDone = done[i][0] === true || norm(done[i][0]) === 'true';
      var stamp = doneOn ? doneOn[i][0] : '';
      if (isDone && stamp instanceof Date && !sameDay(stamp, t)) {        // yesterday's tick → clear
        done[i][0] = false; if (doneOn) doneOn[i][0] = ''; changed = true; count++;
      } else if (isDone && !(stamp instanceof Date) && doneOn) {         // ticked by hand → stamp today
        doneOn[i][0] = t; changed = true;
      } else if (!isDone && stamp !== '' && doneOn) {                    // unticked by hand → clear stamp
        doneOn[i][0] = ''; changed = true;
      }
    }
    if (changed) {
      sh.getRange(2, h['Done'] + 1, n, 1).setValues(done);
      if (doneOn) sh.getRange(2, h['Done On'] + 1, n, 1).setValues(doneOn);
    }
  });
  return count;
}

function addRow(ss, p) {
  var sh = sheetFor(ss, p.tab), h = headers(sh);
  var id = p.id || (Utilities.getUuid().slice(0, 8));
  var row = [];
  for (var i = 0; i < sh.getLastColumn(); i++) row.push('');
  function set(col, val) { if (h[col] != null) row[h[col]] = val; }
  set('Class', p['class'] || '');
  set('Date', today());
  set('Section', p.section || 'Added on screen');
  set('Task', String(p.task || '').slice(0, 200));
  set('Show', true);
  set('Source', 'screen:' + id);
  set('Done', false);
  // first row whose Task cell is empty (blank rows with unticked checkboxes still count as empty)
  var r = firstEmptyRow(sh, h);
  sh.getRange(r, 1, 1, row.length).setValues([row]);
  return id;
}
function firstEmptyRow(sh, h) {
  var col = h['Task'] != null ? h['Task'] + 1 : 1;
  var last = sh.getMaxRows();
  if (last < 2) return 2;
  var vals = sh.getRange(2, col, last - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) if (norm(vals[i][0]) === '') return i + 2;
  return last + 1;
}

function findRow(sh, h, p) {
  var last = sh.getLastRow(); if (last < 2) return 0;
  var vals = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  var src = p.source ? norm(p.source) : '';
  for (var i = 0; i < vals.length; i++) {
    var v = vals[i];
    if (src && h['Source'] != null && norm(v[h['Source']]) === src) return i + 2;
  }
  if (src) return 0;                                   // a screen-created row that's gone
  for (var j = 0; j < vals.length; j++) {
    var w = vals[j];
    if (norm(w[h['Class']]) === norm(p['class']) &&
        norm(w[h['Section']]) === norm(p.section) &&
        norm(w[h['Task']]) === norm(p.task)) return j + 2;
  }
  return 0;
}

function setDone(ss, p) {
  var sh = sheetFor(ss, p.tab), h = headers(sh);
  var r = findRow(sh, h, p); if (!r) return false;
  var done = p.done === true || norm(p.done) === 'true';
  if (h['Done'] != null) sh.getRange(r, h['Done'] + 1).setValue(done);
  if (h['Done On'] != null) sh.getRange(r, h['Done On'] + 1).setValue(done ? today() : '');
  return true;
}

function removeRow(ss, p) {
  var sh = sheetFor(ss, p.tab), h = headers(sh);
  if (!p.source || norm(p.source).indexOf('screen:') !== 0) return false;   // only rows the screen made
  var r = findRow(sh, h, { source: p.source }); if (!r) return false;
  sh.deleteRow(r);
  return true;
}
