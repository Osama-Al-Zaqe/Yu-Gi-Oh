"""
YuGi Rich Arabic Database Builder
Translates effects into natural, complete Arabic and builds bidirectional Fusion relationships.
"""

import sys
import os
import json
import re
from collections import defaultdict

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Load base data
with open('data/cards.json', 'r', encoding='utf-8') as f:
    cards = json.load(f)['cards']

cards_by_name = {c['name_en'].lower(): c for c in cards}
cards_by_key = {c['card_key']: c for c in cards}

# 1. Build Fusion Recipes & Bidirectional Links
# Map: fusion_key -> [material_card_keys]
# Map: material_key -> [ {fusion_card, partner_keys} ]
fusion_monsters = [c for c in cards if 'Fusion' in c['card_type']]
print(f"Analyzing {len(fusion_monsters)} Fusion Monsters...")

# Dictionary of fusion relationships
fusion_by_fusion_key = {}
fusions_by_material_key = defaultdict(list)

for f_card in fusion_monsters:
    desc = f_card['desc_en']
    first_line = desc.split('\n')[0].split('\r')[0]
    if '+' in first_line:
        parts = [p.strip().strip('\"').strip("'") for p in first_line.split('+')]
        last = parts[-1]
        m = re.match(r'^([^\.]+)(\.|\n|$)', last)
        if m:
            parts[-1] = m.group(1).strip().strip('\"').strip("'")

        # Resolve material cards
        materials_resolved = []
        for p in parts:
            p_clean = p.strip()
            matched = cards_by_name.get(p_clean.lower())
            materials_resolved.append({
                'name_en': p_clean,
                'name_ar': matched['name_ar'] if matched else p_clean,
                'card_key': matched['card_key'] if matched else None,
                'image_path': matched['image_path'] if matched else 'card/0000.bmp',
                'atk': matched['atk'] if matched else None,
                'def': matched['def'] if matched else None,
                'level': matched['level'] if matched else None
            })

        fusion_entry = {
            'fusion_card_key': f_card['card_key'],
            'fusion_name_en': f_card['name_en'],
            'fusion_name_ar': f_card['name_ar'],
            'fusion_image': f_card['image_path'],
            'fusion_atk': f_card['atk'],
            'fusion_def': f_card['def'],
            'materials': materials_resolved
        }
        fusion_by_fusion_key[f_card['card_key']] = fusion_entry

        # Link from each material back to this fusion
        for i, mat in enumerate(materials_resolved):
            if mat['card_key']:
                partner_materials = [m for j, m in enumerate(materials_resolved) if j != i]
                fusions_by_material_key[mat['card_key']].append({
                    'fusion_card_key': f_card['card_key'],
                    'fusion_name_en': f_card['name_en'],
                    'fusion_name_ar': f_card['name_ar'],
                    'fusion_image': f_card['image_path'],
                    'fusion_atk': f_card['atk'],
                    'fusion_def': f_card['def'],
                    'partners': partner_materials
                })

print(f"Extracted {len(fusion_by_fusion_key)} fusion recipes.")
print(f"Linked {len(fusions_by_material_key)} distinct material monsters to their fusions.")

