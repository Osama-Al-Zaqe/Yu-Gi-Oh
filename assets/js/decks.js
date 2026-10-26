/**
 * YuGi Ultimate Encyclopedia - Deck Builder & Management
 * Handles pre-made decks, custom user decks, card copy limits (1-3),
 * real-time statistics (Monsters/Spells/Traps/Average ATK/DEF), localStorage persistence, and JSON Export/Import.
 */

class DecksManager {
  constructor() {
    this.premadeDecks = [];
    this.customDecks = [];
    this.activeDeckId = null;
    this.currentSubTab = 'premade'; // 'premade' | 'custom'
  }

  async init() {
    // Strategy 1: Pre-loaded via script tag (Works 100% on file://)
    if (window.YUGI_DECKS_DATA && window.YUGI_DECKS_DATA.decks) {
      this.premadeDecks = window.YUGI_DECKS_DATA.decks;
    } else {
      // Strategy 2: Fetch decks.json
      try {
        const response = await fetch('data/decks.json');
        if (response.ok) {
          const data = await response.json();
          this.premadeDecks = data.decks || [];
        }
      } catch (e) {
        console.warn('Could not load premade decks via fetch, trying script fallback:', e);
        // Strategy 3: Dynamic script injection
        try {
          await this.loadScriptFallback('data/decks-data.js');
          if (window.YUGI_DECKS_DATA && window.YUGI_DECKS_DATA.decks) {
            this.premadeDecks = window.YUGI_DECKS_DATA.decks;
          }
        } catch (e2) {}
      }
    }

    this.loadCustomDecks();
    if (this.customDecks.length === 0) {
      // Create a default initial deck for convenience
      this.createDeck('مجموعتي الأولى', 'مجموعة مخصصة يمكنك إضافة بطاقاتك المفضلة إليها.');
    }
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

  loadCustomDecks() {
    try {
      const stored = localStorage.getItem('yugi_custom_decks');
      this.customDecks = stored ? JSON.parse(stored) : [];
      if (this.customDecks.length > 0) {
        this.activeDeckId = this.customDecks[0].id;
      }
    } catch (e) {
      console.error('Failed to parse custom decks from localStorage:', e);
      this.customDecks = [];
    }
  }

  saveCustomDecks() {
    try {
      localStorage.setItem('yugi_custom_decks', JSON.stringify(this.customDecks));
    } catch (e) {
      console.warn('Could not save custom decks to localStorage:', e);
    }
  }

  getActiveDeck() {
    return this.customDecks.find(d => d.id === this.activeDeckId) || this.customDecks[0] || null;
  }

  createDeck(name, description = '') {
    const newDeck = {
      id: 'custom-' + Date.now(),
      name: name || 'مجموعة جديدة',
      description: description,
      is_premade: false,
      created_at: new Date().toISOString(),
      cards: []
    };
    this.customDecks.push(newDeck);
    this.activeDeckId = newDeck.id;
    this.saveCustomDecks();
    return newDeck;
  }

  cloneDeck(deckId) {
    let source = this.premadeDecks.find(d => d.id === deckId);
    if (!source) {
      source = this.customDecks.find(d => d.id === deckId);
    }
    if (!source) return null;

    const cloned = {
      id: 'custom-' + Date.now(),
      name: `نسخة من ${source.name}`,
      description: source.description,
      is_premade: false,
      created_at: new Date().toISOString(),
      cards: JSON.parse(JSON.stringify(source.cards))
    };

    this.customDecks.push(cloned);
    this.activeDeckId = cloned.id;
    this.saveCustomDecks();
    this.currentSubTab = 'custom';
    return cloned;
  }

  deleteDeck(deckId) {
    const index = this.customDecks.findIndex(d => d.id === deckId);
    if (index !== -1) {
      this.customDecks.splice(index, 1);
      this.activeDeckId = this.customDecks.length > 0 ? this.customDecks[0].id : null;
      this.saveCustomDecks();
      return true;
    }
    return false;
  }

  renameDeck(deckId, newName, newDesc) {
    const deck = this.customDecks.find(d => d.id === deckId);
    if (deck) {
      if (newName) deck.name = newName;
      if (newDesc !== undefined) deck.description = newDesc;
      this.saveCustomDecks();
      return true;
    }
    return false;
  }

  // --- Card Operations inside Active Deck ---
  addCardToDeck(cardKey, deckId = null) {
    const deck = deckId ? this.customDecks.find(d => d.id === deckId) : this.getActiveDeck();
    if (!deck) return { success: false, error: 'لا توجد مجموعة نشطة.' };

    const card = window.cardsManager.getCardByKey(cardKey);
    if (!card) return { success: false, error: 'البطاقة غير موجودة.' };

    // Total count check (max 60 standard main deck)
    const totalCount = this.calculateDeckStats(deck).totalCards;
    if (totalCount >= 60) {
      return { success: false, error: 'وصلت المجموعة إلى الحد الأقصى (60 بطاقة).' };
    }

    // Check copies of this card (max 3 standard)
    const existing = deck.cards.find(c => c.card_key === cardKey || (c.passcode && c.passcode === card.passcode));
    if (existing) {
      if (existing.count >= 3) {
        return { success: false, error: 'لا يمكن إضافة أكثر من 3 نسخ من نفس البطاقة.' };
      }
      existing.count++;
    } else {
      deck.cards.push({
        card_key: card.card_key,
        passcode: card.passcode,
        name_en: card.name_en,
        name_ar: card.name_ar,
        image_path: card.image_path,
        category: card.category,
        atk: card.atk,
        def: card.def,
        level: card.level,
        count: 1
      });
    }

    this.saveCustomDecks();
    return { success: true, deckName: deck.name };
  }

  removeCardFromDeck(cardKey, deckId = null) {
    const deck = deckId ? this.customDecks.find(d => d.id === deckId) : this.getActiveDeck();
    if (!deck) return false;

    const idx = deck.cards.findIndex(c => c.card_key === cardKey);
    if (idx !== -1) {
      if (deck.cards[idx].count > 1) {
        deck.cards[idx].count--;
      } else {
        deck.cards.splice(idx, 1);
      }
      this.saveCustomDecks();
      return true;
    }
    return false;
  }

  removeCardCompletely(cardKey, deckId = null) {
    const deck = deckId ? this.customDecks.find(d => d.id === deckId) : this.getActiveDeck();
    if (!deck) return false;

    const idx = deck.cards.findIndex(c => c.card_key === cardKey);
    if (idx !== -1) {
      deck.cards.splice(idx, 1);
      this.saveCustomDecks();
      return true;
    }
    return false;
  }

  // --- Statistics Calculator ---
  calculateDeckStats(deck) {
    if (!deck || !deck.cards) {
      return { totalCards: 0, monsters: 0, spells: 0, traps: 0, avgAtk: 0, avgDef: 0, levelCounts: {} };
    }

    let totalCards = 0;
    let monsters = 0;
    let spells = 0;
    let traps = 0;
    let sumAtk = 0;
    let atkCount = 0;
    let sumDef = 0;
    let defCount = 0;
    const levelCounts = {};

    deck.cards.forEach(item => {
      const count = item.count || 1;
      totalCards += count;

      if (item.category === 'monster') {
        monsters += count;
        if (item.atk !== null && item.atk !== undefined) {
          sumAtk += item.atk * count;
          atkCount += count;
        }
        if (item.def !== null && item.def !== undefined) {
          sumDef += item.def * count;
          defCount += count;
        }
        if (item.level) {
          levelCounts[item.level] = (levelCounts[item.level] || 0) + count;
        }
      } else if (item.category === 'spell') {
        spells += count;
      } else if (item.category === 'trap') {
        traps += count;
      }
    });

    return {
      totalCards,
      monsters,
      spells,
      traps,
      avgAtk: atkCount > 0 ? Math.round(sumAtk / atkCount) : 0,
      avgDef: defCount > 0 ? Math.round(sumDef / defCount) : 0,
      levelCounts
    };
  }

  // --- Export / Import ---
  exportDeckToJson(deckId = null) {
    const deck = deckId ? this.customDecks.find(d => d.id === deckId) || this.premadeDecks.find(d => d.id === deckId) : this.getActiveDeck();
    if (!deck) return;

    const exportData = {
      app: 'YuGi-Encyclopedia',
      version: '1.0',
      exported_at: new Date().toISOString(),
      deck: {
        name: deck.name,
        description: deck.description,
        cards: deck.cards
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deck_${deck.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importDeckFromJson(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      const deckData = data.deck || data;

      if (!deckData.name || !Array.isArray(deckData.cards)) {
        throw new Error('صيغة ملف المجموعة غير صالحة.');
      }

      // Validate and sanitize cards
      const validCards = [];
      deckData.cards.forEach(c => {
        if (c.card_key) {
          validCards.push({
            card_key: String(c.card_key),
            passcode: c.passcode || null,
            name_en: c.name_en || '',
            name_ar: c.name_ar || '',
            image_path: c.image_path || `card/${c.card_key}.bmp`,
            category: c.category || 'monster',
            atk: typeof c.atk === 'number' ? c.atk : null,
            def: typeof c.def === 'number' ? c.def : null,
            level: typeof c.level === 'number' ? c.level : null,
            count: Math.min(3, Math.max(1, parseInt(c.count, 10) || 1))
          });
        }
      });

      const newDeck = {
        id: 'custom-' + Date.now(),
        name: `${deckData.name} (مستوردة)`,
        description: deckData.description || 'مجموعة مستوردة من ملف JSON',
        is_premade: false,
        created_at: new Date().toISOString(),
        cards: validCards
      };

      this.customDecks.push(newDeck);
      this.activeDeckId = newDeck.id;
      this.saveCustomDecks();
      return { success: true, deck: newDeck };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  promptAddCard(cardKey) {
    if (this.customDecks.length === 0) {
      this.createDeck('مجموعتي الأولى');
    }

    if (this.customDecks.length === 1) {
      const res = this.addCardToDeck(cardKey, this.customDecks[0].id);
      if (res.success) {
        window.app.showToast(`تمت إضافة البطاقة إلى "${res.deckName}"`);
      } else {
        window.app.showToast(res.error, 'error');
      }
    } else {
      // Prompt user to select which custom deck
      const options = this.customDecks.map(d => `${d.name} (${this.calculateDeckStats(d).totalCards} بطاقة)`).join('\n');
      const choice = prompt(`اختر اسم المجموعة المراد الإضافة إليها:\n${options}`, this.customDecks[0].name);
      if (!choice) return;

      const selected = this.customDecks.find(d => d.name.trim().toLowerCase() === choice.trim().toLowerCase()) || this.customDecks[0];
      const res = this.addCardToDeck(cardKey, selected.id);
      if (res.success) {
        window.app.showToast(`تمت إضافة البطاقة إلى "${res.deckName}"`);
      } else {
        window.app.showToast(res.error, 'error');
      }
    }
  }
}

window.decksManager = new DecksManager();
