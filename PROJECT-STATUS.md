# Trade Manager - Project Status

> **Domain:** tm.skyler.tools
> **Current Version:** Trade Manager v1.0
> **Last Updated:** December 14, 2025

---

## Overview

Trade Manager is a suite of trading tools hosted on skyler.tools. The first tool is the **Risk Calculator** - a position sizing calculator for traders that helps manage risk, log trades, and track performance.

---

## Completed Features

### Core Calculator
- [x] Position size calculation based on account size and risk %
- [x] Shares to buy calculation
- [x] Stop distance (% and $/share)
- [x] R-multiple calculation when target is set
- [x] 5R target price calculation
- [x] Potential profit and ROI display
- [x] Risk scenarios table (0.1%, 0.25%, 0.5%, 1%, 1.5%)
- [x] Max position size limiter with warning

### Trade Journal
- [x] Log trades with ticker, entry, stop, target, shares, notes
- [x] Active trades display (up to 5 shown)
- [x] Total risk summary with LOW/MEDIUM/HIGH indicator
- [x] Close trades with exit price (calculates P&L)
- [x] Delete trades
- [x] Full journal modal with filtering (All/Open/Trimmed/Closed)
- [x] Journal summary stats (W-L-O record, total P&L)

### Discord Alert Parser
- [x] Collapsible card UI
- [x] Parse $TICKER format (prioritized)
- [x] Parse entry price (@, entry, adding, bought)
- [x] Parse stop loss (sl, stop, stop loss)
- [x] Parse target (target, tp, pt)
- [x] Parse risk % (risking X%)
- [x] Auto-fill calculator fields

### Settings & Persistence
- [x] Settings slide-out panel
- [x] Starting account size configuration
- [x] Default risk % presets (0.1%, 0.25%, 0.5%, 1%)
- [x] Default max position % presets (10%, 20%, 50%, 75%, 100%)
- [x] Dynamic account tracking toggle
- [x] Account summary (starting, P&L, current)
- [x] Reset account to starting balance
- [x] Theme selection (Dark/Light)
- [x] LocalStorage persistence for settings and journal

### Data Management
- [x] Export All Data (JSON backup)
- [x] Import Data (restore from JSON)
- [x] Clear All Data (with double confirmation)
- [x] Export CSV (download)
- [x] Export TSV (download)
- [x] Copy CSV to clipboard
- [x] Copy TSV to clipboard (Excel-friendly)
- [ ] PDF export (placeholder - shows "coming soon")

### UI/UX
- [x] 3-panel responsive layout (Input | Results | Journal)
- [x] Dark/Light theme with CSS custom properties
- [x] Flash-free theme switching (preload script)
- [x] Trade Setup as hero card
- [x] Drop zone paste alert with NEW FEATURE badge
- [x] Compact settings cards with presets
- [x] K/M notation support (50k, 1.5m)
- [x] Toast notifications (bottom center, glassmorphism, icons)
- [x] Keyboard shortcuts (Escape to close modals)
- [x] Mobile responsive design
- [x] Header with skyler.tools branding
- [x] Footer with horizontal layout (Tools, Connect links)
- [x] Clear calculator button
- [x] Welcome card with SVG calculator icon (inactive state)
- [x] Consistent panel header styling
- [x] Emoji icons in card headers (📋 Position Details, 📊 Active Trades)

### Animations
- [x] Page load panel animations (staggered)
- [x] Result card update animations
- [x] Toast spring animation (bottom center pop-up)
- [x] Settings panel slide animation
- [x] Collapsible card expand/collapse
- [x] Button press feedback
- [x] Header account value flash on update
- [x] Save to Journal pulsing glow CTA

---

## Known Issues

### High Priority
*None*

### Medium Priority
*None*

### Low Priority
1. **PDF export** - Not implemented, shows placeholder toast.
2. ~~**No data validation**~~ - Stop and target validation now implemented (warns for invalid setups).

---

## Planned Features

### Phase 2: Trade Manager Suite Rebrand
- [x] Rebrand to "Trade Manager"
- [x] New domain: tm.skyler.tools (configured in meta tags)
- [ ] Landing page with tool cards
- [ ] Unified navigation between tools

### Phase 2: Position Management
- [ ] **Custom Close Position Modal**
  - Proper modal instead of browser `prompt()`
  - Exit price input with validation
  - Quick buttons (current price, breakeven, target)
  - P&L preview before confirming
  - Partial close option (sell X shares)

- [ ] **Tier Trimming System**
  - Define trim levels (e.g., 1R, 2R, 3R, 5R)
  - Configurable trim percentages per level
  - "Trim" action on active trades
  - Track trimmed portions separately
  - Average exit price calculation
  - Visual progress bar showing position remaining

### Phase 3: Advanced Features
- [ ] **Trade Tags/Categories**
  - Momentum, Swing, Scalp, etc.
  - Filter journal by tag
  - Performance stats by category

- [ ] **Charts/Analytics**
  - P&L over time chart
  - Win rate visualization
  - R-multiple distribution
  - Streak tracking

- [ ] **Multi-Account Support**
  - Switch between accounts
  - Separate journals per account

- [ ] **Alerts/Notifications**
  - Price alerts (browser notifications)
  - Stop hit warnings

### Phase 4: Integrations
- [ ] **Broker Sync** (stretch goal)
  - Import trades from broker CSV
  - Real-time position sync (API)

- [ ] **Discord Bot**
  - Post trades to Discord channel
  - Parse alerts directly from bot

---

## Technical Notes

### File Structure
```
skyler.tools/
├── index.html          # Main HTML structure
├── project-status.md   # This file - project documentation
├── css/
│   ├── variables.css   # Design tokens (colors, spacing, etc.)
│   ├── base.css        # Reset, typography, theme transitions
│   ├── components.css  # Buttons, inputs, cards, modals
│   ├── layout.css      # Header, footer, panels, grid
│   └── animations.css  # Keyframes, animation classes
└── js/
    ├── bundle.js       # Combined JS (for non-module servers)
    ├── state.js        # Centralized state management
    ├── utils.js        # Formatting/parsing utilities
    ├── calculator.js   # Position sizing logic
    ├── parser.js       # Discord alert parser
    ├── journal.js      # Trade journal management
    ├── settings.js     # Settings panel logic
    ├── ui.js           # Toasts, theme, keyboard
    └── main.js         # App entry point
```

### Tech Stack
- Vanilla JS (ES6+, bundled for compatibility)
- CSS Custom Properties for theming
- LocalStorage for persistence
- No build tools required (static files)
- Hosted on Netlify

### Browser Support
- Chrome, Firefox, Safari, Edge (modern versions)
- Mobile browsers (iOS Safari, Chrome Android)

---

## Deployment

**Current:** Manual upload to Netlify
**Domain:** skyler.tools/risk-calculator
**Future:** tm.skyler.tools

### Pre-Deploy Checklist
- [ ] Test all calculator functions
- [ ] Test journal CRUD operations
- [ ] Test data export/import
- [ ] Test both themes
- [ ] Test mobile responsiveness
- [ ] Verify social links work
- [ ] Check console for errors

---

## Contact

- **Discord:** discord.gg/EnYEcNWQ
- **GitHub:** github.com/skylerberry
- **X/Twitter:** x.com/skylerber
