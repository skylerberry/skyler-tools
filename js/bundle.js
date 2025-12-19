/**
 * Trade Manager - Bundled Version
 * This file combines all modules for servers that don't support ES modules
 */

// ============================================
// Utils
// ============================================

const Utils = {
  formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  },

  formatNumber(value, decimals = 0) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  },

  formatPercent(value, decimals = 2) {
    return `${this.formatNumber(value, decimals)}%`;
  },

  formatWithCommas(value) {
    if (value === null || value === undefined) return '';
    return this.formatNumber(value, value % 1 === 0 ? 0 : 2);
  },

  parseNumber(str) {
    if (!str) return null;
    if (typeof str === 'number') return str;

    let cleaned = str.toString().replace(/,/g, '').trim();
    const multipliers = { k: 1000, m: 1000000 };
    const match = cleaned.match(/^([\d.]+)\s*([km])$/i);

    if (match) {
      const num = parseFloat(match[1]);
      const multiplier = multipliers[match[2].toLowerCase()];
      return num * multiplier;
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  },

  formatDate(dateString, options = {}) {
    const defaults = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', { ...defaults, ...options });
  }
};

// ============================================
// State Management
// ============================================

const AppState = {
  state: {
    settings: {
      startingAccountSize: 10000,
      defaultRiskPercent: 1,
      defaultMaxPositionPercent: 100,
      dynamicAccountEnabled: true,
      theme: 'dark',
      sarMember: true
    },
    account: {
      currentSize: 10000,
      realizedPnL: 0,
      riskPercent: 1,
      maxPositionPercent: 100
    },
    trade: {
      ticker: '',
      entry: null,
      stop: null,
      target: null,
      notes: ''
    },
    results: {
      shares: 0,
      positionSize: 0,
      riskDollars: 0,
      stopDistance: 0,
      stopPerShare: 0,
      rMultiple: null,
      target5R: null,
      profit: null,
      roi: null,
      isLimited: false,
      percentOfAccount: 0
    },
    journal: {
      entries: [],
      filter: 'all'
    },
    journalMeta: {
      achievements: {
        unlocked: [],
        progress: {
          totalTrades: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastTradeDate: null,
          tradesWithNotes: 0,
          tradesWithThesis: 0,
          completeWizardCount: 0
        }
      },
      settings: {
        wizardEnabled: false,
        celebrationsEnabled: true,
        soundEnabled: false
      },
      schemaVersion: 1
    },
    ui: {
      scenariosExpanded: false,
      alertExpanded: false,
      settingsOpen: false,
      journalOpen: false
    }
  },

  listeners: new Map(),

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  },

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  },

  updateSettings(updates) {
    Object.assign(this.state.settings, updates);
    this.emit('settingsChanged', this.state.settings);
    this.saveSettings();
  },

  updateAccount(updates) {
    Object.assign(this.state.account, updates);
    this.emit('accountChanged', this.state.account);
  },

  updateTrade(updates) {
    Object.assign(this.state.trade, updates);
    this.emit('tradeChanged', this.state.trade);
  },

  updateResults(results) {
    this.state.results = { ...this.state.results, ...results };
    this.emit('resultsChanged', this.state.results);
  },

  addJournalEntry(entry) {
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...entry
    };
    this.state.journal.entries.unshift(newEntry);
    this.saveJournal();
    this.emit('journalEntryAdded', newEntry);
    return newEntry;
  },

  updateJournalEntry(id, updates) {
    const entry = this.state.journal.entries.find(e => e.id === id);
    if (entry) {
      Object.assign(entry, updates);
      this.saveJournal();
      this.emit('journalEntryUpdated', entry);
    }
    return entry;
  },

  deleteJournalEntry(id) {
    const index = this.state.journal.entries.findIndex(e => e.id === id);
    if (index > -1) {
      const deleted = this.state.journal.entries.splice(index, 1)[0];
      this.saveJournal();
      this.emit('journalEntryDeleted', deleted);
      return deleted;
    }
    return null;
  },

  getOpenTrades() {
    return this.state.journal.entries.filter(e => e.status === 'open');
  },

  getFilteredEntries(filter = 'all') {
    if (filter === 'all') return this.state.journal.entries;
    return this.state.journal.entries.filter(e => e.status === filter);
  },

  toggleUI(key) {
    this.state.ui[key] = !this.state.ui[key];
    this.emit('uiChanged', { key, value: this.state.ui[key] });
  },

  setUI(key, value) {
    this.state.ui[key] = value;
    this.emit('uiChanged', { key, value });
  },

  saveSettings() {
    try {
      localStorage.setItem('riskCalcSettings', JSON.stringify(this.state.settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  },

  loadSettings() {
    try {
      const saved = localStorage.getItem('riskCalcSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(this.state.settings, parsed);
        this.state.account.currentSize = this.state.settings.startingAccountSize;
        this.state.account.riskPercent = this.state.settings.defaultRiskPercent;
        this.state.account.maxPositionPercent = this.state.settings.defaultMaxPositionPercent;
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  },

  saveJournal() {
    try {
      localStorage.setItem('riskCalcJournal', JSON.stringify(this.state.journal.entries));
    } catch (e) {
      console.error('Failed to save journal:', e);
    }
  },

  loadJournal() {
    try {
      const saved = localStorage.getItem('riskCalcJournal');
      if (saved) {
        this.state.journal.entries = JSON.parse(saved);
        // Calculate realized P&L from closed and trimmed trades
        // Use totalRealizedPnL for trades with trim history, fallback to pnl for legacy
        this.state.account.realizedPnL = this.state.journal.entries
          .filter(t => (t.status === 'closed' || t.status === 'trimmed'))
          .reduce((sum, t) => sum + (t.totalRealizedPnL ?? t.pnl ?? 0), 0);

        if (this.state.settings.dynamicAccountEnabled) {
          this.state.account.currentSize =
            this.state.settings.startingAccountSize + this.state.account.realizedPnL;
        }
      }
    } catch (e) {
      console.error('Failed to load journal:', e);
    }
  },

  // JournalMeta methods
  updateJournalMetaSettings(updates) {
    Object.assign(this.state.journalMeta.settings, updates);
    this.saveJournalMeta();
    this.emit('journalMetaSettingsChanged', this.state.journalMeta.settings);
  },

  updateStreak() {
    const progress = this.state.journalMeta.achievements.progress;
    const today = new Date().toDateString();
    const lastDate = progress.lastTradeDate ? new Date(progress.lastTradeDate).toDateString() : null;

    if (lastDate === today) return progress.currentStreak;

    if (lastDate) {
      const daysDiff = Math.floor(
        (new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24)
      );
      progress.currentStreak = (daysDiff === 1) ? progress.currentStreak + 1 : 1;
    } else {
      progress.currentStreak = 1;
    }

    if (progress.currentStreak > progress.longestStreak) {
      progress.longestStreak = progress.currentStreak;
    }

    progress.lastTradeDate = new Date().toISOString();
    this.saveJournalMeta();
    this.emit('streakUpdated', progress.currentStreak);
    return progress.currentStreak;
  },

  unlockAchievement(id) {
    const unlocked = this.state.journalMeta.achievements.unlocked;
    if (!unlocked.find(a => a.id === id)) {
      const achievement = { id, unlockedAt: new Date().toISOString(), notified: false };
      unlocked.push(achievement);
      this.saveJournalMeta();
      this.emit('achievementUnlocked', achievement);
      return achievement;
    }
    return null;
  },

  isAchievementUnlocked(id) {
    return this.state.journalMeta.achievements.unlocked.some(a => a.id === id);
  },

  markAchievementNotified(id) {
    const achievement = this.state.journalMeta.achievements.unlocked.find(a => a.id === id);
    if (achievement) {
      achievement.notified = true;
      this.saveJournalMeta();
    }
  },

  migrateJournalEntries() {
    let migrated = false;
    this.state.journal.entries = this.state.journal.entries.map(entry => {
      if (!entry.hasOwnProperty('thesis')) {
        migrated = true;
        return { ...entry, thesis: null, wizardComplete: false, wizardSkipped: [] };
      }
      return entry;
    });
    if (migrated) {
      this.saveJournal();
      console.log('Migrated journal entries to new schema');
    }
  },

  saveJournalMeta() {
    try {
      localStorage.setItem('riskCalcJournalMeta', JSON.stringify(this.state.journalMeta));
    } catch (e) {
      console.error('Failed to save journal meta:', e);
    }
  },

  loadJournalMeta() {
    try {
      const saved = localStorage.getItem('riskCalcJournalMeta');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state.journalMeta = {
          achievements: {
            unlocked: parsed.achievements?.unlocked || [],
            progress: { ...this.state.journalMeta.achievements.progress, ...(parsed.achievements?.progress || {}) }
          },
          settings: { ...this.state.journalMeta.settings, ...(parsed.settings || {}) },
          schemaVersion: parsed.schemaVersion || 1
        };
      }
    } catch (e) {
      console.error('Failed to load journal meta:', e);
    }
  },

  // Recalculate progress from existing journal entries (for upgrades/migrations)
  recalculateProgress() {
    const entries = this.state.journal.entries;
    if (entries.length === 0) return;

    const progress = this.state.journalMeta.achievements.progress;

    // Recalculate metrics
    progress.totalTrades = entries.length;
    progress.tradesWithNotes = entries.filter(e => e.notes && e.notes.trim()).length;
    progress.tradesWithThesis = entries.filter(e =>
      e.thesis && (e.thesis.setupType || e.thesis.theme || e.thesis.conviction ||
                   e.thesis.entryType || e.thesis.riskReasoning)
    ).length;
    progress.completeWizardCount = entries.filter(e =>
      e.wizardComplete && (!e.wizardSkipped || e.wizardSkipped.length === 0)
    ).length;

    // Find most recent trade date
    const sorted = [...entries].sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    if (sorted[0]) {
      progress.lastTradeDate = sorted[0].timestamp;
    }

    // Recalculate streak from history
    this.recalculateStreakFromHistory();
    this.saveJournalMeta();
  },

  recalculateStreakFromHistory() {
    const entries = [...this.state.journal.entries]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (entries.length === 0) {
      this.state.journalMeta.achievements.progress.currentStreak = 0;
      return;
    }

    // Group trades by date
    const tradesByDate = {};
    entries.forEach(entry => {
      const date = new Date(entry.timestamp).toDateString();
      if (!tradesByDate[date]) tradesByDate[date] = true;
    });

    const tradeDates = Object.keys(tradesByDate).map(d => new Date(d)).sort((a, b) => a - b);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count consecutive days backwards from today/yesterday
    let streak = 0;
    let checkDate = new Date(today);

    // Check if traded today
    const tradedToday = tradeDates.some(d => d.toDateString() === today.toDateString());
    if (!tradedToday) {
      // Check yesterday
      checkDate.setDate(checkDate.getDate() - 1);
    }

    for (let i = tradeDates.length - 1; i >= 0; i--) {
      const tradeDate = tradeDates[i];
      tradeDate.setHours(0, 0, 0, 0);

      if (tradeDate.getTime() === checkDate.getTime()) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (tradeDate.getTime() < checkDate.getTime()) {
        break; // Gap found
      }
    }

    this.state.journalMeta.achievements.progress.currentStreak = streak;
    this.state.journalMeta.achievements.progress.longestStreak = Math.max(
      this.state.journalMeta.achievements.progress.longestStreak,
      streak
    );
  },

  get settings() { return this.state.settings; },
  get account() { return this.state.account; },
  get trade() { return this.state.trade; },
  get results() { return this.state.results; },
  get journal() { return this.state.journal; },
  get journalMeta() { return this.state.journalMeta; },
  get ui() { return this.state.ui; }
};

// ============================================
// UI - Toasts
// ============================================

const UI = {
  toastContainer: null,
  toastContainerTop: null,

  toastIcons: {
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
  },

  showToast(message, type = 'success') {
    if (!this.toastContainer) {
      this.toastContainer = document.getElementById('toastContainer');
    }
    if (!this.toastContainer) return;

    const icon = this.toastIcons[type] || this.toastIcons.success;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon">${icon}</span>
      <span class="toast__message">${message}</span>
      <button class="toast__close" aria-label="Dismiss">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M1 1l8 8M9 1l-8 8"/>
        </svg>
      </button>
    `;

    toast.querySelector('.toast__close').addEventListener('click', () => {
      this.removeToast(toast);
    });

    this.toastContainer.appendChild(toast);
    setTimeout(() => this.removeToast(toast), 3000);
  },

  removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  },

  showToastTop(message, type = 'success', duration = 3000) {
    if (!this.toastContainerTop) {
      this.toastContainerTop = document.getElementById('toastContainerTop');
    }
    if (!this.toastContainerTop) return;

    const icon = this.toastIcons[type] || this.toastIcons.success;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon">${icon}</span>
      <span class="toast__message">${message}</span>
      <button class="toast__close" aria-label="Dismiss">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M1 1l8 8M9 1l-8 8"/>
        </svg>
      </button>
    `;

    toast.querySelector('.toast__close').addEventListener('click', () => {
      this.removeToast(toast);
    });

    this.toastContainerTop.appendChild(toast);
    setTimeout(() => this.removeToast(toast), duration);
  },

  flashHeaderAccount() {
    const el = document.querySelector('.header__account-value');
    if (el) {
      el.classList.add('updated');
      setTimeout(() => el.classList.remove('updated'), 500);
    }
  }
};

// ============================================
// Calculator
// ============================================

const Calculator = {
  elements: {},

  init() {
    this.cacheElements();
    this.bindEvents();
    this.calculate();
  },

  cacheElements() {
    this.elements = {
      accountSize: document.getElementById('accountSize'),
      maxPositionPercent: document.getElementById('maxPositionPercent'),
      ticker: document.getElementById('ticker'),
      entryPrice: document.getElementById('entryPrice'),
      stopLoss: document.getElementById('stopLoss'),
      targetPrice: document.getElementById('targetPrice'),
      positionSize: document.getElementById('positionSize'),
      positionPercent: document.getElementById('positionPercent'),
      shares: document.getElementById('shares'),
      riskAmount: document.getElementById('riskAmount'),
      riskPercentDisplay: document.getElementById('riskPercentDisplay'),
      stopDistance: document.getElementById('stopDistance'),
      stopPerShare: document.getElementById('stopPerShare'),
      rMultiple: document.getElementById('rMultiple'),
      profitPerShare: document.getElementById('profitPerShare'),
      potentialProfit: document.getElementById('potentialProfit'),
      profitROI: document.getElementById('profitROI'),
      // What If Section
      whatIfSection: document.getElementById('whatIfSection'),
      whatIfTargetPrice: document.getElementById('whatIfTargetPrice'),
      resultsTicker: document.getElementById('resultsTicker'),
      customRisk: document.getElementById('customRisk'),
      scenariosToggle: document.getElementById('scenariosToggle'),
      scenariosContent: document.getElementById('scenariosContent'),
      scenariosBody: document.getElementById('scenariosBody'),
      clearCalculatorBtn: document.getElementById('clearCalculatorBtn'),
      // R-Progress Bar
      rProgressBar: document.getElementById('rProgressBar'),
      rProgressFill: document.getElementById('rProgressFill'),
      rStopPrice: document.getElementById('rStopPrice'),
      rStopProfit: document.getElementById('rStopProfit'),
      rEntryPrice: document.getElementById('rEntryPrice'),
      r1RPrice: document.getElementById('r1RPrice'),
      r1RProfit: document.getElementById('r1RProfit'),
      r2RPrice: document.getElementById('r2RPrice'),
      r2RProfit: document.getElementById('r2RProfit'),
      r3RPrice: document.getElementById('r3RPrice'),
      r3RProfit: document.getElementById('r3RProfit'),
      r4RPrice: document.getElementById('r4RPrice'),
      r4RProfit: document.getElementById('r4RProfit'),
      r5RPrice: document.getElementById('r5RPrice'),
      r5RProfit: document.getElementById('r5RProfit')
    };
  },

  bindEvents() {
    const inputs = ['maxPositionPercent', 'ticker', 'entryPrice', 'stopLoss', 'targetPrice'];
    inputs.forEach(id => {
      const el = this.elements[id];
      if (el) el.addEventListener('input', () => this.calculate());
    });

    // Mobile: Enter key advances to next field
    const fieldOrder = ['ticker', 'entryPrice', 'stopLoss', 'targetPrice'];
    fieldOrder.forEach((id, index) => {
      const el = this.elements[id];
      if (el) {
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const nextId = fieldOrder[index + 1];
            if (nextId && this.elements[nextId]) {
              this.elements[nextId].focus();
              this.elements[nextId].select();
            } else {
              // Last field - blur to dismiss keyboard
              el.blur();
            }
          }
        });
      }
    });

    // Input validation: Ticker only A-Z, prices only numbers
    if (this.elements.ticker) {
      this.elements.ticker.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase();
      });
    }

    const priceFields = ['entryPrice', 'stopLoss', 'targetPrice'];
    priceFields.forEach(id => {
      const el = this.elements[id];
      if (el) {
        el.addEventListener('input', (e) => {
          // Allow only digits and one decimal point
          let value = e.target.value;
          value = value.replace(/[^\d.]/g, '');
          // Ensure only one decimal point
          const parts = value.split('.');
          if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
          }
          e.target.value = value;
        });
      }
    });

    if (this.elements.accountSize) {
      this.elements.accountSize.addEventListener('input', (e) => {
        const inputValue = e.target.value.trim();

        // Instant format when K/M notation is used
        if (inputValue && (inputValue.toLowerCase().includes('k') || inputValue.toLowerCase().includes('m'))) {
          const converted = Utils.parseNumber(inputValue);
          if (converted !== null) {
            const cursorPosition = e.target.selectionStart;
            const originalLength = e.target.value.length;
            e.target.value = Utils.formatWithCommas(converted);
            const newLength = e.target.value.length;
            const newCursorPosition = Math.max(0, cursorPosition + (newLength - originalLength));
            e.target.setSelectionRange(newCursorPosition, newCursorPosition);
            // Update all displays with the converted value
            SettingsToggle.updateSummary(converted, AppState.account.maxPositionPercent);
            Settings.updateAccountDisplay(converted);
            AppState.updateAccount({ currentSize: converted });
          }
        }
        this.calculate();
      });
      this.elements.accountSize.addEventListener('blur', (e) => {
        const num = Utils.parseNumber(e.target.value);
        if (num !== null) {
          e.target.value = Utils.formatWithCommas(num);
          SettingsToggle.updateSummary(num, AppState.account.maxPositionPercent);
          Settings.updateAccountDisplay(num);
        }
      });
    }

    document.querySelectorAll('.settings-grid .preset-group').forEach(group => {
      group.addEventListener('click', (e) => this.handlePresetClick(e));
    });

    if (this.elements.scenariosToggle) {
      this.elements.scenariosToggle.addEventListener('click', () => this.toggleScenarios());
    }

    if (this.elements.clearCalculatorBtn) {
      this.elements.clearCalculatorBtn.addEventListener('click', () => this.clear());
    }

    // Stepper buttons for entry/stop
    document.querySelectorAll('.input-stepper__btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleStepper(e));
    });

    // Risk buttons
    document.querySelectorAll('.risk-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleRiskButton(e));
    });

    // Custom risk input
    if (this.elements.customRisk) {
      this.elements.customRisk.addEventListener('input', () => this.handleCustomRisk());
      this.elements.customRisk.addEventListener('blur', () => this.handleCustomRisk());
    }
  },

  handleStepper(e) {
    const btn = e.target.closest('.input-stepper__btn');
    if (!btn) return;

    const targetId = btn.dataset.target;
    const direction = btn.dataset.direction;
    const input = document.getElementById(targetId);
    if (!input) return;

    const currentValue = parseFloat(input.value) || 0;
    const step = 0.01;
    const newValue = direction === 'up'
      ? currentValue + step
      : Math.max(0, currentValue - step);

    input.value = newValue.toFixed(2);
    this.calculate();
  },

  handleRiskButton(e) {
    const btn = e.target.closest('.risk-btn');
    if (!btn) return;

    const risk = parseFloat(btn.dataset.risk);
    if (isNaN(risk)) return;

    // Update active state
    document.querySelectorAll('.risk-btn').forEach(b => b.classList.remove('risk-btn--active'));
    btn.classList.add('risk-btn--active');

    // Clear custom input
    if (this.elements.customRisk) {
      this.elements.customRisk.value = '';
    }

    // Update state and recalculate
    if (this.elements.riskPercent) {
      this.elements.riskPercent.value = risk;
    }
    AppState.updateAccount({ riskPercent: risk });
    this.calculate();
  },

  handleCustomRisk() {
    const value = parseFloat(this.elements.customRisk?.value);
    if (isNaN(value) || value <= 0) return;

    // Clear active state from preset buttons
    document.querySelectorAll('.risk-btn').forEach(b => b.classList.remove('risk-btn--active'));

    // Update state and recalculate
    if (this.elements.riskPercent) {
      this.elements.riskPercent.value = value;
    }
    AppState.updateAccount({ riskPercent: value });
    this.calculate();
  },

  clear() {
    // Clear trade input fields
    if (this.elements.ticker) this.elements.ticker.value = '';
    if (this.elements.entryPrice) this.elements.entryPrice.value = '';
    if (this.elements.stopLoss) this.elements.stopLoss.value = '';
    if (this.elements.targetPrice) this.elements.targetPrice.value = '';

    // Clear any error states
    this.setStopError(false);

    // Recalculate (will show empty/default results)
    this.calculate();

    // Show feedback
    showToast('Calculator cleared', 'success');
    console.log('🧹 Calculator cleared');
  },

  handlePresetClick(e) {
    const btn = e.target.closest('.preset-btn');
    if (!btn) return;

    const group = btn.closest('.preset-group');
    const value = parseFloat(btn.dataset.value);

    group.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Max Position Size preset
    if (this.elements.maxPositionPercent) {
      this.elements.maxPositionPercent.value = value;
      AppState.updateAccount({ maxPositionPercent: value });
    }

    this.calculate();
  },

  toggleScenarios() {
    AppState.toggleUI('scenariosExpanded');
    this.elements.scenariosToggle?.classList.toggle('active', AppState.ui.scenariosExpanded);
    this.elements.scenariosContent?.classList.toggle('open', AppState.ui.scenariosExpanded);
  },

  calculate() {
    const accountSize = Utils.parseNumber(this.elements.accountSize?.value);
    const riskPercent = AppState.account.riskPercent || AppState.settings.defaultRiskPercent;
    const entry = Utils.parseNumber(this.elements.entryPrice?.value);
    const stop = Utils.parseNumber(this.elements.stopLoss?.value);
    const target = Utils.parseNumber(this.elements.targetPrice?.value);
    const maxPositionPercent = Utils.parseNumber(this.elements.maxPositionPercent?.value) || AppState.account.maxPositionPercent;

    AppState.updateAccount({
      currentSize: accountSize || AppState.settings.startingAccountSize
    });

    AppState.updateTrade({
      ticker: this.elements.ticker?.value.toUpperCase() || '',
      entry, stop, target
    });

    // Check target vs entry early (even before full validation)
    const hasTargetWarning = target && entry && target <= entry;

    if (!accountSize || !riskPercent || !entry || !stop) {
      this.setStopError(false);
      this.renderEmptyResults();
      return;
    }

    if (stop >= entry) {
      this.setStopError(true);
      this.renderEmptyResults();
      return;
    }

    // Valid setup - clear error
    this.setStopError(false);

    const riskPerShare = entry - stop;
    const riskDollars = accountSize * (riskPercent / 100);
    let shares = Math.floor(riskDollars / riskPerShare);
    let positionSize = shares * entry;
    let isLimited = false;

    // Store original values before limiting
    const originalShares = shares;
    const originalPositionSize = positionSize;
    const originalPercentOfAccount = (originalPositionSize / accountSize) * 100;
    const originalRiskDollars = riskDollars;
    const originalRiskPercent = riskPercent;

    const maxPosition = accountSize * (maxPositionPercent / 100);
    if (positionSize > maxPosition) {
      shares = Math.floor(maxPosition / entry);
      positionSize = shares * entry;
      isLimited = true;
    }

    const actualRiskDollars = shares * riskPerShare;
    const actualRiskPercent = (actualRiskDollars / accountSize) * 100;
    const stopDistance = (riskPerShare / entry) * 100;
    const percentOfAccount = (positionSize / accountSize) * 100;

    let rMultiple = null, profit = null, roi = null, targetProfitPerShare = null;
    if (target && target !== entry) {
      targetProfitPerShare = target - entry;
      rMultiple = targetProfitPerShare / riskPerShare;
      profit = shares * targetProfitPerShare;
      roi = (targetProfitPerShare / entry) * 100;
    }

    const results = {
      shares, positionSize, riskDollars: actualRiskDollars, stopDistance,
      stopPerShare: riskPerShare, rMultiple, target, profit, roi, targetProfitPerShare, isLimited, percentOfAccount,
      originalPositionSize, originalPercentOfAccount,
      originalRiskDollars, originalRiskPercent, actualRiskPercent
    };

    AppState.updateResults(results);
    this.renderResults(results);
    this.renderScenarios(accountSize, entry, riskPerShare, maxPositionPercent);
    this.renderRProgressBar(entry, stop, shares, riskPerShare);

    console.log(`🧮 Calculated: ${shares} shares @ $${entry.toFixed(2)}, risk $${actualRiskDollars.toFixed(2)} (${riskPercent}%)`);
  },

  renderResults(r) {
    const ticker = AppState.trade.ticker || '—';

    document.querySelectorAll('.result-card').forEach(card => {
      card.classList.add('updated');
      setTimeout(() => card.classList.remove('updated'), 300);
    });

    // Position Size - show strikethrough if limited
    if (this.elements.positionSize) {
      if (r.isLimited) {
        this.elements.positionSize.innerHTML = `<span class="value--struck">${Utils.formatCurrency(r.originalPositionSize)}</span> ${Utils.formatCurrency(r.positionSize)}`;
      } else {
        this.elements.positionSize.textContent = Utils.formatCurrency(r.positionSize);
      }
    }
    // % of Account - show strikethrough if limited
    if (this.elements.positionPercent) {
      if (r.isLimited) {
        this.elements.positionPercent.innerHTML = `<span class="value--struck">${Utils.formatPercent(r.originalPercentOfAccount)}</span> ${Utils.formatPercent(r.percentOfAccount)} of account`;
      } else {
        this.elements.positionPercent.textContent = `${Utils.formatPercent(r.percentOfAccount)} of account`;
      }
    }
    if (this.elements.shares) this.elements.shares.textContent = Utils.formatNumber(r.shares);
    // Risk Amount - show strikethrough if limited
    if (this.elements.riskAmount) {
      if (r.isLimited) {
        this.elements.riskAmount.innerHTML = `<span class="value--struck">${Utils.formatCurrency(r.originalRiskDollars)}</span> ${Utils.formatCurrency(r.riskDollars)}`;
      } else {
        this.elements.riskAmount.textContent = Utils.formatCurrency(r.riskDollars);
      }
    }
    // Risk % - show strikethrough if limited
    if (this.elements.riskPercentDisplay) {
      if (r.isLimited) {
        this.elements.riskPercentDisplay.innerHTML = `<span class="value--struck">${Utils.formatPercent(r.originalRiskPercent)}</span> ${Utils.formatPercent(r.actualRiskPercent)} of account`;
      } else {
        this.elements.riskPercentDisplay.textContent = `${Utils.formatPercent(r.actualRiskPercent)} of account`;
      }
    }
    if (this.elements.stopDistance) this.elements.stopDistance.textContent = Utils.formatPercent(r.stopDistance);
    if (this.elements.stopPerShare) this.elements.stopPerShare.textContent = `${Utils.formatCurrency(r.stopPerShare)}/share`;
    if (this.elements.resultsTicker) this.elements.resultsTicker.textContent = `Ticker: ${ticker}`;

    // What If Section - Progressive Disclosure (profit or loss scenarios)
    if (r.rMultiple !== null && r.target) {
      const isProfit = r.profit >= 0;
      const colorClass = isProfit ? 'text-success' : 'text-danger';
      const sign = isProfit ? '+' : '-';

      // Show What If section
      if (this.elements.whatIfSection) this.elements.whatIfSection.classList.add('visible');
      if (this.elements.whatIfTargetPrice) {
        this.elements.whatIfTargetPrice.textContent = Utils.formatCurrency(r.target);
        this.elements.whatIfTargetPrice.className = `what-if__target-price ${colorClass}`;
      }
      if (this.elements.rMultiple) {
        this.elements.rMultiple.textContent = `${sign}${Math.abs(r.rMultiple).toFixed(2)}R`;
        this.elements.rMultiple.className = `what-if__stat-value ${colorClass}`;
      }
      if (this.elements.profitPerShare) {
        this.elements.profitPerShare.textContent = `${sign}${Utils.formatCurrency(Math.abs(r.targetProfitPerShare))}/sh`;
        this.elements.profitPerShare.className = `what-if__stat-value ${colorClass}`;
      }
      if (this.elements.potentialProfit) {
        this.elements.potentialProfit.textContent = `${sign}${Utils.formatCurrency(Math.abs(r.profit))}`;
        this.elements.potentialProfit.className = `what-if__stat-value ${colorClass}`;
      }
      if (this.elements.profitROI) {
        this.elements.profitROI.textContent = `${sign}${Utils.formatPercent(Math.abs(r.roi))}`;
        this.elements.profitROI.className = `what-if__stat-value ${colorClass}`;
      }
    } else {
      // Hide What If section
      if (this.elements.whatIfSection) this.elements.whatIfSection.classList.remove('visible');
    }

    Settings.updateAccountDisplay(AppState.account.currentSize);

    // Activate results panel glow
    if (r.shares > 0) {
      FocusManager.activateResults();
    }
  },

  renderEmptyResults() {
    const defaults = {
      positionSize: '$0.00', positionPercent: '0% of account', shares: '0',
      riskAmount: '$0.00', riskPercentDisplay: '0% of account', stopDistance: '0%',
      stopPerShare: '$0.00/share', resultsTicker: 'Ticker: —'
    };
    Object.entries(defaults).forEach(([key, value]) => {
      if (this.elements[key]) this.elements[key].textContent = value;
    });

    // Hide What If section
    if (this.elements.whatIfSection) this.elements.whatIfSection.classList.remove('visible');

    // Clear scenarios table
    if (this.elements.scenariosBody) {
      this.elements.scenariosBody.innerHTML = '';
    }

    // Hide R-progress bar
    if (this.elements.rProgressBar) {
      this.elements.rProgressBar.classList.remove('visible');
    }

    // Deactivate results panel glow
    FocusManager.deactivateResults();
  },

  renderScenarios(accountSize, entry, riskPerShare, maxPositionPercent) {
    if (!this.elements.scenariosBody) return;
    const riskLevels = [0.1, 0.25, 0.5, 1, 1.5];
    const currentRisk = AppState.account.riskPercent;
    const maxPosition = accountSize * (maxPositionPercent / 100);

    const rows = riskLevels.map(risk => {
      const riskDollars = accountSize * (risk / 100);
      let shares = Math.floor(riskDollars / riskPerShare);
      let positionSize = shares * entry;
      if (positionSize > maxPosition) {
        shares = Math.floor(maxPosition / entry);
        positionSize = shares * entry;
      }
      const actualRisk = shares * riskPerShare;
      const isActive = risk === currentRisk;
      return `<tr class="${isActive ? 'active' : ''}">
        <td>${Utils.formatPercent(risk, risk < 1 ? 2 : 1)}</td>
        <td>${Utils.formatNumber(shares)}</td>
        <td>${Utils.formatCurrency(positionSize)}</td>
        <td>${Utils.formatCurrency(actualRisk)}</td>
      </tr>`;
    }).join('');

    this.elements.scenariosBody.innerHTML = rows;
  },

  // R-Progress Bar rendering
  renderRProgressBar(entry, stop, shares, riskPerShare) {
    const bar = this.elements.rProgressBar;
    if (!bar) return;

    // Only show for valid long positions (entry > stop)
    if (!entry || !stop || stop >= entry || shares <= 0) {
      bar.classList.remove('visible');
      return;
    }

    // Calculate all R-multiple levels
    const levels = {
      stop: { price: stop, profit: -(riskPerShare * shares) },
      entry: { price: entry, profit: 0 },
      r1: { price: entry + (1 * riskPerShare), profit: 1 * riskPerShare * shares },
      r2: { price: entry + (2 * riskPerShare), profit: 2 * riskPerShare * shares },
      r3: { price: entry + (3 * riskPerShare), profit: 3 * riskPerShare * shares },
      r4: { price: entry + (4 * riskPerShare), profit: 4 * riskPerShare * shares },
      r5: { price: entry + (5 * riskPerShare), profit: 5 * riskPerShare * shares }
    };

    // Update DOM elements
    if (this.elements.rStopPrice) this.elements.rStopPrice.textContent = Utils.formatCurrency(levels.stop.price);
    if (this.elements.rStopProfit) this.elements.rStopProfit.textContent = Utils.formatCurrency(levels.stop.profit);
    if (this.elements.rEntryPrice) this.elements.rEntryPrice.textContent = Utils.formatCurrency(levels.entry.price);

    if (this.elements.r1RPrice) this.elements.r1RPrice.textContent = Utils.formatCurrency(levels.r1.price);
    if (this.elements.r1RProfit) this.elements.r1RProfit.textContent = `+${Utils.formatCurrency(levels.r1.profit)}`;

    if (this.elements.r2RPrice) this.elements.r2RPrice.textContent = Utils.formatCurrency(levels.r2.price);
    if (this.elements.r2RProfit) this.elements.r2RProfit.textContent = `+${Utils.formatCurrency(levels.r2.profit)}`;

    if (this.elements.r3RPrice) this.elements.r3RPrice.textContent = Utils.formatCurrency(levels.r3.price);
    if (this.elements.r3RProfit) this.elements.r3RProfit.textContent = `+${Utils.formatCurrency(levels.r3.profit)}`;

    if (this.elements.r4RPrice) this.elements.r4RPrice.textContent = Utils.formatCurrency(levels.r4.price);
    if (this.elements.r4RProfit) this.elements.r4RProfit.textContent = `+${Utils.formatCurrency(levels.r4.profit)}`;

    if (this.elements.r5RPrice) this.elements.r5RPrice.textContent = Utils.formatCurrency(levels.r5.price);
    if (this.elements.r5RProfit) this.elements.r5RProfit.textContent = `+${Utils.formatCurrency(levels.r5.profit)}`;

    // Show the progress bar with animation
    bar.classList.add('visible');
  },

  fillFromParsed(parsed) {
    if (parsed.ticker && this.elements.ticker) this.elements.ticker.value = parsed.ticker;
    if (parsed.entry && this.elements.entryPrice) this.elements.entryPrice.value = parsed.entry;
    if (parsed.stop && this.elements.stopLoss) this.elements.stopLoss.value = parsed.stop;
    if (parsed.target && this.elements.targetPrice) this.elements.targetPrice.value = parsed.target;
    if (parsed.riskPercent) {
      AppState.updateAccount({ riskPercent: parsed.riskPercent });
      // Update risk button active states
      document.querySelectorAll('.risk-btn').forEach(btn => {
        btn.classList.toggle('risk-btn--active', parseFloat(btn.dataset.risk) === parsed.riskPercent);
      });
      // If not a preset value, show in custom input
      if (this.elements.customRisk) {
        const isPreset = [0.1, 0.25, 0.5, 1].includes(parsed.riskPercent);
        this.elements.customRisk.value = isPreset ? '' : parsed.riskPercent;
      }
    }
    this.calculate();
  },

  setStopError(hasError) {
    if (this.elements.stopLoss) {
      this.elements.stopLoss.classList.toggle('input--error', hasError);
    }
  }
};

