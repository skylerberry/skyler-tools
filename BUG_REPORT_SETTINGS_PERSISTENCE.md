# Bug Report: Settings Not Persisting / Syncing on Page Reload

## Summary
Default Risk Per Trade and Default Max Position settings either don't save properly, don't update the calculator UI (preset buttons) on reload, or both.

---

## Architecture Overview

There are **TWO separate UI areas** with settings, each with different behavior:

### 1. Quick Settings (Main Calculator Panel)
Location: `index.html` lines 264-322

| Element | HTML | Selector | Synced on Load? |
|---------|------|----------|-----------------|
| Account Size | `<input id="accountSize">` | `#accountSize` | YES (settings.js:285) |
| Risk % Buttons | `<button class="risk-btn" data-risk="X">` | `.risk-btn` | YES (calculator.js:21-32) |
| Max Position Presets | `<button class="preset-btn" data-value="X">` | `.preset-btn` in `.settings-grid` | **NO** |
| Max Position Input | `<input id="maxPositionPercent">` | `#maxPositionPercent` | YES (settings.js:290) |

### 2. Settings Panel (Slide-out Panel)
Location: `index.html` lines 870-1020

| Element | HTML | Selector | Synced on Load? |
|---------|------|----------|-----------------|
| Account Size | `<input id="settingsAccountSize">` | `#settingsAccountSize` | YES (settings.js:247-248) |
| Default Risk Presets | `<button class="preset-btn" data-setting="defaultRisk">` | `.preset-btn[data-setting="defaultRisk"]` | YES (settings.js:213-217) |
| Default Max Pos Presets | `<button class="preset-btn" data-setting="defaultMaxPos">` | `.preset-btn[data-setting="defaultMaxPos"]` | YES (settings.js:220-224) |
| Theme Presets | `<button class="preset-btn" data-setting="theme">` | `.preset-btn[data-setting="theme"]` | YES (settings.js:227-230) |

---

## State Architecture

```
state.settings (Defaults - Persisted to localStorage)
├── startingAccountSize: 10000
├── defaultRiskPercent: 1
├── defaultMaxPositionPercent: 100
├── dynamicAccountEnabled: true
├── theme: 'dark'
└── sarMember: true

state.account (Current Session Values - NOT persisted directly)
├── currentSize: 10000
├── realizedPnL: 0
├── riskPercent: 1          ← copied from defaultRiskPercent on load
└── maxPositionPercent: 100  ← copied from defaultMaxPositionPercent on load
```

### localStorage Key: `'riskCalcSettings'`
Contains: `JSON.stringify(state.settings)`

---

## Data Flow on Page Load

```
1. main.js:36  → theme.init()
2. main.js:39  → settings.init()
   └── settings.js:19 → loadAndApply()
       ├── state.js:196-209 → loadSettings()
       │   ├── Parse localStorage['riskCalcSettings']
       │   ├── Object.assign(state.settings, parsed)
       │   ├── state.account.currentSize = state.settings.startingAccountSize
       │   ├── state.account.riskPercent = state.settings.defaultRiskPercent     ✅
       │   └── state.account.maxPositionPercent = state.settings.defaultMaxPositionPercent  ✅
       │
       ├── settings.js:247-248 → settingsAccountSize.value = ... ✅
       ├── settings.js:285     → accountSize.value = ...        ✅
       ├── settings.js:290     → maxPositionPercent.value = ... ✅
       └── settings.js:294     → syncPresetButtons()            ✅ (Settings Panel only)

3. main.js:42  → calculator.init()
   └── calculator.js:17 → syncRiskButton()                      ✅ (Risk buttons only)
```

---

## Identified Issues

### Issue #1: Quick Settings Max Position Presets NOT Synced

**Location**: `index.html` lines 307-311
```html
<div class="preset-group preset-group--compact">
  <button class="preset-btn" data-value="25">25%</button>
  <button class="preset-btn" data-value="50">50%</button>
  <button class="preset-btn active" data-value="100">100%</button>  <!-- Hardcoded! -->
</div>
```

**Problem**: These buttons have `active` hardcoded on 100% and are NEVER synced to match `state.account.maxPositionPercent` on page load.

**Why it wasn't caught**:
- The **input field** `#maxPositionPercent` IS synced (settings.js:290)
- But the **preset buttons** are not
- My fix `syncPresetButtons()` only targets buttons with `data-setting` attribute

