/**
 * YuGi Ultimate Encyclopedia - Master Application Controller
 * Coordinates views, rendering, diagnostics, theme management, and event delegations.
 */

class YuGiApp {
  constructor() {
    this.currentTab = 'catalog';
    this.theme = localStorage.getItem('yugi_theme') || 'dark';
    this.cardSize = localStorage.getItem('yugi_card_size') || 'medium';
    this.viewMode = localStorage.getItem('yugi_view_mode') || 'grid';
  }

  async start() {
    this.applyTheme(this.theme);
    this.bindNavigation();
    this.bindThemeToggle();
    this.bindDisplayToggles();
    this.bindDeckEvents();
    this.bindCompareEvents();
    this.bindSettingsEvents();

    // Initialize Card Database
    const loaded = await window.cardsManager.init();
    if (!loaded) {
      this.showToast('تعذر تحميل قاعدة بيانات البطاقات!', 'error');
      return;
    }

    // Initialize other controllers
    await window.decksManager.init();
    window.filtersController.init();

    // Initial render
    this.renderCardsGrid();
    this.renderStatsView();
    this.updateCompareBadge();
    this.updateFavNavBadge();
  }

  // --- Theme & View Preferences ---
  applyTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('yugi_theme', theme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
      themeBtn.title = theme === 'dark' ? 'التحويل للوضع الفاتح' : 'التحويل للوضع الداكن';
    }
  }

  bindThemeToggle() {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        this.applyTheme(this.theme === 'dark' ? 'light' : 'dark');
      });
    }
  }

  bindDisplayToggles() {
    // Grid vs List view
    const viewGridBtn = document.getElementById('view-grid-btn');
    const viewListBtn = document.getElementById('view-list-btn');
    const cardsGrid = document.getElementById('cards-grid');

    if (viewGridBtn && viewListBtn && cardsGrid) {
      viewGridBtn.addEventListener('click', () => {
        viewGridBtn.classList.add('active');
        viewListBtn.classList.remove('active');
        this.viewMode = 'grid';
        cardsGrid.classList.remove('view-list');
        localStorage.setItem('yugi_view_mode', 'grid');
      });

      viewListBtn.addEventListener('click', () => {
        viewListBtn.classList.add('active');
        viewGridBtn.classList.remove('active');
        this.viewMode = 'list';
        cardsGrid.classList.add('view-list');
        localStorage.setItem('yugi_view_mode', 'list');
      });
    }

    // Card Size
    const sizeSelect = document.getElementById('card-size-select');
    if (sizeSelect && cardsGrid) {
      sizeSelect.value = this.cardSize;
      cardsGrid.classList.add(`size-${this.cardSize}`);
      sizeSelect.addEventListener('change', (e) => {
        this.cardSize = e.target.value;
        cardsGrid.classList.remove('size-compact', 'size-medium', 'size-large');
        cardsGrid.classList.add(`size-${this.cardSize}`);
        localStorage.setItem('yugi_card_size', this.cardSize);
      });
    }
  }

  // --- Navigation Tabs ---
  bindNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[data-tab]');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.dataset.tab;
        this.switchTab(tab);
      });
    });

    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navTabs = document.querySelector('.nav-tabs');
    if (mobileMenuBtn && navTabs) {
      mobileMenuBtn.addEventListener('click', () => {
        navTabs.classList.toggle('mobile-open');
      });
    }
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-link[data-tab]').forEach(l => l.classList.remove('active'));

    const targetView = document.getElementById(`view-${tabName}`);
    const activeLink = document.querySelector(`.nav-link[data-tab="${tabName}"]`);

    if (targetView) targetView.classList.add('active');
    if (activeLink) activeLink.classList.add('active');

    // Close mobile nav menu
    const navTabs = document.querySelector('.nav-tabs');
    if (navTabs) navTabs.classList.remove('mobile-open');

    // Refresh specific tab contents
    if (tabName === 'catalog') {
      this.renderCardsGrid();
    } else if (tabName === 'decks') {
      this.renderDecksView();
    } else if (tabName === 'compare') {
      this.renderCompareView();
    } else if (tabName === 'favorites') {
      window.cardsManager.filters.category = 'favorites';
      window.cardsManager.applyFilters();
      this.renderCardsGrid();
      this.switchTab('catalog');
      this.showToast('عرض البطاقات المفضلة');
    } else if (tabName === 'stats') {
      this.renderStatsView();
    }
  }

  // --- Cards Grid Rendering ---
  renderCardsGrid() {
    const container = document.getElementById('cards-grid');
    const statsEl = document.getElementById('catalog-results-stats');
    const loadMoreWrap = document.getElementById('load-more-container');
    if (!container) return;

    const cards = window.cardsManager.getPaginatedCards();
    const totalFiltered = window.cardsManager.filteredCards.length;

    if (statsEl) {
      statsEl.innerHTML = `عرض <strong>${cards.length}</strong> من أصل <strong>${totalFiltered}</strong> بطاقة`;
    }

    if (cards.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>لم يتم العثور على أي بطاقة مطابقة!</h3>
          <p>جرّب تعديل كلمات البحث أو مسح بعض الفلاتر النشطة.</p>
          <button class="btn-primary" style="margin-top:1rem;" onclick="window.filtersController.resetAll()">مسح جميع الفلاتر</button>
        </div>
      `;
      if (loadMoreWrap) loadMoreWrap.style.display = 'none';
      return;
    }

    container.innerHTML = cards.map(c => this.createCardItemHtml(c)).join('');

    if (loadMoreWrap) {
      loadMoreWrap.style.display = window.cardsManager.hasMore() ? 'flex' : 'none';
      const loadMoreBtn = document.getElementById('load-more-btn');
      if (loadMoreBtn) {
        loadMoreBtn.onclick = () => {
          window.cardsManager.loadNextPage();
          this.renderCardsGrid();
        };
      }
    }
  }

  createCardItemHtml(c) {
    const isFav = window.cardsManager.isFavorite(c.card_key);
    const isMonster = c.category === 'monster';

    let statsRow = '';
    if (isMonster) {
      statsRow = `
        <div class="card-stats-row">
          <span class="stat-atk">ATK ${c.atk !== null ? c.atk : '؟'}</span>
          <span class="stat-def">DEF ${c.def !== null ? c.def : '؟'}</span>
          <span class="stat-level">★ ${c.level || 0}</span>
        </div>
      `;
    } else {
      statsRow = `
        <div class="card-stats-row">
          <span style="color:${c.frame_color}; font-weight:700;">${c.card_type}</span>
          <span style="color:var(--text-muted); font-size:0.75rem;">${c.race_ar || c.race}</span>
        </div>
      `;
    }

    return `
      <div class="card-item" data-key="${c.card_key}" onclick="window.cardDetailsModal.open('${c.card_key}')">
        <div class="card-image-wrap">
          <img class="card-img" src="${c.image_path}" alt="${c.name_en}" loading="lazy" onerror="this.src='card/0000.bmp'">
          <div class="card-frame-badge" style="background:${c.frame_color};">
            ${c.card_type.split(' ')[0]}
          </div>
          <button class="card-fav-btn ${isFav ? 'is-fav' : ''}" onclick="event.stopPropagation(); window.app.handleFavClick('${c.card_key}')" title="إضافة للمفضلة">
            ${isFav ? '★' : '☆'}
          </button>
          ${c.is_alt_art ? '<span class="card-alt-badge">رسمة بديلة</span>' : ''}
        </div>
        <div class="card-info">
          <div class="card-name-ar" title="${c.name_ar}">${c.name_ar || c.name_en}</div>
          <div class="card-name-en" title="${c.name_en}">${c.name_en}</div>
          ${statsRow}
        </div>
      </div>
    `;
  }

  handleFavClick(cardKey) {
    const isFav = window.cardsManager.toggleFavorite(cardKey);
    const btn = document.querySelector(`[data-key="${cardKey}"] .card-fav-btn`);
    if (btn) {
      btn.classList.toggle('is-fav', isFav);
      btn.textContent = isFav ? '★' : '☆';
    }
    this.updateFavNavBadge();
    this.showToast(isFav ? 'تمت إضافة البطاقة إلى المفضلة' : 'تمت إزالة البطاقة من المفضلة');
  }

  updateFavNavBadge() {
    const badge = document.getElementById('nav-fav-badge');
    if (badge) {
      const count = window.cardsManager.favorites.size;
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  updateCompareBadge() {
    const badge = document.getElementById('nav-compare-badge');
    if (badge) {
      const count = window.cardsManager.compareList.size;
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  // --- Decks View Management ---
  bindDeckEvents() {
    const premadeTabBtn = document.getElementById('tab-decks-premade');
    const customTabBtn = document.getElementById('tab-decks-custom');
    const premadeSection = document.getElementById('section-premade-decks');
    const customSection = document.getElementById('section-custom-decks');

    if (premadeTabBtn && customTabBtn && premadeSection && customSection) {
      premadeTabBtn.addEventListener('click', () => {
        premadeTabBtn.classList.add('active');
        customTabBtn.classList.remove('active');
        premadeSection.style.display = 'grid';
        customSection.style.display = 'none';
        window.decksManager.currentSubTab = 'premade';
      });

      customTabBtn.addEventListener('click', () => {
        customTabBtn.classList.add('active');
        premadeTabBtn.classList.remove('active');
        premadeSection.style.display = 'none';
        customSection.style.display = 'grid';
        window.decksManager.currentSubTab = 'custom';
        this.renderCustomDeckWorkspace();
      });
    }

    const newDeckBtn = document.getElementById('btn-new-deck');
    if (newDeckBtn) {
      newDeckBtn.addEventListener('click', () => {
        const name = prompt('أدخل اسم المجموعة الجديدة:', 'مجموعة مخصصة');
        if (name) {
          const d = window.decksManager.createDeck(name);
          this.renderCustomDeckWorkspace();
          this.showToast(`تم إنشاء المجموعة "${d.name}" بنجاح`);
        }
      });
    }

    const exportDeckBtn = document.getElementById('btn-export-deck');
    if (exportDeckBtn) {
      exportDeckBtn.addEventListener('click', () => {
        window.decksManager.exportDeckToJson();
        this.showToast('تم تصدير ملف المجموعة JSON');
      });
    }

    const importDeckInput = document.getElementById('import-deck-file');
    if (importDeckInput) {
      importDeckInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          const res = window.decksManager.importDeckFromJson(evt.target.result);
          if (res.success) {
            this.renderCustomDeckWorkspace();
            this.showToast(`تم استيراد "${res.deck.name}" بنجاح!`);
          } else {
            this.showToast(`خطأ في الاستيراد: ${res.error}`, 'error');
          }
        };
        reader.readAsText(file);
      });
    }
  }

  renderDecksView() {
    const premadeContainer = document.getElementById('section-premade-decks');
    if (!premadeContainer) return;

    premadeContainer.innerHTML = window.decksManager.premadeDecks.map(deck => {
      const stats = window.decksManager.calculateDeckStats(deck);
      return `
        <div class="premade-deck-card">
          <div class="deck-card-header">
            <div>
              <h3>${deck.name}</h3>
              <p class="deck-desc">${deck.description}</p>
            </div>
          </div>
          <div class="deck-stats-pill">
            <span>🃏 الإجمالي: <strong>${stats.totalCards}</strong></span>
            <span>⚔️ وحوش: <strong>${stats.monsters}</strong></span>
            <span>✨ سحر: <strong>${stats.spells}</strong></span>
            <span>🛡️ فخاخ: <strong>${stats.traps}</strong></span>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted);">
            متوسط الهجوم: <strong style="color:#ef4444;">${stats.avgAtk} ATK</strong> • متوسط الدفاع: <strong style="color:#38bdf8;">${stats.avgDef} DEF</strong>
          </div>
          <div class="deck-card-actions">
            <button class="btn-primary" onclick="window.app.cloneDeckToCustom('${deck.id}')">
              📥 استنساخ وتعديل
            </button>
            <button class="btn-secondary" onclick="window.decksManager.exportDeckToJson('${deck.id}')">
              ⬇ تصدير JSON
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (window.decksManager.currentSubTab === 'custom') {
      this.renderCustomDeckWorkspace();
    }
  }

  cloneDeckToCustom(deckId) {
    const cloned = window.decksManager.cloneDeck(deckId);
    if (cloned) {
      document.getElementById('tab-decks-custom').click();
      this.showToast(`تم استنساخ "${cloned.name}" إلى مجموعاتك الخاصة`);
    }
  }

  renderCustomDeckWorkspace() {
    const selector = document.getElementById('custom-decks-selector');
    const cardsListContainer = document.getElementById('custom-deck-cards-list');
    const statsContainer = document.getElementById('custom-deck-stats');
    const nameInput = document.getElementById('custom-deck-name-input');
    const descInput = document.getElementById('custom-deck-desc-input');

    if (!selector || !cardsListContainer) return;

    const decks = window.decksManager.customDecks;
    const activeDeck = window.decksManager.getActiveDeck();

    selector.innerHTML = decks.map(d => `
      <option value="${d.id}" ${activeDeck && d.id === activeDeck.id ? 'selected' : ''}>
        ${d.name} (${window.decksManager.calculateDeckStats(d).totalCards} بطاقة)
      </option>
    `).join('');

    selector.onchange = (e) => {
      window.decksManager.activeDeckId = e.target.value;
      this.renderCustomDeckWorkspace();
    };

    if (!activeDeck) {
      cardsListContainer.innerHTML = '<p style="color:var(--text-muted); text-align:center;">لا توجد مجموعات حالية.</p>';
      return;
    }

    if (nameInput) nameInput.value = activeDeck.name;
    if (descInput) descInput.value = activeDeck.description || '';

    // Update Deck Name & Desc on blur
    nameInput.onblur = () => {
      window.decksManager.renameDeck(activeDeck.id, nameInput.value, descInput.value);
    };
    descInput.onblur = () => {
      window.decksManager.renameDeck(activeDeck.id, nameInput.value, descInput.value);
    };

    // Calculate stats
    const stats = window.decksManager.calculateDeckStats(activeDeck);
    if (statsContainer) {
      const monsterPct = stats.totalCards ? (stats.monsters / stats.totalCards) * 100 : 0;
      const spellPct = stats.totalCards ? (stats.spells / stats.totalCards) * 100 : 0;
      const trapPct = stats.totalCards ? (stats.traps / stats.totalCards) * 100 : 0;

      statsContainer.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong>بطاقات المجموعة: ${stats.totalCards} / 60</strong>
          <span style="font-size:0.8rem; color:${stats.totalCards >= 40 ? 'var(--emerald-primary)' : 'var(--crimson-primary)'}">
            ${stats.totalCards >= 40 ? '✓ مجموعة مكتملة قانونياً (40+)' : '⚠ الحد الأدنى القانوني 40 بطاقة'}
          </span>
        </div>
        <div class="deck-chart-bar">
          <div class="bar-monster" style="width:${monsterPct}%;" title="وحوش: ${stats.monsters}"></div>
          <div class="bar-spell" style="width:${spellPct}%;" title="سحر: ${stats.spells}"></div>
          <div class="bar-trap" style="width:${trapPct}%;" title="فخاخ: ${stats.traps}"></div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted);">
          <span>وحوش: <strong style="color:#b85b24;">${stats.monsters}</strong></span>
          <span>سحر: <strong style="color:#1d9273;">${stats.spells}</strong></span>
          <span>فخاخ: <strong style="color:#bc245c;">${stats.traps}</strong></span>
        </div>
        <div style="font-size:0.82rem; color:var(--text-secondary); margin-top:4px;">
          متوسط الهجوم: <strong style="color:#ef4444;">${stats.avgAtk} ATK</strong> • متوسط الدفاع: <strong style="color:#38bdf8;">${stats.avgDef} DEF</strong>
        </div>
      `;
    }

    if (!activeDeck.cards || activeDeck.cards.length === 0) {
      cardsListContainer.innerHTML = `
        <div style="text-align:center; padding:2rem 1rem; color:var(--text-muted); font-size:0.85rem;">
          المجموعة فارغة حالياً.<br>
          تصفح مكتبة البطاقات وانقر على "إضافة إلى مجموعة" لبناء تشكيلتك!
        </div>
      `;
      return;
    }

    cardsListContainer.innerHTML = activeDeck.cards.map(c => `
      <div class="deck-slot-item" onclick="window.cardDetailsModal.open('${c.card_key}')">
        <div style="display:flex; align-items:center; gap:0.6rem; overflow:hidden;">
          <img src="${c.image_path}" alt="" style="width:28px; height:40px; border-radius:3px; object-fit:cover;">
          <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            <div style="font-weight:700; color:var(--text-primary);">${c.name_ar || c.name_en}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${c.category === 'monster' ? `ATK ${c.atk || 0}` : c.category}</div>
          </div>
        </div>
        <div class="slot-controls" onclick="event.stopPropagation()">
          <button class="btn-slot-qty" onclick="window.app.modifySlotQty('${c.card_key}', -1)">-</button>
          <span style="font-weight:700; font-size:0.85rem; min-width:14px; text-align:center;">${c.count || 1}</span>
          <button class="btn-slot-qty" onclick="window.app.modifySlotQty('${c.card_key}', 1)">+</button>
          <button class="btn-slot-qty" style="color:var(--crimson-primary); margin-right:4px;" onclick="window.app.deleteSlotCompletely('${c.card_key}')" title="حذف من المجموعة">✕</button>
        </div>
      </div>
    `).join('');
  }

  modifySlotQty(cardKey, delta) {
    if (delta > 0) {
      const res = window.decksManager.addCardToDeck(cardKey);
      if (!res.success) {
        this.showToast(res.error, 'error');
        return;
      }
    } else {
      window.decksManager.removeCardFromDeck(cardKey);
    }
    this.renderCustomDeckWorkspace();
  }

  deleteSlotCompletely(cardKey) {
    window.decksManager.removeCardCompletely(cardKey);
    this.renderCustomDeckWorkspace();
  }

  deleteCurrentDeck() {
    const deck = window.decksManager.getActiveDeck();
    if (!deck) return;
    if (confirm(`هل أنت متأكد من رغبتك في حذف المجموعة "${deck.name}" نهائياً؟`)) {
      window.decksManager.deleteDeck(deck.id);
      this.renderCustomDeckWorkspace();
      this.showToast('تم حذف المجموعة');
    }
  }

  // --- Comparison Tool View ---
  bindCompareEvents() {
    const clearBtn = document.getElementById('btn-clear-compare');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        window.cardsManager.clearCompare();
        this.updateCompareBadge();
        this.renderCompareView();
        this.showToast('تم تفريغ قائمة المقارنة');
      });
    }
  }

  renderCompareView() {
    const cards = window.cardsManager.getCompareCards();
    const container = document.getElementById('compare-content-wrap');
    if (!container) return;

    if (cards.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚖️</div>
          <h3>قائمة المقارنة فارغة حالياً</h3>
          <p>يمكنك فتح أي بطاقة والنقر على زر "مقارنة" لإضافتها هنا ومقارنتها وجهاً لوجه مع بطاقات أخرى (حتى 3 بطاقات).</p>
          <button class="btn-primary" style="margin-top:1rem;" onclick="window.app.switchTab('catalog')">تصفح البطاقات</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="overflow-x:auto;">
        <table class="compare-table">
          <thead>
            <tr>
              <th>وجه المقارنة</th>
              ${cards.map(c => `
                <th style="text-align:center;">
                  <img src="${c.image_path}" alt="" style="width:100px; border-radius:6px; box-shadow:0 4px 10px rgba(0,0,0,0.5); cursor:pointer;" onclick="window.cardDetailsModal.open('${c.card_key}')">
                  <div style="font-size:1rem; font-weight:800; color:var(--text-primary); margin-top:6px;">${c.name_ar || c.name_en}</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">${c.name_en}</div>
                  <button class="btn-secondary" style="font-size:0.75rem; padding:2px 8px; margin-top:6px;" onclick="window.cardsManager.toggleCompare('${c.card_key}'); window.app.updateCompareBadge(); window.app.renderCompareView();">إزالة ✕</button>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>التصنيف والإطار</th>
              ${cards.map(c => `<td><span class="tag-badge" style="background:${c.frame_color}; display:inline-block;">${c.card_type}</span></td>`).join('')}
            </tr>
            <tr>
              <th>العنصر والفئة</th>
              ${cards.map(c => `<td>${c.attribute_ar} • ${c.race_ar}</td>`).join('')}
            </tr>
            <tr>
              <th>المستوى (النجوم)</th>
              ${cards.map(c => `<td>${c.level !== null ? '★ ' + c.level : '—'}</td>`).join('')}
            </tr>
            <tr>
              <th>الهجوم (ATK)</th>
              ${cards.map(c => {
                const maxAtk = Math.max(...cards.map(x => x.atk || 0));
                const isMax = c.atk === maxAtk && maxAtk > 0;
                return `<td style="color:#ef4444; font-weight:800; font-size:1.1rem;">${c.atk !== null ? c.atk + (isMax ? ' 👑' : '') : '—'}</td>`;
              }).join('')}
            </tr>
            <tr>
              <th>الدفاع (DEF)</th>
              ${cards.map(c => {
                const maxDef = Math.max(...cards.map(x => x.def || 0));
                const isMax = c.def === maxDef && maxDef > 0;
                return `<td style="color:#38bdf8; font-weight:800; font-size:1.1rem;">${c.def !== null ? c.def + (isMax ? ' 👑' : '') : '—'}</td>`;
              }).join('')}
            </tr>
            <tr>
              <th>سرعة التأثير</th>
              ${cards.map(c => `<td>${c.special_abilities?.speed_type_ar || 'عادي'}</td>`).join('')}
            </tr>
            <tr>
              <th>القدرة على التدمير</th>
              ${cards.map(c => `<td>${c.special_abilities?.can_destroy ? '✓ قادرة على التدمير' : '✕ لا تدمر'}</td>`).join('')}
            </tr>
            <tr>
              <th>تعزيز الهجوم / الدفاع</th>
              ${cards.map(c => `<td>${c.special_abilities?.can_boost ? '✓ تزيد الإحصائيات' : '✕ لا تزيد'}</td>`).join('')}
            </tr>
            <tr>
              <th>الاستدعاء الخاص</th>
              ${cards.map(c => `<td>${c.special_abilities?.can_summon ? '✓ تدعم الاستدعاء' : '✕ لا تدعم'}</td>`).join('')}
            </tr>
            <tr>
              <th>إبطال التأثيرات</th>
              ${cards.map(c => `<td>${c.special_abilities?.can_negate ? '✓ تبطل التأثيرات' : '✕ لا تبطل'}</td>`).join('')}
            </tr>
            <tr>
              <th>شرح التأثير العربي</th>
              ${cards.map(c => `<td style="font-size:0.82rem; line-height:1.5;">${c.desc_ar || c.desc_en}</td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  // --- Statistics & Diagnostics View ---
  renderStatsView() {
    const meta = window.cardsManager.metadata;
    if (!meta) return;

    const cards = window.cardsManager.cards;
    const totalIndexed = meta.total_cards;
    const verified = meta.verified_cards;
    const pending = meta.pending_review;

    const monsters = cards.filter(c => c.category === 'monster').length;
    const spells = cards.filter(c => c.category === 'spell').length;
    const traps = cards.filter(c => c.category === 'trap').length;
    const tokens = cards.filter(c => c.category === 'token').length;

    const statTotal = document.getElementById('stat-total-cards');
    const statVerified = document.getElementById('stat-verified-cards');
    const statMonsters = document.getElementById('stat-monsters-count');
    const statSpells = document.getElementById('stat-spells-count');
    const statTraps = document.getElementById('stat-traps-count');

    if (statTotal) statTotal.textContent = totalIndexed;
    if (statVerified) statVerified.textContent = verified;
    if (statMonsters) statMonsters.textContent = monsters;
    if (statSpells) statSpells.textContent = spells;
    if (statTraps) statTraps.textContent = traps;
  }

  runImageIntegrityTest() {
    const btn = document.getElementById('btn-run-integrity');
    const resultBox = document.getElementById('integrity-test-result');
    if (!resultBox) return;

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'جارٍ فحص سلامة الملفات والمسارات...';
    }

    resultBox.style.display = 'block';
    resultBox.innerHTML = '<p>جارٍ فحص 1,116 ملف بطاقة محلي...</p>';

    const cards = window.cardsManager.cards;
    let checked = 0;
    let failed = 0;

    cards.forEach(c => {
      const img = new Image();
      img.onload = () => {
        checked++;
        if (checked === cards.length) {
          this.finalizeIntegrityReport(cards.length, failed, btn, resultBox);
        }
      };
      img.onerror = () => {
        checked++;
        failed++;
        if (checked === cards.length) {
          this.finalizeIntegrityReport(cards.length, failed, btn, resultBox);
        }
      };
      img.src = c.image_path;
    });
  }

  finalizeIntegrityReport(total, failed, btn, resultBox) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'إعادة فحص سلامة الصور والمسارات';
    }

    if (failed === 0) {
      resultBox.innerHTML = `
        <div style="color:var(--emerald-primary); font-weight:700;">
          ✓ اكتمل الفحص بنجاح تام! جميع ملفات الصور المحلية (${total} ملفاً) سليمة وجاهزة للعرض بدون أي مسارات مفقودة.
        </div>
      `;
    } else {
      resultBox.innerHTML = `
        <div style="color:var(--crimson-primary); font-weight:700;">
          ⚠ تم العثور على ${failed} ملفاً غير مقروء من أصل ${total}.
        </div>
      `;
    }
  }

  // --- Settings & Diagnostics Events ---
  bindSettingsEvents() {
    const backupExportBtn = document.getElementById('btn-export-backup');
    if (backupExportBtn) {
      backupExportBtn.addEventListener('click', () => {
        const backup = {
          app: 'YuGi-Ultimate-Encyclopedia',
          timestamp: new Date().toISOString(),
          favorites: Array.from(window.cardsManager.favorites),
          custom_decks: window.decksManager.customDecks,
          theme: this.theme,
          card_size: this.cardSize,
          view_mode: this.viewMode
        };

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `yugi_backup_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast('تم تصدير النسخة الاحتياطية بنجاح');
      });
    }

    const backupImportInput = document.getElementById('import-backup-file');
    if (backupImportInput) {
      backupImportInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = JSON.parse(evt.target.result);
            if (data.favorites && Array.isArray(data.favorites)) {
              window.cardsManager.favorites = new Set(data.favorites);
              localStorage.setItem('yugi_favorites', JSON.stringify(data.favorites));
            }
            if (data.custom_decks && Array.isArray(data.custom_decks)) {
              window.decksManager.customDecks = data.custom_decks;
              window.decksManager.saveCustomDecks();
            }
            this.updateFavNavBadge();
            this.renderCardsGrid();
            this.showToast('تم استعادة النسخة الاحتياطية بنجاح!');
          } catch (err) {
            this.showToast('فشل قراءة ملف النسخة الاحتياطية.', 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    const resetSettingsBtn = document.getElementById('btn-reset-settings');
    if (resetSettingsBtn) {
      resetSettingsBtn.addEventListener('click', () => {
        if (confirm('هل أنت متأكد من رغبتك في إعادة ضبط إعدادات العرض الافتراضية؟ لن يتم حذف مجموعاتك الشخصية.')) {
          this.applyTheme('dark');
          this.cardSize = 'medium';
          this.viewMode = 'grid';
          localStorage.setItem('yugi_card_size', 'medium');
          localStorage.setItem('yugi_view_mode', 'grid');
          window.filtersController.resetAll();
          this.showToast('تمت إعادة ضبط الإعدادات الافتراضية');
        }
      });
    }
  }

  // --- Toast Notifications ---
  showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderRightColor = type === 'error' ? 'var(--crimson-primary)' : 'var(--gold-primary)';
    toast.innerHTML = `<span>${type === 'error' ? '⚠' : 'ℹ'}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

// Global App Instance
window.app = new YuGiApp();

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.app.start();
});
