# Risk Calculator Rewrite - Design & Architecture Brief

> **Status:** ~85% Complete | **Last Updated:** December 14, 2025
>
> **Quick Summary:**
> - Phases 1-3: ✅ Complete (Foundation, Calculator, Settings)
> - Phase 4: 🟡 80% (Discord Parser - missing visual feedback)
> - Phase 5: 🟡 70% (Journal - missing trim management)
> - Phase 6: 🟡 85% (Polish - missing PDF export, auto theme)

---

## Executive Summary

A complete reimagining of the risk calculator as a **full-screen trading dashboard** designed for beginner traders who copy-trade from Discord alerts. The new design prioritizes:
- **Screen real estate utilization** - dashboard layout vs. compact card
- **Beginner-friendly UX** - guided flows, clear terminology, helpful tooltips
- **Seamless alert-to-journal workflow** - paste → calculate → log in one fluid motion
- **Modern, refined aesthetics** - professional yet approachable

---

## Design Direction: "Trading Terminal Lite"

### Aesthetic Vision
**Tone:** Refined industrial meets soft accessibility - professional enough to feel like real trading software, but warm and approachable enough to not intimidate beginners.

**Key Visual Characteristics:**
- **Dark theme primary** with carefully chosen accent colors (not harsh, slightly muted)
- **Monospace numbers** for that terminal/financial data feel
- **Generous spacing** - breathing room between sections
- **Subtle depth** via layered cards with soft shadows and borders
- **Color-coded feedback** - green profits, amber warnings, red stops
- **Smooth micro-interactions** that feel responsive and alive

**Typography:**
- Display/Headers: **"Outfit"** - geometric, modern, highly readable
- Numbers/Data: **"JetBrains Mono"** - professional monospace for financial data
- Body text: **"Outfit"** at lighter weights

**Color Palette:**
```
Background:     #0f1419 (deep navy-black)
Surface:        #1a2332 (elevated cards)
Surface-hover:  #242f42 (interactive states)
Border:         #2d3a4f (subtle definition)

Primary:        #3b82f6 (confident blue)
Success:        #22c55e (profit green)
Warning:        #f59e0b (trim/caution amber)
Danger:         #ef4444 (stop loss red)

Text-primary:   #f1f5f9 (high contrast)
Text-secondary: #94a3b8 (subdued labels)
Text-muted:     #64748b (hints/placeholders)
```

---

## Layout Architecture

### Full-Screen Dashboard (3-Panel Design)

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: Logo + Account Summary ($50,320) + [⚙️ Settings] [🌙 Theme]│
├───────────────────────┬─────────────────────┬───────────────────────┤
│                       │                     │                       │
│   LEFT PANEL          │   CENTER PANEL      │   RIGHT PANEL         │
│   (Input Zone)        │   (Results)         │   (Journal)           │
│                       │                     │                       │
│   • Discord Alert     │   • Position Size   │   • Active Trades     │
│     Paste Box         │   • Shares          │   • Total Risk        │
│                       │   • Risk $          │   • Quick Log         │
│   • Account Setup     │   • Stop Distance   │   • Trade History     │
│   • Trade Entry       │   • R-Multiple      │   • Export Options    │
│   • Risk Settings     │   • Profit Target   │                       │
│   • Presets           │   • Scenarios       │                       │
│                       │                     │                       │
└───────────────────────┴─────────────────────┴───────────────────────┘
```

### Responsive Behavior
- **Desktop (1200px+):** 3-column layout
- **Tablet (768-1199px):** 2-column (inputs + results stacked, journal slides out)
- **Mobile (<768px):** Single column with tab navigation

---

## Feature Redesign

### 1. Discord Alert Parser (HERO FEATURE)

**Current:** Small button, modal popup, separate from main flow
**New:** **Prominent paste zone at top of input panel**

```
┌─────────────────────────────────────────┐
│  📋 PASTE DISCORD ALERT                 │
│  ┌───────────────────────────────────┐  │
│  │ Paste your alert here...          │  │
│  │                                   │  │
│  │ "Adding $TSLA @ 243.10, SL @      │  │
│  │  237.90, risking 1%"              │  │
│  └───────────────────────────────────┘  │
│  [Parse Alert ⚡]  or enter manually ↓  │
└─────────────────────────────────────────┘
```

**Improvements:**
- Always visible, not hidden in a modal
- Real-time parsing as you type/paste
- Visual feedback showing extracted values
- Smooth animation populating fields below
- Support for more alert formats (pattern library)

### 2. Account & Risk Settings

**Current:** Scattered inputs with preset buttons inline
**New:** **Organized settings cards with visual presets**

```
┌─────────────────────────────────────────┐
│  💰 ACCOUNT                             │
│  ┌───────────────────────────────────┐  │
│  │ $│ 50,000                      │✓│  │
│  └───────────────────────────────────┘  │
│  Supports: 50k, 1.5m notation           │
├─────────────────────────────────────────┤
│  ⚡ RISK PER TRADE                      │
│  ┌─────┬─────┬─────┬─────┬─────┐       │
│  │0.25%│0.5% │0.75%│ 1%  │1.5% │       │
│  └─────┴─────┴─────┴─────┴─────┘       │
│  Custom: [____]%                        │
├─────────────────────────────────────────┤
│  🛡️ MAX POSITION SIZE                   │
│  ┌─────┬─────┬─────┬─────┬─────┐       │
│  │ 10% │ 25% │ 50% │ 75% │100% │       │
│  └─────┴─────┴─────┴─────┴─────┘       │
│  Limits how much of account per trade   │
└─────────────────────────────────────────┘
```

### 3. Trade Entry

**Current:** Standard form inputs
**New:** **Smart entry with inline validation and visual feedback**

```
┌─────────────────────────────────────────┐
│  📈 TRADE SETUP                         │
│                                         │
│  Ticker    [TSLA________]               │
│                                         │
│  Entry     [$│243.10____] ← Your buy    │
│  Stop      [$│237.90____] ← Exit if wrong│
│  Target    [$│260.00____] ← Profit goal │
│            (optional)                   │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Stop is 2.14% below entry ✓     │    │
│  │ Target is 6.95% above entry     │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 4. Results Panel (CENTER - Maximum Visibility)

