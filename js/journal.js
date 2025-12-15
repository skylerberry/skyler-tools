/**
 * Journal - Trade logging and management
 */

import { state } from './state.js';
import { formatCurrency, formatPercent, formatDate } from './utils.js';
import { showToast } from './ui.js';
import { trimModal } from './trimModal.js';

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
    // Open trim modal instead of browser prompt
    trimModal.open(id);
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
    // Include both open and trimmed trades (they still have positions)
    const activeTrades = state.journal.entries.filter(e => e.status === 'open' || e.status === 'trimmed');

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
        </div>
      `;
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
              <span class="trade-card__value">${formatCurrency(trade.entry)}</span>
            </div>
            <div class="trade-card__detail">
              <span class="trade-card__label">Stop</span>
              <span class="trade-card__value">${formatCurrency(trade.stop)}</span>
            </div>
            <div class="trade-card__detail">
              <span class="trade-card__label">Risk</span>
              <span class="trade-card__value">${formatCurrency(currentRisk)}</span>
            </div>
            <div class="trade-card__detail">
              <span class="trade-card__label">Status</span>
              <span class="status-badge status-badge--${trade.status}">${isTrimmed ? 'Trimmed' : 'Open'}</span>
            </div>
            ${isTrimmed ? `
            <div class="trade-card__detail">
              <span class="trade-card__label">Realized</span>
              <span class="trade-card__value ${realizedPnL >= 0 ? 'text-success' : 'text-danger'}">${realizedPnL >= 0 ? '+' : ''}${formatCurrency(realizedPnL)}</span>
            </div>
            ` : ''}
          </div>
          <div class="trade-card__actions">
            <button class="btn btn--sm btn--secondary" onclick="closeTrade(${trade.id})">${isTrimmed ? 'Trim More' : 'Close'}</button>
            <button class="btn btn--sm btn--ghost" onclick="deleteTrade(${trade.id})">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderRiskSummary() {
    if (!this.elements.riskSummary) return;

    // Include both open and trimmed trades (they still have positions at risk)
    const activeTrades = state.journal.entries.filter(e => e.status === 'open' || e.status === 'trimmed');

    // Show CASH status when no active trades
    if (activeTrades.length === 0) {
      this.elements.riskSummary.innerHTML = `
        <span class="risk-summary__label">Status:</span>
        <span class="risk-summary__indicator risk-summary__indicator--low">CASH</span>
      `;
      return;
    }

    // Calculate risk based on remaining shares
    const totalRisk = activeTrades.reduce((sum, t) => {
      const shares = t.remainingShares ?? t.shares;
      const riskPerShare = t.entry - t.stop;
      return sum + (shares * riskPerShare);
    }, 0);
    const riskPercent = (totalRisk / state.account.currentSize) * 100;

    let level = 'low';
    if (riskPercent > 2) level = 'high';
    else if (riskPercent > 0.5) level = 'medium';

    this.elements.riskSummary.innerHTML = `
      <span class="risk-summary__label">Open Risk:</span>
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
      const isTrimmed = trade.status === 'trimmed';
      const isClosed = trade.status === 'closed';

      // Use totalRealizedPnL for trimmed/closed trades, fallback to pnl for legacy
      const pnlValue = trade.totalRealizedPnL ?? trade.pnl;
      const pnlDisplay = pnlValue !== null && pnlValue !== undefined
        ? `<span class="${pnlValue >= 0 ? 'text-success' : 'text-danger'}">${pnlValue >= 0 ? '+' : ''}${formatCurrency(pnlValue)}</span>`
        : '—';

      // Show remaining shares for trimmed trades
      const sharesDisplay = isTrimmed
        ? `${trade.remainingShares}/${trade.originalShares}`
        : trade.shares;

      return `
        <tr data-id="${trade.id}">
          <td>${date}</td>
          <td>${trade.ticker}</td>
          <td>${formatCurrency(trade.entry)}</td>
          <td>${formatCurrency(trade.stop)}</td>
          <td>${sharesDisplay}</td>
          <td>${formatCurrency(trade.riskDollars)}</td>
          <td><span class="status-badge status-badge--${trade.status}">${trade.status}</span></td>
          <td>${pnlDisplay}</td>
          <td>
            <button class="btn btn--ghost btn--sm" onclick="deleteTrade(${trade.id})">×</button>
          </td>
        </tr>
      `;
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
        `${trades.length} trades | ${wins}W-${losses}L-${activeCount}A | ${totalPnL >= 0 ? '+' : ''}${formatCurrency(totalPnL)}`;
    }
  }
}

export const journal = new Journal();
export { Journal };