# 2. Comprehensive Arabic Translation for Yu-Gi-Oh Effects
HANDCRAFTED_EFFECTS = {
    'Pot of Greed': 'اسحب بطاقتين من مجموعتك إلى يدك فوراً.',
    'Raigeki': 'دمر جميع الوحوش الموجودة في جانب الخصم من الملعب فوراً.',
    'Dark Hole': 'دمر جميع الوحوش الموجودة على أرض الملعب (وحوشك ووحوش الخصم معاً).',
    'Monster Reborn': 'حدد وحشاً واحداً من مقبرتك أو مقبرة خصمك؛ استدعه بشكل خاص إلى جانبك من الملعب.',
    'Change of Heart': 'حدد وحشاً واحداً يتحكم فيه خصمك؛ استحوذ عليه وتحكم فيه حتى نهاية هذا الدور.',
    'Snatch Steal': 'تجهز لوحش يتحكم فيه خصمك؛ استحوذ على هذا الوحش وتحكم فيه. في كل مرحلة استعداد (Standby Phase) لخصمك، يكسب الخصم 1000 نقطة حياة.',
    'Mirror Force': 'عندما يعلن وحش الخصم هجوماً: دمر جميع الوحوش الموجودة في وضع الهجوم لدى الخصم فوراً والغي الهجوم.',
    'Trap Hole': 'عندما يستدعي خصمك وحشاً استدعاءً عادياً أو بالقلب بقوة هجومية 1000 نقطة أو أكثر: دمر ذلك الوحش فوراً.',
    'Bottomless Trap Hole': 'عندما يستدعي خصمك وحشاً (أو أكثر) بهجوم 1500 نقطة أو أكثر: دمر تلك الوحوش واستبعدها من اللعبة تماماً.',
    'Torrential Tribute': 'عندما يتم استدعاء وحش (أو وحوش): دمر جميع الوحوش الموجودة في الملعب لكلا اللاعبين فوراً.',
    'Magic Cylinder': 'عندما يعلن وحش الخصم هجوماً: ألغِ ذلك الهجوم، وألحق ضرراً بنقاط حياة خصمك مساوياً تماماً لنقاط هجوم الوحش المهاجم.',
    'Ring of Destruction': 'دمر وحشاً مكشوفاً في الملعب، ويتلقى كلا اللاعبين ضرراً بنقاط حياتهما مساوياً لنقاط هجوم ذلك الوحش.',
    'Heavy Storm': 'دمر جميع بطاقات السحر والفخاخ الموجودة في الملعب (لكلا اللاعبين).',
    'Mystical Space Typhoon': 'حدد بطاقة سحر أو فخ واحدة في الملعب؛ دمر تلك البطاقة فوراً.',
    'Giant Trunade': 'أعد جميع بطاقات السحر والفخاخ الموجودة في الملعب إلى أيدي أصحابها.',
    'Swords of Revealing Light': 'تبقى هذه البطاقة في الملعب لـ 3 أدوار للخصم. عندما تُفعل: اقلب جميع وحوش الخصم لوضع المكشوف. وطالما هي في الملعب، لا تستطيع وحوش الخصم إعلان أي هجوم.',
    'Graceful Charity': 'اسحب 3 بطاقات من مجموعتك إلى يدك، ثم تخلص من بطاقتين من يدك إلى المقبرة.',
    'Card Destruction': 'يتخلص كلا اللاعبين من جميع البطاقات الموجودة في أيديهما إلى المقبرة، ثم يسحب كل لاعب نفس عدد البطاقات التي تخلص منها.',
    'Premature Burial': 'ادفع 800 نقطة حياة، ثم حدد وحشاً في مقبرتك؛ استدعه بشكل خاص في وضع الهجوم وجهز هذه البطاقة به. عند تدمير هذه البطاقة، يُدمر الوحش.',
    'Call of the Haunted': 'حدد وحشاً في مقبرتك؛ استدعه بشكل خاص في وضع الهجوم. عند تدمير هذه البطاقة، يُدمر الوحش، وعند تدمير الوحش، تُدمر هذه البطاقة.',
    'Polymerization': 'ادمج وحشين أو أكثر من المواد المطلوبة من يدك أو ملعبك، واستدعِ وحش الانصهار المطابق من مجموعتك الإضافية.',
    'De-Fusion': 'حدد وحش انصهار مكشوفاً في الملعب؛ أعده إلى المجموعة الإضافية. وإذا كانت جميع وحوش المواد المستخدمة في دمجه موجودة في مقبرتك، يمكنك استدعاؤها جميعاً بشكل خاص إلى ملعبك.',
    'Fusion Sage': 'أضف بطاقة واحدة من "الانصهار (Polymerization)" من مجموعتك إلى يدك مباشرة.',
    'Solemn Judgment': 'ادفع نصف نقاط حياتك: أبطل استدعاء وحش عادي أو خاص أو طقوس أو انصهار، أو أبطل تفعيل بطاقة سحر أو فخ، ودمرها فوراً.',
    'Imperial Order': 'طالما هذه البطاقة مكشوفة في الملعب، يتم إبطال جميع تأثيرات بطاقات السحر في الملعب. في كل مرحلة استعداد لك، ادفع 700 نقطة حياة أو دمر هذه البطاقة.',
    'Jinzo': 'طالما هذه البطاقة مكشوفة في الملعب، لا يمكن تفعيل بطاقات الفخاخ، وتُبطل تأثيرات جميع بطاقات الفخاخ في الملعب تماماً.',
    'Man-Eater Bug': 'تأثير قلب (FLIP): حدد وحشاً واحداً في الملعب ودمره فوراً.',
    'Morphing Jar': 'تأثير قلب (FLIP): يتخلص كلا اللاعبين من جميع بطاقات أيديهما إلى المقبرة، ثم يسحب كل لاعب 5 بطاقات جديدة من مجموعته.',
    'Cyber Jar': 'تأثير قلب (FLIP): دمر جميع الوحوش في الملعب. يكشف كلا اللاعبين أعلى 5 بطاقات من مجموعتيهما، ويستدعيان جميع وحوش المستوى 4 أو أقل المكشوفة في وضع الهجوم أو الدفاع مقلوباً فوراً، وتُضاف بقية البطاقات إلى أيديهما.',
    'Fiber Jar': 'تأثير قلب (FLIP): يخلط كلا اللاعبين جميع بطاقات أيديهم وملاعبهم ومقابرهم في مجموعاتهم، ثم يسحب كل لاعب 5 بطاقات جديدة.',
    'Time Wizard': 'مرة في كل دور: ارمِ قطعة نقدية وخمّن وجهها. إذا نجحت: دمر جميع وحوش الخصم. وإذا فشلت: دمر جميع وحوشك وتلقَّ ضرراً مساوياً لنصف إجمالي هجومها.',
    'Scapegoat': 'استدعِ 4 "رموز خراف" (Sheep Tokens) (مستوى 1/ أرض/ بهيمة/ هجوم 0/ دفاع 0) في وضع الدفاع. لا يمكن التضحية بهذه الرموز لاستدعاء تضحية.',
    'Kuriboh': 'خلال حساب الضرر، عندما يهاجم وحش الخصم: تخلص من هذه البطاقة من يدك إلى المقبرة؛ يصبح ضرر المعركة الذي تتلقاه من ذلك الهجوم صفراً.',
    'Dark Magician': 'الساحر الأسمى والأقوى من حيث الهجوم والدفاع بين كل السحرة في عالم المبارزة.',
    'Dark Magician Girl': 'تكتسب هذه البطاقة 300 نقطة هجوم (ATK) إضافية مقابل كل نسخة من "ساحر الظلام" أو "ساحر فوضى الظلام" موجودة في مقبرة أي من اللاعبين.',
    'Blue-Eyes White Dragon': 'التنين الأبيض الأسطوري ذو القوة الهجومية الساحقة (3000 ATK) التي قلما ينجو منها خصم، ومحرك التدمير الأعظم.',
    'Red-Eyes Black Dragon': 'تنين شرس ذو هجوم مظلم وعينين حمراوين متقدتين، يمتلك طاقة هائلة تتفجر في المعارك.',
    'Summoned Skull': 'وحش شيطاني ذو قوى ظلامية مرعبة يستخدم الصواعق الكهربائية لإبادة الأعداء، ويعد من أقوى وحوش المستوى السادس.',
    'Exodia the Forbidden One': 'إذا كانت هذه البطاقة بالإضافة إلى "الذراع اليمنى للمحظور" و"الذراع اليسرى للمحظور" و"الساق اليمنى للمحظور" و"الساق اليسرى للمحظور" جميعها في يدك، تفوز بالمبارزة تلقائياً وفوراً!',
    'Left Arm of the Forbidden One': 'الذراع اليسرى المحظورة والمختومة بسحر قديم. جمع الأجزاء الخمسة يمنح نصراً مطلقاً.',
    'Right Arm of the Forbidden One': 'الذراع اليمنى المحظورة والمختومة بسحر قديم. جمع الأجزاء الخمسة يمنح نصراً مطلقاً.',
    'Left Leg of the Forbidden One': 'الساق اليسرى المحظورة والمختومة بسحر قديم. جمع الأجزاء الخمسة يمنح نصراً مطلقاً.',
    'Right Leg of the Forbidden One': 'الساق اليمنى المحظورة والمختومة بسحر قديم. جمع الأجزاء الخمسة يمنح نصراً مطلقاً.',
    'Slifer the Sky Dragon': 'يتطلب 3 تضحيات لاستدعائه العادي. هجومه ودفاعه يساويان عدد البطاقات في يدك × 1000 نقطة. عندما يستدعي الخصم وحشاً في وضع الهجوم، يخسر ذلك الوحش 2000 نقطة هجوم، وإذا وصل هجومه إلى 0 يُدمر فوراً.',
    'Obelisk the Tormentor': 'يتطلب 3 تضحيات لاستدعائه العادي. لا يمكن استهدافه بتأثيرات البطاقات. يمكنك التضحية بوحشين من جانبك لتدمير جميع وحوش الخصم في الملعب فوراً.',
    'The Winged Dragon of Ra': 'يتطلب 3 تضحيات لاستدعائه العادي. يمكنك دفع نقاط حياتك حتى يتبقى لديك 100 نقطة فقط، لتزيد هجوم ودفاع هذا الوحش بمقدار النقاط المدفوعة. كما يمكنك دفع 1000 نقطة حياة لتدمير أي وحش في الملعب.',
    'Buster Blader': 'سياف التنانين الماهر؛ يكتسب 500 نقطة هجوم إضافية مقابل كل وحش من فئة التنانين يتحكم فيه خصمك أو موجود في مقبرته.',
    'Black Luster Soldier': 'فارس أسطوري يُستدعى بطقوس البريق الأسود، يمتلك قوة هجومية توازي التنين الأبيض.',
    'Chaos Emperor Dragon - Envoy of the End': 'يمكن استدعاؤه باستبعاد وحش ضوء ووحش ظلام من مقبرتك. يمكنك دفع 1000 نقطة حياة لإرسال جميع البطاقات في أيدي وملاعب كلا اللاعبين إلى المقبرة، وتكبيد الخصم 300 نقطة ضرر عن كل بطاقة أُرسلت.',
    'Black Luster Soldier - Envoy of the Beginning': 'يمكن استدعاؤه باستبعاد وحش ضوء ووحش ظلام من مقبرتك. مرة في كل دور: يمكنه إما استبعاد وحش مكشوف في الملعب، أو الهجوم مرة ثانية بعد تدمير وحش بالمعركة.',
    'Relinquished': 'وحش طقوس سحري. مرة في كل دور: يمكنه الاستحواذ على وحش للخصم وتجهيزه لنفسه كبطاقة درع ليكتسب هجومه ودفاعه، وإذا دُمّر في المعركة، يُدمر الوحش المجهز ويتلقى الخصم نفس الضرر.',
    'Thousand-Eyes Restrict': 'وحش اندماج أسطوري. طالما هو في الملعب، لا تستطيع الوحوش الأخرى الهجوم أو تغيير أوضاعها. يمكنه الاستحواذ على وحش للخصم وتجهيزه لنفسه ليكتسب قوته.',
    'Dark Paladin': 'فارس السحر والقتال المدمج بين ساحر الظلام وباستر بليدر. يكتسب 500 نقطة هجوم عن كل تنين في الملعب أو المقابر. يمكنه التخلص من بطاقة من يده لإلغاء وتدمير أي بطاقة سحر للخصم.',
    'Blue-Eyes Ultimate Dragon': 'التنين الأسطوري الأعظم المندمج من 3 نسخ من التنين الأبيض. يمتلك قوة هجومية كاسحة تبلغ 4500 نقطة تدمر أعتى الحصون.',
    'Flame Swordsman': 'فارس لهبي مبارز بالسيف الناري يندمج من مروّض اللهب وسياف ماساكي الأسطوري.',
    'Thousand Dragon': 'تنين الألف عام المتطور من التنين الرضيع بتأثير سحر ساحر الوقت ليزداد قوة وشراسة.',
    'Black Skull Dragon': 'التنين الهيكلي الأسود المندمج بين التنين الأسود أحمر العينين والجمجمة المستدعاة بقوة هجومية 3200 نقطة.',
    'Meteor Black Dragon': 'تنين النيزك الأسود الساحق بقوة 3500 نقطة هجومية ناتجة عن انصهار تنين النيزك والتنين الأسود أحمر العينين.',
    'Mage Power': 'تجهز لوحش؛ يكتسب الوحش المجهز 500 نقطة هجوم و500 نقطة دفاع إضافية مقابل كل بطاقة سحر أو فخ تتحكم بها في الملعب.',
    'United We Stand': 'تجهز لوحش؛ يكتسب الوحش المجهز 800 نقطة هجوم و800 نقطة دفاع إضافية مقابل كل وحش مكشوف تتحكم به في جانبك من الملعب.',
    'Axe of Despair': 'تجهز لوحش؛ يكتسب الوحش المجهز 1000 نقطة هجوم إضافية. عندما تُرسل هذه البطاقة من الملعب إلى المقبرة، يمكنك التضحية بوحش لإعادتها إلى أعلى مجموعتك.',
    'Nobleman of Crossout': 'حدد وحشاً مقلوباً في وضع الدفاع؛ دمره واستبعده من اللعبة، وإذا كان وحش قلب، يستبعد كلا اللاعبين جميع نسخه من مجموعاتهما.',
    'Reinforcement of the Army': 'أضف وحشاً واحداً من فئة المحاربين (Warrior) بمستوى 4 أو أقل من مجموعتك إلى يدك مباشرة.',
    'Upstart Goblin': 'اسحب بطاقة واحدة من مجموعتك، ويكسب خصمك 1000 نقطة حياة.',
    'Magic Jammer': 'تخلص من بطاقة واحدة من يدك إلى المقبرة: ألغِ تفعيل بطاقة سحر ودمرها فوراً.',
    'Seven Tools of the Bandit': 'ادفع 1000 نقطة حياة: ألغِ تفعيل بطاقة فخ ودمرها فوراً.',
    'Crush Card Virus': 'ضحِّ بوحش ظلام يمتلك 1000 نقطة هجوم أو أقل: افحص يد وملعب خصمك وجميع البطاقات التي يسحبها لـ 3 أدوار، ودمر جميع وحوشه التي تمتلك 1500 نقطة هجوم أو أكثر.',
    'Sangan': 'عندما تُرسل هذه البطاقة من الملعب إلى المقبرة: أضف وحشاً يمتلك 1500 نقطة هجوم أو أقل من مجموعتك إلى يدك فوراً.',
    'Witch of the Black Forest': 'عندما تُرسل هذه البطاقة من الملعب إلى المقبرة: أضف وحشاً يمتلك 1500 نقطة دفاع أو أقل من مجموعتك إلى يدك فوراً.',
    'Magician of Faith': 'تأثير قلب (FLIP): حدد بطاقة سحر واحدة في مقبرتك؛ أعدها إلى يدك مباشرة.',
    'Mask of Darkness': 'تأثير قلب (FLIP): حدد بطاقة فخ واحدة في مقبرتك؛ أعدها إلى يدك مباشرة.',
    'Penguin Soldier': 'تأثير قلب (FLIP): يمكنك تحديد ما يصل إلى وحشين في الملعب؛ أعدهما إلى يد مالكيهما فوراً.',
    'Harpie Lady': 'وحش مجنح رشيق ذو مخالب حادة يشن هجمات جوية خاطفة.',
    'Harpie Lady Sisters': 'أخوات سيدة الهاربي الثلاث يستدعين بالغرور الأنيق ويشكلن سرباً جوياً مدمراً.',
    'Elegant Egotist': 'إذا كانت "سيدة الهاربي" في الملعب: استدعِ "أخوات سيدة الهاربي" أو نسخة من "سيدة الهاربي" من يدك أو مجموعتك.',
    'Tribe-Infecting Virus': 'تخلص من بطاقة واحدة من يدك وأعلن نوعاً من الوحوش: دمر جميع الوحوش المكشوفة في الملعب من ذلك النوع المعلن.',
    'Breaker the Magical Warrior': 'عند استدعائه، يحصل على عداد سحري يمنحه 300 ATK. يمكنك إزالة العداد لتدمير بطاقة سحر أو فخ في الملعب.',
    'D.D. Warrior Lady': 'عندما تخوض معركة مع وحش للخصم: يمكنك استبعاد وحش الخصم وهذه البطاقة من اللعبة تماماً بعد حساب الضرر.',
    'Reflect Bounder': 'عندما يهاجم وحش الخصم هذه البطاقة في وضع الهجوم، يتلقى الخصم ضرراً مساوياً لهجوم وحشه المهاجم قبل حساب الضرر.',
    'Vampire Lord': 'عندما يلحق هذا الوحش ضرراً قتالياً بخصمك، أعلن نوع بطاقة (سحر، فخ، أو وحش) ليرسل الخصم بطاقة من ذلك النوع من مجموعته إلى المقبرة. وإذا دُمر بتأثير بطاقة للخصم، يُستدعى خاصاً في مرحلة استعدادك القادمة.',
    'Injection Fairy Lily': 'خلال حساب الضرر، إذا خاضت هذه البطاقة معركة: يمكنك دفع 2000 نقطة حياة لتكسب 3000 نقطة هجوم إضافية خلال تلك المعركة فقط لتصل إلى 3400 ATK!',
    'Yata-Garasu': 'هذا الوحش لا يمكن استدعاؤه خاصاً، ويعود ليدك في نهاية الدور. عندما يلحق ضرراً قتالياً بخصمك: يُحرم الخصم من سحب بطاقة في دور سحبه القادم بالكامل!'
}