// ============================================
// Parser
// ============================================

const Parser = {
  elements: {},

  init() {
    this.cacheElements();
    this.bindEvents();
    this.setShortcutHint();
  },

  cacheElements() {
    this.elements = {
      alertCard: document.getElementById('alertCard'),
      pasteBtn: document.getElementById('pasteAlertBtn'),
      shortcutHint: document.getElementById('shortcutHint')
    };
  },

  bindEvents() {
    if (this.elements.pasteBtn) {
      this.elements.pasteBtn.addEventListener('click', () => this.pasteAndParse());
    }

    // Global keyboard shortcut: Cmd+V (Mac) or Ctrl+V (Windows/Linux)
    document.addEventListener('keydown', (e) => {
      // Check for Cmd+V (Mac) or Ctrl+V (Windows)
      const isPasteShortcut = (e.metaKey || e.ctrlKey) && e.key === 'v';
      if (!isPasteShortcut) return;

      // Don't intercept if user is typing in an input field
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );
      if (isTyping) return;

      // Prevent default paste and trigger our parser
      e.preventDefault();
      this.pasteAndParse();
    });
  },

  setShortcutHint() {
    if (!this.elements.shortcutHint) return;

    const textSpan = this.elements.shortcutHint.querySelector('.shortcut-text');
    const keySpan = this.elements.shortcutHint.querySelector('.drop-zone__key');

    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /iphone|ipad|ipod|android|mobile/.test(ua);
    const isMac = /mac/.test(navigator.platform.toLowerCase());

    if (isMobile) {
      // On mobile, simplify to just "Tap to paste"
      this.elements.shortcutHint.textContent = 'Tap to paste';
    } else if (textSpan) {
      textSpan.textContent = isMac ? '⌘V' : 'Ctrl+V';
    }
  },

  async pasteAndParse() {
    try {
      const text = await navigator.clipboard.readText();

      if (!text || !text.trim()) {
        this.flashButton('error');
        UI.showToast('Clipboard is empty', 'warning');
        return;
      }

      const parsed = this.parse(text);

      if (!parsed || (!parsed.ticker && !parsed.entry && !parsed.stop)) {
        this.flashButton('error');
        UI.showToast('Could not parse alert', 'warning');
        console.log('⚠️ Failed to parse clipboard text');
        return;
      }

      Calculator.fillFromParsed(parsed);

      const parts = [];
      if (parsed.ticker) parts.push(parsed.ticker);
      if (parsed.entry) parts.push(`@ $${parseFloat(parsed.entry).toFixed(2)}`);
      if (parsed.stop) parts.push(`SL $${parseFloat(parsed.stop).toFixed(2)}`);
      if (parsed.riskPercent) parts.push(`${parsed.riskPercent}%`);

      this.flashButton('success');
      UI.showToastTop(`Parsed: ${parts.join(' | ')}`, 'success', 3000);
      console.log(`🔍 Alert parsed: ${parts.join(' | ')}`);

      this.scrollToResultsOnMobile();
    } catch (err) {
      // Clipboard permission denied or not available
      this.flashButton('error');
      UI.showToast('Clipboard access denied. Try copying again.', 'error');
      console.error('📋 Clipboard error:', err);
    }
  },

  flashButton(type) {
    if (!this.elements.pasteBtn) return;
    const className = type === 'success' ? 'flash-success' : 'flash-error';
    this.elements.pasteBtn.classList.add(className);
    setTimeout(() => this.elements.pasteBtn.classList.remove(className), 1000);
  },

  parse(text) {
    if (!text) return null;
    const result = {};

    // Ticker MUST have $ prefix (e.g., $TSLA, $AXTI)
    const dollarTickerMatch = text.match(/\$([A-Z]{1,5})\b/i);
    if (dollarTickerMatch) {
      result.ticker = dollarTickerMatch[1].toUpperCase();
    }

    // Entry price: @ 243.10, adding @ 243, bought @ 243
    const entryMatch = text.match(/(?:@|entry|adding|add|bought?)\s*\$?\s*([\d.]+)/i);
    if (entryMatch) result.entry = parseFloat(entryMatch[1]);

    // Stop loss: sl 237.90, stop 237, stop loss @ 237.90
    const stopMatch = text.match(/(?:sl|stop(?:\s*loss)?)\s*@?\s*\$?\s*([\d.]+)/i);
    if (stopMatch) result.stop = parseFloat(stopMatch[1]);

    // Risk percent: risking 1%, risk 0.5%
    const riskMatch = text.match(/risk(?:ing)?\s*([\d.]+)\s*%/i);
    if (riskMatch) result.riskPercent = parseFloat(riskMatch[1]);

    // Target: target 260, tp 260, pt 260
    const targetMatch = text.match(/(?:target|tp|pt)\s*@?\s*\$?\s*([\d.]+)/i);
    if (targetMatch) result.target = parseFloat(targetMatch[1]);

    // Require at least entry AND stop for a valid alert
    if (!result.entry || !result.stop) {
      return null;
    }

    return result;
  },

  scrollToResultsOnMobile() {
    // Only scroll on mobile viewports (768px or less)
    if (window.innerWidth > 768) return;

    const resultsPanel = document.querySelector('.panel--results');
    if (!resultsPanel) return;

    // Delay to let the results panel become visible after FocusManager.activateResults()
    setTimeout(() => {
      const headerHeight = 60; // Account for fixed header
      const padding = 16; // Extra padding for visual breathing room
      const targetY = resultsPanel.getBoundingClientRect().top + window.scrollY - headerHeight - padding;

      window.scrollTo({
        top: targetY,
        behavior: 'smooth'
      });
    }, 100);
  }
};

