/**
 * CompoundView - Compound growth visualization table
 */

import { parseNumber, formatWithCommas } from './utils.js';
import { state } from './state.js';

class CompoundView {
  constructor() {
    this.elements = {};
    this.startingCapital = 10000; // Will be updated from state in init()
    this.returnRates = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200];
    this.years = 10;

    // Simplified contribution model
    this.contributionMode = null; // null, 'deposits', 'withdrawals', 'both'
    this.deposits = { amount: 0, frequency: 'monthly' };
    this.withdrawals = { amount: 0, frequency: 'monthly' };
  }

  init() {
    this.cacheElements();
    this.bindEvents();

    // Set starting capital from user's account size
    this.startingCapital = state.account.currentSize || 10000;
    if (this.elements.input) {
      this.elements.input.value = this.startingCapital.toLocaleString();
    }
    this.updatePresetStates();

    // Listen for account size changes
    state.on('accountSizeChanged', (size) => {
      // Only update if user hasn't manually changed the value
      if (this.startingCapital === state.account.currentSize ||
          this.startingCapital === 10000) {
        this.startingCapital = size;
        if (this.elements.input) {
          this.elements.input.value = size.toLocaleString();
        }
        this.updatePresetStates();
        this.render();
      }
    });

    this.render();
  }

  cacheElements() {
    this.elements = {
      view: document.getElementById('compoundView'),
      input: document.getElementById('compoundStartingCapital'),
      presets: document.querySelectorAll('#compoundView .preset-group .preset-btn[data-capital]'),
      tableHead: document.querySelector('#compoundTable thead tr'),
      tableBody: document.getElementById('compoundTableBody'),
      summaryContainer: document.getElementById('compoundSummary'),
      // Contribution elements
      modeToggle: document.getElementById('contributionModeToggle'),
      modeButtons: document.querySelectorAll('#contributionModeToggle .preset-btn'),
      fieldsWrapper: document.getElementById('contributionFieldsWrapper'),
      depositFields: document.getElementById('depositFields'),
      withdrawalFields: document.getElementById('withdrawalFields'),
      depositAmount: document.getElementById('depositAmount'),
      depositFrequency: document.getElementById('depositFrequency'),
      withdrawalAmount: document.getElementById('withdrawalAmount'),
      withdrawalFrequency: document.getElementById('withdrawalFrequency')
    };
  }

  bindEvents() {
    // Input change
    this.elements.input?.addEventListener('input', () => this.handleInputChange());
    this.elements.input?.addEventListener('blur', () => this.handleInputChange());

    // Preset buttons
    this.elements.presets?.forEach(btn => {
      btn.addEventListener('click', (e) => this.handlePresetClick(e));
    });

    // Contribution mode toggle
    this.elements.modeButtons?.forEach(btn => {
      btn.addEventListener('click', () => this.handleModeToggle(btn.dataset.mode));
    });

    // Deposit inputs
    this.elements.depositAmount?.addEventListener('input', () => this.handleDepositChange());
    this.elements.depositAmount?.addEventListener('blur', () => this.handleDepositChange());
    this.elements.depositFrequency?.addEventListener('change', () => this.handleDepositChange());

    // Withdrawal inputs
    this.elements.withdrawalAmount?.addEventListener('input', () => this.handleWithdrawalChange());
    this.elements.withdrawalAmount?.addEventListener('blur', () => this.handleWithdrawalChange());
    this.elements.withdrawalFrequency?.addEventListener('change', () => this.handleWithdrawalChange());
  }

  handleInputChange() {
    const inputValue = this.elements.input?.value || '';
    const value = parseNumber(inputValue);
    if (value && value > 0) {
      this.startingCapital = value;

      // Auto-expand K/M notation (e.g., "50k" -> "50,000")
      if (inputValue.toLowerCase().includes('k') || inputValue.toLowerCase().includes('m')) {
        this.elements.input.value = formatWithCommas(value);
      }

      this.updatePresetStates();
      this.render();
    }
  }

  handlePresetClick(e) {
    const btn = e.target.closest('[data-capital]');
    if (!btn) return;

    const value = parseInt(btn.dataset.capital);
    this.startingCapital = value;
    this.elements.input.value = value.toLocaleString();
    this.updatePresetStates();
    this.render();
  }

  updatePresetStates() {
    this.elements.presets?.forEach(btn => {
      const val = parseInt(btn.dataset.capital);
      btn.classList.toggle('active', val === this.startingCapital);
    });
  }

  handleModeToggle(mode) {
    // Toggle off if clicking the same mode
    if (this.contributionMode === mode) {
      this.contributionMode = null;
    } else {
      this.contributionMode = mode;
    }

    this.updateModeUI();
    this.render();
  }

  updateModeUI() {
    // Update button states
    this.elements.modeButtons?.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === this.contributionMode);
    });

    // Determine what to show
    const showDeposits = this.contributionMode === 'deposits' || this.contributionMode === 'both';
    const showWithdrawals = this.contributionMode === 'withdrawals' || this.contributionMode === 'both';
    const showAny = showDeposits || showWithdrawals;

    // Show/hide wrapper
    if (this.elements.fieldsWrapper) {
      this.elements.fieldsWrapper.style.display = showAny ? 'flex' : 'none';
    }

    // Show/hide individual fields
    if (this.elements.depositFields) {
      this.elements.depositFields.style.display = showDeposits ? 'block' : 'none';
    }
    if (this.elements.withdrawalFields) {
      this.elements.withdrawalFields.style.display = showWithdrawals ? 'block' : 'none';
    }
  }

  handleDepositChange() {
    const inputValue = this.elements.depositAmount?.value || '';
    const value = parseNumber(inputValue);
    this.deposits.amount = value || 0;
    this.deposits.frequency = this.elements.depositFrequency?.value || 'monthly';

    // Auto-expand K/M notation
    if (inputValue.toLowerCase().includes('k') || inputValue.toLowerCase().includes('m')) {
      this.elements.depositAmount.value = formatWithCommas(value);
    }

    this.render();
  }

  handleWithdrawalChange() {
    const inputValue = this.elements.withdrawalAmount?.value || '';
    const value = parseNumber(inputValue);
    this.withdrawals.amount = value || 0;
    this.withdrawals.frequency = this.elements.withdrawalFrequency?.value || 'monthly';

    // Auto-expand K/M notation
    if (inputValue.toLowerCase().includes('k') || inputValue.toLowerCase().includes('m')) {
      this.elements.withdrawalAmount.value = formatWithCommas(value);
    }

    this.render();
  }

  getAnnualContribution() {
    // If no mode selected, no contributions
    if (!this.contributionMode) return 0;

    const frequencyMultiplier = { monthly: 12, quarterly: 4, yearly: 1 };

    let annual = 0;

    // Add deposits
    if (this.contributionMode === 'deposits' || this.contributionMode === 'both') {
      const depositMultiplier = frequencyMultiplier[this.deposits.frequency] || 12;
      annual += this.deposits.amount * depositMultiplier;
    }

    // Subtract withdrawals
    if (this.contributionMode === 'withdrawals' || this.contributionMode === 'both') {
      const withdrawalMultiplier = frequencyMultiplier[this.withdrawals.frequency] || 12;
      annual -= this.withdrawals.amount * withdrawalMultiplier;
    }

    return annual;
  }

  calculateCompoundValue(principal, rate, years) {
    let value = principal;
    const annualContribution = this.getAnnualContribution();

    for (let year = 1; year <= years; year++) {
      // Apply compound interest
      value = value * (1 + rate / 100);
      // Add net contribution (deposits - withdrawals)
      value += annualContribution;
    }

    return Math.max(0, value); // Don't go negative
  }

  getGlowClass(value) {
    if (value >= 5000000) return 'compound-cell--gold';    // $5M+
    if (value >= 1000000) return 'compound-cell--green';   // $1M - $5M
    if (value >= 100000) return 'compound-cell--white';    // $100K - $1M
    return '';
  }

  formatCompact(value) {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  }

  render() {
    this.renderHeader();
    this.renderBody();
    this.renderSummary();
  }

  renderHeader() {
    if (!this.elements.tableHead) return;

    let html = '<th class="compound-th compound-th--year">Year</th>';
    this.returnRates.forEach(rate => {
      html += `<th class="compound-th growth-${rate}" data-rate="${rate}">${rate}%</th>`;
    });
    this.elements.tableHead.innerHTML = html;
  }

  renderBody() {
    if (!this.elements.tableBody) return;

    let html = '';
    for (let year = 1; year <= this.years; year++) {
      html += `<tr class="compound-row stagger-${year}">`;
      html += `<td class="compound-cell compound-cell--year">${year}</td>`;

      this.returnRates.forEach(rate => {
        const value = this.calculateCompoundValue(this.startingCapital, rate, year);
        const glowClass = this.getGlowClass(value);
        const formatted = this.formatCompact(value);

        html += `<td class="compound-cell ${glowClass}" data-value="${value}">${formatted}</td>`;
      });

      html += '</tr>';
    }
    this.elements.tableBody.innerHTML = html;
  }

  formatMultiplier(value) {
    const multiplier = Math.round(value / this.startingCapital);
    if (multiplier >= 1000000) return `${(multiplier / 1000000).toFixed(1)}M× growth`;
    if (multiplier >= 1000) return `${(multiplier / 1000).toFixed(0)}K× growth`;
    return `${multiplier.toLocaleString()}× growth`;
  }

  renderSummary() {
    if (!this.elements.summaryContainer) return;

    const milestones = [
      { label: '5 Years @ 50%', rate: 50, years: 5, variant: 'success' },
      { label: '10 Years @ 50%', rate: 50, years: 10, variant: 'success' },
      { label: '10 Years @ 100%', rate: 100, years: 10, variant: 'success' },
      { label: 'Best Case (10yr @ 200%)', rate: 200, years: 10, variant: 'warning' }
    ];

    const html = milestones.map(m => {
      const value = this.calculateCompoundValue(this.startingCapital, m.rate, m.years);
      const formatted = this.formatCompact(value);
      const multiplier = this.formatMultiplier(value);

      return `
        <div class="stat-card stat-card--${m.variant}">
          <span class="stat-card__label">${m.label}</span>
          <span class="stat-card__value">+${formatted}</span>
          <span class="stat-card__sub">${multiplier}</span>
        </div>
      `;
    }).join('');

    this.elements.summaryContainer.innerHTML = html;
  }
}

export const compoundView = new CompoundView();
