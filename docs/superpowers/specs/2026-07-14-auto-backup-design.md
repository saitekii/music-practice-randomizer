# Auto-Backup

**Goal:** Give users a safety net against silent data loss (a corrupted localStorage key, a browser "clear site data," a bug) without requiring them to remember to click the existing manual Export button.

## Background

The app already has a full manual backup mechanism: `exportJSON()` (script.js:4139) bundles `adaptWeights`, `earAdaptWeights`, the daily practice log, `mpr_settings`, `mpr_learning_stage`, and `mpr_theme` into one JSON file and downloads it via an `<a download>` click; `importJSON()` (script.js:4190) restores from that file. Both are wired to buttons in the Stats popup's footer (index.html:786-795). This only helps if the user remembers to click it.

A prompted design question — could this run automatically, silently? — surfaced a real browser-behavior risk: if the user has Chrome's "Ask where to save each file before downloading" setting on, a JS-triggered download without a direct click still pops a native save dialog, which is jarring if it happens unprompted mid-practice. Browsers also apply anti-abuse heuristics to downloads not triggered by direct user gesture (untested here, and not fully guaranteed stable across browser versions). For these reasons, auto-backup is **opt-in, off by default** — not a silent background feature everyone gets without asking.

## Design

**New localStorage keys:**
- `mpr_auto_backup_enabled` — `'1'` when on, absent/anything else means off. Same boolean convention as `mpr_midi`.
- `mpr_auto_backup_cadence` — `'daily'` | `'weekly'` | `'monthly'`. Defaults to `'weekly'` the first time auto-backup is enabled.
- `mpr_last_auto_backup` — timestamp (`Date.now()` as a string) of the last automatic download. Absent until the first automatic (or manually-triggered-via-enabling) backup fires.

**Trigger — `checkAutoBackup()`:**

```js
function checkAutoBackup() {
  if (localStorage.getItem('mpr_auto_backup_enabled') !== '1') return;
  const CADENCE_MS = { daily: 86400000, weekly: 604800000, monthly: 2592000000 };
  const cadenceMs = CADENCE_MS[localStorage.getItem('mpr_auto_backup_cadence') || 'weekly'];
  const last = parseInt(localStorage.getItem('mpr_last_auto_backup') || '0', 10);
  if (Date.now() - last < cadenceMs) return;
  exportJSON();
  localStorage.setItem('mpr_last_auto_backup', Date.now().toString());
  showBackupToast();
}
```

Called once at app load, alongside the existing startup checks near the bottom of `script.js` (e.g. `if (localStorage.getItem('mpr_midi') === '1') enableMidi();`). `monthly` is a flat 30 days, not calendar-month-aware — matches the simplicity of `daily`/`weekly` rather than introducing date-object math for one option.

Reuses `exportJSON()` verbatim — no new export logic, no risk of the automatic and manual backups drifting out of sync in content.

**UI — new row in the Stats popup footer** (index.html, inside `.stats-footer`, alongside the existing Export/Import rows):

```html
<div class="stats-export-row">
  <span class="stats-footer-label">Auto-backup</span>
  <input type="checkbox" id="autoBackupEnabled">
  <select id="autoBackupCadence">
    <option value="daily">Daily</option>
    <option value="weekly" selected>Weekly</option>
    <option value="monthly">Monthly</option>
  </select>
</div>
```

`autoBackupCadence` is disabled (grayed, not hidden) whenever `autoBackupEnabled` is unchecked — visually matching how `syncUI()` disables sub-option groups elsewhere in the app, but implemented as its own small `change` listener on `autoBackupEnabled`, not as an addition to `syncUI()` itself (that function governs the main settings panel's checkbox tree, not the Stats popup).

Checking the box: sets `mpr_auto_backup_enabled = '1'`, sets `mpr_auto_backup_cadence` to the dropdown's current value if not already set, and calls `checkAutoBackup()` immediately — since `mpr_last_auto_backup` is absent the first time, this fires an immediate backup, giving the user instant proof the feature is working rather than a silent promise to check back in a week. Unchecking just sets `mpr_auto_backup_enabled` to `'0'`; it does not clear `mpr_last_auto_backup` (so re-enabling later respects the original cadence clock rather than immediately re-downloading).

Changing the cadence dropdown only updates `mpr_auto_backup_cadence` — it does not reset `mpr_last_auto_backup` or trigger an immediate backup.

**Toast — new `backupToast` element**, structurally separate from the existing `undoToast` (script.js:2776-2792, index.html:768-771), which is purpose-built around the Undo button and a 4-second progress-bar animation tied to that specific action. `backupToast` is a simpler fade in/fade out message, "Backup saved to Downloads", shown for ~3 seconds — same transient-message spirit as the existing Import button's `btn.textContent = 'Restored: ...'` pattern (script.js:4234-4237), but as a standalone toast since there's no button click to anchor the message to when the trigger is automatic.

## Edge Cases

- **Fresh/empty profile**: `checkAutoBackup()` still runs `exportJSON()` if enabled — downloads a JSON file with mostly `null`/empty fields. Harmless, not special-cased (matches how the manual Export button already behaves for a new user).
- **"Clear practice history" button** (`clearHistoryBtn`, script.js) only removes `mpr_daily` — does not touch `mpr_auto_backup_enabled`, `mpr_auto_backup_cadence`, or `mpr_last_auto_backup`. Auto-backup keeps running on its existing schedule after a history clear.
- **Multiple tabs/windows open**: not addressed — each tab independently checks `mpr_last_auto_backup` at its own load time; whichever loads next after the cadence window elapses will trigger the download. Not a meaningful risk for a single-user local app.

## Testing

- Checkbox and dropdown render in the Stats popup footer; dropdown is disabled when checkbox is unchecked, enabled when checked.
- `checkAutoBackup()` triggers a real download (verified via Playwright's `page.waitForEvent('download')`) when `mpr_auto_backup_enabled === '1'` and `mpr_last_auto_backup` is older than the selected cadence.
- `checkAutoBackup()` does NOT trigger a download when disabled, or when the cadence window hasn't elapsed yet.
- Checking the box for the first time triggers an immediate backup (proving the "instant proof" behavior).
- `backupToast` appears after an automatic backup and disappears after ~3 seconds.
- Unchecking and re-checking the box does not reset `mpr_last_auto_backup` (re-enabling respects the original clock, doesn't force an immediate re-download unless the cadence window has actually elapsed).
- `exportJSON()`'s existing manual-trigger behavior (via `exportJsonBtn`) is unaffected — regression check.
