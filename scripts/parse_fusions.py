import sys
import json
import re

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

with open('data/cards.json', 'r', encoding='utf-8') as f:
    cards = json.load(f)['cards']

cards_by_name = {c['name_en'].lower(): c for c in cards}

fusion_monsters = [c for c in cards if 'Fusion' in c['card_type']]
print(f'Total Fusion Monsters: {len(fusion_monsters)}')

recipes = []
for f in fusion_monsters:
    desc = f['desc_en']
    first_line = desc.split('\n')[0].split('\r')[0]
    # Check pattern like '"Mat 1" + "Mat 2"' or 'Mat 1 + Mat 2'
    if '+' in first_line:
        # split by +
        parts = [p.strip().strip('\"').strip("'") for p in first_line.split('+')]
        # Clean up any trailing text in the last part (e.g. if not on separate line)
        last = parts[-1]
        m = re.match(r'^([^\.]+)(\.|\n|$)', last)
        if m:
            parts[-1] = m.group(1).strip().strip('\"')
        
        # Check if materials exist in our card database
        resolved_materials = []
        for p in parts:
            p_clean = p.strip()
            # check alias or direct
            c = cards_by_name.get(p_clean.lower())
            resolved_materials.append({
                'name_en': p_clean,
                'card_key': c['card_key'] if c else None,
                'image_path': c['image_path'] if c else None,
                'name_ar': c['name_ar'] if c else p_clean
            })
        
        recipes.append({
            'fusion_name_en': f['name_en'],
            'fusion_name_ar': f['name_ar'],
            'fusion_card_key': f['card_key'],
            'fusion_image': f['image_path'],
            'materials': resolved_materials
        })
    else:
        print(f"Non-standard fusion line: {f['name_en']} -> {repr(first_line)}")

print(f'Successfully parsed {len(recipes)} fusion recipes!')
for r in recipes[:10]:
    m_names = [m['name_en'] + (' (found)' if m['card_key'] else ' (not in db)') for m in r['materials']]
    print(f"  {r['fusion_name_en']} <== {m_names}")
