"""Short de noticia en minutos: guion -> ficha automática con clips/imágenes oficiales por tema.
Uso: python3 tools/jshort.py J01 "TOP DEL GANCHO" ["texto final del marcador"]
Requiere guiones/J01.txt, render/public/voz-j01.mp3 y words/J01.json (alinear.py).
Cada frase = un plano anclado en sus 2 primeras palabras; clip o imagen según palabras clave; nada se repite."""
import sys, json, os, re, random, glob
SP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.argv_backup = sys.argv; sys.argv = [sys.argv[0]]
import importlib.util
spec = importlib.util.spec_from_file_location('mov', f'{SP}/tools/movimiento.py')
src = open(f'{SP}/tools/movimiento.py').read().split('\ndef main')[0]
mov = {'__file__': f'{SP}/tools/movimiento.py'}; exec(src, mov)
sys.argv = sys.argv_backup
POOLS = mov['POOLS']
vid, top = sys.argv[1], sys.argv[2]
cierre = sys.argv[3] if len(sys.argv) > 3 else 'cada día, lo nuevo de GTA 6'
W = json.load(open(f'{SP}/words/{vid}.json'))
IMG = {t: sorted(glob.glob(f'{SP}/render/public/p/{t}_*.jpg')) for t in ['Vice_City','Jason_Duval','Lucia_Caminos','Jason_and_Lucia','Port_Gellhorn','Mount_Kalaga_National_Park','Leonida_Keys','Grassrivers','Ambrosia','Real_Dimez','Raul_Bautista','DreQuan_Priest','Cal_Hampton','Brian_Heder','Boobie_Ike']}
CLAVES = [(r'luc[ií]a', 'lucia', 'Lucia_Caminos'), (r'jason', 'jason', 'Jason_Duval'), (r'cayos|keys|barco|lancha|mar\b|playa', 'cayos', 'Leonida_Keys'),
          (r'pantano|caim[aá]n|animal|grassrivers|iguana', 'naturaleza', 'Grassrivers'), (r'coche|conduc|carrera|veh[ií]culo|moto', 'coches', 'Vice_City'),
          (r'polic[ií]a|estrella|atraco|banco|arma|disparo|persecuci', 'accion', 'Jason_and_Lucia'), (r'm[uú]sica|radio|canci[oó]n|rap', 'musica', 'Real_Dimez'),
          (r'kalaga|monta[ñn]a', 'naturaleza', 'Mount_Kalaga_National_Park'), (r'ambrosia|pueblo|granja', 'pueblo', 'Ambrosia'), (r'port gellhorn|gellhorn', 'pueblo', 'Port_Gellhorn'),
          (r'brian', 'brian', 'Brian_Heder'), (r'cal\b|hampton', 'cal', 'Cal_Hampton'), (r'raul|bautista', 'raul', 'Raul_Bautista'), (r'boobie', 'musica', 'Boobie_Ike')]
rnd = random.Random(vid); usados = set()
def coge(lista):
    l = [x for x in lista if x not in usados] or lista
    x = rnd.choice(l); usados.add(x); return x
frases = []; cur = []
for w in W:
    cur.append(w['text'])
    if re.search(r'[.?!]$', w['text']): frases.append(cur); cur = []
if cur: frases.append(cur)
GRAF = [(r'gps|localizador|rastreador|ruta|te persigue|polic[ií]a', {'tipo': 'rastreador', 'topText': 'te localizan'}),
        (r'r[aá]pido|velocidad|despacio|kil[oó]metros', {'tipo': 'velocimetro', 'value': 160, 'unit': '200'}),
        (r'app|m[oó]vil|tel[eé]fono|men[uú]', {'tipo': 'app', 'items': ['Dato 1', 'Dato 2', 'Dato 3']}),
        (r'd[oó]lares|precio|cuesta|vale|dinero', {'tipo': 'precio', 'value': 1000, 'unit': '$'})]
n_graf = 0
planos = []
for k, f in enumerate(frases):
    txt = ' '.join(f).lower()
    pool, imgs = 'ciudad', 'Vice_City'
    for pat, p, im in CLAVES:
        if re.search(pat, txt): pool, imgs = p, im; break
    if k == 0: pool = 'gancho'
    graf = None
    if k > 0 and n_graf < 2:
        for pat, g in GRAF:
            mm = re.search(pat, txt)
            if mm: graf = dict(g); graf.setdefault('text', mm.group(0).upper()); break
    if graf:
        n_graf += 1
        graf.update({'a': ' '.join(f[:2]), 'tpl': 'gta-grafico', 'imageUrl': 'p/' + os.path.basename(coge(IMG[imgs]))})
        planos.append(graf); continue
    clip = {'clip': coge(POOLS[pool])}
    img = {'img': 'p/' + os.path.basename(coge(IMG[imgs]))}
    q = {'lista': [clip, img] if k % 2 == 0 else [img, clip]}
    if k == 0: q['lista'][0]['top'] = top
    else: q['a'] = ' '.join(f[:2])
    planos.append(q)
planos[-1] = {'a': ' '.join(frases[-1][:2]), 'tpl': 'gta-marcador', 'topText': cierre, 'text': 'SÍGUEME', 'items': ['Secretos', 'Trucos', 'Easter eggs'], 'value': 25}
F = {'id': vid, 'tipo': 'short', 'voz': f'voz-{vid.lower()}.mp3', 'words': f'{SP}/words/{vid}.json', 'fin': 0.8,
     'planos': planos, 'booms': [' '.join(frases[1][:2])] if len(frases) > 2 else [], 'flami': [], 'claves': []}
json.dump(F, open(f'{SP}/fichas/{vid}.json', 'w'), ensure_ascii=False, indent=1)
print(f'{vid}: {len(planos)} planos -> fichas/{vid}.json')