**Current:** Grid of small cards
**New:** **Large, scannable result cards with visual hierarchy**

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   POSITION SIZE          SHARES TO BUY          │
│   ┌─────────────────┐    ┌─────────────────┐    │
│   │   $2,430.00     │    │      10         │    │
│   │   4.86% of acct │    │   shares        │    │
│   └─────────────────┘    └─────────────────┘    │
│                                                 │
│   RISK AMOUNT            STOP DISTANCE          │
│   ┌─────────────────┐    ┌─────────────────┐    │
│   │    $52.00       │    │    2.14%        │    │
│   │   1% of account │    │   $5.20/share   │    │
│   └─────────────────┘    └─────────────────┘    │
│                                                 │
│   ─────────── PROFIT TARGETS ───────────        │
│                                                 │
│   R-MULTIPLE    5R TARGET       TRIM ZONE       │
│   ┌─────────┐   ┌─────────┐    ┌──────────┐    │
│   │  3.25R  │   │ $269.10 │    │ Sell 25% │    │
│   │ target  │   │ +10.7%  │    │ at 5R    │    │
│   └─────────┘   └─────────┘    └──────────┘    │
│                                                 │
│   IF TARGET HIT:                                │
│   ┌─────────────────────────────────────────┐  │
│   │  💰 $169.00 profit (+6.95% ROI)         │  │
│   │     Risk:Reward = 1:3.25                │  │
│   └─────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 5. Risk Scenarios (Collapsible Section)

**Current:** Separate expandable section
**New:** **Inline toggle with visual comparison**

