/**
 * View Manager - Handles view swapping between 4 views
 */

import { state } from './state.js';

class ViewManager {
  constructor() {
    this.currentView = 'dashboard';
    this.views = {
      dashboard: null,
      positions: null,
      journal: null,
      stats: null,
      compound: null
    };
    this.navElement = null;
    this.navButtons = null;
    this.mobileBreakpoint = 800;
  }

  init() {
    // Get DOM elements for all views
    this.views.dashboard = document.querySelector('.main');
    this.views.positions = document.getElementById('positionsView');
    this.views.journal = document.getElementById('journalView');
    this.views.stats = document.getElementById('statsView');
    this.views.compound = document.getElementById('compoundView');
    this.navElement = document.getElementById('viewNav');
    this.navButtons = document.querySelectorAll('.view-nav__btn');

    if (!this.views.dashboard) {
      console.warn('ViewManager: Dashboard element not found');
      return;
    }

    // Set initial state - dashboard visible, others hidden
    Object.entries(this.views).forEach(([name, el]) => {
      if (!el) return;
      if (name === 'dashboard') {
        el.classList.add('view--active');
        el.classList.remove('view--hidden');
      } else {
        el.classList.remove('view--active');
        el.classList.add('view--hidden');
      }
    });

    // Bind navigation buttons with mobile-aware handling
    this.navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        const isActive = e.currentTarget.classList.contains('view-nav__btn--active');

        if (this.isMobile()) {
          if (!this.isNavExpanded()) {
            // Collapsed: expand nav (don't switch view yet)
            e.stopPropagation();
            this.expandNav();
          } else {
            // Expanded: switch view and collapse
            if (view && !isActive) {
              this.switchTo(view);
            }
            this.collapseNav();
          }
        } else {
          // Desktop: just switch view
          if (view) this.switchTo(view);
        }
      });
    });

    // Close expanded nav when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isMobile() && this.isNavExpanded()) {
        if (!this.navElement.contains(e.target)) {
          this.collapseNav();
        }
      }
    });

    // Handle URL hash on load
    this.initDeepLink();

    // Keyboard shortcuts: Cmd/Ctrl + 1-4 for direct navigation
    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey) {
        const viewMap = { '1': 'dashboard', '2': 'positions', '3': 'journal', '4': 'stats', '5': 'compound' };
        if (viewMap[e.key]) {
          e.preventDefault();
          this.switchTo(viewMap[e.key]);
          if (this.isMobile()) this.collapseNav();
        }
      }
    });
  }

  // Mobile nav helpers
  isMobile() {
    return window.innerWidth <= this.mobileBreakpoint;
  }

  isNavExpanded() {
    return this.navElement?.classList.contains('view-nav--expanded');
  }

  expandNav() {
    this.navElement?.classList.add('view-nav--expanded');
  }

  collapseNav() {
    this.navElement?.classList.remove('view-nav--expanded');
  }

  initDeepLink() {
    const hash = window.location.hash.slice(1);
    if (hash && this.views[hash]) {
      this.switchTo(hash, { animate: false });
    }
  }

  switchTo(view, options = { animate: true }) {
    if (view === this.currentView) return;
    if (!this.views[view]) return;

    const previousView = this.currentView;
    const fromView = this.views[previousView];
    const toView = this.views[view];

    if (!fromView || !toView) return;

    // Update button states
    this.navButtons.forEach(btn => {
      const isActive = btn.dataset.view === view;
      btn.classList.toggle('view-nav__btn--active', isActive);
    });

    // Update URL hash
    window.history.replaceState(null, '', `#${view}`);

    if (options.animate) {
      // Animate out current view
      fromView.classList.add('view--hiding');
      fromView.classList.remove('view--active');

      // Short delay for animation, then hide and show new view
      setTimeout(() => {
        fromView.classList.remove('view--hiding');
        fromView.classList.add('view--hidden');

        // Show and animate in new view
        toView.classList.remove('view--hidden');
        toView.classList.add('view--entering');
        toView.classList.add('view--active');

        setTimeout(() => {
          toView.classList.remove('view--entering');
        }, 300);
      }, 200);
    } else {
      // Instant switch (no animation)
      fromView.classList.remove('view--active');
      fromView.classList.add('view--hidden');
      toView.classList.remove('view--hidden');
      toView.classList.add('view--active');
    }

    this.currentView = view;

    // Emit event for other modules to react
    state.emit('viewChanged', { from: previousView, to: view });
  }

  toggle() {
    // Cycle through views: dashboard → positions → journal → stats → dashboard
    const viewOrder = ['dashboard', 'positions', 'journal', 'stats', 'compound'];
    const currentIndex = viewOrder.indexOf(this.currentView);
    const nextIndex = (currentIndex + 1) % viewOrder.length;
    this.switchTo(viewOrder[nextIndex]);
  }

  isStatsView() {
    return this.currentView === 'stats';
  }

  isDashboardView() {
    return this.currentView === 'dashboard';
  }

  isPositionsView() {
    return this.currentView === 'positions';
  }

  isJournalView() {
    return this.currentView === 'journal';
  }

  isCompoundView() {
    return this.currentView === 'compound';
  }

  // Navigate to a specific view (for use by other modules)
  navigateTo(view) {
    if (this.views[view] !== undefined) {
      this.switchTo(view);
    }
  }
}

export const viewManager = new ViewManager();
export { ViewManager };
