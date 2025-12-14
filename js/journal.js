/**
 * Journal - Trade logging and management
 */

import { state } from './state.js';
import { formatCurrency, formatPercent, formatDate } from './utils.js';
import { showToast } from './ui.js';

class Journal {
  constructor() {
    this.elements = {};
  }

  init() {
    this.cacheElements();
    this.bindEvents();
    this.render();

    // Listen for state changes
    state.on('journalEntryAdded', () => this.render());
    state.on('journalEntryUpdated', () => this.render());
    state.on('journalEntryDeleted', () => this.render());
  }

  cacheElements() {
    this.elements = {
      // Log trade
      tradeNotes: document.getElementById('tradeNotes'),
      logTradeBtn: document.getElementById('logTradeBtn'),

      // Active trades
      activeTrades: document.getElementById('activeTrades'),
      activeTradeCount: document.getElementById('activeTradeCount'),
      riskSummary: document.getElementById('riskSummary'),

      // Modal
      journalModal: document.getElementById('journalModal'),
      journalModalOverlay: document.getElementById('journalModalOverlay'),
      closeJournalBtn: document.getElementById('closeJournalBtn'),
      viewJournalBtn: document.getElementById('viewJournalBtn'),
      journalTableBody: document.getElementById('journalTableBody'),
      journalSummaryText: document.getElementById('journalSummaryText')
    };
  }