```
┌─────────────────────────────────────────────────┐
│  📊 RISK SCENARIOS                    [Expand ▼]│
├─────────────────────────────────────────────────┤
│                                                 │
│  Risk%   Shares    Position    Risk $           │
│  ─────   ──────    ────────    ──────           │
│  0.25%      2      $486        $13              │
│  0.50%      5      $1,215      $26              │
│  0.75%      8      $1,944      $39          ◄──│
│  ● 1.00%   10      $2,430      $52    SELECTED  │
│  1.50%     15      $3,645      $78              │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 6. Journal System (COMPLETE RETHINK)

**Current:** Modal-based, separate from main flow, complex
**New:** **Integrated sidebar with streamlined workflow**

#### The New Journal Flow

**Step 1: Calculate** (automatic)
- User enters trade details
- Results display in real-time

**Step 2: Quick Log** (one click)
```
┌─────────────────────────────────────────┐
│  ✚ LOG THIS TRADE                       │
│                                         │
│  Quick note (optional):                 │
│  ┌───────────────────────────────────┐  │
│  │ Followed @trader's TSLA call      │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Save to Journal →]                    │
└─────────────────────────────────────────┘
```

**Step 3: Active Trades Dashboard**
```
┌─────────────────────────────────────────┐
│  📊 ACTIVE TRADES           [3 open]    │
│                                         │
│  Total Risk: $156 (0.31%)  ● LOW        │
│  ════════════════════════════════════   │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ TSLA  │ 10 shares │ Entry: $243.10 ││
│  │ Risk: $52 (1%)    │ Stop: $237.90  ││
│  │ ─────────────────────────────────  ││
│  │ [Trim 25%] [Close] [Edit]          ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ NVDA  │ 5 shares  │ Entry: $480.00 ││
│  │ ...                                ││
│  └─────────────────────────────────────┘│
│                                         │
│  [View Full Journal] [Export ▼]         │
└─────────────────────────────────────────┘
```

### 7. Trim Management (NEW STREAMLINED FLOW)

**Current:** Partially implemented, confusing
**New:** **Guided trim workflow**

When user clicks "Trim 25%":
```
┌─────────────────────────────────────────┐
│  ✂️ TRIM POSITION                       │
│                                         │
│  TSLA - Currently holding 10 shares     │
│                                         │
│  Trim amount:                           │
│  ┌─────┬─────┬─────┬──────┐            │
│  │ 25% │ 50% │ 75% │Custom│            │
│  └─────┴─────┴─────┴──────┘            │
│                                         │
│  Shares to sell: 2 (keeping 8)          │
│                                         │
│  Exit price: [$│260.00____]             │
│                                         │
│  Profit from trim: +$33.80              │
│  Remaining position risk: $41.60        │
│                                         │
│  [Cancel]              [Confirm Trim →] │
└─────────────────────────────────────────┘
```

### 8. Full Journal View (Slide-out Panel or Modal)

```
┌──────────────────────────────────────────────────────────────┐
│  📖 TRADE JOURNAL                                    [×]     │
├──────────────────────────────────────────────────────────────┤
│  Filter: [All ▼] [Open ▼] [Trimmed ▼] [Closed ▼]            │
│  Search: [________________________]                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Date       Ticker  Entry    Stop     Status   P/L          │
│  ────────   ──────  ─────    ────     ──────   ───          │
│  Dec 13     TSLA    $243.10  $237.90  ● Open   —            │
│  Dec 12     NVDA    $480.00  $470.00  ◐ Trim   +$85         │
│  Dec 11     SPY     $450.00  $445.00  ● Closed +$120        │
│  Dec 10     AMD     $120.00  $115.00  ● Closed -$50         │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  📊 Summary: 4 trades │ 2W-1L-1O │ +$155 total              │
│                                                              │
│  [Copy as TSV]  [Download CSV]  [Export PDF]                │
└──────────────────────────────────────────────────────────────┘
```

### 9. Settings Panel (NEW)

**Purpose:** Persistent user preferences that act as defaults + dynamic account tracking

**Accessible via:** Gear icon in header → slides out settings panel

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ SETTINGS                                          [×]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ACCOUNT DEFAULTS                                           │
│  ─────────────────                                          │
│                                                             │
│  Starting Account Size                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ $│ 50,000                                        │   │   │
│  └─────────────────────────────────────────────────────┘   │
│  This is your baseline. Supports K/M notation.              │
│                                                             │
│  Default Risk Per Trade                                     │
│  ┌─────┬─────┬─────┬─────┬─────┐                           │
│  │0.25%│0.5% │0.75%│ 1%  │1.5% │  or Custom: [___]%        │
│  └─────┴─────┴─────┴─────┴─────┘                           │
│  Pre-selected when you open the calculator.                 │
│                                                             │
│  Default Max Position                                       │
│  ┌─────┬─────┬─────┬─────┬─────┐                           │
│  │ 10% │ 25% │ 50% │ 75% │100% │                           │
│  └─────┴─────┴─────┴─────┴─────┘                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DYNAMIC ACCOUNT TRACKING                                   │
│  ────────────────────────                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ☑ Enable dynamic account size                      │   │
│  │                                                     │   │
│  │  Your account size will automatically update        │   │
│  │  based on closed trade profits and losses.          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Starting Balance:        $50,000.00                        │
│  Realized P&L:              +$320.00  (from 8 trades)       │
│  ───────────────────────────────────                        │
│  Current Account Size:    $50,320.00  ← used in calculator  │
│                                                             │
│  [Reset to Starting Balance]                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  APPEARANCE                                                 │
│  ──────────                                                 │
│                                                             │
│  Theme                                                      │
│  ┌─────────┬─────────┬─────────┐                           │
│  │  Dark   │  Light  │  Auto   │                           │
│  └─────────┴─────────┴─────────┘                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DATA MANAGEMENT                                            │
│  ───────────────                                            │
│                                                             │
│  [Export All Data]  [Import Data]  [Clear All Data]         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Dynamic Account Logic:**

1. **Base Account:** User's starting balance (stored in settings)
2. **Realized P&L:** Sum of all closed trade profits/losses from journal
3. **Current Account:** `Base Account + Realized P&L`
4. **Calculator Uses:** Current Account (when dynamic mode enabled)

**When a trade is closed:**
```
User closes TSLA trade:
  Entry: $243.10 × 10 shares = $2,431.00 invested
  Exit:  $260.00 × 10 shares = $2,600.00 returned
  Profit: +$169.00

