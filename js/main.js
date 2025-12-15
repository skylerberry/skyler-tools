/**
 * Main - Application entry point
 */

import { state } from './state.js';
import { calculator } from './calculator.js';
import { parser } from './parser.js';
import { journal } from './journal.js';
import { settings } from './settings.js';
import { theme, keyboard, settingsToggle, focusManager } from './ui.js';
import { trimModal } from './trimModal.js';

class App {
  constructor() {
    this.init();
  }

  init() {
    console.log('Initializing Trade Manager...');

    // Initialize theme first (handles saved preference)
    theme.init();

    // Initialize settings (loads saved data)
    settings.init();

    // Initialize calculator
    calculator.init();

    // Initialize parser
    parser.init();

    // Initialize journal
    journal.init();

    // Initialize trim modal
    trimModal.init();

    // Initialize keyboard shortcuts
    keyboard.init();

    // Initialize settings card toggle
    settingsToggle.init();

    // Initialize focus manager for visual attention flow
    focusManager.init();

    // Sync Quick Settings summary with loaded values
    settingsToggle.updateSummary(
      state.account.currentSize,
      state.settings.riskPercent,
      state.settings.maxPositionPercent
    );

    // Set up global event listeners
    this.setupGlobalEvents();

    console.log('Trade Manager initialized');
  }

  setupGlobalEvents() {
    // Listen for account changes to update calculator and summary
    state.on('accountSizeChanged', () => {
      calculator.calculate();
      settingsToggle.updateSummary(
        state.account.currentSize,
        state.settings.riskPercent,
        state.settings.maxPositionPercent
      );
    });

    // Listen for results to update header and activate results panel
    state.on('resultsRendered', (results) => {
      settings.updateAccountDisplay(state.account.currentSize);

      // Activate results panel glow when we have real results
      if (results && results.shares > 0) {
        focusManager.activateResults();
      } else {
        focusManager.deactivateResults();
      }
    });

    // Deactivate results when trade is cleared
    state.on('tradeChanged', (trade) => {
      if (!trade.entry && !trade.stop) {
        focusManager.deactivateResults();
      }
    });

    // Update settings summary when settings change
    state.on('settingsChanged', (s) => {
      settingsToggle.updateSummary(
        state.account.currentSize,
        s.riskPercent,
        s.maxPositionPercent
      );
    });

    // Debug logging in development
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      state.on('settingsChanged', (s) => console.log('Settings:', s));
      state.on('tradeChanged', (t) => console.log('Trade:', t));
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App());
} else {
  new App();
}

// Export for potential external use
export { App };