  bindEvents() {
    // Log trade button
    if (this.elements.logTradeBtn) {
      this.elements.logTradeBtn.addEventListener('click', () => this.logTrade());
    }

    // Open/close modal
    if (this.elements.viewJournalBtn) {
      this.elements.viewJournalBtn.addEventListener('click', () => this.openModal());
    }
    if (this.elements.closeJournalBtn) {
      this.elements.closeJournalBtn.addEventListener('click', () => this.closeModal());
    }
    if (this.elements.journalModalOverlay) {
      this.elements.journalModalOverlay.addEventListener('click', () => this.closeModal());
    }

    // Filter buttons
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.renderTable(e.target.dataset.filter);
      });
    });

    // Make close/delete functions globally available
    window.closeTrade = (id) => this.closeTrade(id);
    window.deleteTrade = (id) => this.deleteTrade(id);
  }

  logTrade() {
    const results = state.results;
    const trade = state.trade;

    if (!results.shares || results.shares === 0) {
      showToast('Enter a valid trade to log', 'warning');
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
      riskPercent: state.account.riskPercent,
      stopDistance: results.stopDistance,
      notes: this.elements.tradeNotes?.value || '',
      status: 'open',
      exitPrice: null,
      exitDate: null,
      pnl: null
    };

    state.addJournalEntry(entry);

    // Clear notes
    if (this.elements.tradeNotes) {
      this.elements.tradeNotes.value = '';
    }

    showToast(`${entry.ticker} trade logged!`, 'success');
  }

  closeTrade(id) {
    const entry = state.journal.entries.find(e => e.id === id);
    if (!entry) return;

    const exitPrice = prompt(`Enter exit price for ${entry.ticker}:`);
    if (!exitPrice) return;

    const exit = parseFloat(exitPrice);
    if (isNaN(exit)) {
      showToast('Invalid price', 'error');
      return;
    }

    const pnl = (exit - entry.entry) * entry.shares;

    state.updateJournalEntry(id, {
      exitPrice: exit,
      exitDate: new Date().toISOString(),
      pnl,
      status: 'closed'
    });

    // Update realized P&L
    state.updateAccount({
      realizedPnL: state.account.realizedPnL + pnl
    });

    // Update account if dynamic tracking enabled
    if (state.settings.dynamicAccountEnabled) {
      const newSize = state.settings.startingAccountSize + state.account.realizedPnL;
      state.updateAccount({ currentSize: newSize });
      state.emit('accountSizeChanged', newSize);
    }

    showToast(
      `${entry.ticker} closed: ${pnl >= 0 ? '+' : ''}${formatCurrency(pnl)}`,
      pnl >= 0 ? 'success' : 'warning'
    );
  }

  deleteTrade(id) {
    if (!confirm('Delete this trade?')) return;

    const deleted = state.deleteJournalEntry(id);
    if (deleted) {
      showToast('Trade deleted', 'success');
    }
  }

  render() {
    this.renderActiveTrades();
    this.renderRiskSummary();
  }

  renderActiveTrades() {
    const openTrades = state.getOpenTrades();

    if (this.elements.activeTradeCount) {
      this.elements.activeTradeCount.textContent = `${openTrades.length} open`;
    }

    if (!this.elements.activeTrades) return;

    if (openTrades.length === 0) {
      this.elements.activeTrades.innerHTML = `
        <div class="empty-state">
          <span class="empty-state__icon">🧘</span>
          <span class="empty-state__text">No active trades</span>
          <span class="empty-state__hint">Log a trade to see it here</span>
        </div>
      `;
      return;
    }

    this.elements.activeTrades.innerHTML = openTrades.slice(0, 5).map(trade => `
      <div class="trade-card" data-id="${trade.id}">
        <div class="trade-card__header">
          <span class="trade-card__ticker">${trade.ticker}</span>
          <span class="trade-card__shares">${trade.shares} shares</span>
        </div>
        <div class="trade-card__details">
          <div class="trade-card__detail">
            <span class="trade-card__label">Entry</span>
            <span class="trade-card__value">${formatCurrency(trade.entry)}</span>
          </div>
          <div class="trade-card__detail">
            <span class="trade-card__label">Stop</span>
            <span class="trade-card__value">${formatCurrency(trade.stop)}</span>
          </div>
          <div class="trade-card__detail">
            <span class="trade-card__label">Risk</span>
            <span class="trade-card__value">${formatCurrency(trade.riskDollars)}</span>
          </div>
          <div class="trade-card__detail">
            <span class="trade-card__label">Status</span>
            <span class="status-badge status-badge--open">Open</span>
          </div>
        </div>
        <div class="trade-card__actions">
          <button class="btn btn--sm btn--secondary" onclick="closeTrade(${trade.id})">Close</button>
          <button class="btn btn--sm btn--ghost" onclick="deleteTrade(${trade.id})">Delete</button>
        </div>
      </div>
    `).join('');
  }

  renderRiskSummary() {
    if (!this.elements.riskSummary) return;

    const openTrades = state.getOpenTrades();
    const totalRisk = openTrades.reduce((sum, t) => sum + t.riskDollars, 0);
    const riskPercent = (totalRisk / state.account.currentSize) * 100;

    let level = 'low';
    if (riskPercent > 2) level = 'high';
    else if (riskPercent > 0.5) level = 'medium';

    this.elements.riskSummary.innerHTML = `
      <span class="risk-summary__label">Total Risk:</span>
      <span class="risk-summary__value">${formatCurrency(totalRisk)}</span>
      <span class="risk-summary__percent">(${formatPercent(riskPercent)})</span>
      <span class="risk-summary__indicator risk-summary__indicator--${level}">${level.toUpperCase()}</span>
    `;
  }

  openModal() {
    this.elements.journalModal?.classList.add('open');
    this.elements.journalModalOverlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
    state.setUI('journalOpen', true);
    this.renderTable();
  }

  closeModal() {
    this.elements.journalModal?.classList.remove('open');
    this.elements.journalModalOverlay?.classList.remove('open');
    document.body.style.overflow = '';
    state.setUI('journalOpen', false);
  }

  renderTable(filter = 'all') {
    if (!this.elements.journalTableBody) return;

    const trades = state.getFilteredEntries(filter);

    if (trades.length === 0) {
      this.elements.journalTableBody.innerHTML = `
        <tr class="journal-empty">
          <td colspan="9">No trades ${filter !== 'all' ? 'with status "' + filter + '"' : 'logged yet'}</td>
        </tr>
      `;
      if (this.elements.journalSummaryText) {
        this.elements.journalSummaryText.textContent = '0 trades';
      }
      return;
    }

    this.elements.journalTableBody.innerHTML = trades.map(trade => {
      const date = formatDate(trade.timestamp);
      const pnlDisplay = trade.pnl !== null
        ? `<span class="${trade.pnl >= 0 ? 'text-success' : 'text-danger'}">${trade.pnl >= 0 ? '+' : ''}${formatCurrency(trade.pnl)}</span>`
        : '—';

      return `
        <tr data-id="${trade.id}">
          <td>${date}</td>
          <td>${trade.ticker}</td>
          <td>${formatCurrency(trade.entry)}</td>
          <td>${formatCurrency(trade.stop)}</td>
          <td>${trade.shares}</td>
          <td>${formatCurrency(trade.riskDollars)}</td>
          <td><span class="status-badge status-badge--${trade.status}">${trade.status}</span></td>
          <td>${pnlDisplay}</td>
          <td>
            <button class="btn btn--ghost btn--sm" onclick="deleteTrade(${trade.id})">×</button>
          </td>
        </tr>
      `;
    }).join('');

    // Summary
    const wins = trades.filter(t => t.pnl > 0).length;
    const losses = trades.filter(t => t.pnl < 0).length;
    const open = trades.filter(t => t.status === 'open').length;
    const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    if (this.elements.journalSummaryText) {
      this.elements.journalSummaryText.textContent =
        `${trades.length} trades | ${wins}W-${losses}L-${open}O | ${totalPnL >= 0 ? '+' : ''}${formatCurrency(totalPnL)}`;
    }
  }
}

export const journal = new Journal();
export { Journal };
