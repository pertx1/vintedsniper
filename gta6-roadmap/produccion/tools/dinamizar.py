"""Hace un vídeo largo (gen JSON ya montado) más dinámico: más clips oficiales, motion graphics y efectos de sonido.
Uso: python3 tools/dinamizar.py GENID [graficos.json]
 - Planos de imagen >=2.2 s se parten en clip (<=2.4 s) + imagen; algunos cortos pasan a clip entero.
 - graficos.json: [{"frase": "veinte dólares", "tipo": "precio", ...props de gta-grafico}] -> sustituye el plano que suena en esa frase.
 - Efectos: sello -> stamp, gráfico -> ping, dinero -> cash, policía -> siren, "ojo" -> scratch (mín. 6 s entre efectos).
Guarda copia en render/src/gen/GENID.base.json y siempre parte de ella."""
import sys, json, os, re, random, shutil, unicodedata
SP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(f'{SP}/tools/movimiento.py').read().split('\ndef main')[0]; mov = {'__file__': f'{SP}/tools/movimiento.py'}; exec(src, mov)
POOLS, tema = mov['POOLS'], mov['tema']
OSCUROS = {'0236','0248','0320','0332','0356','1316','1400','1544'}
def ruta(c):
    if c.startswith('ext/'):
        return None if c[-4:] in OSCUROS else c + '.mp4'
    return 'h/' + c + '.mp4'
gid = sys.argv[1]
g = f'{SP}/render/src/gen/{gid}.json'; base = g.replace('.json', '.base.json')
if not os.path.exists(base): shutil.copy(g, base)
D = json.load(open(base))
rnd = random.Random(gid); recientes = []
def clip_para(img):
    t = tema(img or '')
    pool = [ruta(c) for c in POOLS.get(t, POOLS['ciudad']) + POOLS['ciudad']]
    pool = [c for c in pool if c and c not in recientes[-14:]] or [ruta(c) for c in POOLS['ciudad'] if ruta(c)]
    c = rnd.choice(pool); recientes.append(c); return c
nuevos = []; t = 0.0; n_split = n_full = 0
for k, p in enumerate(D['planos']):
    s = p['segundos']
    es_img = p['plantilla'] == 'gta-plano' and p.get('imageUrl') and not p.get('videoUrl')
    if es_img and t > 7 and s >= 2.2:
        d1 = round(min(2.4, s * 0.5), 3)
        c = {'plantilla': 'gta-plano', 'videoUrl': clip_para(p['imageUrl']), 'segundos': d1}
        if p.get('topText'): c['topText'] = p['topText']
        q = dict(p); q['segundos'] = round(s - d1, 3); q.pop('topText', None)
        nuevos += [c, q] if k % 2 else [q, c]; n_split += 1
    elif es_img and t > 7 and s < 2.2 and k % 2 == 0:
        q = {'plantilla': 'gta-plano', 'videoUrl': clip_para(p['imageUrl']), 'segundos': s}
        if p.get('topText'): q['topText'] = p['topText']
        nuevos.append(q); n_full += 1
    else:
        nuevos.append(p)
    t += s
D['planos'] = nuevos
# motion graphics
W = D['palabras']
def norm(w):
    w = unicodedata.normalize('NFD', w.lower()); w = ''.join(c for c in w if unicodedata.category(c) != 'Mn'); return re.sub(r'[^a-z0-9]', '', w)
toks = [norm(w[0]) for w in W]
def tiempo(frase):
    q = [norm(x) for x in frase.split()]
    for i in range(len(toks) - len(q) + 1):
        if toks[i:i+len(q)] == q: return W[i][1]
    return None
inicios = []; acc = 0
for p in D['planos']: inicios.append(acc); acc += p['segundos']
graf_t = []
if len(sys.argv) > 2:
    for gspec in json.load(open(sys.argv[2])):
        tt = tiempo(gspec['frase'])
        if tt is None: print('no encuentro', gspec['frase']); continue
        i = max(j for j, s0 in enumerate(inicios) if s0 <= tt)
        bg = D['planos'][i].get('imageUrl') or 'p/Vice_City_02.jpg'
        props = {k: v for k, v in gspec.items() if k != 'frase'}
        D['planos'][i] = {'plantilla': 'gta-grafico', **props, 'imageUrl': bg, 'segundos': D['planos'][i]['segundos']}
        graf_t.append(inicios[i])
# efectos de sonido
sfx = []
def mete(t, src, vol=0.35):
    if all(abs(t - x['t']) >= 6 for x in sfx): sfx.append({'t': round(max(0, t), 2), 'src': src, 'vol': vol})
for t0 in graf_t: mete(t0, 'sfx/ping.mp3', 0.4)
for i, p in enumerate(D['planos']):
    if p['plantilla'] == 'gta-sello': mete(inicios[i] + 0.1, 'sfx/stamp.mp3', 0.45)
for w, a, b in W:
    n = norm(w)
    if n in ('dolares', 'euros', 'dinero', 'pasta', 'millones'): mete(a, 'sfx/cash.mp3', 0.3)
    elif n in ('policia', 'estrellas', 'poli'): mete(a, 'sfx/siren.mp3', 0.22)
    elif n == 'ojo': mete(a - 0.1, 'sfx/scratch.mp3', 0.3)
    elif n in ('foto', 'imagen', 'imagenes', 'captura'): mete(a, 'sfx/shutter.mp3', 0.35)
D['sfx'] = sorted(sfx, key=lambda x: x['t'])
json.dump(D, open(g, 'w'), ensure_ascii=False, indent=1)
from collections import Counter
print(gid, 'planos', len(D['planos']), 'con vídeo', sum(1 for p in D['planos'] if p.get('videoUrl')), '| partidos', n_split, 'clip entero', n_full, '| gráficos', len(graf_t), '| efectos', len(D['sfx']), Counter(x['src'] for x in D['sfx']))
