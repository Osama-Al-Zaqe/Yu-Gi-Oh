/**
 * YuGi Ultimate Encyclopedia - Card Details Modal Viewer
 * Renders full comprehensive data, 3D card flipping, complete Arabic effects,
 * superpowers, alternate art, and bidirectional Fusion relationships (materials & combinations).
 */

class CardDetailsModal {
  constructor() {
    this.currentCard = null;
    this.isFlipped = false;
    this.modalEl = null;
    this.initElements();
  }

  initElements() {
    this.modalEl = document.getElementById('card-details-modal');
    if (!this.modalEl) return;

    // Close on overlay click or Esc
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl || e.target.closest('.modal-close-btn')) {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  isOpen() {
    return this.modalEl && this.modalEl.classList.contains('open');
  }

  open(cardKey) {
    const card = window.cardsManager.getCardByKey(cardKey);
    if (!card) return;

    this.currentCard = card;
    this.isFlipped = false;
    this.render();
    this.modalEl.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  close() {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('open');
    document.body.style.overflow = '';
  }

  flipCard() {
    const flipper = document.getElementById('modal-card-flipper');
    if (flipper) {
      this.isFlipped = !this.isFlipped;
      flipper.classList.toggle('flipped', this.isFlipped);
    }
  }

  switchAlternateArt(newBmp) {
    const newKey = newBmp.replace('.bmp', '');
    const altCard = window.cardsManager.getCardByKey(newKey);
    if (altCard) {
      this.currentCard = altCard;
      this.isFlipped = false;
      this.render();
    }
  }

  render() {
    const c = this.currentCard;
    if (!c) return;

    const modalBody = document.getElementById('modal-card-body');
    const modalTitleAr = document.getElementById('modal-card-title-ar');
    const modalTitleEn = document.getElementById('modal-card-title-en');

    if (modalTitleAr) modalTitleAr.textContent = c.name_ar || c.name_en;
    if (modalTitleEn) modalTitleEn.textContent = `${c.name_en} • Passcode: ${c.passcode || c.cid}`;

    const isFav = window.cardsManager.isFavorite(c.card_key);
    const inComp = window.cardsManager.isInCompare(c.card_key);

    // Stars display
    let levelHtml = '';
    if (c.level !== null && c.level !== undefined) {
      levelHtml = `<div class="tag-badge" style="background:#b45309;">★ المستوى: ${c.level}</div>`;
    }

    // Stats Matrix (Monsters only vs Spell/Trap)
    let statsSectionHtml = '';
    if (c.category === 'monster') {
      statsSectionHtml = `
        <div class="stats-matrix">
          <div class="stat-cell">
            <span class="stat-cell-title">نقاط الهجوم (ATK)</span>
            <span class="stat-cell-val" style="color:#ef4444;">${c.atk !== null ? c.atk : '؟'}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-cell-title">نقاط الدفاع (DEF)</span>
            <span class="stat-cell-val" style="color:#38bdf8;">${c.def !== null ? c.def : '؟'}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-cell-title">المستوى / النجوم</span>
            <span class="stat-cell-val" style="color:var(--text-gold);">${c.level !== null ? '★ ' + c.level : '—'}</span>
          </div>
        </div>
      `;
    } else {
      // Spell or Trap badge banner
      statsSectionHtml = `
        <div class="detail-box" style="background:rgba(0,0,0,0.25); border-color:${c.frame_color};">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:700; color:${c.frame_color};">تصنيف البطاقة: ${c.card_type}</span>
            <span style="font-size:0.85rem; color:var(--text-muted);">نوع التأثير: ${c.race_ar || c.race}</span>
          </div>
        </div>
      `;
    }

    // 1. Fusion Relationships Section (Materials & Products)
    let fusionSectionHtml = '';
    if (c.fusion_recipe && c.fusion_recipe.materials) {
      // Case A: This card is a Fusion Monster -> Show its material requirements
      const mats = c.fusion_recipe.materials;
      fusionSectionHtml = `
        <div class="fusion-box">
          <span class="fusion-box-title">🧬 مواد الانصهار المطلوبة لتكوين هذا الوحش (${mats.length})</span>
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            ${mats.map((m, idx) => `
              <div class="fusion-mini-card" ${m.card_key ? `onclick="window.cardDetailsModal.open('${m.card_key}')" title="انقر لعرض تفاصيل ${m.name_ar}"` : ''}>
                <img src="${m.image_path || 'card/0000.bmp'}" alt="${m.name_en}" onerror="this.src='card/0000.bmp'">
                <div class="fusion-mini-info">
                  <span class="fusion-mini-name-ar">${m.name_ar}</span>
                  <span class="fusion-mini-name-en">${m.name_en}</span>
                  ${m.atk !== null && m.atk !== undefined ? `<span style="font-size:0.7rem; color:#ef4444;">ATK: ${m.atk} • DEF: ${m.def}</span>` : ''}
                </div>
              </div>
            `).join('<div style="text-align:center; font-weight:800; color:#c084fc;">+</div>')}
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">
            💡 يتم استدعاؤه بدمج هذه الوحوش عبر بطاقة سحر <strong>Polymerization (الانصهار)</strong>.
          </div>
        </div>
      `;
    } else if (c.fusion_products && c.fusion_products.length > 0) {
      // Case B: This card is a Material Monster -> Show what it fuses with and into
      fusionSectionHtml = `
        <div class="fusion-box">
          <span class="fusion-box-title">🔀 شراكات الاندماج (وحوش تتحد مع هذا الوحش)</span>
          <div style="display:flex; flex-direction:column; gap:0.8rem;">
            ${c.fusion_products.map(p => `
              <div class="fusion-chain">
                <div style="font-size:0.8rem; color:var(--text-secondary); width:100%; margin-bottom:2px;">
                  يندمج مع:
                </div>
                ${p.partners && p.partners.length > 0 ? p.partners.map(part => `
                  <div class="fusion-mini-card" ${part.card_key ? `onclick="window.cardDetailsModal.open('${part.card_key}')" title="انقر لعرض ${part.name_ar}"` : ''}>
                    <img src="${part.image_path || 'card/0000.bmp'}" alt="" onerror="this.src='card/0000.bmp'">
                    <div class="fusion-mini-info">
                      <span class="fusion-mini-name-ar">${part.name_ar}</span>
                      <span class="fusion-mini-name-en">${part.name_en}</span>
                    </div>
                  </div>
                `).join('<span style="color:#c084fc; font-weight:800;">+</span>') : '<span style="color:var(--text-muted); font-size:0.75rem;">وحش شريك</span>'}

                <div class="fusion-arrow">➔ لينتجا:</div>

                <!-- Resulting Fusion Monster -->
                <div class="fusion-mini-card" style="border-color:#a855f7; background:rgba(168, 85, 247, 0.15);" onclick="window.cardDetailsModal.open('${p.fusion_card_key}')" title="انقر لفتح وحش الانصهار">
                  <img src="${p.fusion_image || 'card/0000.bmp'}" alt="" onerror="this.src='card/0000.bmp'">
                  <div class="fusion-mini-info">
                    <span class="fusion-mini-name-ar" style="color:#e9d5ff;">${p.fusion_name_ar}</span>
                    <span class="fusion-mini-name-en">${p.fusion_name_en}</span>
                    <span style="font-size:0.7rem; color:#fca5a5; font-weight:700;">ATK: ${p.fusion_atk} • DEF: ${p.fusion_def}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Alternate Artworks selector
    let altArtHtml = '';
    if (c.alt_art_group && c.alt_art_group.length > 0) {
      const allArts = [c.filename, ...c.alt_art_group];
      altArtHtml = `
        <div class="detail-box" style="width:100%;">
          <span class="detail-box-title">🎨 الرسومات البديلة المتوفرة (${allArts.length})</span>
          <div class="alt-art-selector">
            ${allArts.map((artFile, idx) => {
              const activeClass = artFile === c.filename ? 'active' : '';
              return `
                <div class="alt-art-thumb ${activeClass}" onclick="window.cardDetailsModal.switchAlternateArt('${artFile}')" title="رسمة ${idx + 1}">
                  <img src="card/${artFile}" alt="Artwork ${idx + 1}" loading="lazy">
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // Superpower Detailed Bullets
    const superpowersList = c.superpower_details_ar || [];
    const superpowersListHtml = superpowersList.map(p => `
      <div class="superpower-item-bullet">
        ${p}
      </div>
    `).join('');

    // Superpower / Mechanics Questions Matrix
    const m = c.special_abilities || {};
    const powerGridHtml = `
      <div class="power-questions-grid">
        <div class="power-q-item">
          <span class="power-q-title">💥 هل تدمر بطاقات الخصم؟</span>
          <span class="power-q-ans ${m.can_destroy ? 'yes' : 'no'}">
            ${m.can_destroy ? 'نعم — قادرة على تدمير بطاقات' : 'لا تملك قدرة تدمير مباشرة'}
          </span>
        </div>
        <div class="power-q-item">
          <span class="power-q-title">📈 هل تزيد أو تعدل الهجوم/الدفاع؟</span>
          <span class="power-q-ans ${m.can_boost ? 'yes' : 'no'}">
            ${m.can_boost ? 'نعم — تدعم الهجوم أو الدفاع' : 'لا تزيد الإحصائيات'}
          </span>
        </div>
        <div class="power-q-item">
          <span class="power-q-title">⚡ هل تستدعي وحوشاً أخرى؟</span>
          <span class="power-q-ans ${m.can_summon ? 'yes' : 'no'}">
            ${m.can_summon ? 'نعم — تدعم الاستدعاء الخاص' : 'لا تستدعي وحوشاً'}
          </span>
        </div>
        <div class="power-q-item">
          <span class="power-q-title">🛡️ هل تبطل التأثيرات أو الهجمات؟</span>
          <span class="power-q-ans ${m.can_negate ? 'yes' : 'no'}">
            ${m.can_negate ? 'نعم — قدرة إبطال وحماية' : 'لا تبطل التأثيرات'}
          </span>
        </div>
        <div class="power-q-item">
          <span class="power-q-title">♻️ هل تستعيد بطاقات من المقبرة؟</span>
          <span class="power-q-ans ${m.can_recover ? 'yes' : 'no'}">
            ${m.can_recover ? 'نعم — استعادة أو سحب إضافي' : 'لا تستعيد من المقبرة'}
          </span>
        </div>
        <div class="power-q-item">
          <span class="power-q-title">💎 هل تتطلب دفع تكلفة؟</span>
          <span class="power-q-ans ${m.has_cost ? 'yes' : 'no'}">
            ${m.has_cost ? 'نعم — تتطلب تكلفة تفعيل' : 'مجانية بدون تكلفة إضافية'}
          </span>
        </div>
      </div>
    `;

    // Strengths & Weaknesses
    const strengthsHtml = (m.strengths_ar && m.strengths_ar.length > 0)
      ? m.strengths_ar.map(s => `<li>✓ ${s}</li>`).join('')
      : '<li>✓ لا توجد نقاط قوة مسجلة.</li>';

    const weaknessesHtml = (m.weaknesses_ar && m.weaknesses_ar.length > 0)
      ? m.weaknesses_ar.map(w => `<li>⚠ ${w}</li>`).join('')
      : '<li>⚠ لا توجد نقاط ضعف مسجلة.</li>';

    // Synergies
    const synergiesHtml = (m.synergies && m.synergies.length > 0)
      ? m.synergies.map(syn => `<span class="tag-badge" style="background:var(--bg-surface); color:var(--text-gold); border:1px solid var(--border-color);">${syn}</span>`).join('')
      : '<span style="color:var(--text-muted); font-size:0.85rem;">متوافقة مع البطاقات العامة</span>';

    modalBody.innerHTML = `
      <!-- Visual & Fusion Column (Left) -->
      <div class="modal-visual-col">
        <div class="card-flipper-wrap" onclick="window.cardDetailsModal.flipCard()" title="انقر لقلب البطاقة ورؤية الخلفية">
          <div class="card-flipper" id="modal-card-flipper">
            <!-- Front Face -->
            <div class="card-face card-face-front">
              <img src="${c.image_path}" alt="${c.name_en}" onerror="this.src='card/0000.bmp'">
            </div>
            <!-- Back Face -->
            <div class="card-face card-face-back">
              <img src="card/0000.bmp" alt="خلفية البطاقة الرسمية">
            </div>
          </div>
        </div>
        <span class="flip-hint">🔄 انقر على الصورة لقلبها (وجه / ظهر)</span>

        <div class="modal-card-actions">
          <button class="btn-action ${isFav ? 'active' : ''}" onclick="window.cardDetailsModal.toggleFav()" id="modal-fav-btn">
            ${isFav ? '★ بالمفضلة' : '☆ إضافة للمفضلة'}
          </button>
          <button class="btn-action ${inComp ? 'active' : ''}" onclick="window.cardDetailsModal.toggleCompare()" id="modal-comp-btn">
            ${inComp ? '✓ بالمقارنة' : '⚖ مقارنة'}
          </button>
        </div>

        <button class="btn-primary" style="width:100%;" onclick="window.decksManager.promptAddCard('${c.card_key}')">
          ➕ إضافة إلى مجموعة
        </button>

        <!-- FUSION RELATIONSHIP ON THE SIDE -->
        ${fusionSectionHtml}

        ${altArtHtml}

        <!-- File & Verification Metadata -->
        <div class="detail-box" style="width:100%; font-size:0.78rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span style="color:var(--text-muted);">المسار المحلي:</span>
            <code style="direction:ltr;">${c.image_path}</code>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span style="color:var(--text-muted);">معرف اللعبة (CID):</span>
            <strong>${c.cid}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span style="color:var(--text-muted);">رقم البطاقة (Passcode):</span>
            <strong>${c.passcode || 'غير محدد'}</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:var(--text-muted);">حالة التحقق:</span>
            <span style="color:var(--emerald-primary); font-weight:700;">✓ مؤكدة ومطابقة</span>
          </div>
        </div>
      </div>

      <!-- Info Column (Right) -->
      <div class="modal-info-col">
        <!-- Badges Row -->
        <div class="badge-row">
          <div class="tag-badge" style="background:${c.frame_color};">${c.card_type}</div>
          <div class="tag-badge" style="background:var(--bg-surface); border:1px solid var(--border-color);">${c.race_ar || c.race}</div>
          <div class="tag-badge" style="background:var(--bg-surface); border:1px solid var(--border-color);">${c.attribute_ar || c.attribute}</div>
          ${levelHtml}
        </div>

        ${statsSectionHtml}

        <!-- 1. FULL ARABIC EFFECT & ABILITIES -->
        <div class="detail-box" style="border-right: 4px solid var(--gold-primary);">
          <span class="detail-box-title">📜 تأثير وقدرات البطاقة باللغة العربية</span>
          <p class="detail-desc-ar">${c.desc_ar || 'لا يتوفر شرح عربي.'}</p>
        </div>

        <!-- 2. SUPERPOWERS & SPECIAL ABILITIES -->
        <div class="detail-box">
          <span class="detail-box-title">⚡ القوة الخارقة والقدرات القتالية الخاصة</span>
          <div style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom:0.8rem;">
            ${superpowersListHtml}
          </div>
          ${powerGridHtml}
        </div>

        <!-- 3. Speed & Timing -->
        <div class="detail-box">
          <span class="detail-box-title">⏱️ توقيت التفعيل وسرعة التأثير</span>
          <p style="font-size:0.88rem; color:var(--text-primary); margin-bottom:4px;">
            <strong>السرعة والتصنيف:</strong> ${m.speed_type_ar || m.speed_type || 'عادي'}
          </p>
          <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
            <strong>متى يمكن تفعيله؟</strong> ${m.timing_ar || 'وفق شروط مرحلة المعركة أو المرحلة الرئيسية.'}
          </p>
          <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
            <strong>القيود على التكرار:</strong> ${m.usage_restriction_ar || 'غير مقيد.'}
          </p>
          <p style="font-size:0.85rem; color:var(--text-secondary);">
            <strong>التكلفة المطلوبة:</strong> ${m.cost_desc_ar || 'بدون تكلفة.'}
          </p>
        </div>

        <!-- 4. Summoning Requirements -->
        ${m.summon_req_ar ? `
          <div class="detail-box">
            <span class="detail-box-title">⚔️ شروط ومتطلبات الاستدعاء</span>
            <p style="font-size:0.88rem; color:var(--text-primary);">${m.summon_req_ar}</p>
          </div>
        ` : ''}

        <!-- 5. Dueling Strategy -->
        <div class="detail-box">
          <span class="detail-box-title">🎯 الاستراتيجية المناسبة في المبارزة</span>
          <p style="font-size:0.88rem; color:var(--text-primary); line-height:1.5;">${m.strategy_ar || 'استخدمها بتنسيق مع أوراقك الدفاعية للحفاظ على الملعب.'}</p>
        </div>

        <!-- 6. Strengths and Weaknesses -->
        <div class="detail-box">
          <span class="detail-box-title">⚖️ نقاط القوة والضعف</span>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.8rem; font-size:0.82rem;">
            <div>
              <strong style="color:var(--emerald-primary);">نقاط القوة:</strong>
              <ul style="list-style:none; padding:0; margin-top:4px; display:flex; flex-direction:column; gap:4px; color:var(--text-secondary);">
                ${strengthsHtml}
              </ul>
            </div>
            <div>
              <strong style="color:var(--crimson-primary);">نقاط الضعف:</strong>
              <ul style="list-style:none; padding:0; margin-top:4px; display:flex; flex-direction:column; gap:4px; color:var(--text-secondary);">
                ${weaknessesHtml}
              </ul>
            </div>
          </div>
        </div>

        <!-- 7. Synergies -->
        <div class="detail-box">
          <span class="detail-box-title">🤝 البطاقات المتوافقة والشراكات التكتيكية</span>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            ${synergiesHtml}
          </div>
        </div>

        <!-- 8. Original English Text (Secondary Reference) -->
        <div class="detail-box" style="background:rgba(0,0,0,0.15);">
          <span class="detail-box-title" style="font-size:0.85rem; color:var(--text-muted);">🔤 النص الأصلي باللغة الإنجليزية (للمطابقة والمراجعة)</span>
          <p class="detail-desc-en">${c.desc_en || 'No English text provided.'}</p>
        </div>

        <!-- Verified Sources -->
        <div style="font-size:0.78rem; color:var(--text-muted); display:flex; align-items:center; justify-content:space-between; border-top:1px solid var(--border-color); padding-top:0.6rem;">
          <span>المصادر الرسمية: ${c.sources.join(' • ')}</span>
          <a href="https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&keyword=${encodeURIComponent(c.name_en)}" target="_blank" rel="noopener" style="color:var(--blue-primary); text-decoration:none;">
            عرض في قاعدة بيانات Konami ↗
          </a>
        </div>
      </div>
    `;
  }

  toggleFav() {
    if (!this.currentCard) return;
    const isNowFav = window.cardsManager.toggleFavorite(this.currentCard.card_key);
    const btn = document.getElementById('modal-fav-btn');
    if (btn) {
      btn.textContent = isNowFav ? '★ بالمفضلة' : '☆ إضافة للمفضلة';
      btn.classList.toggle('active', isNowFav);
    }
    const cardGridEl = document.querySelector(`[data-key="${this.currentCard.card_key}"] .card-fav-btn`);
    if (cardGridEl) {
      cardGridEl.classList.toggle('is-fav', isNowFav);
      cardGridEl.textContent = isNowFav ? '★' : '☆';
    }
    window.app.showToast(isNowFav ? 'تمت إضافة البطاقة إلى المفضلة' : 'تمت إزالة البطاقة من المفضلة');
  }

  toggleCompare() {
    if (!this.currentCard) return;
    const res = window.cardsManager.toggleCompare(this.currentCard.card_key);
    if (res.error) {
      window.app.showToast(res.error, 'error');
      return;
    }
    const btn = document.getElementById('modal-comp-btn');
    if (btn) {
      btn.textContent = res.added ? '✓ بالمقارنة' : '⚖ مقارنة';
      btn.classList.toggle('active', res.added);
    }
    window.app.updateCompareBadge();
    window.app.showToast(res.added ? 'تمت إضافة البطاقة إلى المقارنة' : 'تمت إزالة البطاقة من المقارنة');
  }
}

window.cardDetailsModal = new CardDetailsModal();