// ============================================
// Trim Modal
// ============================================

const TrimModal = {
  elements: {},
  currentTrade: null,
  selectedR: 5,
  selectedTrimPercent: 100,

  init() {
    this.cacheElements();
    this.bindEvents();
  },

  cacheElements() {
    this.elements = {
      modal: document.getElementById('trimModal'),
      overlay: document.getElementById('trimModalOverlay'),
      closeBtn: document.getElementById('closeTrimModalBtn'),
      cancelBtn: document.getElementById('cancelTrimBtn'),
      confirmBtn: document.getElementById('confirmTrimBtn'),
      ticker: document.getElementById('trimModalTicker'),
      entryPrice: document.getElementById('trimEntryPrice'),
      stopLoss: document.getElementById('trimStopLoss'),
      riskPerShare: document.getElementById('trimRiskPerShare'),
      remainingShares: document.getElementById('trimRemainingShares'),
      exitPrice: document.getElementById('trimExitPrice'),
      rDisplay: document.getElementById('trimRDisplay'),
      customTrimPercent: document.getElementById('customTrimPercent'),
      dateInput: document.getElementById('trimDate'),
      sharesClosing: document.getElementById('trimSharesClosing'),
      sharesRemaining: document.getElementById('trimSharesRemaining'),
      profitPerShare: document.getElementById('trimProfitPerShare'),
      totalPnL: document.getElementById('trimTotalPnL'),
      preview: document.getElementById('trimPreview')
    };
  },

  bindEvents() {
    this.elements.closeBtn?.addEventListener('click', () => this.close());
    this.elements.cancelBtn?.addEventListener('click', () => this.close());
    this.elements.overlay?.addEventListener('click', () => this.close());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });

    this.elements.modal?.querySelectorAll('[data-r]').forEach(btn => {
      btn.addEventListener('click', (e) => this.selectR(e));
    });

    this.elements.modal?.querySelectorAll('[data-trim]').forEach(btn => {
      btn.addEventListener('click', (e) => this.selectTrimPercent(e));
    });

    this.elements.customTrimPercent?.addEventListener('input', () => this.handleCustomTrimPercent());
    this.elements.exitPrice?.addEventListener('input', () => this.handleManualExitPrice());
    this.elements.confirmBtn?.addEventListener('click', () => this.confirm());
  },

  setDefaultDate() {
    if (this.elements.dateInput) {
      this.elements.dateInput.value = new Date().toISOString().split('T')[0];
    }
  },

  open(tradeId) {
    const trade = AppState.journal.entries.find(e => e.id === tradeId);
    if (!trade) {
      UI.showToast('Trade not found', 'error');
      return;
    }

    this.currentTrade = trade;

    if (trade.originalShares === undefined || trade.originalShares === null) {
      trade.originalShares = trade.shares;
      trade.remainingShares = trade.shares;
      trade.trimHistory = [];
      trade.totalRealizedPnL = 0;
    }

    this.populateTradeData(trade);
    this.selectedR = 5;
    this.selectedTrimPercent = 100;
    this.setDefaultDate();

    this.elements.modal?.querySelectorAll('[data-r]').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.r) === this.selectedR);
    });
    this.elements.modal?.querySelectorAll('[data-trim]').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.trim) === this.selectedTrimPercent);
    });

    if (this.elements.customTrimPercent) this.elements.customTrimPercent.value = '';

    this.calculateExitPrice();
    this.calculatePreview();

    this.elements.modal?.classList.add('open');
    this.elements.overlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  close() {
    this.elements.modal?.classList.remove('open');
    this.elements.overlay?.classList.remove('open');
    document.body.style.overflow = '';
    this.currentTrade = null;
  },

  isOpen() {
    return this.elements.modal?.classList.contains('open') ?? false;
  },

  populateTradeData(trade) {
    const remainingShares = trade.remainingShares ?? trade.shares;
    const riskPerShare = trade.entry - trade.stop;

    if (this.elements.ticker) this.elements.ticker.textContent = trade.ticker;
    if (this.elements.entryPrice) this.elements.entryPrice.textContent = Utils.formatCurrency(trade.entry);
    if (this.elements.stopLoss) this.elements.stopLoss.textContent = Utils.formatCurrency(trade.stop);
    if (this.elements.riskPerShare) this.elements.riskPerShare.textContent = Utils.formatCurrency(riskPerShare);
    if (this.elements.remainingShares) this.elements.remainingShares.textContent = Utils.formatNumber(remainingShares);
  },

  selectR(e) {
    const btn = e.target.closest('[data-r]');
    if (!btn) return;

    this.selectedR = parseInt(btn.dataset.r);
    this.elements.modal?.querySelectorAll('[data-r]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    this.calculateExitPrice();
    this.calculatePreview();
  },

  selectTrimPercent(e) {
    const btn = e.target.closest('[data-trim]');
    if (!btn) return;

    this.selectedTrimPercent = parseInt(btn.dataset.trim);
    this.elements.modal?.querySelectorAll('[data-trim]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (this.elements.customTrimPercent) this.elements.customTrimPercent.value = '';
    this.calculatePreview();
  },

  handleCustomTrimPercent() {
    const value = parseFloat(this.elements.customTrimPercent?.value);
    if (!isNaN(value) && value > 0 && value <= 100) {
      this.selectedTrimPercent = value;
      this.elements.modal?.querySelectorAll('[data-trim]').forEach(b => b.classList.remove('active'));
      this.calculatePreview();
    }
  },

  handleManualExitPrice() {
    const exitPrice = parseFloat(this.elements.exitPrice?.value);
    if (!this.currentTrade || isNaN(exitPrice)) return;

    const riskPerShare = this.currentTrade.entry - this.currentTrade.stop;
    const rMultiple = riskPerShare !== 0 ? (exitPrice - this.currentTrade.entry) / riskPerShare : 0;

    if (this.elements.rDisplay) {
      this.elements.rDisplay.textContent = `(${rMultiple.toFixed(1)}R)`;
      this.elements.rDisplay.classList.toggle('negative', rMultiple < 0);
    }

    this.elements.modal?.querySelectorAll('[data-r]').forEach(b => b.classList.remove('active'));
    this.calculatePreview();
  },

  calculateExitPrice() {
    if (!this.currentTrade) return;

    const riskPerShare = this.currentTrade.entry - this.currentTrade.stop;
    const exitPrice = this.currentTrade.entry + (this.selectedR * riskPerShare);

    if (this.elements.exitPrice) this.elements.exitPrice.value = exitPrice.toFixed(2);
    if (this.elements.rDisplay) {
      this.elements.rDisplay.textContent = `(${this.selectedR}R)`;
      this.elements.rDisplay.classList.remove('negative');
    }
  },

  calculatePreview() {
    if (!this.currentTrade) return;

    const exitPrice = parseFloat(this.elements.exitPrice?.value) || 0;
    const remainingShares = this.currentTrade.remainingShares ?? this.currentTrade.shares;
    const sharesToClose = Math.floor(remainingShares * (this.selectedTrimPercent / 100));
    const sharesRemaining = remainingShares - sharesToClose;

    const profitPerShare = exitPrice - this.currentTrade.entry;
    const totalPnL = profitPerShare * sharesToClose;
    const isProfit = totalPnL >= 0;

    if (this.elements.sharesClosing) this.elements.sharesClosing.textContent = `${Utils.formatNumber(sharesToClose)} shares`;
    if (this.elements.sharesRemaining) this.elements.sharesRemaining.textContent = `(${Utils.formatNumber(sharesRemaining)} remaining)`;

    if (this.elements.profitPerShare) {
      this.elements.profitPerShare.textContent = `${isProfit ? '+' : ''}${Utils.formatCurrency(profitPerShare)}`;
      this.elements.profitPerShare.className = `trim-preview__value ${isProfit ? 'text-success' : 'text-danger'}`;
    }
    if (this.elements.totalPnL) {
      this.elements.totalPnL.textContent = `${isProfit ? '+' : ''}${Utils.formatCurrency(totalPnL)}`;
      this.elements.totalPnL.className = `trim-preview__value ${isProfit ? 'text-success' : 'text-danger'}`;
    }
    if (this.elements.preview) this.elements.preview.classList.toggle('negative', !isProfit);
  },

  confirm() {
    if (!this.currentTrade) return;

    const exitPrice = parseFloat(this.elements.exitPrice?.value);
    if (isNaN(exitPrice) || exitPrice <= 0) {
      UI.showToast('Please enter a valid exit price', 'error');
      return;
    }

    const remainingShares = this.currentTrade.remainingShares ?? this.currentTrade.shares;
    const sharesToClose = Math.floor(remainingShares * (this.selectedTrimPercent / 100));

    if (sharesToClose <= 0) {
      UI.showToast('No shares to close', 'error');
      return;
    }

    const sharesAfterTrim = remainingShares - sharesToClose;
    const riskPerShare = this.currentTrade.entry - this.currentTrade.stop;
    const rMultiple = riskPerShare !== 0 ? (exitPrice - this.currentTrade.entry) / riskPerShare : 0;
    const pnl = (exitPrice - this.currentTrade.entry) * sharesToClose;

    const closeDate = this.elements.dateInput?.value
      ? new Date(this.elements.dateInput.value + 'T12:00:00').toISOString()
      : new Date().toISOString();

    const trimEvent = {
      id: Date.now(),
      date: closeDate,
      shares: sharesToClose,
      exitPrice: exitPrice,
      rMultiple: rMultiple,
      pnl: pnl,
      percentTrimmed: this.selectedTrimPercent
    };

    if (!this.currentTrade.trimHistory) this.currentTrade.trimHistory = [];

    const isFullClose = sharesAfterTrim === 0;
    const newStatus = isFullClose ? 'closed' : 'trimmed';
    const existingPnL = this.currentTrade.totalRealizedPnL || 0;
    const newTotalPnL = existingPnL + pnl;

    const updates = {
      originalShares: this.currentTrade.originalShares ?? this.currentTrade.shares,
      remainingShares: sharesAfterTrim,
      status: newStatus,
      trimHistory: [...this.currentTrade.trimHistory, trimEvent],
      totalRealizedPnL: newTotalPnL
    };

    if (isFullClose) {
      updates.exitPrice = exitPrice;
      updates.exitDate = closeDate;
      updates.pnl = newTotalPnL;
    }

    AppState.updateJournalEntry(this.currentTrade.id, updates);
    AppState.updateAccount({ realizedPnL: AppState.account.realizedPnL + pnl });

    if (AppState.settings.dynamicAccountEnabled) {
      const newSize = AppState.settings.startingAccountSize + AppState.account.realizedPnL;
      AppState.updateAccount({ currentSize: newSize });
      AppState.emit('accountSizeChanged', newSize);
    }

    const actionText = isFullClose ? 'closed' : `trimmed ${this.selectedTrimPercent}%`;
    UI.showToast(
      `${this.currentTrade.ticker} ${actionText}: ${pnl >= 0 ? '+' : ''}${Utils.formatCurrency(pnl)}`,
      pnl >= 0 ? 'success' : 'warning'
    );

    this.close();
  }
};

// ============================================
// Journal
// ============================================

const Journal = {
  elements: {},

  init() {
    this.cacheElements();
    this.bindEvents();
    this.render();

    AppState.on('journalEntryAdded', () => this.render());
    AppState.on('journalEntryUpdated', () => this.render());
    AppState.on('journalEntryDeleted', () => this.render());
  },

  cacheElements() {
    this.elements = {
      tradeNotes: document.getElementById('tradeNotes'),
      logTradeBtn: document.getElementById('logTradeBtn'),
      activeTrades: document.getElementById('activeTrades'),
      activeTradeCount: document.getElementById('activeTradeCount'),
      riskSummary: document.getElementById('riskSummary'),
      journalModal: document.getElementById('journalModal'),
      journalModalOverlay: document.getElementById('journalModalOverlay'),
      closeJournalBtn: document.getElementById('closeJournalBtn'),
      viewJournalBtn: document.getElementById('viewJournalBtn'),
      journalTableBody: document.getElementById('journalTableBody'),
      journalSummaryText: document.getElementById('journalSummaryText')
    };
  },

  bindEvents() {
    if (this.elements.logTradeBtn) {
      this.elements.logTradeBtn.addEventListener('click', (e) => {
        // Shift+Click bypasses wizard for power users
        if (e.shiftKey || !AppState.journalMeta.settings.wizardEnabled) {
          this.directLogTrade();
        } else {
          Wizard.open();
        }
      });
      // Add tooltip hint for Shift+Click bypass
      this.elements.logTradeBtn.title = 'Shift+Click to save without wizard';
    }
    if (this.elements.viewJournalBtn) {
      this.elements.viewJournalBtn.addEventListener('click', () => this.openModal());
    }
    if (this.elements.closeJournalBtn) {
      this.elements.closeJournalBtn.addEventListener('click', () => this.closeModal());
    }
    if (this.elements.journalModalOverlay) {
      this.elements.journalModalOverlay.addEventListener('click', () => this.closeModal());
    }

    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.renderTable(e.target.dataset.filter);
      });
    });

    window.closeTrade = (id) => this.closeTrade(id);
    window.deleteTrade = (id) => this.deleteTrade(id);
  },

  // Direct save without wizard (used for Shift+Click or when wizard disabled)
  directLogTrade() {
    const results = AppState.results;
    const trade = AppState.trade;

    if (!results.shares || results.shares === 0) {
      UI.showToast('Enter a valid trade to log', 'warning');
      return;
    }

    const entry = {
      ticker: trade.ticker || 'UNKNOWN',
      entry: trade.entry,
      stop: trade.stop,
      target: trade.target,
      shares: results.shares,
      positionSize: results.positionSize,
      riskDollars: results.riskDollars,
      riskPercent: AppState.account.riskPercent,
      stopDistance: results.stopDistance,
      notes: this.elements.tradeNotes?.value || '',
      status: 'open',
      exitPrice: null,
      exitDate: null,
      pnl: null,
      // Thesis fields (null for direct save)
      thesis: null,
      wizardComplete: false,
      wizardSkipped: []
    };

    const newEntry = AppState.addJournalEntry(entry);
    if (this.elements.tradeNotes) this.elements.tradeNotes.value = '';

    // Update progress stats
    const progress = AppState.journalMeta.achievements.progress;
    progress.totalTrades++;
    if (entry.notes) {
      progress.tradesWithNotes++;
    }
    AppState.updateStreak();
    AppState.saveJournalMeta();

    // Emit trade logged event for achievements
    AppState.emit('tradeLogged', { entry: newEntry, wizardComplete: false, thesis: null });

    // Show success toast with rotating messages
    const messages = [
      "Trade logged! Good luck!",
      "Nice setup! Tracked.",
      "You're on a roll! Trade saved.",
      "Disciplined trader! Logged.",
      "Trade captured! Let's go!"
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];
    UI.showToast(message, 'success');
    SoundFX.playSuccess();
    console.log(`📝 Trade logged: ${entry.ticker} | ${entry.shares} shares @ $${entry.entry} | Risk: $${entry.riskDollars.toFixed(2)}`);

    // Trigger confetti and celebration sound if celebrations enabled
    if (AppState.journalMeta.settings.celebrationsEnabled) {
      AppState.emit('triggerConfetti');
      SoundFX.playCelebration();
    }

    // Stop pulsing after trade is saved
    FocusManager.stopPulse();
  },

  closeTrade(id) {
    // Open trim modal instead of browser prompt
    TrimModal.open(id);
  },

  deleteTrade(id) {
    if (!confirm('Delete this trade?')) return;
    const entry = AppState.journal.entries.find(e => e.id === id);
    const deleted = AppState.deleteJournalEntry(id);
    if (deleted) {
      UI.showToast('Trade deleted', 'success');
      console.log(`🗑️ Trade deleted: ${entry?.ticker || 'Unknown'}`);
    }
  },

  render() {
    this.renderActiveTrades();
    this.renderRiskSummary();
    this.renderStreak();
  },

  renderActiveTrades() {
    // Include both open and trimmed trades (they still have positions)
    const activeTrades = AppState.journal.entries.filter(e => e.status === 'open' || e.status === 'trimmed');
    if (this.elements.activeTradeCount) {
      this.elements.activeTradeCount.textContent = `${activeTrades.length} active`;
    }
    if (!this.elements.activeTrades) return;

    if (activeTrades.length === 0) {
      this.elements.activeTrades.innerHTML = `
        <div class="empty-state">
          <span class="empty-state__icon">🧘</span>
          <span class="empty-state__text">No active trades</span>
          <span class="empty-state__hint">Log a trade to see it here</span>
        </div>`;
      return;
    }

    this.elements.activeTrades.innerHTML = activeTrades.slice(0, 5).map(trade => {
      const shares = trade.remainingShares ?? trade.shares;
      const riskPerShare = trade.entry - trade.stop;
      const currentRisk = shares * riskPerShare;
      const isTrimmed = trade.status === 'trimmed';
      const realizedPnL = trade.totalRealizedPnL || 0;

      return `
        <div class="trade-card" data-id="${trade.id}">
          <div class="trade-card__header">
            <span class="trade-card__ticker">${trade.ticker}</span>
            <span class="trade-card__shares">${shares} shares${isTrimmed ? ` (${trade.originalShares} orig)` : ''}</span>
          </div>
          <div class="trade-card__details">
            <div class="trade-card__detail">
              <span class="trade-card__label">Entry</span>
              <span class="trade-card__value">${Utils.formatCurrency(trade.entry)}</span>
            </div>
            <div class="trade-card__detail">
              <span class="trade-card__label">Stop</span>
              <span class="trade-card__value">${Utils.formatCurrency(trade.stop)}</span>
            </div>
            <div class="trade-card__detail">
              <span class="trade-card__label">Risk</span>
              <span class="trade-card__value">${Utils.formatCurrency(currentRisk)}</span>
            </div>
            <div class="trade-card__detail">
              <span class="trade-card__label">Status</span>
              <span class="status-badge status-badge--${trade.status}">${isTrimmed ? 'Trimmed' : 'Open'}</span>
            </div>
            ${isTrimmed ? `
            <div class="trade-card__detail">
              <span class="trade-card__label">Realized</span>
              <span class="trade-card__value ${realizedPnL >= 0 ? 'text-success' : 'text-danger'}">${realizedPnL >= 0 ? '+' : ''}${Utils.formatCurrency(realizedPnL)}</span>
            </div>
            ` : ''}
          </div>
          <div class="trade-card__actions">
            <button class="btn btn--sm btn--secondary" onclick="closeTrade(${trade.id})">${isTrimmed ? 'Trim More' : 'Close'}</button>
            <button class="btn btn--sm btn--ghost" onclick="deleteTrade(${trade.id})">Delete</button>
          </div>
        </div>`;
    }).join('');
  },

  renderRiskSummary() {
    if (!this.elements.riskSummary) return;
    // Include both open and trimmed trades (they still have positions at risk)
    const activeTrades = AppState.journal.entries.filter(e => e.status === 'open' || e.status === 'trimmed');

    // Show CASH status when no active trades
    if (activeTrades.length === 0) {
      this.elements.riskSummary.innerHTML = `
        <span class="risk-summary__label">Status:</span>
        <span class="risk-summary__indicator risk-summary__indicator--low">CASH</span>`;
      return;
    }

    // Calculate risk based on remaining shares
    const totalRisk = activeTrades.reduce((sum, t) => {
      const shares = t.remainingShares ?? t.shares;
      const riskPerShare = t.entry - t.stop;
      return sum + (shares * riskPerShare);
    }, 0);
    const riskPercent = (totalRisk / AppState.account.currentSize) * 100;

    let level = 'low';
    if (riskPercent > 2) level = 'high';
    else if (riskPercent > 0.5) level = 'medium';

    this.elements.riskSummary.innerHTML = `
      <span class="risk-summary__label">Open Risk:</span>
      <span class="risk-summary__value">${Utils.formatCurrency(totalRisk)}</span>
      <span class="risk-summary__percent">(${Utils.formatPercent(riskPercent)})</span>
      <span class="risk-summary__indicator risk-summary__indicator--${level}">${level.toUpperCase()}</span>`;
  },

  renderStreak() {
    const streakDisplay = document.getElementById('streakDisplay');
    const streakText = document.getElementById('streakText');
    if (!streakDisplay || !streakText) return;

    const streak = AppState.journalMeta.achievements.progress.currentStreak;

    if (streak === 0) {
      streakDisplay.style.display = 'none';
      return;
    }

    streakDisplay.style.display = 'flex';
    streakText.textContent = streak === 1 ? '1 day streak' : `${streak} day streak`;

    // Set data attribute for CSS styling intensity
    if (streak >= 7) {
      streakDisplay.setAttribute('data-streak', '7+');
    } else if (streak >= 3) {
      streakDisplay.setAttribute('data-streak', '3-6');
    } else {
      streakDisplay.setAttribute('data-streak', '1-2');
    }
  },

  openModal() {
    this.elements.journalModal?.classList.add('open');
    this.elements.journalModalOverlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
    AppState.setUI('journalOpen', true);
    this.renderTable();
  },

  closeModal() {
    this.elements.journalModal?.classList.remove('open');
    this.elements.journalModalOverlay?.classList.remove('open');
    document.body.style.overflow = '';
    AppState.setUI('journalOpen', false);
  },

  renderTable(filter = 'all') {
    if (!this.elements.journalTableBody) return;
    const trades = AppState.getFilteredEntries(filter);

    if (trades.length === 0) {
      this.elements.journalTableBody.innerHTML = `
        <tr class="journal-empty">
          <td colspan="9">No trades ${filter !== 'all' ? 'with status "' + filter + '"' : 'logged yet'}</td>
        </tr>`;
      if (this.elements.journalSummaryText) this.elements.journalSummaryText.textContent = '0 trades';
      return;
    }

    this.elements.journalTableBody.innerHTML = trades.map(trade => {
      const date = Utils.formatDate(trade.timestamp);
      const isTrimmed = trade.status === 'trimmed';

      // Use totalRealizedPnL for trimmed/closed trades, fallback to pnl for legacy
      const pnlValue = trade.totalRealizedPnL ?? trade.pnl;
      const pnlDisplay = pnlValue !== null && pnlValue !== undefined
        ? `<span class="${pnlValue >= 0 ? 'text-success' : 'text-danger'}">${pnlValue >= 0 ? '+' : ''}${Utils.formatCurrency(pnlValue)}</span>`
        : '—';

      // Show remaining shares for trimmed trades
      const sharesDisplay = isTrimmed
        ? `${trade.remainingShares}/${trade.originalShares}`
        : trade.shares;

      return `
        <tr data-id="${trade.id}">
          <td>${date}</td>
          <td>${trade.ticker}</td>
          <td>${Utils.formatCurrency(trade.entry)}</td>
          <td>${Utils.formatCurrency(trade.stop)}</td>
          <td>${sharesDisplay}</td>
          <td>${Utils.formatCurrency(trade.riskDollars)}</td>
          <td><span class="status-badge status-badge--${trade.status}">${trade.status}</span></td>
          <td>${pnlDisplay}</td>
          <td><button class="btn btn--ghost btn--sm" onclick="deleteTrade(${trade.id})">×</button></td>
        </tr>`;
    }).join('');

    // Summary - use totalRealizedPnL for accurate counting
    const getPnL = (t) => t.totalRealizedPnL ?? t.pnl ?? 0;
    const wins = trades.filter(t => getPnL(t) > 0).length;
    const losses = trades.filter(t => getPnL(t) < 0).length;
    const open = trades.filter(t => t.status === 'open').length;
    const trimmed = trades.filter(t => t.status === 'trimmed').length;
    const totalPnL = trades.reduce((sum, t) => sum + getPnL(t), 0);

    if (this.elements.journalSummaryText) {
      const activeCount = open + trimmed;
      this.elements.journalSummaryText.textContent =
        `${trades.length} trades | ${wins}W-${losses}L-${activeCount}A | ${totalPnL >= 0 ? '+' : ''}${Utils.formatCurrency(totalPnL)}`;
    }
  }
};