→ Realized P&L updates: $151.00 → $320.00
→ Current Account updates: $50,151.00 → $50,320.00
→ Next calculation uses $50,320.00 as account size
```

**Edge Cases:**
- Partial closes (trims) contribute proportional P&L
- Losses subtract from account
- User can manually override/reset at any time
- Toggle to disable dynamic tracking (use fixed amount)

---

## Technical Architecture

### File Structure
```
risk-calculator/
├── index.html              # Single HTML file with semantic structure
├── css/
│   ├── variables.css       # Design tokens (colors, spacing, fonts)
│   ├── base.css            # Reset, typography, global styles
│   ├── components.css      # Buttons, inputs, cards, modals
│   ├── layout.css          # Grid, panels, responsive breakpoints
│   └── animations.css      # Transitions and keyframe animations
├── js/
│   ├── app.js              # Main entry point, app initialization
│   ├── state.js            # Centralized state management
│   ├── settings.js         # Settings panel + dynamic account logic
│   ├── calculator.js       # Core calculation logic
│   ├── parser.js           # Discord alert parser (enhanced)
│   ├── journal.js          # Trade journal system
│   ├── ui.js               # DOM manipulation utilities
│   └── storage.js          # localStorage abstraction
└── assets/
    └── fonts/              # Self-hosted fonts (Outfit, JetBrains Mono)
