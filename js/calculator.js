/**
 * Calculator - Core position sizing calculations
 */

import { state } from './state.js';
import { parseNumber, formatCurrency, formatPercent, formatNumber, formatWithCommas } from './utils.js';

class Calculator {
  constructor() {
    this.elements = {};
  }

  init() {
    this.cacheElements();
    this.bindEvents();
    this.calculate();
  }

  cacheElements() {
    this.elements = {
      // Inputs
      accountSize: document.getElementById('accountSize'),
      riskPercent: document.getElementById('riskPercent'),
      maxPositionPercent: document.getElementById('maxPositionPercent'),
      ticker: document.getElementById('ticker'),
      entryPrice: document.getElementById('entryPrice'),
      stopLoss: document.getElementById('stopLoss'),
      targetPrice: document.getElementById('targetPrice'),

      // Results
      positionSize: document.getElementById('positionSize'),
      positionPercent: document.getElementById('positionPercent'),
      shares: document.getElementById('shares'),
      riskAmount: document.getElementById('riskAmount'),
      riskPercentDisplay: document.getElementById('riskPercentDisplay'),
      stopDistance: document.getElementById('stopDistance'),
      stopPerShare: document.getElementById('stopPerShare'),
      rMultiple: document.getElementById('rMultiple'),
      target5R: document.getElementById('target5R'),
      potentialProfit: document.getElementById('potentialProfit'),
      profitROI: document.getElementById('profitROI'),
      resultsTicker: document.getElementById('resultsTicker'),
      tradeInsights: document.getElementById('tradeInsights'),

      // Scenarios
      scenariosToggle: document.getElementById('scenariosToggle'),
      scenariosContent: document.getElementById('scenariosContent'),
      scenariosBody: document.getElementById('scenariosBody'),

      // Clear button
      clearCalculatorBtn: document.getElementById('clearCalculatorBtn')
    };
  }