// ============================================
// Data Manager
// ============================================

const DataManager = {
  exportAllData() {
    const data = {
      version: 1,
      exportDate: new Date().toISOString(),
      settings: AppState.settings,
      journal: AppState.journal.entries,
      account: {
        realizedPnL: AppState.account.realizedPnL
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    UI.showToast('Data exported successfully', 'success');
    console.log(`💾 Data exported: ${data.journal.length} trades`);
  },

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);

          if (!data.settings || !data.journal) {
            UI.showToast('Invalid backup file format', 'error');
            return;
          }

          // Restore settings
          Object.assign(AppState.state.settings, data.settings);
          AppState.saveSettings();

          // Restore journal
          AppState.state.journal.entries = data.journal || [];
          AppState.saveJournal();

          // Restore account P&L
          if (data.account) {
            AppState.state.account.realizedPnL = data.account.realizedPnL || 0;
          }

          // Recalculate current account size
          if (AppState.settings.dynamicAccountEnabled) {
            AppState.state.account.currentSize =
              AppState.settings.startingAccountSize + AppState.account.realizedPnL;
          } else {
            AppState.state.account.currentSize = AppState.settings.startingAccountSize;
          }

          // Refresh UI
          Settings.loadAndApply();
          Calculator.calculate();
          Journal.render();

          UI.showToast(`Imported ${data.journal.length} trades`, 'success');
          console.log(`📥 Data imported: ${data.journal.length} trades from backup`);
        } catch (err) {
          console.error('❌ Import error:', err);
          UI.showToast('Failed to import data', 'error');
        }
      };
      reader.readAsText(file);
    });

    input.click();
  },

  clearAllData() {
    ClearDataModal.open();
  },

  confirmClearAllData() {
    // Clear localStorage
    localStorage.removeItem('riskCalcSettings');
    localStorage.removeItem('riskCalcJournal');
    localStorage.removeItem('riskCalcJournalMeta');

    // Reset state
    AppState.state.settings = {
      startingAccountSize: 10000,
      defaultRiskPercent: 1,
      defaultMaxPositionPercent: 100,
      dynamicAccountEnabled: true,
      theme: AppState.settings.theme, // Keep theme
      sarMember: true
    };
    AppState.state.account = {
      currentSize: 10000,
      realizedPnL: 0,
      riskPercent: 1,
      maxPositionPercent: 100
    };
    AppState.state.journal.entries = [];

    // Reset achievements & progress
    AppState.state.journalMeta = {
      achievements: {
        unlocked: [],
        progress: {
          totalTrades: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastTradeDate: null,
          tradesWithNotes: 0,
          tradesWithThesis: 0,
          completeWizardCount: 0
        }
      },
      settings: {
        wizardEnabled: false,
        celebrationsEnabled: true
      },
      schemaVersion: 1
    };

    // Refresh UI
    Settings.loadAndApply();
    Calculator.calculate();
    Journal.render();

    ClearDataModal.close();
    UI.showToast('All data cleared', 'success');
    console.log('⚠️ All data cleared - reset to defaults');
  },

  exportCSV() {
    const trades = AppState.journal.entries;
    if (trades.length === 0) {
      UI.showToast('No trades to export', 'warning');
      return;
    }

    const headers = ['Date', 'Ticker', 'Entry', 'Stop', 'Target', 'Shares', 'Position Size', 'Risk $', 'Risk %', 'Status', 'Exit Price', 'P&L', 'Notes'];
    const rows = trades.map(t => [
      new Date(t.timestamp).toLocaleDateString(),
      t.ticker,
      t.entry,
      t.stop,
      t.target || '',
      t.shares,
      t.positionSize?.toFixed(2) || '',
      t.riskDollars?.toFixed(2) || '',
      t.riskPercent,
      t.status,
      t.exitPrice || '',
      t.pnl?.toFixed(2) || '',
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    this.downloadFile(csv, 'trades.csv', 'text/csv');
    UI.showToast('CSV exported', 'success');
  },

  exportTSV() {
    const trades = AppState.journal.entries;
    if (trades.length === 0) {
      UI.showToast('No trades to export', 'warning');
      return;
    }

    const headers = ['Date', 'Ticker', 'Entry', 'Stop', 'Target', 'Shares', 'Position Size', 'Risk $', 'Risk %', 'Status', 'Exit Price', 'P&L', 'Notes'];
    const rows = trades.map(t => [
      new Date(t.timestamp).toLocaleDateString(),
      t.ticker,
      t.entry,
      t.stop,
      t.target || '',
      t.shares,
      t.positionSize?.toFixed(2) || '',
      t.riskDollars?.toFixed(2) || '',
      t.riskPercent,
      t.status,
      t.exitPrice || '',
      t.pnl?.toFixed(2) || '',
      (t.notes || '').replace(/\t/g, ' ')
    ]);

    const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    this.downloadFile(tsv, 'trades.tsv', 'text/tab-separated-values');
    UI.showToast('TSV exported', 'success');
  },

  copyCSV() {
    const trades = AppState.journal.entries;
    if (trades.length === 0) {
      UI.showToast('No trades to copy', 'warning');
      return;
    }

    const headers = ['Date', 'Ticker', 'Entry', 'Stop', 'Shares', 'Risk $', 'Status', 'P&L'];
    const rows = trades.map(t => [
      new Date(t.timestamp).toLocaleDateString(),
      t.ticker,
      t.entry,
      t.stop,
      t.shares,
      t.riskDollars?.toFixed(2) || '',
      t.status,
      t.pnl?.toFixed(2) || ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    navigator.clipboard.writeText(csv).then(() => {
      UI.showToast('CSV copied to clipboard', 'success');
    }).catch(() => {
      UI.showToast('Failed to copy', 'error');
    });
  },

  copyTSV() {
    const trades = AppState.journal.entries;
    if (trades.length === 0) {
      UI.showToast('No trades to copy', 'warning');
      return;
    }

    const headers = ['Date', 'Ticker', 'Entry', 'Stop', 'Shares', 'Risk $', 'Status', 'P&L'];
    const rows = trades.map(t => [
      new Date(t.timestamp).toLocaleDateString(),
      t.ticker,
      t.entry,
      t.stop,
      t.shares,
      t.riskDollars?.toFixed(2) || '',
      t.status,
      t.pnl?.toFixed(2) || ''
    ]);

    const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      UI.showToast('TSV copied to clipboard (paste into Excel)', 'success');
    }).catch(() => {
      UI.showToast('Failed to copy', 'error');
    });
  },

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

// ============================================
// Settings
// ============================================

const Settings = {
  elements: {},

  init() {
    this.cacheElements();
    this.bindEvents();
    this.loadAndApply();
  },

  cacheElements() {
    this.elements = {
      settingsPanel: document.getElementById('settingsPanel'),
      settingsOverlay: document.getElementById('settingsOverlay'),
      settingsBtn: document.getElementById('settingsBtn'),
      closeSettingsBtn: document.getElementById('closeSettingsBtn'),
      settingsAccountSize: document.getElementById('settingsAccountSize'),
      dynamicAccountToggle: document.getElementById('dynamicAccountToggle'),
      resetAccountBtn: document.getElementById('resetAccountBtn'),
      summaryStarting: document.getElementById('summaryStarting'),
      summaryPnL: document.getElementById('summaryPnL'),
      summaryCurrent: document.getElementById('summaryCurrent'),
      accountSize: document.getElementById('accountSize'),
      riskPercent: document.getElementById('riskPercent'),
      maxPositionPercent: document.getElementById('maxPositionPercent'),
      headerAccountValue: document.querySelector('.header__account-value'),
      themeBtn: document.getElementById('themeBtn'),
      // Data management buttons
      exportDataBtn: document.getElementById('exportDataBtn'),
      importDataBtn: document.getElementById('importDataBtn'),
      clearDataBtn: document.getElementById('clearDataBtn'),
      // Journal export buttons
      exportCSVBtn: document.getElementById('exportCSVBtn'),
      exportTSVBtn: document.getElementById('exportTSVBtn'),
      exportPDFBtn: document.getElementById('exportPDFBtn'),
      journalCopyCSV: document.getElementById('journalCopyCSV'),
      journalCopyTSV: document.getElementById('journalCopyTSV'),
      journalDownload: document.getElementById('journalDownload'),
      // SAR Member toggle
      sarMemberToggle: document.getElementById('sarMemberToggle'),
      discordDropZone: document.getElementById('discordDropZone'),
      welcomeDiscordHint: document.querySelector('.welcome-card__hint-discord'),
      // Journal/Wizard settings
      wizardEnabledToggle: document.getElementById('wizardEnabledToggle'),
      celebrationsToggle: document.getElementById('celebrationsToggle'),
      soundToggle: document.getElementById('soundToggle')
    };
  },

  bindEvents() {
    if (this.elements.settingsBtn) {
      this.elements.settingsBtn.addEventListener('click', () => this.open());
    }
    if (this.elements.closeSettingsBtn) {
      this.elements.closeSettingsBtn.addEventListener('click', () => this.close());
    }
    if (this.elements.settingsOverlay) {
      this.elements.settingsOverlay.addEventListener('click', () => this.close());
    }
    if (this.elements.themeBtn) {
      this.elements.themeBtn.addEventListener('click', () => this.toggleTheme());
    }
    if (this.elements.settingsAccountSize) {
      const syncAccountSize = (value) => {
        AppState.updateSettings({ startingAccountSize: value });
        AppState.updateAccount({ currentSize: value });
        this.updateSummary();
        if (this.elements.accountSize) {
          this.elements.accountSize.value = Utils.formatWithCommas(value);
        }
        this.updateAccountDisplay(value);
        SettingsToggle.updateSummary(value, AppState.account.maxPositionPercent);
        Calculator.calculate();
      };

      this.elements.settingsAccountSize.addEventListener('input', (e) => {
        const inputValue = e.target.value.trim();

        // Instant format when K/M notation is used
        if (inputValue && (inputValue.toLowerCase().includes('k') || inputValue.toLowerCase().includes('m'))) {
          const converted = Utils.parseNumber(inputValue);
          if (converted !== null) {
            const cursorPosition = e.target.selectionStart;
            const originalLength = e.target.value.length;
            e.target.value = Utils.formatWithCommas(converted);
            const newLength = e.target.value.length;
            const newCursorPosition = Math.max(0, cursorPosition + (newLength - originalLength));
            e.target.setSelectionRange(newCursorPosition, newCursorPosition);
            syncAccountSize(converted);
          }
        }
      });

      this.elements.settingsAccountSize.addEventListener('blur', (e) => {
        const value = Utils.parseNumber(e.target.value);
        if (value) {
          e.target.value = Utils.formatWithCommas(value);
          syncAccountSize(value);
        }
      });

      this.elements.settingsAccountSize.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const value = Utils.parseNumber(e.target.value);
          if (value) {
            e.target.value = Utils.formatWithCommas(value);
            syncAccountSize(value);
          }
          e.target.blur();
        }
      });
    }
    if (this.elements.dynamicAccountToggle) {
      this.elements.dynamicAccountToggle.addEventListener('change', (e) => {
        AppState.updateSettings({ dynamicAccountEnabled: e.target.checked });
      });
    }
    if (this.elements.resetAccountBtn) {
      this.elements.resetAccountBtn.addEventListener('click', () => this.resetAccount());
    }
    if (this.elements.settingsPanel) {
      this.elements.settingsPanel.addEventListener('click', (e) => this.handlePresetClick(e));
    }

    // Data management buttons
    if (this.elements.exportDataBtn) {
      this.elements.exportDataBtn.addEventListener('click', () => DataManager.exportAllData());
    }
    if (this.elements.importDataBtn) {
      this.elements.importDataBtn.addEventListener('click', () => DataManager.importData());
    }
    if (this.elements.clearDataBtn) {
      this.elements.clearDataBtn.addEventListener('click', () => DataManager.clearAllData());
    }

    // Journal export buttons (in journal panel)
    if (this.elements.exportCSVBtn) {
      this.elements.exportCSVBtn.addEventListener('click', () => DataManager.exportCSV());
    }
    if (this.elements.exportTSVBtn) {
      this.elements.exportTSVBtn.addEventListener('click', () => DataManager.exportTSV());
    }
    if (this.elements.exportPDFBtn) {
      this.elements.exportPDFBtn.addEventListener('click', () => {
        UI.showToast('PDF export coming soon. Use CSV for now.', 'warning');
      });
    }

    // Journal modal buttons
    if (this.elements.journalCopyCSV) {
      this.elements.journalCopyCSV.addEventListener('click', () => DataManager.copyCSV());
    }
    if (this.elements.journalCopyTSV) {
      this.elements.journalCopyTSV.addEventListener('click', () => DataManager.copyTSV());
    }
    if (this.elements.journalDownload) {
      this.elements.journalDownload.addEventListener('click', () => DataManager.exportCSV());
    }

    // SAR Member toggle
    if (this.elements.sarMemberToggle) {
      this.elements.sarMemberToggle.addEventListener('change', (e) => {
        this.toggleDiscordDropZone(e.target.checked);
        AppState.updateSettings({ sarMember: e.target.checked });
      });
    }

    // Journal/Wizard toggles
    if (this.elements.wizardEnabledToggle) {
      this.elements.wizardEnabledToggle.addEventListener('change', (e) => {
        AppState.updateJournalMetaSettings({ wizardEnabled: e.target.checked });
        this.updateWizardHint(e.target.checked);
      });
    }
    if (this.elements.celebrationsToggle) {
      this.elements.celebrationsToggle.addEventListener('change', (e) => {
        AppState.updateJournalMetaSettings({ celebrationsEnabled: e.target.checked });
      });
    }
    if (this.elements.soundToggle) {
      this.elements.soundToggle.addEventListener('change', (e) => {
        AppState.updateJournalMetaSettings({ soundEnabled: e.target.checked });
        // Play a test sound when enabling
        if (e.target.checked) {
          SoundFX.playClick();
        }
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.elements.settingsPanel?.classList.contains('open')) this.close();
        if (Journal.elements.journalModal?.classList.contains('open')) Journal.closeModal();
      }
    });
  },

  handlePresetClick(e) {
    const btn = e.target.closest('.preset-btn[data-setting]');
    if (!btn) return;

    const setting = btn.dataset.setting;
    const value = btn.dataset.value;
    const group = btn.closest('.preset-group');

    group.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (setting === 'defaultRisk') {
      AppState.updateSettings({ defaultRiskPercent: parseFloat(value) });
    } else if (setting === 'defaultMaxPos') {
      AppState.updateSettings({ defaultMaxPositionPercent: parseFloat(value) });
    } else if (setting === 'theme') {
      document.documentElement.dataset.theme = value;
      AppState.updateSettings({ theme: value });
      localStorage.setItem('theme', value);
    }
  },

  loadAndApply() {
    AppState.loadSettings();
    AppState.loadJournal();
    AppState.loadJournalMeta();

    // Recalculate progress from existing entries (handles upgrades/migrations)
    if (AppState.journal.entries.length > 0) {
      AppState.recalculateProgress();
    }

    // Theme is already set by preload script in HTML head. Just sync AppState.
    const theme = document.documentElement.dataset.theme || 'dark';
    AppState.updateSettings({ theme });

    if (this.elements.settingsAccountSize) {
      this.elements.settingsAccountSize.value = Utils.formatWithCommas(AppState.settings.startingAccountSize);
    }
    if (this.elements.dynamicAccountToggle) {
      this.elements.dynamicAccountToggle.checked = AppState.settings.dynamicAccountEnabled;
    }
    if (this.elements.accountSize) {
      this.elements.accountSize.value = Utils.formatWithCommas(AppState.account.currentSize);
    }
    if (this.elements.riskPercent) {
      this.elements.riskPercent.value = AppState.settings.defaultRiskPercent;
    }
    if (this.elements.maxPositionPercent) {
      this.elements.maxPositionPercent.value = AppState.settings.defaultMaxPositionPercent;
    }

    // SAR Member toggle (default true)
    const isSarMember = AppState.settings.sarMember !== false;
    if (this.elements.sarMemberToggle) {
      this.elements.sarMemberToggle.checked = isSarMember;
    }
    this.toggleDiscordDropZone(isSarMember);

    // Journal/Wizard toggles
    if (this.elements.wizardEnabledToggle) {
      this.elements.wizardEnabledToggle.checked = AppState.journalMeta.settings.wizardEnabled;
    }
    if (this.elements.celebrationsToggle) {
      this.elements.celebrationsToggle.checked = AppState.journalMeta.settings.celebrationsEnabled;
    }
    if (this.elements.soundToggle) {
      this.elements.soundToggle.checked = AppState.journalMeta.settings.soundEnabled;
    }

    // Show/hide wizard hint based on setting
    this.updateWizardHint(AppState.journalMeta.settings.wizardEnabled);

    this.updateAccountDisplay(AppState.account.currentSize);
  },

  updateWizardHint(wizardEnabled) {
    const hint = document.getElementById('wizardHint');
    if (hint) {
      hint.style.display = wizardEnabled ? 'block' : 'none';
    }
  },

  toggleDiscordDropZone(show) {
    if (this.elements.discordDropZone) {
      this.elements.discordDropZone.style.display = show ? '' : 'none';
    }
    if (this.elements.welcomeDiscordHint) {
      this.elements.welcomeDiscordHint.style.display = show ? '' : 'none';
    }
  },

  toggleTheme() {
    const html = document.documentElement;
    const current = html.dataset.theme || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';

    // Enable smooth transition, then switch theme
    html.classList.add('theme-transitioning');
    html.dataset.theme = next;
    AppState.updateSettings({ theme: next });
    localStorage.setItem('theme', next);

    // Remove transition class after animation completes
    setTimeout(() => html.classList.remove('theme-transitioning'), 400);
    console.log(`🎨 Theme changed to: ${next}`);
  },

  open() {
    this.elements.settingsPanel?.classList.add('open');
    this.elements.settingsOverlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
    AppState.setUI('settingsOpen', true);
    this.updateSummary();
  },

  close() {
    this.elements.settingsPanel?.classList.remove('open');
    this.elements.settingsOverlay?.classList.remove('open');
    document.body.style.overflow = '';
    AppState.setUI('settingsOpen', false);
  },

  updateSummary() {
    const starting = AppState.settings.startingAccountSize;
    const pnl = AppState.account.realizedPnL;
    const current = starting + pnl;

    if (this.elements.summaryStarting) this.elements.summaryStarting.textContent = Utils.formatCurrency(starting);
    if (this.elements.summaryPnL) {
      this.elements.summaryPnL.textContent = (pnl >= 0 ? '+' : '') + Utils.formatCurrency(pnl);
      this.elements.summaryPnL.className = 'account-summary__value ' +
        (pnl >= 0 ? 'account-summary__value--success' : 'account-summary__value--danger');
    }
    if (this.elements.summaryCurrent) this.elements.summaryCurrent.textContent = Utils.formatCurrency(current);
  },

  updateAccountDisplay(size) {
    if (this.elements.headerAccountValue) {
      const newText = Utils.formatCurrency(size);
      if (this.elements.headerAccountValue.textContent !== newText) {
        this.elements.headerAccountValue.textContent = newText;
        UI.flashHeaderAccount();
      }
    }
    if (this.elements.accountSize) {
      this.elements.accountSize.value = Utils.formatWithCommas(size);
    }
  },

  resetAccount() {
    AppState.updateAccount({
      realizedPnL: 0,
      currentSize: AppState.settings.startingAccountSize
    });
    this.updateAccountDisplay(AppState.account.currentSize);
    this.updateSummary();
    Calculator.calculate();
    UI.showToast('Account reset to starting balance', 'success');
  }
};