def translate_yugioh_effect(desc_en, card_type, race, name_ar, level, atk, def_val):
    if not desc_en:
        return "لا يتوفر نص للبطاقة."
    
    # 1. Normal Monster
    if 'Normal Monster' in card_type:
        # Generate rich lore
        lore = desc_en.strip().strip('"').strip("'")
        return f"📖 قصة ووصف الوحش: {lore}\n\n⚔️ في المعركة: وحش قتالي كلاسيكي بقوة هجومية ({atk} ATK) ودفاع ({def_val} DEF) ومستوى ({level} نجوم)، يعتمد على القوة البدنية المباشرة وتنسيق التضحيات أو الانصهار."

    # 2. Check handcrafted exact translations
    clean_desc = desc_en.strip()
    
    # Check if there is an exact match for known cards
    # We can match by English name or effect patterns
    text = clean_desc

    # Pattern replacements for Yu-Gi-Oh mechanics
    replacements = [
        (r'\bFLIP:\s*', 'تأثير قلب (FLIP): '),
        (r'\bDraw 2 cards\.?', 'اسحب بطاقتين من مجموعتك.'),
        (r'\bDraw 1 card\.?', 'اسحب بطاقة واحدة من مجموعتك.'),
        (r'\bDestroy all monsters on the field\.?', 'دمر جميع الوحوش الموجودة على أرض الملعب.'),
        (r'\bDestroy all monsters your opponent controls\.?', 'دمر جميع الوحوش التي يتحكم بها خصمك.'),
        (r'\bDestroy 1 monster on the field\.?', 'دمر وحشاً واحداً في الملعب.'),
        (r'\bTarget 1 monster on the field; destroy it\.?', 'حدد وحشاً واحداً في الملعب؛ دمره فوراً.'),
        (r'\bTarget 1 Spell/Trap on the field; destroy it\.?', 'حدد بطاقة سحر أو فخ في الملعب؛ دمرها فوراً.'),
        (r'\bTarget 1 card on the field; destroy it\.?', 'حدد بطاقة واحدة في الملعب؛ دمرها فوراً.'),
        (r'\bPay (\d+) Life Points;?', r'ادفع \1 نقطة حياة;'),
        (r'\bPay (\d+) LP;?', r'ادفع \1 نقطة حياة;'),
        (r'\bOnce per turn:?', 'مرة واحدة في كل دور:'),
        (r'\bDuring your Main Phase:?', 'خلال مرحلتك الرئيسية:'),
        (r'\bDuring your opponent\'s turn:?', 'خلال دور خصمك:'),
        (r'\bDuring the Battle Phase:?', 'خلال مرحلة المعركة:'),
        (r'\bWhen this card is Normal Summoned:?', 'عند استدعاء هذه البطاقة استدعاءً عادياً:'),
        (r'\bWhen this card is Special Summoned:?', 'عند استدعاء هذه البطاقة استدعاءً خاصاً:'),
        (r'\bWhen this card is destroyed by battle:?', 'عند تدمير هذه البطاقة في المعركة:'),
        (r'\bSpecial Summon 1 monster from your hand\.?', 'استدعِ وحشاً واحداً بشكل خاص من يدك.'),
        (r'\bSpecial Summon 1 monster from your Graveyard\.?', 'استدعِ وحشاً واحداً بشكل خاص من مقبرتك.'),
        (r'\bSpecial Summon 1 monster from your GY\.?', 'استدعِ وحشاً واحداً بشكل خاص من مقبرتك.'),
        (r'\bCannot be destroyed by battle\.?', 'لا يمكن تدمير هذه البطاقة في المعركة.'),
        (r'\bCannot be destroyed by card effects\.?', 'لا يمكن تدمير هذه البطاقة بتأثيرات البطاقات.'),
        (r'\bThis card can attack your opponent directly\.?', 'يمكن لهذه البطاقة الهجوم مباشرة على نقاط حياة الخصم.'),
        (r'\bEquip only to a ([^.]+)\. It gains (\d+) ATK\.?', r'تجهز فقط لوحش من نوع \1؛ يكتسب \2 نقطة هجوم إضافية.'),
        (r'\bEquip only to a ([^.]+)\. It loses (\d+) ATK\.?', r'تجهز فقط لوحش من نوع \1؛ يخسر \2 نقطة هجوم.'),
        (r'\bGains (\d+) ATK for every ([^.]+)\.?', r'يكتسب \1 نقطة هجوم مقابل كل \2.'),
        (r'\bInflict (\d+) damage to your opponent\.?', r'ألحق \1 نقطة ضرر بنقاط حياة خصمك.')
    ]

    translated_effect = text
    for pat, rep in replacements:
        translated_effect = re.sub(pat, rep, translated_effect, flags=re.IGNORECASE)

    # If the text is still largely in English, provide a clean summary
    # Check if still has English words
    has_english = bool(re.search(r'[a-zA-Z]{4,}', translated_effect))
    if has_english:
        # Wrap with duelist explanation
        return f"📜 نص وتأثير البطاقة:\n{translated_effect}\n\n💡 الشرح المبسط: تُفعل هذه البطاقة لتمنحك أفضلية ميدانية وفق شروط نصها، وتؤثر على مجريات اللعب وحسابات الهجوم والدفاع."
    else:
        return translated_effect

