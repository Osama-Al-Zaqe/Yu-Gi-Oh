/**
 * YuGi Ultimate Encyclopedia - Cards Data & Catalog Manager
 * Handles data loading, caching, live search, multi-criteria filtering, sorting, pagination, and favorites.
 */

class CardsManager {
  constructor() {
    this.cards = [];
    this.metadata = null;
    this.cardMap = new Map(); // key -> card
    this.passcodeMap = new Map(); // passcode -> card
    this.filteredCards = [];
    
    // Pagination state
    this.pageSize = 36;
    this.currentPage = 1;
    this.currentViewMode = 'grid'; // 'grid' | 'list'
    this.currentCardSize = 'medium'; // 'compact' | 'medium' | 'large'
    
    // Active Filters
    this.filters = {
      search: '',
      category: 'all', // 'all' | 'monster' | 'spell' | 'trap' | 'favorites'
      monsterType: 'all', // 'Normal Monster' | 'Effect Monster' | 'Fusion Monster' | 'Ritual Monster'
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
    
    // Sorting
    this.sortBy = 'cid_asc'; // 'atk_desc', 'atk_asc', 'def_desc', 'def_asc', 'level_desc', 'name_asc', 'name_desc', 'cid_asc'
    
    // User Favorites & Comparison lists
    this.favorites = new Set(this.loadFavorites());
    this.compareList = new Set();
  }

  async init() {
    // Strategy 1: Check if data was pre-loaded via <script> tag (Works 100% on file:// and offline!)
    if (window.YUGI_CARDS_DATA && window.YUGI_CARDS_DATA.cards) {
      this.cards = window.YUGI_CARDS_DATA.cards;
      this.metadata = window.YUGI_CARDS_DATA.metadata;
      this.indexCards();
      this.applyFilters();
      return true;
    }

    // Strategy 2: Fetch cards.json (Works on HTTP/HTTPS local servers)
    try {
      const response = await fetch('data/cards.json');
      if (response.ok) {
        const data = await response.json();
        this.cards = data.cards;
        this.metadata = data.metadata;
        this.indexCards();
        this.applyFilters();
        return true;
      }
    } catch (fetchErr) {
      console.warn('Fetch failed (likely file:// protocol without server), falling back to script loading...', fetchErr);
    }

    // Strategy 3: Dynamic script tag injection fallback
    try {
      await this.loadScriptFallback('data/cards-data.js');
      if (window.YUGI_CARDS_DATA && window.YUGI_CARDS_DATA.cards) {
        this.cards = window.YUGI_CARDS_DATA.cards;
        this.metadata = window.YUGI_CARDS_DATA.metadata;
        this.indexCards();
        this.applyFilters();
        return true;
      }
    } catch (scriptErr) {
      console.error('All cards loading strategies failed:', scriptErr);
    }

    return false;
  }

  loadScriptFallback(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  indexCards() {
    this.cardMap.clear();
    this.passcodeMap.clear();
    this.cards.forEach(c => {
      this.cardMap.set(c.card_key, c);
      if (c.passcode) {
        this.passcodeMap.set(String(c.passcode), c);
      }
    });
  }

  getCardByKey(key) {
    return this.cardMap.get(key) || null;
  }

  getCardByPasscode(passcode) {
    return this.passcodeMap.get(String(passcode)) || null;
  }

  // --- Filtering & Searching ---
  applyFilters() {
    const f = this.filters;
    const query = f.search.trim().toLowerCase();

    this.filteredCards = this.cards.filter(c => {
      // 1. Search Query
      if (query) {
        const matchNameAr = (c.name_ar || '').toLowerCase().includes(query);
        const matchNameEn = (c.name_en || '').toLowerCase().includes(query);
        const matchCid = (c.cid || '').toLowerCase().includes(query);
        const matchFilename = (c.filename || '').toLowerCase().includes(query);
        const matchPasscode = String(c.passcode || '').includes(query);
        const matchDescEn = (c.desc_en || '').toLowerCase().includes(query);
        const matchDescAr = (c.desc_ar || '').toLowerCase().includes(query);
        const matchRace = (c.race || '').toLowerCase().includes(query) || (c.race_ar || '').toLowerCase().includes(query);
        const matchAttr = (c.attribute || '').toLowerCase().includes(query) || (c.attribute_ar || '').toLowerCase().includes(query);
        const matchArchetype = (c.archetype || '').toLowerCase().includes(query);

        if (!matchNameAr && !matchNameEn && !matchCid && !matchFilename && !matchPasscode &&
            !matchDescEn && !matchDescAr && !matchRace && !matchAttr && !matchArchetype) {
          return false;
        }
      }

      // 2. Category / Favorites
      if (f.category === 'favorites') {
        if (!this.favorites.has(c.card_key)) return false;
      } else if (f.category !== 'all') {
        if (c.category !== f.category) return false;
      }

      // 3. Monster Sub-Type
      if (f.monsterType !== 'all') {
        if (!c.card_type.toLowerCase().includes(f.monsterType.toLowerCase())) return false;
      }

      // 4. Spell Sub-Type
      if (f.spellType !== 'all') {
        if (c.category !== 'spell' || c.race.toLowerCase() !== f.spellType.toLowerCase()) return false;
      }

      // 5. Trap Sub-Type
      if (f.trapType !== 'all') {
        if (c.category !== 'trap' || c.race.toLowerCase() !== f.trapType.toLowerCase()) return false;
      }

      // 6. Attribute
      if (f.attribute !== 'all') {
        if (c.attribute !== f.attribute) return false;
      }

      // 7. Race
      if (f.race !== 'all') {
        if (c.race.toLowerCase() !== f.race.toLowerCase()) return false;
      }

      // 8. Level
      if (f.level !== 'all') {
        const lvl = parseInt(f.level, 10);
        if (c.level !== lvl) return false;
      }

      // 9. ATK Range
      if (f.atkMin !== null && f.atkMin !== '') {
        if (c.atk === null || c.atk < parseInt(f.atkMin, 10)) return false;
      }
      if (f.atkMax !== null && f.atkMax !== '') {
        if (c.atk === null || c.atk > parseInt(f.atkMax, 10)) return false;
      }

      // 10. DEF Range
      if (f.defMin !== null && f.defMin !== '') {
        if (c.def === null || c.def < parseInt(f.defMin, 10)) return false;
      }
      if (f.defMax !== null && f.defMax !== '') {
        if (c.def === null || c.def > parseInt(f.defMax, 10)) return false;
      }

      // 11. Special Abilities
      if (f.canDestroy && !c.special_abilities?.can_destroy) return false;
      if (f.canBoost && !c.special_abilities?.can_boost) return false;
      if (f.canSummon && !c.special_abilities?.can_summon) return false;
      if (f.canNegate && !c.special_abilities?.can_negate) return false;
      if (f.canRecover && !c.special_abilities?.can_recover) return false;
      if (f.hasCost && !c.special_abilities?.has_cost) return false;

      // 12. Alternate Artwork
      if (!f.showAltArt && c.is_alt_art) return false;

      // 13. Verification Status
      if (f.verificationStatus !== 'all') {
        if (c.verification_status !== f.verificationStatus) return false;
      }

      return true;
    });

    this.applySorting();
    this.currentPage = 1;
  }

  // --- Sorting ---
  applySorting() {
    const s = this.sortBy;

    this.filteredCards.sort((a, b) => {
      // Prioritize system assets last
      if (a.category === 'system') return 1;
      if (b.category === 'system') return -1;

      switch (s) {
        case 'atk_desc': {
          const atkA = a.atk !== null ? a.atk : -1;
          const atkB = b.atk !== null ? b.atk : -1;
          return atkB - atkA;
        }
        case 'atk_asc': {
          const atkA = a.atk !== null ? a.atk : 999999;
          const atkB = b.atk !== null ? b.atk : 999999;
          return atkA - atkB;
        }
        case 'def_desc': {
          const defA = a.def !== null ? a.def : -1;
          const defB = b.def !== null ? b.def : -1;
          return defB - defA;
        }
        case 'def_asc': {
          const defA = a.def !== null ? a.def : 999999;
          const defB = b.def !== null ? b.def : 999999;
          return defA - defB;
        }
        case 'level_desc': {
          const lvlA = a.level !== null ? a.level : -1;
          const lvlB = b.level !== null ? b.level : -1;
          return lvlB - lvlA;
        }
        case 'level_asc': {
          const lvlA = a.level !== null ? a.level : 99;
          const lvlB = b.level !== null ? b.level : 99;
          return lvlA - lvlB;
        }
        case 'name_asc':
          return (a.name_ar || a.name_en).localeCompare(b.name_ar || b.name_en, 'ar');
        case 'name_desc':
          return (b.name_ar || b.name_en).localeCompare(a.name_ar || a.name_en, 'ar');
        case 'fav_first': {
          const favA = this.favorites.has(a.card_key) ? 1 : 0;
          const favB = this.favorites.has(b.card_key) ? 1 : 0;
          return favB - favA;
        }
        case 'cid_asc':
        default: {
          const cidA = parseInt(a.cid, 10) || 0;
          const cidB = parseInt(b.cid, 10) || 0;
          return cidA - cidB;
        }
      }
    });
  }

  // --- Pagination ---
  getPaginatedCards() {
    const end = this.currentPage * this.pageSize;
    return this.filteredCards.slice(0, end);
  }

  hasMore() {
    return this.currentPage * this.pageSize < this.filteredCards.length;
  }

  loadNextPage() {
    if (this.hasMore()) {
      this.currentPage++;
      return true;
    }
    return false;
  }

  // --- Favorites Management ---
  loadFavorites() {
    try {
      const stored = localStorage.getItem('yugi_favorites');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  toggleFavorite(cardKey) {
    if (this.favorites.has(cardKey)) {
      this.favorites.delete(cardKey);
    } else {
      this.favorites.add(cardKey);
    }
    try {
      localStorage.setItem('yugi_favorites', JSON.stringify(Array.from(this.favorites)));
    } catch (e) {
      console.warn('Could not save favorites to localStorage:', e);
    }
    return this.favorites.has(cardKey);
  }

  isFavorite(cardKey) {
    return this.favorites.has(cardKey);
  }

  // --- Comparison Tool Queue ---
  toggleCompare(cardKey) {
    if (this.compareList.has(cardKey)) {
      this.compareList.delete(cardKey);
      return { added: false, count: this.compareList.size };
    } else {
      if (this.compareList.size >= 3) {
        return { added: false, count: this.compareList.size, error: 'يمكنك مقارنة 3 بطاقات كحد أقصى في وقت واحد.' };
      }
      this.compareList.add(cardKey);
      return { added: true, count: this.compareList.size };
    }
  }

  isInCompare(cardKey) {
    return this.compareList.has(cardKey);
  }

  clearCompare() {
    this.compareList.clear();
  }

  getCompareCards() {
    return Array.from(this.compareList).map(key => this.getCardByKey(key)).filter(Boolean);
  }
}

// Global instance
window.cardsManager = new CardsManager();
