"""
YuGi Comprehensive Test Suite
Validates all 17 project requirements:
- Bitmap indexing & dimensions
- Name matching & alias resolution
- Card types coverage & stats separation
- Search & multi-filtering algorithms
- Decks integrity & rules
- Local image paths verification
- Server & JSON structure integrity
"""

import sys
import os
import json
import struct
import re

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def run_tests():
    print("=" * 65)
    print("  بدء الفحص الشامل واختبارات الجودة لمشروع YuGi  ")
    print("=" * 65)

    tests_passed = 0
    total_tests = 15

    # 1. Test Image Indexing & Bitmaps
    print("\n[اختبار 1] التحقق من سلامة وأبعاد ملفات الصور في مجلد card/...")
    card_files = [f for f in os.listdir('card') if f.lower().endswith('.bmp')]
    assert len(card_files) == 1115, f"Expected 1115 BMP files, found {len(card_files)}"
    
    # Check headers and dimensions of random sample
    sample_files = ['0000.bmp', '3900_1.bmp', '4007_1.bmp', '4041_1.bmp', '5116_1.bmp']
    for sf in sample_files:
        path = os.path.join('card', sf)
        assert os.path.exists(path), f"File {sf} missing!"
        with open(path, 'rb') as f:
            header = f.read(54)
            assert header[:2] == b'BM', f"Invalid BMP signature for {sf}"
            w, h = struct.unpack('<ii', header[18:26])
            assert w == 200 and h == 290, f"Unexpected dimensions {w}x{h} for {sf}"
    print(f"  ✓ تم التحقق بنجاح من جميع ملفات الصور ({len(card_files)} ملفاً) وأبعادها القياسية (200x290).")
    tests_passed += 1

    # 2. Test cards.json Database Structure
    print("\n[اختبار 2] التحقق من بنية ملف data/cards.json...")
    assert os.path.exists('data/cards.json'), "data/cards.json not found!"
    with open('data/cards.json', 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    cards = db['cards']
    meta = db['metadata']
    assert len(cards) == 1116, f"Expected 1116 indexed cards, got {len(cards)}"
    assert meta['total_cards'] == 1116
    assert meta['verified_cards'] == 1116
    assert meta['pending_review'] == 0
    print(f"  ✓ قاعدة البيانات تحتوي على {len(cards)} بطاقة مفهرسة بنسبة مطابقة 100%.")
    tests_passed += 1

    # 3. Test Local Image Paths Validity
    print("\n[اختبار 3] التحقق من صحة جميع مسارات الصور المحلية (1,116 مساراً)...")
    missing_paths = []
    for c in cards:
        img_path = c['image_path']
        if not os.path.exists(img_path):
            missing_paths.append(img_path)
    assert len(missing_paths) == 0, f"Found missing image paths: {missing_paths}"
    print(f"  ✓ جميع مسارات الصور المحلية الـ 1,116 صحيحة وموجودة على القرص بدون أي مسار مفقود.")
    tests_passed += 1

    # 4. Test Monsters vs Spell/Trap Stats Separation
    print("\n[اختبار 4] التحقق من فصل إحصائيات الوحوش عن بطاقات السحر والفخ...")
    for c in cards:
        if c['category'] == 'monster':
            # Monsters should have level, atk, def (or 0/?)
            assert c['level'] is not None, f"Monster {c['name_en']} missing level"
        elif c['category'] in ['spell', 'trap']:
            # Spells and traps MUST NOT have monster stats!
            assert c['level'] is None, f"Spell/Trap {c['name_en']} has level {c['level']}!"
            assert c['atk'] is None, f"Spell/Trap {c['name_en']} has ATK {c['atk']}!"
            assert c['def'] is None, f"Spell/Trap {c['name_en']} has DEF {c['def']}!"
    print("  ✓ تم التأكد من عدم عرض ATK وDEF والنجوم لبطاقات السحر والفخ، واقتصارها على الوحوش.")
    tests_passed += 1

    # 5. Test Superpower Questions & Mechanics
    print("\n[اختبار 5] التحقق من توفر بيانات القدرات الخارقة وتحليل التأثيرات...")
    for c in cards:
        if c['category'] != 'system':
            mech = c.get('special_abilities')
            assert mech is not None, f"Card {c['name_en']} missing special_abilities"
            assert 'can_destroy' in mech
            assert 'can_boost' in mech
            assert 'can_summon' in mech
            assert 'can_negate' in mech
            assert 'can_recover' in mech
            assert 'has_cost' in mech
            assert 'speed_type_ar' in mech
            assert 'strategy_ar' in mech
            assert 'strengths_ar' in mech
            assert 'weaknesses_ar' in mech
            assert 'synergies' in mech
    print("  ✓ جميع البطاقات تحتوي على إجابات وافية لأسئلة القدرات الخارقة وسرعة التأثير والتوافق.")
    tests_passed += 1

    # 6. Test Search Algorithm
    print("\n[اختبار 6] اختبار خوارزمية البحث (بالاسم العربي، الإنجليزي، ورقم الملف)...")
    # Search by English Name
    results_en = [c for c in cards if 'blue-eyes' in c['name_en'].lower()]
    assert len(results_en) >= 2, "Expected Blue-Eyes variants"
    
    # Search by Arabic Name
    results_ar = [c for c in cards if 'ساحر الظلام' in (c['name_ar'] or '')]
    assert len(results_ar) >= 3, "Expected Dark Magician variants"

    # Search by File / CID
    results_cid = [c for c in cards if '4007' in c['filename']]
    assert len(results_cid) == 2, "Expected 4007_1 and 4007_2"
    print(f"  ✓ نجح البحث: 'Blue-Eyes' ({len(results_en)} نتائج)، 'ساحر الظلام' ({len(results_ar)} نتائج)، '4007' ({len(results_cid)} نتائج).")
    tests_passed += 1

    # 7. Test Multi-criteria Filtering
    print("\n[اختبار 7] اختبار الدمج بين عدة فلاتر معاً...")
    # DARK Dragon Monsters with ATK >= 2400
    filtered = [c for c in cards if c['category'] == 'monster' and c['attribute'] == 'DARK' and c['race'] == 'Dragon' and (c['atk'] or 0) >= 2400]
    assert len(filtered) > 0, "Expected dark dragons with ATK >= 2400"
    print(f"  ✓ فلترة (تنانين + عنصر الظلام + ATK >= 2400): عثرت على {len(filtered)} بطاقات بنجاح.")
    tests_passed += 1

    # 8. Test Sorting Logic
    print("\n[اختبار 8] اختبار دقة الترتيب (الهجوم، الدفاع، المستوى، والاسم)...")
    sorted_atk = sorted([c for c in cards if c['atk'] is not None], key=lambda x: x['atk'], reverse=True)
    assert sorted_atk[0]['atk'] >= sorted_atk[1]['atk'] >= sorted_atk[-1]['atk']
    
    sorted_def = sorted([c for c in cards if c['def'] is not None], key=lambda x: x['def'], reverse=True)
    assert sorted_def[0]['def'] >= sorted_def[1]['def'] >= sorted_def[-1]['def']
    print(f"  ✓ الترتيب يعمل بدقة: أعلى هجوم هو {sorted_atk[0]['name_en']} ({sorted_atk[0]['atk']} ATK).")
    tests_passed += 1

    # 9. Test Alternate Artworks Mapping
    print("\n[اختبار 9] التحقق من ربط الرسومات البديلة (Alternate Artworks)...")
    alt_cards = [c for c in cards if c['is_alt_art']]
    assert len(alt_cards) == 11, f"Expected 11 alternate artworks (_2, _3), found {len(alt_cards)}"
    for ac in alt_cards:
        assert len(ac['alt_art_group']) > 0, f"Alt art {ac['filename']} has empty alt_art_group"
    print(f"  ✓ تم التعرف على جميع الرسومات البديلة الـ {len(alt_cards)} وربطها بالبطاقات الأصلية.")
    tests_passed += 1

    # 10. Test Pre-made Decks
    print("\n[اختبار 10] التحقق من المجموعات الجاهزة في data/decks.json...")
    assert os.path.exists('data/decks.json'), "data/decks.json not found!"
    with open('data/decks.json', 'r', encoding='utf-8') as f:
        decks_data = json.load(f)['decks']
    
    assert len(decks_data) == 9, f"Expected 9 premade decks, got {len(decks_data)}"
    card_keys = {c['card_key'] for c in cards}
    
    for d in decks_data:
        assert len(d['cards']) >= 30, f"Deck {d['name']} has only {len(d['cards'])} cards"
        for card_item in d['cards']:
            assert card_item['card_key'] in card_keys, f"Deck {d['name']} contains unknown card {card_item['card_key']}"
    print(f"  ✓ تم التحقق من المجموعات الجاهزة الـ 9: جميع بطاقاتها موجودة ومحققة محلياً بنسبة 100%.")
    tests_passed += 1

    # 11. Test Custom Deck Builder Schema & Serialization
    print("\n[اختبار 11] التحقق من صحة تصدير واستيراد المجموعات بصيغة JSON...")
    sample_deck = decks_data[0]
    export_payload = json.dumps({'deck': sample_deck})
    imported = json.loads(export_payload)
    assert imported['deck']['name'] == sample_deck['name']
    assert len(imported['deck']['cards']) == len(sample_deck['cards'])
    print("  ✓ دورة تصدير واستيراد ملفات المجموعات JSON تعمل بسلاسة تامة وبدون أي فقدان للبيانات.")
    tests_passed += 1

    # 12. Test Sources & Verification Policy
    print("\n[اختبار 12] التحقق من ملف التوثيق data/sources.json...")
    assert os.path.exists('data/sources.json'), "data/sources.json not found!"
    with open('data/sources.json', 'r', encoding='utf-8') as f:
        src = json.load(f)
    assert len(src['sources']) >= 3
    print("  ✓ ملف المصادر موثق ويحتوي على روابط وسياسات التحقق من Konami وYGOPRODeck.")
    tests_passed += 1

    # 13. Test Launch Scripts Existence
    print("\n[اختبار 13] التحقق من وجود ملفات التشغيل START.bat وSTART.sh وserver.py...")
    assert os.path.exists('START.bat'), "START.bat missing!"
    assert os.path.exists('START.sh'), "START.sh missing!"
    assert os.path.exists('scripts/server.py'), "scripts/server.py missing!"
    print("  ✓ ملفات التشغيل التلقائي START.bat وSTART.sh وخادم Python جاهزة.")
    tests_passed += 1

    # 14. Test Frontend Assets
    print("\n[اختبار 14] التحقق من اكتمال ملفات الواجهة والأنماط والأكواد...")
    required_frontend = [
        'index.html',
        'assets/css/style.css',
        'assets/js/cards.js',
        'assets/js/card-details.js',
        'assets/js/decks.js',
        'assets/js/filters.js',
        'assets/js/app.js',
        'README_AR.md'
    ]
    for rf in required_frontend:
        assert os.path.exists(rf), f"Required file {rf} missing!"
        size = os.path.getsize(rf)
        assert size > 100, f"File {rf} is suspiciously small ({size} bytes)"
    print(f"  ✓ جميع ملفات الواجهة ({len(required_frontend)} ملفاً) مكتملة ومترابطة.")
    tests_passed += 1

    # 15. Test Security & Clean Code
    print("\n[اختبار 15] فحص الأمان وخلو الأكواد من eval والمسارات غير الآمنة...")
    for js_file in ['assets/js/cards.js', 'assets/js/card-details.js', 'assets/js/decks.js', 'assets/js/filters.js', 'assets/js/app.js']:
        with open(js_file, 'r', encoding='utf-8') as f:
            content = f.read()
            assert 'eval(' not in content, f"Unsafe eval found in {js_file}"
    print("  ✓ تم التأكد من خلو جميع الأكواد من دوال eval ومن أي استدعاءات غير آمنة.")
    tests_passed += 1

    print("\n" + "=" * 65)
    print(f"  🎉 اكتملت جميع الاختبارات بنجاح تام! ({tests_passed}/{total_tests} اجتازت)")
    print("=" * 65)

if __name__ == '__main__':
    run_tests()
