/**
 * CompoundView - Compound growth visualization table
 */

import { parseNumber } from './utils.js';

class CompoundView {
  constructor() {
    this.elements = {};
    this.startingCapital = 10000;
    this.returnRates = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200];
    this.years = 10;
    this.contributions = {
      recurring: { amount: 0, frequency: 'monthly', type: 'deposit' },
      oneTime: []
    };
  }

  init() {
    this.cacheElements();
    this.bindEvents();
    this.render();
  }

  cacheElements() {
    this.elements = {
      view: document.getElementById('compoundView'),
      input: document.getElementById('compoundStartingCapital'),
      presets: document.querySelectorAll('#compoundView .preset-group .preset-btn[data-capital]'),
      tableHead: document.querySelector('#compoundTable thead tr'),
      tableBody: document.getElementById('compoundTableBody'),
      // Contribution elements
      recurringAmount: document.getElementById('recurringAmount'),
      recurringFrequency: document.getElementById('recurringFrequency'),
      recurringToggle: document.querySelectorAll('.contribution-toggle .toggle-btn'),
      oneTimeRows: document.getElementById('oneTimeRows'),
      addOneTimeRowBtn: document.getElementById('addOneTimeRowBtn'),
      summaryContainer: document.getElementById('compoundSummary')
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

    // Contribution events
    this.bindContributionEvents();
  }

  bindContributionEvents() {
    // Recurring amount change
    this.elements.recurringAmount?.addEventListener('input', () => {
      this.contributions.recurring.amount = parseNumber(this.elements.recurringAmount.value) || 0;
      this.render();
    });

    this.elements.recurringAmount?.addEventListener('blur', () => {
      this.contributions.recurring.amount = parseNumber(this.elements.recurringAmount.value) || 0;
      this.render();
    });

    // Recurring frequency change
    this.elements.recurringFrequency?.addEventListener('change', (e) => {
      this.contributions.recurring.frequency = e.target.value;
      this.render();
    });

    // Deposit/Withdrawal toggle
    this.elements.recurringToggle?.forEach(btn => {
      btn.addEventListener('click', () => {
        this.elements.recurringToggle.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.contributions.recurring.type = btn.dataset.type;
        this.render();
      });
    });

    // Add one-time row button
    this.elements.addOneTimeRowBtn?.addEventListener('click', () => this.addOneTimeRow());
  }

  handleInputChange() {
    const value = parseNumber(this.elements.input?.value);
    if (value && value > 0) {
      this.startingCapital = value;
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

  // One-time row methods
  addOneTimeRow(year = 1, amount = 0, type = 'deposit') {
    const index = this.contributions.oneTime.length;
    this.contributions.oneTime.push({ year, amount, type });
    this.renderOneTimeRows();

    // Focus the new amount input
    const newRow = this.elements.oneTimeRows?.querySelector(`[data-index="${index}"] .onetime-row__amount input`);
    newRow?.focus();
  }

  removeOneTimeRow(index) {
    this.contributions.oneTime.splice(index, 1);
    this.renderOneTimeRows();
    this.render();
  }

  updateOneTimeRow(index, field, value) {
    if (!this.contributions.oneTime[index]) return;

    if (field === 'year') {
      this.contributions.oneTime[index].year = parseInt(value);
    } else if (field === 'amount') {
      this.contributions.oneTime[index].amount = parseNumber(value) || 0;
    } else if (field === 'type') {
      this.contributions.oneTime[index].type = value;
    }

    // Update row styling for deposit/withdrawal
    if (field === 'type') {
      this.renderOneTimeRows();
    }

    this.render();
  }

  renderOneTimeRows() {
    if (!this.elements.oneTimeRows) return;

    if (this.contributions.oneTime.length === 0) {
      this.elements.oneTimeRows.innerHTML = '';
      return;
    }

    const yearOptions = Array.from({ length: 10 }, (_, i) => i + 1)
      .map(y => `<option value="${y}">Year ${y}</option>`)
      .join('');

    this.elements.oneTimeRows.innerHTML = this.contributions.oneTime
      .map((c, i) => `
        <div class="onetime-row onetime-row--${c.type}" data-index="${i}">
          <select class="input input--select onetime-row__year" data-field="year">
            ${yearOptions.replace(`value="${c.year}"`, `value="${c.year}" selected`)}
          </select>
          <div class="input-wrapper input-wrapper--prefix onetime-row__amount">
            <span class="input-prefix">$</span>
            <input type="text" class="input input--mono" value="${c.amount || ''}" placeholder="0" data-field="amount">
          </div>
          <div class="onetime-row__toggle">
            <button type="button" class="toggle-btn ${c.type === 'deposit' ? 'active' : ''}" data-type="deposit">+</button>
            <button type="button" class="toggle-btn ${c.type === 'withdrawal' ? 'active' : ''}" data-type="withdrawal">−</button>
          </div>
          <button type="button" class="onetime-row__remove" data-action="remove">×</button>
        </div>
      `).join('');

    // Bind events to all rows
    this.elements.oneTimeRows.querySelectorAll('.onetime-row').forEach(row => {
      const index = parseInt(row.dataset.index);

      // Year change
      row.querySelector('[data-field="year"]')?.addEventListener('change', (e) => {
        this.updateOneTimeRow(index, 'year', e.target.value);
      });

      // Amount change
      const amountInput = row.querySelector('[data-field="amount"]');
      amountInput?.addEventListener('input', (e) => {
        this.updateOneTimeRow(index, 'amount', e.target.value);
      });
      amountInput?.addEventListener('blur', (e) => {
        this.updateOneTimeRow(index, 'amount', e.target.value);
      });

      // Toggle buttons
      row.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.updateOneTimeRow(index, 'type', btn.dataset.type);
        });
      });

      // Remove button
      row.querySelector('[data-action="remove"]')?.addEventListener('click', () => {
        this.removeOneTimeRow(index);
      });
    });
  }

  getAnnualContribution() {
    const { amount, frequency, type } = this.contributions.recurring;
    const multiplier = { weekly: 52, monthly: 12, yearly: 1 }[frequency];
    const annual = amount * multiplier;
    return type === 'deposit' ? annual : -annual;
  }

  calculateCompoundValue(principal, rate, years) {
    let value = principal;
    const annualContribution = this.getAnnualContribution();

    for (let year = 1; year <= years; year++) {
      // Apply compound interest
      value = value * (1 + rate / 100);

      // Add recurring contribution
      value += annualContribution;

      // Add one-time deposits/withdrawals for this year
      const oneTime = this.contributions.oneTime
        .filter(c => c.year === year)
        .reduce((sum, c) => sum + (c.type === 'deposit' ? c.amount : -c.amount), 0);
      value += oneTime;
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
          <span class="stat-card__value">${formatted}</span>
          <span class="stat-card__sub">${multiplier}</span>
        </div>
      `;
    }).join('');

    this.elements.summaryContainer.innerHTML = html;
  }
}

export const compoundView = new CompoundView();
