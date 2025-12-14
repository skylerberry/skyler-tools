/**
 * State Management - Centralized app state with event system
 */

class AppState {
  constructor() {
    this.state = {
      settings: {
        startingAccountSize: 50000,
        defaultRiskPercent: 1,
        defaultMaxPositionPercent: 100,
        dynamicAccountEnabled: true,
        theme: 'dark'
      },

      account: {
        currentSize: 50000,
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
        riskReward: null,
        isLimited: false,
        percentOfAccount: 0
      },

      journal: {
        entries: [],
        filter: 'all'
      },

      ui: {
        scenariosExpanded: false,
        alertExpanded: false,
        settingsOpen: false,
        journalOpen: false
      }
    };

    this.listeners = new Map();
  }

  // Event system
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  // Settings methods
  updateSettings(updates) {
    Object.assign(this.state.settings, updates);
    this.emit('settingsChanged', this.state.settings);
    this.saveSettings();
  }

  // Account methods
  updateAccount(updates) {
    const oldAccount = { ...this.state.account };
    Object.assign(this.state.account, updates);
    this.emit('accountChanged', { old: oldAccount, new: this.state.account });
  }

  // Trade methods
  updateTrade(updates) {
    Object.assign(this.state.trade, updates);
    this.emit('tradeChanged', this.state.trade);
  }

  // Results methods
  updateResults(results) {
    this.state.results = { ...this.state.results, ...results };
    this.emit('resultsChanged', this.state.results);
  }

  // Journal methods
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
  }

  updateJournalEntry(id, updates) {
    const entry = this.state.journal.entries.find(e => e.id === id);
    if (entry) {
      Object.assign(entry, updates);
      this.saveJournal();
      this.emit('journalEntryUpdated', entry);
    }
    return entry;
  }

  deleteJournalEntry(id) {
    const index = this.state.journal.entries.findIndex(e => e.id === id);
    if (index > -1) {
      const deleted = this.state.journal.entries.splice(index, 1)[0];
      this.saveJournal();
      this.emit('journalEntryDeleted', deleted);
      return deleted;
    }
    return null;
  }

  getOpenTrades() {
    return this.state.journal.entries.filter(e => e.status === 'open');
  }

  getFilteredEntries(filter = 'all') {
    if (filter === 'all') return this.state.journal.entries;
    return this.state.journal.entries.filter(e => e.status === filter);
  }

  // UI state methods
  toggleUI(key) {
    this.state.ui[key] = !this.state.ui[key];
    this.emit('uiChanged', { key, value: this.state.ui[key] });
  }

  setUI(key, value) {
    this.state.ui[key] = value;
    this.emit('uiChanged', { key, value });
  }

  // Persistence
  saveSettings() {
    try {
      localStorage.setItem('riskCalcSettings', JSON.stringify(this.state.settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

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
  }

  saveJournal() {
    try {
      localStorage.setItem('riskCalcJournal', JSON.stringify(this.state.journal.entries));
    } catch (e) {
      console.error('Failed to save journal:', e);
    }
  }

  loadJournal() {
    try {
      const saved = localStorage.getItem('riskCalcJournal');
      if (saved) {
        this.state.journal.entries = JSON.parse(saved);

        // Calculate realized P&L from closed trades
        this.state.account.realizedPnL = this.state.journal.entries
          .filter(t => t.status === 'closed' && t.pnl !== null)
          .reduce((sum, t) => sum + t.pnl, 0);

        if (this.state.settings.dynamicAccountEnabled) {
          this.state.account.currentSize =
            this.state.settings.startingAccountSize + this.state.account.realizedPnL;
        }
      }
    } catch (e) {
      console.error('Failed to load journal:', e);
    }
  }

  // Getters
  get settings() { return this.state.settings; }
  get account() { return this.state.account; }
  get trade() { return this.state.trade; }
  get results() { return this.state.results; }
  get journal() { return this.state.journal; }
  get ui() { return this.state.ui; }
}

// Export singleton instance
export const state = new AppState();
export { AppState };
