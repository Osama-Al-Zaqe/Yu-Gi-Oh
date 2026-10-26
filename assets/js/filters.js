/**
 * YuGi Ultimate Encyclopedia - UI Filters & Search Controller
 * Handles inputs, debounced live search, filter chips, drawer toggles, and reset events.
 */

class FiltersController {
  constructor() {
    this.debounceTimer = null;
  }

  init() {
    this.bindSearch();
    this.bindTypeChips();
    this.bindSortSelect();
    this.bindAdvancedFilters();
    this.bindResetBtn();
  }

  bindSearch() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear-btn');
    if (!input) return;

    input.addEventListener('input', (e) => {
      const val = e.target.value;
      if (clearBtn) {
        clearBtn.style.display = val ? 'block' : 'none';
      }

      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        window.cardsManager.filters.search = val;
        window.cardsManager.applyFilters();
        window.app.renderCardsGrid();
        this.updateActiveFilterIndicators();
      }, 200);
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.style.display = 'none';
        window.cardsManager.filters.search = '';
        window.cardsManager.applyFilters();
        window.app.renderCardsGrid();
        this.updateActiveFilterIndicators();
        input.focus();
      });
    }
  }

  bindTypeChips() {
    const chips = document.querySelectorAll('.chip-btn');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        const cat = chip.dataset.category || 'all';
        window.cardsManager.filters.category = cat;
        window.cardsManager.applyFilters();
        window.app.renderCardsGrid();
        this.updateActiveFilterIndicators();
      });
    });
  }

  bindSortSelect() {
    const sortSelect = document.getElementById('sort-select');
    if (!sortSelect) return;

    sortSelect.addEventListener('change', (e) => {
      window.cardsManager.sortBy = e.target.value;
      window.cardsManager.applySorting();
      window.cardsManager.currentPage = 1;
      window.app.renderCardsGrid();
    });
  }

  bindAdvancedFilters() {
    const drawerToggle = document.getElementById('advanced-filters-toggle');
    const drawerPanel = document.getElementById('advanced-filters-panel');

    if (drawerToggle && drawerPanel) {
      drawerToggle.addEventListener('click', () => {
        drawerPanel.classList.toggle('open');
      });
    }

    // Select dropdowns
    const bindSelect = (id, filterKey) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', (e) => {
          window.cardsManager.filters[filterKey] = e.target.value;
          window.cardsManager.applyFilters();
          window.app.renderCardsGrid();
          this.updateActiveFilterIndicators();
        });
      }
    };

    bindSelect('filter-monster-type', 'monsterType');
    bindSelect('filter-spell-type', 'spellType');
    bindSelect('filter-trap-type', 'trapType');
    bindSelect('filter-attribute', 'attribute');
    bindSelect('filter-race', 'race');
    bindSelect('filter-level', 'level');
    bindSelect('filter-status', 'verificationStatus');

    // Number Inputs (ATK / DEF)
    const bindRange = (id, filterKey) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', (e) => {
          clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => {
            window.cardsManager.filters[filterKey] = e.target.value !== '' ? parseInt(e.target.value, 10) : null;
            window.cardsManager.applyFilters();
            window.app.renderCardsGrid();
            this.updateActiveFilterIndicators();
          }, 300);
        });
      }
    };

    bindRange('filter-atk-min', 'atkMin');
    bindRange('filter-atk-max', 'atkMax');
    bindRange('filter-def-min', 'defMin');
    bindRange('filter-def-max', 'defMax');

    // Checkboxes (Special abilities)
    const bindCheck = (id, filterKey) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', (e) => {
          window.cardsManager.filters[filterKey] = e.target.checked;
          window.cardsManager.applyFilters();
          window.app.renderCardsGrid();
          this.updateActiveFilterIndicators();
        });
      }
    };

    bindCheck('check-destroy', 'canDestroy');
    bindCheck('check-boost', 'canBoost');
    bindCheck('check-summon', 'canSummon');
    bindCheck('check-negate', 'canNegate');
    bindCheck('check-recover', 'canRecover');
    bindCheck('check-cost', 'hasCost');
    bindCheck('check-alt-art', 'showAltArt');
  }

  bindResetBtn() {
    const btn = document.getElementById('reset-filters-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      this.resetAll();
    });
  }

  resetAll() {
    // Reset filters state
    window.cardsManager.filters = {
      search: '',
      category: 'all',
      monsterType: 'all',
      spellType: 'all',
      trapType: 'all',
      attribute: 'all',
      race: 'all',
      level: 'all',
      atkMin: null,
      atkMax: null,
      defMin: null,
      defMax: null,
      canDestroy: false,
      canBoost: false,
      canSummon: false,
      canNegate: false,
      canRecover: false,
      hasCost: false,
      showAltArt: true,
      verificationStatus: 'all'
    };

    // Reset UI Inputs
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) clearBtn.style.display = 'none';

    document.querySelectorAll('.chip-btn').forEach(c => {
      c.classList.toggle('active', (c.dataset.category || 'all') === 'all');
    });

    const resetSelect = (id) => {
      const el = document.getElementById(id);
      if (el) el.value = 'all';
    };
    resetSelect('filter-monster-type');
    resetSelect('filter-spell-type');
    resetSelect('filter-trap-type');
    resetSelect('filter-attribute');
    resetSelect('filter-race');
    resetSelect('filter-level');
    resetSelect('filter-status');

    const resetVal = (id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    };
    resetVal('filter-atk-min');
    resetVal('filter-atk-max');
    resetVal('filter-def-min');
    resetVal('filter-def-max');

    const resetCheck = (id, defVal = false) => {
      const el = document.getElementById(id);
      if (el) el.checked = defVal;
    };
    resetCheck('check-destroy');
    resetCheck('check-boost');
    resetCheck('check-summon');
    resetCheck('check-negate');
    resetCheck('check-recover');
    resetCheck('check-cost');
    resetCheck('check-alt-art', true);

    window.cardsManager.applyFilters();
    window.app.renderCardsGrid();
    this.updateActiveFilterIndicators();
    window.app.showToast('تمت إعادة ضبط جميع الفلاتر');
  }

  updateActiveFilterIndicators() {
    const f = window.cardsManager.filters;
    let count = 0;
    if (f.search) count++;
    if (f.category !== 'all') count++;
    if (f.monsterType !== 'all') count++;
    if (f.spellType !== 'all') count++;
    if (f.trapType !== 'all') count++;
    if (f.attribute !== 'all') count++;
    if (f.race !== 'all') count++;
    if (f.level !== 'all') count++;
    if (f.atkMin !== null || f.atkMax !== null) count++;
    if (f.defMin !== null || f.defMax !== null) count++;
    if (f.canDestroy) count++;
    if (f.canBoost) count++;
    if (f.canSummon) count++;
    if (f.canNegate) count++;
    if (f.canRecover) count++;
    if (f.hasCost) count++;
    if (!f.showAltArt) count++;
    if (f.verificationStatus !== 'all') count++;

    const badge = document.getElementById('active-filters-count');
    const toggle = document.getElementById('advanced-filters-toggle');
    if (badge) {
      badge.textContent = count > 0 ? count : '';
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
    if (toggle) {
      toggle.classList.toggle('has-filters', count > 0);
    }
  }
}

window.filtersController = new FiltersController();