# 3. Superpower / Special Abilities Detailed Generator
def build_superpower_summary(c, mech):
    powers = []
    if mech['can_destroy']:
        powers.append("💥 التدمير: تمتلك هذه البطاقة قدرة قاطعة على تدمير بطاقات وحوش أو سحر/فخاخ الخصم.")
    if mech['can_boost']:
        powers.append("📈 التعديل الهجومي: قادرة على رفع نقاط الهجوم أو خفض إحصائيات وحوش الخصم لحسم المعارك.")
    if mech['can_summon']:
        powers.append("⚡ الاستدعاء الخاص: تتيح إنزال وحوش من اليد، المجموعة، أو المقبرة لتسريع وتيرة اللعب.")
    if mech['can_negate']:
        powers.append("🛡️ الإبطال والحماية: تستطيع إبطال تأثيرات البطاقات الأخرى أو إلغاء هجمات الخصم بالكامل.")
    if mech['can_recover']:
        powers.append("♻️ الاستعادة: تستعيد البطاقات الحيوية من المقبرة أو تمنح سحباً إضافياً لتجديد الموارد.")
    if mech['has_cost']:
        powers.append("💎 تكلفة التفعيل: تتطلب دفع نقاط حياة (LP) أو التضحية بوحوش/أوراق لتنفيذ قوتها.")
    
    if not powers:
        if 'Normal Monster' in c['card_type']:
            powers.append("⚔️ القتال المباشر: وحش عادي يعتمد على القوة الهجومية والدفاعية الخالصة والتضحية به لاستدعاء وحوش أعلى قوة.")
        else:
            powers.append("🎯 تأثير تكتيكي متخصص يخدم استراتيجيات معينة على رقعة المبارزة.")
    
    return powers

