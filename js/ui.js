/**
 * UI - Toasts, theme toggle, and UI utilities
 */

import { state } from './state.js';

// Toast container reference
let toastContainer = null;

/**
 * Show a toast notification
 */
export function showToast(message, type = 'success') {
  if (!toastContainer) {
    toastContainer = document.getElementById('toastContainer');
  }

  if (!toastContainer) {
    console.warn('Toast container not found');
    return;
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__message">${message}</span>
    <button class="toast__close">×</button>
  `;

  // Close button handler
  toast.querySelector('.toast__close').addEventListener('click', () => {
    removeToast(toast);
  });

  toastContainer.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => removeToast(toast), 3000);
}

function removeToast(toast) {
  if (!toast || !toast.parentNode) return;
  toast.classList.add('removing');
  setTimeout(() => toast.remove(), 300);
}

/**
 * Theme management
 */
class ThemeManager {
  constructor() {
    this.themeBtn = null;
  }

  init() {
    this.themeBtn = document.getElementById('themeBtn');

    // Theme is already set by preload script in HTML head. Just sync state.
    const initialTheme = document.documentElement.dataset.theme || 'dark';
    state.updateSettings({ theme: initialTheme });

    // Bind toggle
    if (this.themeBtn) {
      this.themeBtn.addEventListener('click', () => this.toggle());
    }
  }

  toggle() {
    const html = document.documentElement;
    const current = html.dataset.theme || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';

    // Enable smooth transition, then switch theme
    html.classList.add('theme-transitioning');
    html.dataset.theme = next;
    state.updateSettings({ theme: next });
    localStorage.setItem('theme', next);

    // Remove transition class after animation completes
    setTimeout(() => html.classList.remove('theme-transitioning'), 400);
  }

  set(theme) {
    document.documentElement.dataset.theme = theme;
    state.updateSettings({ theme });
    localStorage.setItem('theme', theme);
  }
}

/**
 * Keyboard shortcuts
 */
class KeyboardManager {
  init() {
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  handleKeydown(e) {
    // Escape to close modals/panels
    if (e.key === 'Escape') {
      const settingsPanel = document.getElementById('settingsPanel');
      const journalModal = document.getElementById('journalModal');

      if (settingsPanel?.classList.contains('open')) {
        settingsPanel.classList.remove('open');
        document.getElementById('settingsOverlay')?.classList.remove('open');
        document.body.style.overflow = '';
        state.setUI('settingsOpen', false);
      }

      if (journalModal?.classList.contains('open')) {
        journalModal.classList.remove('open');
        document.getElementById('journalModalOverlay')?.classList.remove('open');
        document.body.style.overflow = '';
        state.setUI('journalOpen', false);
      }
    }
  }
}

/**
 * Settings Card Toggle (collapsible)
 */
class SettingsToggle {
  constructor() {
    this.card = null;
    this.toggle = null;
    this.summary = null;
  }

  init() {
    this.card = document.getElementById('settingsCard');
    this.toggle = document.getElementById('settingsToggle');
    this.summary = document.getElementById('settingsSummary');

    if (this.toggle && this.card) {
      this.toggle.addEventListener('click', () => this.handleToggle());
    }
  }

  handleToggle() {
    this.card.classList.toggle('open');
  }

  updateSummary(accountSize, riskPercent, maxPosition) {
    if (!this.summary) return;

    // Format account size (50000 -> $50k, 1500000 -> $1.5m)
    const formatAccount = (val) => {
      if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}m`.replace('.0m', 'm');
      if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
      return `$${val}`;
    };

    this.summary.textContent = `${formatAccount(accountSize)} · ${riskPercent}% · ${maxPosition}%`;
  }
}

/**
 * Focus Manager - Controls visual attention flow between panels
 */
class FocusManager {
  constructor() {
    this.heroCard = null;
    this.primaryResultCards = null;
    this.activatableCards = null;
    this.welcomeCard = null;
    this.resultsGrid = null;
    this.profitTargetsSection = null;
    this.scenariosSection = null;
    this.saveBtn = null;
    this.isResultsActive = false;
  }

  init() {
    this.heroCard = document.getElementById('alertCard');
    this.primaryResultCards = document.querySelectorAll('.result-card--primary');
    this.activatableCards = document.querySelectorAll('.result-card--activatable');
    this.welcomeCard = document.getElementById('welcomeCard');
    this.resultsGrid = document.getElementById('resultsGrid');
    this.profitTargetsSection = document.getElementById('profitTargetsSection');
    this.scenariosSection = document.getElementById('scenariosSection');
    this.saveBtn = document.getElementById('logTradeBtn');

    // Start with welcome card visible, results hidden
    this.showWelcome();
  }

  showWelcome() {
    if (this.welcomeCard) this.welcomeCard.classList.remove('hidden');
    if (this.resultsGrid) this.resultsGrid.classList.add('hidden');
    if (this.profitTargetsSection) this.profitTargetsSection.classList.add('hidden');
    if (this.scenariosSection) this.scenariosSection.classList.add('hidden');
  }

  showResults() {
    if (this.welcomeCard) this.welcomeCard.classList.add('hidden');
    if (this.resultsGrid) this.resultsGrid.classList.remove('hidden');
    if (this.profitTargetsSection) this.profitTargetsSection.classList.remove('hidden');
    if (this.scenariosSection) this.scenariosSection.classList.remove('hidden');
  }

  // Called when calculations produce results
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
    // Start pulsing Save to Journal button
    if (this.saveBtn) {
      this.saveBtn.classList.add('btn--pulse');
    }
  }

  // Stop pulse without deactivating results (called after saving trade)
  stopPulse() {
    if (this.saveBtn) {
      this.saveBtn.classList.remove('btn--pulse');
    }
  }

  // Called when results are cleared/empty
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
    // Stop pulsing Save to Journal button
    if (this.saveBtn) {
      this.saveBtn.classList.remove('btn--pulse');
    }
  }
}

// Export instances
export const theme = new ThemeManager();
export const keyboard = new KeyboardManager();
export const settingsToggle = new SettingsToggle();
export const focusManager = new FocusManager();