```

### State Management

```javascript
const AppState = {
  // User settings (persisted to localStorage)
  settings: {
    // Account defaults
    startingAccountSize: 50000,       // Base account balance
    defaultRiskPercent: 1,            // Pre-selected risk %
    defaultMaxPositionPercent: 100,   // Pre-selected max position %

    // Dynamic account tracking
    dynamicAccountEnabled: true,      // Toggle for auto-updating account

    // Appearance
    theme: 'dark'                     // 'dark' | 'light' | 'auto'
  },

  // Computed account (derived from settings + journal)
  account: {
    // These are computed when dynamicAccountEnabled is true:
    // currentSize = startingAccountSize + realizedPnL
    currentSize: 50000,               // What calculator uses
    realizedPnL: 0,                   // Sum of closed trade P&L
    closedTradeCount: 0,              // How many trades contributed to P&L

    // Session overrides (cleared on reload unless saved)
    riskPercent: 1,                   // Current risk % (starts as default)
    maxPositionPercent: 100           // Current max % (starts as default)
  },

  // Current trade being calculated
  trade: {
    ticker: '',
    entry: null,
    stop: null,
    target: null,
    notes: ''
  },

  // Calculated results (derived)
  results: {
    shares: 0,
    positionSize: 0,
    riskDollars: 0,
    stopDistance: 0,
    rMultiple: null,
    target5R: null,
    profit: null,
    roi: null,
    riskReward: null,
    isLimited: false,
    originalShares: null
  },

  // Journal entries (persisted)
  journal: {
    entries: [],
    filter: 'all'
  },

  // UI state (transient)
  ui: {
    scenariosExpanded: false,
    journalOpen: false,
    settingsOpen: false,
    activePanel: 'calculator'
  }
}
```

**Account Size Computation (when dynamic mode enabled):**
```javascript
function computeCurrentAccountSize(settings, journal) {
  if (!settings.dynamicAccountEnabled) {
    return settings.startingAccountSize;
  }

  const closedTrades = journal.entries.filter(t => t.status === 'closed');
  const realizedPnL = closedTrades.reduce((sum, trade) => {
    return sum + (trade.totalProfit || 0);
  }, 0);

  return settings.startingAccountSize + realizedPnL;
}
```

### Event System

```javascript
// Pub/sub for decoupled modules
const Events = {
  // Settings changes
  'settings:updated': (settings) => {},
  'settings:account-reset': () => {},

  // Account changes
  'account:updated': (account) => {},
  'account:pnl-changed': (pnlData) => {},
  'trade:updated': (trade) => {},

  // Calculations
  'results:calculated': (results) => {},

  // Journal
  'journal:entry-added': (entry) => {},
  'journal:entry-updated': (entry) => {},
  'journal:entry-deleted': (id) => {},
  'journal:trade-closed': (entry, pnl) => {},  // Triggers account recalc

  // Parser
  'alert:parsed': (data) => {},
  'alert:error': (error) => {},

  // UI
  'theme:changed': (theme) => {},
  'panel:toggled': (panel) => {}
}
```

---

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETE
- [x] HTML structure with semantic markup
- [x] CSS design system (variables, base, components)
- [x] Basic 3-panel layout
- [x] State management setup
- [x] Settings storage abstraction

### Phase 2: Core Calculator ✅ COMPLETE
- [x] Input components with K/M notation
- [x] Preset buttons (risk %, max position)
- [x] Calculation engine
- [x] Results display with formatting

### Phase 3: Settings System ✅ COMPLETE
- [x] Settings panel UI (slide-out)
- [x] Default account size configuration
- [x] Default risk % and max position % presets
- [x] Dynamic account tracking toggle
- [x] P&L computation from closed trades
- [x] Real-time account size updates
- [x] Reset to starting balance functionality

### Phase 4: Discord Parser 🟡 80% COMPLETE
- [x] Enhanced parser with more patterns
- [x] Drop zone paste UI with NEW FEATURE badge
- [x] Auto-populate fields on parse
- [ ] Visual extraction feedback (show parsed values before populating)
- [ ] Live-parsing as you type (currently parses on Enter/click)

### Phase 5: Journal System 🟡 70% COMPLETE
- [x] Quick log workflow
- [x] Active trades sidebar
- [x] Full journal view with filtering
- [x] Close trade workflow (captures exit price, calculates P&L)
- [x] P&L integration with dynamic account
- [ ] **Trim management flow** (major pending feature)
- [ ] Custom close position modal (currently uses browser prompt)

### Phase 6: Polish & Extras 🟡 85% COMPLETE
- [x] Animations and transitions (spring toasts, panel animations, button feedback)
- [x] Responsive breakpoints
- [x] Export functionality (CSV, TSV, JSON)
- [ ] PDF export (shows "coming soon" placeholder)
- [x] Theme toggle (dark/light)
- [ ] Auto theme option
- [x] Tooltips and help text
- [x] Data import/export in settings

---

## Key UX Improvements for Beginners

1. **Inline explanations** - Every input has a brief "what is this?" hint
2. **Visual validation** - Green checkmarks, red warnings as they type
3. **Calculated insights** - "Your stop is 2.14% below entry"
4. **Risk visualization** - Color-coded risk levels (green/amber/red)
5. **Guided trim flow** - Step-by-step, can't mess it up
6. **Discord-first workflow** - Paste is the primary input method
7. **Progressive disclosure** - Advanced options hidden until needed
8. **Persistent settings** - Account size/risk preferences saved

---

## Discord Alert Parser Patterns (Enhanced)

Support for common alert formats:

```
// Standard format
"Adding $TSLA @ 243.10, stop loss @ 237.90, risking 1%"

// Abbreviated
"$TSLA 243.10 sl 237.90"

// With target
"LONG $SPY @ 450, stop 445, target 460"

// Share count (extract for reference)
"Adding 100 shares $NVDA @ 480"

// Entry range
"$AMD 120-122 sl 115"

// Percentage stop
"$AAPL @ 180, stop -2%"
```

---

## Success Metrics

1. **Time from alert to logged trade** < 10 seconds
2. **Zero confusion on trim workflow** - linear, obvious steps
3. **Full screen utilization** - no wasted space on desktop
4. **Mobile-usable** - can log a trade from phone
5. **Visually distinctive** - doesn't look like generic Bootstrap

---

## Ready to Build?

This plan is ready for implementation. The phases are designed to be iterative - each phase produces a working (if incomplete) application.

Shall we begin with Phase 1: Foundation?