**Evidence**: No code exists that syncs `.preset-btn` in `.settings-grid` based on `state.account.maxPositionPercent`.

---

### Issue #2: Different Button Systems

The codebase has TWO different button systems:

| System | Class | Data Attribute | Active Class | Synced By |
|--------|-------|----------------|--------------|-----------|
| Risk Buttons | `.risk-btn` | `data-risk` | `.risk-btn--active` | `calculator.syncRiskButton()` |
| Settings Panel Presets | `.preset-btn` | `data-setting` + `data-value` | `.active` | `settings.syncPresetButtons()` |
| Quick Settings Presets | `.preset-btn` | `data-value` only | `.active` | **NOTHING** |

---

### Issue #3: Potential Timing Issue with syncPresetButtons()

My fix calls `syncPresetButtons()` at end of `loadAndApply()`. But I need to verify:

1. Is `state.settings.defaultRiskPercent` populated at this point?
2. Are the DOM elements available?

**Verification Needed**: Add console.log to confirm values:
```javascript
syncPresetButtons() {
  console.log('syncPresetButtons called');
  console.log('defaultRiskPercent:', state.settings.defaultRiskPercent);
  console.log('defaultMaxPositionPercent:', state.settings.defaultMaxPositionPercent);
  // ... rest of method
}
```

---

## Files Involved

| File | Role | Key Methods |
|------|------|-------------|
| `js/state.js` | State management | `loadSettings()`, `saveSettings()`, `updateSettings()` |
| `js/settings.js` | Settings panel logic | `loadAndApply()`, `syncPresetButtons()`, `handlePresetClick()` |
| `js/calculator.js` | Calculator logic | `syncRiskButton()`, `handlePresetClick()`, `handleRiskButton()` |
| `js/main.js` | App initialization | `init()` - controls load order |
| `index.html` | UI structure | Lines 240-320 (Quick Settings), 870-980 (Settings Panel) |

---

## Required Fixes

### Fix #1: Sync Quick Settings Max Position Presets
Add code to sync `.preset-btn` buttons in `.settings-grid .preset-group` based on `state.account.maxPositionPercent`.

**Where**: Either in `calculator.init()` or `settings.loadAndApply()`

```javascript
// Sync Quick Settings max position presets
const maxPos = state.account.maxPositionPercent;
const settingsGrid = document.querySelector('.settings-grid');
if (settingsGrid) {
  const maxPosGroup = settingsGrid.querySelectorAll('.settings-item')[1]; // Second item
  if (maxPosGroup) {
    maxPosGroup.querySelectorAll('.preset-btn').forEach(btn => {
      const btnValue = parseFloat(btn.dataset.value);
      btn.classList.toggle('active', btnValue === maxPos);
    });
  }
}
```

**Better approach**: Add `data-setting="quickMaxPos"` attribute to Quick Settings presets and update `syncPresetButtons()`.

### Fix #2: Verify syncPresetButtons() is Working
Add logging to confirm the method runs with correct values.

### Fix #3: Consider Unifying Button Systems
The two different button systems (`.risk-btn` vs `.preset-btn`) with different active class conventions (`.risk-btn--active` vs `.active`) creates confusion. Consider standardizing.

---

## How to Test

1. Open the app
2. Go to Settings Panel (gear icon)
3. Change Default Risk to 0.5%
4. Change Default Max Position to 50%
5. Reload the page
6. Check:
   - [ ] Settings Panel shows 0.5% and 50% as active
   - [ ] Quick Settings shows correct preset buttons active
   - [ ] Calculator uses correct values for calculations

---

## Current State of Fix Attempt

The `syncPresetButtons()` method was added to `settings.js` (lines 211-231) and is called at end of `loadAndApply()` (line 294). This should fix Settings Panel presets.

**What's still broken**: Quick Settings Max Position presets in the main calculator panel are NOT synced because they don't have `data-setting` attribute.

---

## Console Debug Commands

Run these in browser console to verify state:

```javascript
// Check what's saved
JSON.parse(localStorage.getItem('riskCalcSettings'))

// Check current state
state.settings.defaultRiskPercent
state.settings.defaultMaxPositionPercent
state.account.riskPercent
state.account.maxPositionPercent

// Check which buttons are active
document.querySelectorAll('.preset-btn.active')
document.querySelectorAll('.risk-btn.risk-btn--active')
```