  bindEvents() {
    const { accountSize, riskPercent, maxPositionPercent, ticker, entryPrice, stopLoss, targetPrice } = this.elements;

    // Input events
    [riskPercent, maxPositionPercent, ticker, entryPrice, stopLoss, targetPrice].forEach(el => {
      if (el) el.addEventListener('input', () => this.calculate());
    });

    // Account size with formatting on blur
    if (accountSize) {
      accountSize.addEventListener('input', () => this.calculate());
      accountSize.addEventListener('blur', (e) => {
        const num = parseNumber(e.target.value);
        if (num !== null) {
          e.target.value = formatWithCommas(num);
        }
      });
    }

    // Preset buttons
    document.querySelectorAll('.settings-grid .preset-group').forEach(group => {
      group.addEventListener('click', (e) => this.handlePresetClick(e));
    });

    // Scenarios toggle
    if (this.elements.scenariosToggle) {
      this.elements.scenariosToggle.addEventListener('click', () => this.toggleScenarios());
    }

    // Clear button
    if (this.elements.clearCalculatorBtn) {
      this.elements.clearCalculatorBtn.addEventListener('click', () => this.clear());
    }
  }

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
  }

  handlePresetClick(e) {
    const btn = e.target.closest('.preset-btn');
    if (!btn) return;

    const group = btn.closest('.preset-group');
    const value = parseFloat(btn.dataset.value);

    // Update active state
    group.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Determine which preset and update
    const card = btn.closest('.card');
    const title = card?.querySelector('.card__title')?.textContent || '';

    if (title.includes('Risk')) {
      this.elements.riskPercent.value = value;
      state.updateAccount({ riskPercent: value });
    } else if (title.includes('Max Position')) {
      this.elements.maxPositionPercent.value = value;
      state.updateAccount({ maxPositionPercent: value });
    }

    this.calculate();
  }

  toggleScenarios() {
    state.toggleUI('scenariosExpanded');
    this.elements.scenariosToggle?.classList.toggle('active', state.ui.scenariosExpanded);
    this.elements.scenariosContent?.classList.toggle('open', state.ui.scenariosExpanded);
  }

  calculate() {
    const accountSize = parseNumber(this.elements.accountSize?.value);
    const riskPercent = parseNumber(this.elements.riskPercent?.value);
    const entry = parseNumber(this.elements.entryPrice?.value);
    const stop = parseNumber(this.elements.stopLoss?.value);
    const target = parseNumber(this.elements.targetPrice?.value);
    const maxPositionPercent = parseNumber(this.elements.maxPositionPercent?.value) || state.account.maxPositionPercent;

    // Update state
    state.updateAccount({
      currentSize: accountSize || state.settings.startingAccountSize,
      riskPercent: riskPercent || state.settings.defaultRiskPercent
    });

    state.updateTrade({
      ticker: this.elements.ticker?.value.toUpperCase() || '',
      entry,
      stop,
      target
    });

    // Check target vs entry early (even before full validation)
    const hasTargetWarning = target && entry && target <= entry;

    // Validate minimum inputs
    if (!accountSize || !riskPercent || !entry || !stop) {
      this.clearStopError();
      this.renderEmptyResults();
      // Show target warning even with incomplete form
      if (hasTargetWarning) {
        this.updateInsights([{ type: 'warning', icon: '⚠️', text: 'Target should be above entry for long trades' }]);
      }
      return;
    }

    // Validate trade setup - stop must be below entry for long trades
    if (stop >= entry) {
      this.setStopError(true);
      this.renderEmptyResults();
      this.updateInsights([{ type: 'danger', icon: '⚠️', text: 'Stop must be below entry for long trades' }]);
      return;
    }

    // Valid setup - clear any error state
    this.setStopError(false);

    // Core calculations
    const riskPerShare = entry - stop;
    const riskDollars = accountSize * (riskPercent / 100);
    let shares = Math.floor(riskDollars / riskPerShare);
    let positionSize = shares * entry;
    let isLimited = false;

    // Apply max position limit
    const maxPosition = accountSize * (maxPositionPercent / 100);
    if (positionSize > maxPosition) {
      shares = Math.floor(maxPosition / entry);
      positionSize = shares * entry;
      isLimited = true;
    }

    const actualRiskDollars = shares * riskPerShare;
    const stopDistance = (riskPerShare / entry) * 100;
    const percentOfAccount = (positionSize / accountSize) * 100;

    // Profit calculations
    let rMultiple = null;
    let profit = null;
    let roi = null;

    if (target && target > entry) {
      const profitPerShare = target - entry;
      rMultiple = profitPerShare / riskPerShare;
      profit = shares * profitPerShare;
      roi = (profitPerShare / entry) * 100;
    }

    // 5R Target
    const target5R = entry + (5 * riskPerShare);

    // Update state results
    const results = {
      shares,
      positionSize,
      riskDollars: actualRiskDollars,
      stopDistance,
      stopPerShare: riskPerShare,
      rMultiple,
      target5R,
      profit,
      roi,
      isLimited,
      percentOfAccount
    };

    state.updateResults(results);

    // Render
    this.renderResults(results);
    this.renderInsights(entry, stop, target, stopDistance, isLimited);
    this.renderScenarios(accountSize, entry, riskPerShare, maxPositionPercent);
  }

  renderResults(r) {
    const ticker = state.trade.ticker || '—';

    // Animate updated cards
    document.querySelectorAll('.result-card').forEach(card => {
      card.classList.add('updated');
      setTimeout(() => card.classList.remove('updated'), 300);
    });

    // Primary results
    if (this.elements.positionSize) this.elements.positionSize.textContent = formatCurrency(r.positionSize);
    if (this.elements.positionPercent) this.elements.positionPercent.textContent = `${formatPercent(r.percentOfAccount)} of account`;
    if (this.elements.shares) this.elements.shares.textContent = formatNumber(r.shares);
    if (this.elements.riskAmount) this.elements.riskAmount.textContent = formatCurrency(r.riskDollars);
    if (this.elements.riskPercentDisplay) this.elements.riskPercentDisplay.textContent = `${formatPercent(state.account.riskPercent)} of account`;
    if (this.elements.stopDistance) this.elements.stopDistance.textContent = formatPercent(r.stopDistance);
    if (this.elements.stopPerShare) this.elements.stopPerShare.textContent = `${formatCurrency(r.stopPerShare)}/share`;
    if (this.elements.resultsTicker) this.elements.resultsTicker.textContent = ticker;

    // Profit targets
    if (r.rMultiple !== null) {
      if (this.elements.rMultiple) this.elements.rMultiple.textContent = `${r.rMultiple.toFixed(2)}R`;
      if (this.elements.potentialProfit) this.elements.potentialProfit.textContent = formatCurrency(r.profit);
      if (this.elements.profitROI) this.elements.profitROI.textContent = `${formatPercent(r.roi)} ROI`;
    } else {
      if (this.elements.rMultiple) this.elements.rMultiple.textContent = '—';
      if (this.elements.potentialProfit) this.elements.potentialProfit.textContent = '—';
      if (this.elements.profitROI) this.elements.profitROI.textContent = 'Set target to see';
    }

    if (this.elements.target5R) this.elements.target5R.textContent = formatCurrency(r.target5R);

    // Emit for header update
    state.emit('resultsRendered', r);
  }

  renderEmptyResults() {
    const defaults = {
      positionSize: '$0.00',
      positionPercent: '0% of account',
      shares: '0',
      riskAmount: '$0.00',
      riskPercentDisplay: '0% of account',
      stopDistance: '0%',
      stopPerShare: '$0.00/share',
      rMultiple: '—',
      target5R: '—',
      potentialProfit: '—',
      profitROI: '—',
      resultsTicker: '—'
    };

    Object.entries(defaults).forEach(([key, value]) => {
      if (this.elements[key]) this.elements[key].textContent = value;
    });
  }

  renderInsights(entry, stop, target, stopDistance, isLimited) {
    const insights = [];

    if (entry && stop) {
      insights.push({
        type: 'neutral',
        icon: '📉',
        text: `Stop is ${formatPercent(stopDistance)} below entry`
      });
    }

    if (target && entry) {
      const targetDistance = ((target - entry) / entry) * 100;
      if (target <= entry) {
        insights.push({
          type: 'warning',
          icon: '⚠️',
          text: 'Target should be above entry for long trades'
        });
      } else {
        insights.push({
          type: 'success',
          icon: '📈',
          text: `Target is ${formatPercent(targetDistance)} above entry`
        });
      }
    }

    if (isLimited) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        text: `Position limited to ${state.account.maxPositionPercent}% of account`
      });
    }

    this.updateInsights(insights);
  }

  updateInsights(insights) {
    if (!this.elements.tradeInsights) return;

    if (!insights.length) {
      this.elements.tradeInsights.innerHTML = `
        <div class="insight insight--neutral">
          <span class="insight__icon">📊</span>
          <span class="insight__text">Enter entry and stop to see insights</span>
        </div>
      `;
      return;
    }

    this.elements.tradeInsights.innerHTML = insights.map(i => `
      <div class="insight insight--${i.type}">
        <span class="insight__icon">${i.icon || '📊'}</span>
        <span class="insight__text">${i.text}</span>
      </div>
    `).join('');
  }

  renderScenarios(accountSize, entry, riskPerShare, maxPositionPercent) {
    if (!this.elements.scenariosBody) return;

    const riskLevels = [0.1, 0.25, 0.5, 1, 1.5];
    const currentRisk = state.account.riskPercent;
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

      return `
        <tr class="${isActive ? 'active' : ''}">
          <td>${formatPercent(risk, risk < 1 ? 2 : 1)}</td>
          <td>${formatNumber(shares)}</td>
          <td>${formatCurrency(positionSize)}</td>
          <td>${formatCurrency(actualRisk)}</td>
        </tr>
      `;
    }).join('');

    this.elements.scenariosBody.innerHTML = rows;
  }

  // Public method to fill form from parsed data
  fillFromParsed(parsed) {
    if (parsed.ticker && this.elements.ticker) this.elements.ticker.value = parsed.ticker;
    if (parsed.entry && this.elements.entryPrice) this.elements.entryPrice.value = parsed.entry;
    if (parsed.stop && this.elements.stopLoss) this.elements.stopLoss.value = parsed.stop;
    if (parsed.target && this.elements.targetPrice) this.elements.targetPrice.value = parsed.target;

    if (parsed.riskPercent) {
      if (this.elements.riskPercent) this.elements.riskPercent.value = parsed.riskPercent;
      state.updateAccount({ riskPercent: parsed.riskPercent });

      // Update preset buttons
      const riskCard = this.elements.riskPercent?.closest('.card');
      if (riskCard) {
        riskCard.querySelectorAll('.preset-btn').forEach(btn => {
          btn.classList.toggle('active', parseFloat(btn.dataset.value) === parsed.riskPercent);
        });
      }
    }

    this.calculate();
  }

  // Validation helpers
  setStopError(hasError) {
    if (this.elements.stopLoss) {
      this.elements.stopLoss.classList.toggle('input--error', hasError);
    }
  }

  clearStopError() {
    this.setStopError(false);
  }
}

export const calculator = new Calculator();
export { Calculator };