// ============================================
// Settings Card Toggle
// ============================================

const SettingsToggle = {
  card: null,
  toggle: null,
  summary: null,

  init() {
    this.card = document.getElementById('settingsCard');
    this.toggle = document.getElementById('settingsToggle');
    this.summary = document.getElementById('settingsSummary');

    if (this.toggle && this.card) {
      this.toggle.addEventListener('click', () => this.handleToggle());
    }
  },

  handleToggle() {
    this.card.classList.toggle('open');
  },

  updateSummary(accountSize, maxPosition) {
    if (!this.summary) return;

    const formatAccount = (val) => {
      if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}m`.replace('.0m', 'm');
      if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
      return `$${val}`;
    };

    this.summary.textContent = `${formatAccount(accountSize)} acc. · Max ${maxPosition}%`;
  }
};

// ============================================
// Focus Manager
// ============================================

const FocusManager = {
  heroCard: null,
  primaryResultCards: null,
  activatableCards: null,
  welcomeCard: null,
  resultsGrid: null,
  rProgressBar: null,
  scenariosSection: null,
  saveBtn: null,
  isResultsActive: false,

  init() {
    this.heroCard = document.getElementById('alertCard');
    this.primaryResultCards = document.querySelectorAll('.result-card--primary');
    this.activatableCards = document.querySelectorAll('.result-card--activatable');
    this.welcomeCard = document.getElementById('welcomeCard');
    this.resultsGrid = document.getElementById('resultsGrid');
    this.rProgressBar = document.getElementById('rProgressBar');
    this.scenariosSection = document.getElementById('scenariosSection');
    this.saveBtn = document.getElementById('logTradeBtn');

    // Start with welcome card visible, results hidden
    this.showWelcome();
  },

  showWelcome() {
    if (this.welcomeCard) this.welcomeCard.classList.remove('hidden');
    if (this.resultsGrid) this.resultsGrid.classList.add('hidden');
    if (this.rProgressBar) {
      this.rProgressBar.classList.add('hidden');
      this.rProgressBar.classList.remove('visible');
    }
    if (this.scenariosSection) this.scenariosSection.classList.add('hidden');
    // Disable Save to Journal button when no results
    if (this.saveBtn) {
      this.saveBtn.disabled = true;
    }
  },

  showResults() {
    if (this.welcomeCard) this.welcomeCard.classList.add('hidden');
    if (this.resultsGrid) this.resultsGrid.classList.remove('hidden');
    if (this.rProgressBar) this.rProgressBar.classList.remove('hidden');
    if (this.scenariosSection) this.scenariosSection.classList.remove('hidden');
  },

  activateResults() {
    if (this.isResultsActive) return;
    this.isResultsActive = true;

    // Switch from welcome to results
    this.showResults();

    if (this.heroCard) {
      this.heroCard.classList.add('inactive');
    }
    if (this.primaryResultCards) {
      this.primaryResultCards.forEach(card => card.classList.add('active'));
    }
    if (this.activatableCards) {
      this.activatableCards.forEach(card => card.classList.add('active'));
    }
    // Enable and pulse Save to Journal button
    if (this.saveBtn) {
      this.saveBtn.disabled = false;
      this.saveBtn.classList.add('btn--pulse');
    }
  },

  // Stop pulse without deactivating results (called after saving trade)
  stopPulse() {
    if (this.saveBtn) {
      this.saveBtn.classList.remove('btn--pulse');
    }
  },

  deactivateResults() {
    if (!this.isResultsActive) return;
    this.isResultsActive = false;

    // Switch back to welcome card
    this.showWelcome();

    if (this.heroCard) {
      this.heroCard.classList.remove('inactive');
    }
    if (this.primaryResultCards) {
      this.primaryResultCards.forEach(card => card.classList.remove('active'));
    }
    if (this.activatableCards) {
      this.activatableCards.forEach(card => card.classList.remove('active'));
    }
    // Disable Save to Journal button
    if (this.saveBtn) {
      this.saveBtn.disabled = true;
      this.saveBtn.classList.remove('btn--pulse');
    }
  }
};

// ============================================
// Trade Wizard
// ============================================

const Wizard = {
  elements: {},
  currentStep: 1,
  totalSteps: 4,
  skippedSteps: [],
  thesis: { setupType: null, theme: null, conviction: null, entryType: null, riskReasoning: null },
  notes: '',

  init() {
    this.cacheElements();
    this.bindEvents();
  },

  cacheElements() {
    this.elements = {
      modal: document.getElementById('wizardModal'),
      overlay: document.getElementById('wizardModalOverlay'),
      closeBtn: document.getElementById('closeWizardBtn'),
      progressSteps: document.querySelectorAll('.wizard-progress__step'),
      steps: document.querySelectorAll('.wizard-step'),
      wizardTicker: document.getElementById('wizardTicker'),
      wizardEntry: document.getElementById('wizardEntry'),
      wizardStop: document.getElementById('wizardStop'),
      wizardShares: document.getElementById('wizardShares'),
      wizardPosition: document.getElementById('wizardPosition'),
      wizardRisk: document.getElementById('wizardRisk'),
      wizardTarget: document.getElementById('wizardTarget'),
      skipAllBtn: document.getElementById('wizardSkipAll'),
      next1Btn: document.getElementById('wizardNext1'),
      setupBtns: document.querySelectorAll('[data-setup]'),
      themeInput: document.getElementById('wizardTheme'),
      convictionStars: document.querySelectorAll('.wizard-star'),
      back2Btn: document.getElementById('wizardBack2'),
      skip2Btn: document.getElementById('wizardSkip2'),
      next2Btn: document.getElementById('wizardNext2'),
      entryTypeBtns: document.querySelectorAll('[data-entry-type]'),
      riskReasoningInput: document.getElementById('wizardRiskReasoning'),
      notesInput: document.getElementById('wizardNotes'),
      back3Btn: document.getElementById('wizardBack3'),
      skip3Btn: document.getElementById('wizardSkip3'),
      next3Btn: document.getElementById('wizardNext3'),
      confirmTicker: document.getElementById('wizardConfirmTicker'),
      confirmPosition: document.getElementById('wizardConfirmPosition'),
      confirmRisk: document.getElementById('wizardConfirmRisk'),
      confirmSetupRow: document.getElementById('wizardConfirmSetupRow'),
      confirmSetup: document.getElementById('wizardConfirmSetup'),
      confirmThemeRow: document.getElementById('wizardConfirmThemeRow'),
      confirmTheme: document.getElementById('wizardConfirmTheme'),
      confirmEntryTypeRow: document.getElementById('wizardConfirmEntryTypeRow'),
      confirmEntryType: document.getElementById('wizardConfirmEntryType'),
      confirmNotesRow: document.getElementById('wizardConfirmNotesRow'),
      confirmNotes: document.getElementById('wizardConfirmNotes'),
      streakDisplay: document.getElementById('wizardStreakDisplay'),
      streakText: document.getElementById('wizardStreakText'),
      back4Btn: document.getElementById('wizardBack4'),
      confirmBtn: document.getElementById('wizardConfirmBtn')
    };
  },

  bindEvents() {
    this.elements.closeBtn?.addEventListener('click', () => this.close());
    this.elements.overlay?.addEventListener('click', () => this.close());

    document.addEventListener('keydown', (e) => {
      if (!this.isOpen()) return;
      if (e.key === 'Escape') this.close();
    });

    this.elements.skipAllBtn?.addEventListener('click', () => this.skipAll());
    this.elements.next1Btn?.addEventListener('click', () => this.goToStep(2));
    this.elements.back2Btn?.addEventListener('click', () => this.goToStep(1));
    this.elements.skip2Btn?.addEventListener('click', () => this.skipStep(2));
    this.elements.next2Btn?.addEventListener('click', () => this.goToStep(3));
    this.elements.back3Btn?.addEventListener('click', () => this.goToStep(2));
    this.elements.skip3Btn?.addEventListener('click', () => this.skipStep(3));
    this.elements.next3Btn?.addEventListener('click', () => this.goToStep(4));
    this.elements.back4Btn?.addEventListener('click', () => this.goToStep(3));
    this.elements.confirmBtn?.addEventListener('click', () => this.confirmTrade());

    this.elements.setupBtns?.forEach(btn => {
      btn.addEventListener('click', () => {
        this.elements.setupBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.thesis.setupType = btn.dataset.setup;
        SoundFX.playClick();
      });
    });

    this.elements.entryTypeBtns?.forEach(btn => {
      btn.addEventListener('click', () => {
        this.elements.entryTypeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.thesis.entryType = btn.dataset.entryType;
        SoundFX.playClick();
      });
    });

    this.elements.convictionStars?.forEach(star => {
      star.addEventListener('click', () => {
        const level = parseInt(star.dataset.conviction);
        this.thesis.conviction = level;
        this.elements.convictionStars.forEach((s, i) => s.classList.toggle('active', i < level));
        SoundFX.playClick();
      });
    });
  },

  isOpen() { return this.elements.modal?.classList.contains('open'); },

  open() {
    if (!this.elements.modal) return;
    this.currentStep = 1;
    this.skippedSteps = [];
    this.thesis = { setupType: null, theme: null, conviction: null, entryType: null, riskReasoning: null };
    this.notes = '';
    this.resetForm();
    this.prefillFromCalculator();
    this.elements.modal.classList.add('open');
    this.elements.overlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
    this.showStep(1);
  },

  close() {
    this.elements.modal?.classList.remove('open');
    this.elements.overlay?.classList.remove('open');
    document.body.style.overflow = '';
  },

  resetForm() {
    this.elements.setupBtns?.forEach(b => b.classList.remove('active'));
    this.elements.entryTypeBtns?.forEach(b => b.classList.remove('active'));
    this.elements.convictionStars?.forEach(s => s.classList.remove('active'));
    if (this.elements.themeInput) this.elements.themeInput.value = '';
    if (this.elements.riskReasoningInput) this.elements.riskReasoningInput.value = '';
    if (this.elements.notesInput) this.elements.notesInput.value = '';
    this.elements.progressSteps?.forEach(step => step.classList.remove('active', 'completed'));
    this.elements.progressSteps?.[0]?.classList.add('active');
  },

  prefillFromCalculator() {
    const trade = AppState.trade;
    const results = AppState.results;
    const account = AppState.account;

    if (this.elements.wizardTicker) this.elements.wizardTicker.textContent = trade.ticker || 'TICKER';
    if (this.elements.wizardEntry) this.elements.wizardEntry.textContent = Utils.formatCurrency(trade.entry || 0);
    if (this.elements.wizardStop) this.elements.wizardStop.textContent = Utils.formatCurrency(trade.stop || 0);
    if (this.elements.wizardShares) this.elements.wizardShares.textContent = Utils.formatNumber(results.shares || 0);
    if (this.elements.wizardPosition) this.elements.wizardPosition.textContent = Utils.formatCurrency(results.positionSize || 0);
    if (this.elements.wizardRisk) this.elements.wizardRisk.textContent = Utils.formatCurrency(results.riskDollars || 0);
    if (this.elements.wizardTarget) this.elements.wizardTarget.textContent = trade.target ? Utils.formatCurrency(trade.target) : '—';
    if (this.elements.confirmTicker) this.elements.confirmTicker.textContent = trade.ticker || 'TICKER';
    if (this.elements.confirmPosition) this.elements.confirmPosition.textContent = `${Utils.formatNumber(results.shares || 0)} shares @ ${Utils.formatCurrency(trade.entry || 0)}`;
    if (this.elements.confirmRisk) this.elements.confirmRisk.textContent = `${Utils.formatCurrency(results.riskDollars || 0)} (${Utils.formatPercent(account.riskPercent || 0)})`;
  },

  showStep(step) {
    const prevStep = this.currentStep;
    this.currentStep = step;

    this.elements.steps?.forEach((stepEl, i) => {
      const stepNum = i + 1;
      stepEl.classList.remove('active', 'exit-left', 'exit-right');

      if (stepNum === step) {
        stepEl.classList.add('active');
      } else if (stepNum === prevStep) {
        // Add exit animation for the previous step
        stepEl.classList.add(step > prevStep ? 'exit-left' : 'exit-right');
      }
    });

    this.elements.progressSteps?.forEach((progressStep, i) => {
      progressStep.classList.remove('active', 'completed');
      if ((i + 1) < step) progressStep.classList.add('completed');
      else if ((i + 1) === step) progressStep.classList.add('active');
    });

    if (step === 4) this.updateConfirmation();
  },

  goToStep(step) {
    if (step < 1 || step > this.totalSteps) return;
    this.collectStepData();
    this.showStep(step);
  },

  skipStep(step) {
    if (!this.skippedSteps.includes(step)) this.skippedSteps.push(step);
    this.goToStep(step + 1);
  },

  skipAll() {
    Journal.directLogTrade();
    this.close();
  },

  collectStepData() {
    if (this.currentStep === 2) this.thesis.theme = this.elements.themeInput?.value.trim() || null;
    if (this.currentStep === 3) {
      this.thesis.riskReasoning = this.elements.riskReasoningInput?.value.trim() || null;
      this.notes = this.elements.notesInput?.value.trim() || '';
    }
  },

  updateConfirmation() {
    if (this.thesis.setupType) {
      this.elements.confirmSetupRow.style.display = 'flex';
      this.elements.confirmSetup.textContent = this.thesis.setupType.toUpperCase();
    } else {
      this.elements.confirmSetupRow.style.display = 'none';
    }
    if (this.thesis.theme) {
      this.elements.confirmThemeRow.style.display = 'flex';
      this.elements.confirmTheme.textContent = this.thesis.theme;
    } else {
      this.elements.confirmThemeRow.style.display = 'none';
    }
    if (this.thesis.entryType) {
      this.elements.confirmEntryTypeRow.style.display = 'flex';
      this.elements.confirmEntryType.textContent = this.thesis.entryType.charAt(0).toUpperCase() + this.thesis.entryType.slice(1);
    } else {
      this.elements.confirmEntryTypeRow.style.display = 'none';
    }

    // Show notes if provided
    if (this.notes && this.notes.trim()) {
      this.elements.confirmNotesRow.style.display = 'flex';
      // Truncate long notes for display
      const displayNotes = this.notes.length > 60 ? this.notes.substring(0, 60) + '...' : this.notes;
      this.elements.confirmNotes.textContent = displayNotes;
    } else {
      this.elements.confirmNotesRow.style.display = 'none';
    }

    const progress = AppState.journalMeta.achievements.progress;
    const today = new Date().toDateString();
    const lastDate = progress.lastTradeDate ? new Date(progress.lastTradeDate).toDateString() : null;

    if (lastDate !== today && progress.currentStreak > 0) {
      this.elements.streakDisplay.style.display = 'flex';
      this.elements.streakText.textContent = `${progress.currentStreak + 1} day streak!`;
    } else if (!lastDate) {
      this.elements.streakDisplay.style.display = 'flex';
      this.elements.streakText.textContent = 'Start your streak!';
    } else {
      this.elements.streakDisplay.style.display = 'none';
    }
  },

  confirmTrade() {
    this.collectStepData();
    this.logTradeWithWizard();
    this.close();
  },

  hasThesisData() {
    return this.thesis.setupType || this.thesis.theme || this.thesis.conviction || this.thesis.entryType || this.thesis.riskReasoning;
  },

  logTradeWithWizard() {
    const trade = AppState.trade;
    const results = AppState.results;
    const account = AppState.account;

    const entry = {
      ticker: trade.ticker || 'UNKNOWN',
      entry: trade.entry,
      stop: trade.stop,
      target: trade.target,
      shares: results.shares,
      positionSize: results.positionSize,
      riskDollars: results.riskDollars,
      riskPercent: account.riskPercent,
      stopDistance: results.stopDistance,
      notes: this.notes || Journal.elements.tradeNotes?.value || '',
      status: 'open',
      thesis: this.hasThesisData() ? { ...this.thesis } : null,
      wizardComplete: true,
      wizardSkipped: [...this.skippedSteps]
    };

    AppState.addJournalEntry(entry);
    if (Journal.elements.tradeNotes) Journal.elements.tradeNotes.value = '';

    // Update progress
    const progress = AppState.journalMeta.achievements.progress;
    progress.totalTrades++;
    if (this.notes) progress.tradesWithNotes++;
    if (this.hasThesisData()) progress.tradesWithThesis++;
    if (this.skippedSteps.length === 0) progress.completeWizardCount++;

    AppState.updateStreak();
    AppState.saveJournalMeta();

    AppState.emit('tradeLogged', { entry, wizardComplete: true });
    Confetti.burst();
    SoundFX.playCelebration();
    Achievements.check();

    this.showSuccessToast();
    SoundFX.playSuccess();
    FocusManager.stopPulse();
  },

  showSuccessToast() {
    const messages = ["Trade logged! Good luck!", "Nice setup! Tracked.", "You're on a roll! Trade saved.", "Disciplined trader! Logged.", "Trade captured! Let's go!"];
    UI.showToast(messages[Math.floor(Math.random() * messages.length)], 'success');
  }
};

// ============================================
// Confetti System
// ============================================

const Confetti = {
  canvas: null,
  ctx: null,
  particles: [],
  animationId: null,
  colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'],

  init() {
    this.canvas = document.getElementById('confettiCanvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }
  },

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  burst(particleCount = 100) {
    if (!this.canvas || !this.ctx) return;
    if (!AppState.journalMeta.settings.celebrationsEnabled) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Create particles from multiple origin points for better spread
    const origins = [
      { x: this.canvas.width * 0.2, y: this.canvas.height * 0.25 },
      { x: this.canvas.width * 0.35, y: this.canvas.height * 0.15 },
      { x: this.canvas.width * 0.5, y: this.canvas.height * 0.1 },
      { x: this.canvas.width * 0.65, y: this.canvas.height * 0.15 },
      { x: this.canvas.width * 0.8, y: this.canvas.height * 0.25 }
    ];

    // Staggered waves for drawn-out celebration effect
    const waves = 4;
    const particlesPerWave = Math.ceil(particleCount / waves);

    for (let wave = 0; wave < waves; wave++) {
      setTimeout(() => {
        for (let i = 0; i < particlesPerWave; i++) {
          const origin = origins[Math.floor(Math.random() * origins.length)];
          this.particles.push(this.createParticle(origin.x, origin.y));
        }
        if (!this.animationId) this.animate();
      }, wave * 150); // 150ms between waves
    }
  },

  createParticle(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = 6 + Math.random() * 8; // Faster initial burst
    return {
      x, y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity - 4, // Stronger upward bias
      size: 8 + Math.random() * 6, // Slightly larger
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 15,
      opacity: 1,
      gravity: 0.12,
      friction: 0.985, // Less friction = longer travel
      shape: Math.random() > 0.5 ? 'rect' : 'circle'
    };
  },

  animate() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += p.gravity;
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.006; // Slower fade for longer celebration

      if (p.opacity > 0) {
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.globalAlpha = p.opacity;
        this.ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          this.ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          this.ctx.beginPath();
          this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          this.ctx.fill();
        }
        this.ctx.restore();
      } else {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.animationId = null;
    }
  }
};

// Debug function for testing confetti (call from browser console)
window.testConfetti = (count) => {
  // Temporarily bypass the celebrations check for testing
  const original = AppState.journalMeta.settings.celebrationsEnabled;
  AppState.journalMeta.settings.celebrationsEnabled = true;
  Confetti.burst(count || 100);
  AppState.journalMeta.settings.celebrationsEnabled = original;
  console.log(`🎉 Confetti burst: ${count || 100} particles`);
};

// ============================================
// Sound Effects System (Web Audio API)
// ============================================

const SoundFX = {
  ctx: null,
  enabled: false,
  warmedUp: false,

  init() {
    this.enabled = AppState.journalMeta.settings.soundEnabled || false;

    // Listen for settings changes
    document.addEventListener('journalMetaSettingsChanged', () => {
      this.enabled = AppState.journalMeta.settings.soundEnabled || false;
    });

    // Warm up audio context on first user interaction
    const warmup = () => {
      if (this.warmedUp) return;
      this.warmup();
      document.removeEventListener('click', warmup);
      document.removeEventListener('touchstart', warmup);
      document.removeEventListener('keydown', warmup);
    };

    document.addEventListener('click', warmup, { once: false, passive: true });
    document.addEventListener('touchstart', warmup, { once: false, passive: true });
    document.addEventListener('keydown', warmup, { once: false, passive: true });
  },

  warmup() {
    if (this.warmedUp) return;

    // Create and resume context
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Play a silent sound to fully initialize the audio pipeline
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime); // Silent
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.001);

    this.warmedUp = true;
  },

  ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  },

  // Premium success chime - ascending major arpeggio with shimmer
  playSuccess() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Base frequencies for C major arpeggio (C5, E5, G5, C6)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const baseGain = 0.12;

    notes.forEach((freq, i) => {
      const startTime = now + i * 0.08;

      // Main tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Subtle detune for richness
      osc.detune.setValueAtTime(Math.random() * 6 - 3, startTime);

      // Warm low-pass filter
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 3, startTime);
      filter.Q.setValueAtTime(1, startTime);

      // ADSR envelope
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(baseGain * (1 - i * 0.15), startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.7);

      // Add shimmer harmonic (octave above, quieter)
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();

      shimmer.type = 'sine';
      shimmer.frequency.setValueAtTime(freq * 2, startTime);

      shimmerGain.gain.setValueAtTime(0, startTime);
      shimmerGain.gain.linearRampToValueAtTime(baseGain * 0.15, startTime + 0.02);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      shimmer.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);

      shimmer.start(startTime);
      shimmer.stop(startTime + 0.5);
    });
  },

  // Achievement unlock - triumphant fanfare with rich harmonics
  playAchievement() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Triumphant interval: fifth then octave (G4 -> D5 -> G5)
    const sequence = [
      { freq: 392.00, time: 0, duration: 0.15 },      // G4
      { freq: 587.33, time: 0.12, duration: 0.15 },   // D5
      { freq: 783.99, time: 0.25, duration: 0.5 },    // G5 (held)
    ];

    const baseGain = 0.14;

    sequence.forEach(note => {
      const startTime = now + note.time;

      // Main tone with triangle for warmth
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(note.freq, startTime);

      // Second oscillator slightly detuned for chorus effect
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(note.freq * 1.002, startTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(note.freq * 4, startTime);
      filter.Q.setValueAtTime(0.5, startTime);

      // Envelope
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(baseGain, startTime + 0.015);
      gain.gain.setValueAtTime(baseGain * 0.8, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.duration + 0.3);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + note.duration + 0.4);
      osc2.stop(startTime + note.duration + 0.4);

      // Add fifth harmonic for richness on final note
      if (note.duration > 0.3) {
        const fifth = ctx.createOscillator();
        const fifthGain = ctx.createGain();

        fifth.type = 'sine';
        fifth.frequency.setValueAtTime(note.freq * 1.5, startTime);

        fifthGain.gain.setValueAtTime(0, startTime);
        fifthGain.gain.linearRampToValueAtTime(baseGain * 0.3, startTime + 0.05);
        fifthGain.gain.exponentialRampToValueAtTime(0.001, startTime + note.duration + 0.2);

        fifth.connect(fifthGain);
        fifthGain.connect(ctx.destination);

        fifth.start(startTime);
        fifth.stop(startTime + note.duration + 0.3);
      }
    });
  },

  // Subtle click for UI feedback
  playClick() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.03);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  },

  // Celebration sound - sparkly ascending run (pairs with confetti)
  playCelebration() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Quick ascending sparkle run
    const notes = [659.25, 783.99, 987.77, 1174.66, 1318.51, 1567.98];
    const baseGain = 0.06;

    notes.forEach((freq, i) => {
      const startTime = now + i * 0.05;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(baseGain, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }
};

// Debug functions for testing sounds
window.testSound = (type) => {
  const original = SoundFX.enabled;
  SoundFX.enabled = true;

  switch(type) {
    case 'success': SoundFX.playSuccess(); break;
    case 'achievement': SoundFX.playAchievement(); break;
    case 'click': SoundFX.playClick(); break;
    case 'celebration': SoundFX.playCelebration(); break;
    default:
      console.log('Usage: testSound("success" | "achievement" | "click" | "celebration")');
      SoundFX.enabled = original;
      return;
  }

  SoundFX.enabled = original;
  console.log(`🔊 Played: ${type}`);
};

// ============================================
// Clear Data Modal
// ============================================

const ClearDataModal = {
  elements: {},

  init() {
    this.elements = {
      modal: document.getElementById('clearDataModal'),
      overlay: document.getElementById('clearDataModalOverlay'),
      closeBtn: document.getElementById('closeClearDataBtn'),
      cancelBtn: document.getElementById('cancelClearDataBtn'),
      confirmBtn: document.getElementById('confirmClearDataBtn'),
      tradeCount: document.getElementById('clearDataTradeCount'),
      achievementCount: document.getElementById('clearDataAchievementCount')
    };

    this.bindEvents();
  },

  bindEvents() {
    this.elements.closeBtn?.addEventListener('click', () => this.close());
    this.elements.overlay?.addEventListener('click', () => this.close());
    this.elements.cancelBtn?.addEventListener('click', () => this.close());
    this.elements.confirmBtn?.addEventListener('click', () => DataManager.confirmClearAllData());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });
  },

  isOpen() {
    return this.elements.modal?.classList.contains('open');
  },

  open() {
    if (!this.elements.modal) return;

    // Update counts
    const tradeCount = AppState.journal.entries.length;
    const achievementCount = AppState.journalMeta.achievements.unlocked.length;
    const streak = AppState.journalMeta.achievements.progress.currentStreak;

    if (this.elements.tradeCount) {
      this.elements.tradeCount.textContent = tradeCount === 0
        ? 'No trades logged'
        : `${tradeCount} trade${tradeCount !== 1 ? 's' : ''} will be deleted`;
    }

    if (this.elements.achievementCount) {
      const parts = [];
      if (achievementCount > 0) parts.push(`${achievementCount} badge${achievementCount !== 1 ? 's' : ''}`);
      if (streak > 0) parts.push(`${streak}-day streak`);
      this.elements.achievementCount.textContent = parts.length > 0
        ? parts.join(' and ') + ' will be reset'
        : 'No achievements unlocked';
    }

    this.elements.modal.classList.add('open');
    this.elements.overlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  close() {
    this.elements.modal?.classList.remove('open');
    this.elements.overlay?.classList.remove('open');
    document.body.style.overflow = '';
  }
};

// ============================================
// Achievements System
// ============================================

const Achievements = {
  definitions: {
    first_steps: { id: 'first_steps', name: 'First Steps', description: 'Log your first trade', icon: '🎯', check: (p) => p.totalTrades >= 1 },
    day_one: { id: 'day_one', name: 'Day One', description: 'Log a trade today', icon: '📅', check: (p) => { const today = new Date().toDateString(); const lastDate = p.lastTradeDate ? new Date(p.lastTradeDate).toDateString() : null; return lastDate === today; } },
    hot_streak: { id: 'hot_streak', name: 'Hot Streak', description: '3-day logging streak', icon: '🔥', check: (p) => p.currentStreak >= 3 }
  },
  queue: [],

  init() {},

  check() {
    const progress = AppState.journalMeta.achievements.progress;
    Object.values(this.definitions).forEach(achievement => {
      if (AppState.isAchievementUnlocked(achievement.id)) return;
      if (achievement.check(progress)) this.unlock(achievement);
    });
  },

  unlock(achievement) {
    const unlocked = AppState.unlockAchievement(achievement.id);
    if (unlocked && AppState.journalMeta.settings.celebrationsEnabled) {
      this.queue.push(achievement);
      if (this.queue.length === 1) this.showNext();
    }
  },

  showNext() {
    if (this.queue.length === 0) return;
    const achievement = this.queue[0];
    this.showAchievementToast(achievement);
    AppState.markAchievementNotified(achievement.id);
    setTimeout(() => {
      this.queue.shift();
      if (this.queue.length > 0) this.showNext();
    }, 3500);
  },

  showAchievementToast(achievement) {
    const container = document.getElementById('toastContainerTop') || document.getElementById('toastContainer');
    if (!container) return;

    // Play achievement sound
    SoundFX.playAchievement();

    const toast = document.createElement('div');
    toast.className = 'toast toast--achievement';
    toast.innerHTML = `
      <span class="toast__icon">${achievement.icon}</span>
      <div class="toast__content">
        <strong class="toast__title">Achievement Unlocked!</strong>
        <span class="toast__text">${achievement.name}</span>
      </div>
      <button class="toast__close" aria-label="Close">×</button>
    `;
    toast.querySelector('.toast__close')?.addEventListener('click', () => {
      toast.classList.add('toast--hiding');
      setTimeout(() => toast.remove(), 300);
    });
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('toast--hiding');
        setTimeout(() => toast.remove(), 300);
      }
    }, 3000);
  }
};

// ============================================
// Hint Arrow Handler - Scroll to input on mobile
// ============================================

const HintArrow = {
  init() {
    const upArrow = document.querySelector('.welcome-card__hint-arrow--up');
    if (!upArrow) return;

    upArrow.style.cursor = 'pointer';
    upArrow.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.scrollToInput();
    });
  },

  scrollToInput() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// ============================================
// Initialize App
// ============================================

function initApp() {
  console.log('🚀 Initializing Trade Manager...');

  Settings.init();
  console.log('✅ Settings loaded');

  Calculator.init();
  console.log('✅ Calculator ready');

  Parser.init();
  console.log('✅ Alert parser ready');

  Journal.init();
  console.log('✅ Journal loaded');

  TrimModal.init();
  console.log('✅ Trim modal loaded');

  // Initialize wizard, confetti, achievements, sounds, and modals
  Wizard.init();
  Confetti.init();
  Achievements.init();
  SoundFX.init();
  ClearDataModal.init();
  console.log('✅ Trade wizard, achievements & sound ready');

  SettingsToggle.init();
  FocusManager.init();
  HintArrow.init();

  // Sync Quick Settings summary with loaded values
  SettingsToggle.updateSummary(
    AppState.account.currentSize,
    AppState.account.maxPositionPercent
  );

  // Prevent tooltip clicks from triggering label focus
  document.addEventListener('click', (e) => {
    const tooltip = e.target.closest('.tooltip');
    if (tooltip) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  console.log('📊 Trade Manager initialized successfully');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