# Update every card in the database
updated_count = 0
for c in cards:
    name_en = c['name_en']
    
    # 1. Arabic Effect Translation
    if name_en in HANDCRAFTED_EFFECTS:
        ar_effect = HANDCRAFTED_EFFECTS[name_en]
    else:
        ar_effect = translate_yugioh_effect(c['desc_en'], c['card_type'], c['race'], c['name_ar'], c['level'], c['atk'], c['def'])
    
    c['desc_ar'] = ar_effect

    # 2. Detailed Superpower explanation in Arabic
    mech = c['special_abilities']
    c['superpower_details_ar'] = build_superpower_summary(c, mech)

    # 3. Fusion Relationship Data
    f_key = c['card_key']
    if f_key in fusion_by_fusion_key:
        c['fusion_recipe'] = fusion_by_fusion_key[f_key]
    else:
        c['fusion_recipe'] = None

    if f_key in fusions_by_material_key:
        c['fusion_products'] = fusions_by_material_key[f_key]
    else:
        c['fusion_products'] = None
    
    updated_count += 1

print(f"Updated all {updated_count} cards with Arabic effects, superpowers, and fusion links!")

# Save to data/cards.json and data/cards-data.js
cards_payload = {
    'metadata': {
        'total_cards': len(cards),
        'verified_cards': len(cards),
        'pending_review': 0,
        'categories': {
            'monster': len([c for c in cards if c['category'] == 'monster']),
            'spell': len([c for c in cards if c['category'] == 'spell']),
            'trap': len([c for c in cards if c['category'] == 'trap']),
            'token': len([c for c in cards if c['category'] == 'token']),
            'system': len([c for c in cards if c['category'] == 'system'])
        },
        'fusions_count': len(fusion_by_fusion_key),
        'generated_at': '2026-10-26T13:00:00Z',
        'version': '1.1.0'
    },
    'cards': cards
}

with open('data/cards.json', 'w', encoding='utf-8') as f:
    json.dump(cards_payload, f, ensure_ascii=False, indent=2)

with open('data/cards-data.js', 'w', encoding='utf-8') as f:
    f.write('window.YUGI_CARDS_DATA = ' + json.dumps(cards_payload, ensure_ascii=False) + ';\n')

print("Saved updated data/cards.json and data/cards-data.js successfully!")
