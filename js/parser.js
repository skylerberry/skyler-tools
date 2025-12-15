/**
 * Discord Alert Parser - Parse trading alerts from Discord
 */

import { calculator } from './calculator.js';
import { showToast } from './ui.js';

class AlertParser {
  constructor() {
    this.elements = {};
  }

  init() {
    this.cacheElements();
    this.bindEvents();
  }

  cacheElements() {
    this.elements = {
      alertCard: document.getElementById('alertCard'),
      alertToggle: document.getElementById('alertToggle'),
      alertInput: document.getElementById('alertInput'),
      parseBtn: document.getElementById('parseAlertBtn')
    };
  }

  bindEvents() {
    // Toggle collapsible
    if (this.elements.alertToggle && this.elements.alertCard) {
      this.elements.alertToggle.addEventListener('click', () => {
        this.elements.alertCard.classList.toggle('open');
      });
    }

    // Parse button
    if (this.elements.parseBtn) {
      this.elements.parseBtn.addEventListener('click', () => this.parseAndFill());
    }

    // Enter key to parse
    if (this.elements.alertInput) {
      this.elements.alertInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.parseAndFill();
        }
      });
    }
  }

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
    if (entryMatch) {
      result.entry = parseFloat(entryMatch[1]);
    }

    // Stop loss: sl 237.90, stop 237, stop loss @ 237.90
    const stopMatch = text.match(/(?:sl|stop(?:\s*loss)?)\s*@?\s*\$?\s*([\d.]+)/i);
    if (stopMatch) {
      result.stop = parseFloat(stopMatch[1]);
    }

    // Risk percent: risking 1%, risk 0.5%
    const riskMatch = text.match(/risk(?:ing)?\s*([\d.]+)\s*%/i);
    if (riskMatch) {
      result.riskPercent = parseFloat(riskMatch[1]);
    }

    // Target: target 260, tp 260, pt 260
    const targetMatch = text.match(/(?:target|tp|pt)\s*@?\s*\$?\s*([\d.]+)/i);
    if (targetMatch) {
      result.target = parseFloat(targetMatch[1]);
    }

    // Require at least entry AND stop for a valid alert
    if (!result.entry || !result.stop) {
      return null;
    }

    return result;
  }

  parseAndFill() {
    const text = this.elements.alertInput?.value;
    const parsed = this.parse(text);

    if (!parsed || (!parsed.ticker && !parsed.entry && !parsed.stop)) {
      this.elements.alertInput?.classList.add('error');
      setTimeout(() => this.elements.alertInput?.classList.remove('error'), 500);
      showToast('Could not parse alert', 'warning');
      return;
    }

    // Fill calculator
    calculator.fillFromParsed(parsed);

    // Build feedback message
    const parts = [];
    if (parsed.ticker) parts.push(parsed.ticker);
    if (parsed.entry) parts.push(`@ $${parseFloat(parsed.entry).toFixed(2)}`);
    if (parsed.stop) parts.push(`SL $${parseFloat(parsed.stop).toFixed(2)}`);
    if (parsed.riskPercent) parts.push(`${parsed.riskPercent}%`);

    // Clear input
    if (this.elements.alertInput) {
      this.elements.alertInput.value = '';
      this.elements.alertInput.classList.add('flash-success');
      setTimeout(() => this.elements.alertInput.classList.remove('flash-success'), 1000);
    }

    showToast(`Parsed: ${parts.join(' | ')}`, 'success');

    // On mobile, scroll to Position Details section
    this.scrollToResultsOnMobile();
  }

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
}

export const parser = new AlertParser();
export { AlertParser };
