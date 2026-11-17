"""Da movimiento a un Short ya montado: cada plano de imagen fija pasa a alternar clip + imagen.
Uso: python3 tools/movimiento.py S12 [S13 ...]   (guarda copia en fichas/orig/ y reescribe fichas/ID.json)
Los clips se eligen por el tema de la imagen (nombre de archivo) y no se repiten dentro del mismo Short."""
import json, sys, os, re, shutil, random
SP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
E = lambda *n: [f'ext/ext-{x:04d}' for x in n]
POOLS = {
    'ciudad': ['precarga-34'] + E(992, 1136, 1232, 1544, 740, 572, 596, 1028, 1076, 1100, 944, 1004) + ['trailer-22', 'x-avioneta', 'precarga-40', 'trailer-21'],
    'cayos': ['x-keys', 'x-marina', 'trailer-06', 'precarga-37', 'trailer-04', 'trailer-02', 'trailer-12'] + E(644, 680),
    'naturaleza': E(464) + ['trailer-10', 'x-iguana', 'trailer-08', 'trailer-06'],
    'jason': E(164, 716, 800, 824, 1016, 1088) + ['trailer-11', 'trailer-05', 'trailer-03', 'trailer-23'],
    'lucia': E(968, 1040, 392, 404, 908, 728) + ['trailer-09', 'trailer-26', 'trailer-30', 'trailer-15'],
    'pareja': E(800, 716, 512, 536, 1004, 740) + ['trailer-18', 'trailer-28', 'trailer-09'],
    'musica': E(1388, 1256, 1268, 1220, 1280) + ['trailer-16', 'trailer-20', 'trailer-25', 'trailer-31', 'precarga-38'],
    'brian': E(644, 656, 668, 680) + ['precarga-39', 'x-marina', 'trailer-06'],
    'cal': E(632, 620) + ['precarga-35', 'trailer-06'],
    'raul': E(716, 728, 848, 860) + ['trailer-13', 'trailer-14', 'trailer-29'],
    'coches': E(512, 524, 536, 752, 764, 776, 920, 932, 1064) + ['trailer-27', 'precarga-40', 'trailer-17', 'trailer-02'],
    'pueblo': E(368, 380, 980, 1088, 500) + ['trailer-02', 'trailer-17'],
    'gancho': E(1136, 848, 860, 992, 1232, 752) + ['trailer-22', 'x-avioneta', 'x-tren', 'trailer-30'],
    'accion': E(848, 860, 968, 1136, 716) + ['trailer-30', 'trailer-13', 'trailer-29', 'x-tren'],
}
REGLAS = [(r'Boobie|DreQuan|Real_Dimez|Album|radio', 'musica'), (r'Brian', 'brian'), (r'Cal_', 'cal'), (r'Raul', 'raul'),
          (r'Jason_and_Lucia|Jason_Lucia|Robbery|Rooftop|Motel|Lock_And|Beach', 'pareja'), (r'Lucia', 'lucia'), (r'Jason', 'jason'),
          (r'Leonida_Keys|cayos|Keys|SQUALO|marina', 'cayos'), (r'Grassrivers|pantanos|Kalaga|animal', 'naturaleza'),
          (r'Ambrosia|Port_Gellhorn', 'pueblo'), (r'CHEETAH|BUGGY|GANADO|WYMAN|SAFEHOUSE|RIDEOUT|coches|STANIER|Pre_Load', 'coches'),
          (r'accion|armas|WEAPON|HAWK', 'accion'), (r'Vice_City|vice-city|Hero|Cover|Postcard|fiesta|gente', 'ciudad')]


def tema(img):
    for pat, t in REGLAS:
        if re.search(pat, img, re.I):
            return t
    return 'ciudad'


def main():
    for vid in sys.argv[1:]:
        f = f'{SP}/fichas/{vid}.json'
        os.makedirs(f'{SP}/fichas/orig', exist_ok=True)
        o = f'{SP}/fichas/orig/{vid}.json'
        if not os.path.exists(o):
            shutil.copy(f, o)
        F = json.load(open(o))
        usados = set(p.get('clip') for p in F['planos'] if 'clip' in p)
        rnd = random.Random(vid)
        def coge(t):
            pool = [c for c in POOLS[t] if c not in usados] or [c for c in POOLS['ciudad'] if c not in usados] or POOLS['ciudad']
            c = rnd.choice(pool); usados.add(c); return c
        n_img = n_mov = 0
        out = []
        for i, p in enumerate(F['planos']):
            q = dict(p)
            plano_simple = 'img' in q and not any(k in q for k in ('ficha', 'cita', 'tpl', 'lista'))
            if plano_simple:
                n_img += 1
                c = coge('gancho' if i == 0 else tema(q['img']))
                top = q.pop('top', None)
                img = {'img': q.pop('img')}
                for k in ('cx',):
                    if k in q: img[k] = q.pop(k)
                clip = {'clip': c}
                if 'sello' in q:  # primero el clip, luego el sello sobre la imagen
                    sel = {k: q.pop(k) for k in ('sello', 'acc', 'g') if k in q}
                    q['lista'] = [clip, {**img, **sel}]
                    out.append(q); n_mov += 1
                    continue
                a, b = (clip, img) if i % 2 == 0 else (img, clip)
                if top: a['top'] = top
                q['lista'] = [a, b]
                n_mov += 1
            elif 'lista' in q:
                nl = []
                for j, s in enumerate(q['lista']):
                    nl.append(s)
                    if 'img' in s and j == len(q['lista']) - 1 and len(q['lista']) < 3:
                        nl.insert(len(nl) - 1, {'clip': coge(tema(s['img']))}); n_mov += 1
                q['lista'] = nl
            out.append(q)
        for q in out:
            q.pop('_img_extra', None)
        # logo oficial de GTA VI en el gancho (arte oficial "With Logos")
        LOGOS = ['p2/Artwork_Wallpapers_Jason_and_Lucia_01_With_Logos_Jason_and_Lucia_01_With_Logos_portrait.jpg',
                 'p2/Artwork_Wallpapers_Jason_and_Lucia_02_With_Logos_Jason_and_Lucia_02_With_Logos_portrait.jpg',
                 'p2/Artwork_Wallpapers_Jason_and_Lucia_Beach_With_Logos_Jason_and_Lucia_Beach_With_Logos_portrait.jpg',
                 'p2/Artwork_Wallpapers_Jason_and_Lucia_Lock_and_Load_With_Logos_Jason_Lucia_Lock_And_Load_With_Logos_portrait.jpg',
                 'p2/Artwork_Wallpapers_Jason_and_Lucia_Robbery_With_Logo_Jason_and_Lucia_Robbery_With_Logo_portrait.jpg',
                 'p2/Artwork_Wallpapers_Jason_and_Lucia_Rooftop_With_Logos_Jason_Lucia_Rooftop_With_Logos_portrait.jpg']
        p0 = out[0]
        if not any(k in p0 for k in ('ficha', 'cita', 'tpl', 'sello')):
            logo = {'img': rnd.choice(LOGOS)}
            if 'lista' in p0:
                if len(p0['lista']) < 3: p0['lista'].append(logo)
            else:
                base = {k: v for k, v in p0.items() if k != 'a'}
                out[0] = {**({'a': p0['a']} if 'a' in p0 else {}), 'lista': [base, logo]}
        F['planos'] = out
        json.dump(F, open(f, 'w'), ensure_ascii=False, indent=1)
        print(f'{vid}: {n_img} planos de foto -> {n_mov} con clip')


main()
