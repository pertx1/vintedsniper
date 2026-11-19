"""Ficha automática para vídeos largos tipo lista/FAQ: cada frase = plano con 2-3 cortes; "Pregunta N:" = sello.
Uso: python3 tools/largo_auto.py ID "TOP DEL GANCHO" """
import sys, json, os, re, random, glob
SP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(f'{SP}/tools/movimiento.py').read().split('\ndef main')[0]; mov = {'__file__': f'{SP}/tools/movimiento.py'}; exec(src, mov)
POOLS = mov['POOLS']
vid, top = sys.argv[1], sys.argv[2]
W = json.load(open(f'{SP}/words/{vid}.json'))
IMG = {t: sorted(glob.glob(f'{SP}/render/public/p/{t}_*.jpg')) for t in ['Vice_City','Jason_Duval','Lucia_Caminos','Jason_and_Lucia','Port_Gellhorn','Mount_Kalaga_National_Park','Leonida_Keys','Grassrivers','Ambrosia','Real_Dimez','Raul_Bautista','DreQuan_Priest','Cal_Hampton','Brian_Heder','Boobie_Ike']}
CLAVES = [(r'luc[ií]a', 'lucia', 'Lucia_Caminos'), (r'jason', 'jason', 'Jason_Duval'), (r'cayos|keys|lancha|mar\b|playa', 'cayos', 'Leonida_Keys'),
          (r'pantano|caim[aá]n|animal|iguana|serpiente|ciervo', 'naturaleza', 'Grassrivers'), (r'coche|conduc|veh[ií]culo|gatillo|mando', 'coches', 'Vice_City'),
          (r'polic[ií]a|arma|violencia|atraca', 'accion', 'Jason_and_Lucia'), (r'm[uú]sica|canci[oó]n|rap|banda sonora', 'musica', 'Real_Dimez'),
          (r'monta[ñn]a|pueblo', 'pueblo', 'Ambrosia'), (r'brian', 'brian', 'Brian_Heder'), (r'cal hampton', 'cal', 'Cal_Hampton'), (r'raul', 'raul', 'Raul_Bautista')]
NUM = {'uno':1,'dos':2,'tres':3,'cuatro':4,'cinco':5,'seis':6,'siete':7,'ocho':8,'nueve':9,'diez':10,'once':11,'doce':12,'trece':13,'catorce':14,'quince':15,'dieciséis':16,'diecisiete':17,'dieciocho':18,'diecinueve':19,'veinte':20,'veintiuno':21,'veintidós':22,'veintitrés':23,'veinticuatro':24,'veinticinco':25,'veintiséis':26,'veintisiete':27,'veintiocho':28,'veintinueve':29,'treinta':30}
rnd = random.Random(vid); usados = []
def coge(lista):
    l = [x for x in lista if x not in usados[-25:]] or lista
    x = rnd.choice(l); usados.append(x); return x
frases = []; cur = []
for w in W:
    cur.append(w['text'])
    if re.search(r'[.?!:]$', w['text']) and len(cur) >= 3: frases.append(cur); cur = []
if cur: frases.append(cur)
planos = []; booms = []
for k, f in enumerate(frases):
    txt = ' '.join(f).lower()
    pool, imgs = 'ciudad', 'Vice_City'
    for pat, p, im in CLAVES:
        if re.search(pat, txt): pool, imgs = p, im; break
    a = None if k == 0 else ' '.join(f[:2])
    m = re.match(r'(y la )?pregunta (\w+)', txt)
    if m and k > 0:
        n = NUM.get(m.group(2).strip(':'), '')
        planos.append({'a': a, 'sello': f'PREGUNTA {n}', 'acc': '#EC517D' if n and n % 2 else '#FFE02E', 'g': -5 if n and n % 2 else 5, 'clip': coge(POOLS['gancho' if not n or n > 29 else pool])})
        booms.append(a); continue
    dur = W[sum(len(x) for x in frases[:k+1]) - 1]['end'] - W[sum(len(x) for x in frases[:k])]['start']
    n_items = 1 if dur < 2.6 else 2 if dur < 5 else 3
    items = []
    for j in range(n_items):
        items.append({'clip': coge(POOLS['gancho' if k == 0 else pool])} if (j + k) % 2 == 0 else {'img': 'p/' + os.path.basename(coge(IMG[imgs]))})
    q = {'lista': items}
    if a: q['a'] = a
    if k == 0: q['lista'][0]['top'] = top
    planos.append(q)
planos[-1] = {'a': planos[-1].get('a'), 'tpl': 'gta-marcador', 'topText': 'cada día, lo nuevo de GTA 6', 'text': 'SUSCRÍBETE', 'items': ['Secretos', 'Trucos', 'Easter eggs'], 'value': 25}
F = {'id': vid, 'tipo': 'largo', 'voz': f'voz-{vid.lower()}.mp3', 'words': f'{SP}/words/{vid}.json', 'fin': 1.5, 'planos': planos,
     'booms': booms[:6], 'flami': booms[6:9], 'claves': []}
json.dump(F, open(f'{SP}/fichas/{vid}.json', 'w'), ensure_ascii=False, indent=1)
print(vid, len(planos), 'planos')
