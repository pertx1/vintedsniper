"""Recorta un Short quitando frases enteras del audio ya grabado (sin regenerar voz).
Uso: python3 tools/recortar.py ID            -> lista las frases con su duración
     python3 tools/recortar.py ID 3,5,6       -> quita esas frases (1 = primera) y reescribe voz, words, guion y ficha
Guarda copias *.full.* la primera vez y siempre parte de ellas."""
import sys, json, os, re, shutil, subprocess, unicodedata
SP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def norm(w):
    w = unicodedata.normalize("NFD", w.lower()); w = "".join(c for c in w if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9$']", "", w)
vid = sys.argv[1]; l = vid.lower()
P = lambda *a: os.path.join(SP, *a)
files = {'voz': P('render/public', f'voz-{l}.mp3'), 'words': P('words', f'{vid}.json'), 'txt': P('guiones', f'{vid}.txt'), 'ficha': P('fichas', f'{vid}.json')}
full = {k: re.sub(r'\.(\w+)$', r'.full.\1', v) for k, v in files.items()}
for k in files:
    if not os.path.exists(full[k]): shutil.copy(files[k], full[k])
W = json.load(open(full['words']))
# frases
S = []; cur = []
for i, w in enumerate(W):
    cur.append(i)
    if re.search(r'[.?!]$', w['text']) or i == len(W) - 1: S.append(cur); cur = []
dur_total = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',full['voz']]).decode())
def rango(k):
    a = W[S[k][0]]['start'] if k > 0 else 0.0
    b = W[S[k+1][0]]['start'] if k + 1 < len(S) else dur_total
    return a, b
if len(sys.argv) < 3:
    for k, s in enumerate(S):
        a, b = rango(k); print(f"{k+1:2d} [{a:5.1f}-{b:5.1f}] {b-a:4.1f}s  {' '.join(W[i]['text'] for i in s)}")
    print('total', round(W[-1]['end'], 1)); sys.exit()
quitar = {int(x) - 1 for x in sys.argv[2].split(',')}
assert 0 not in quitar and len(S) - 1 not in quitar, 'no quites ni la primera ni la última frase'
keep = [k for k in range(len(S)) if k not in quitar]
# audio
partes = []; t = 0.0; nuevaW = []
for k in keep:
    a, b = rango(k); partes.append((a, b))
    for i in S[k]:
        w = dict(W[i]); w['start'] = round(w['start'] - a + t, 3); w['end'] = round(w['end'] - a + t, 3); nuevaW.append(w)
    t += b - a
filt = ''.join(f"[0:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={b-a-0.03:.3f}:d=0.03[p{j}];" for j, (a, b) in enumerate(partes))
filt += ''.join(f"[p{j}]" for j in range(len(partes))) + f"concat=n={len(partes)}:v=0:a=1[o]"
subprocess.run(['ffmpeg','-loglevel','error','-y','-i',full['voz'],'-filter_complex',filt,'-map','[o]','-c:a','libmp3lame','-b:a','128k',files['voz']], check=True)
json.dump(nuevaW, open(files['words'], 'w'), ensure_ascii=False)
open(files['txt'], 'w').write(' '.join(w['text'] for w in nuevaW) + '\n')
# ficha: quitar planos/booms/flami cuyo ancla cae en frases quitadas
F = json.load(open(full['ficha'])); toks = [norm(w['text']) for w in W]
sent_of = {i: k for k, s in enumerate(S) for i in s}
def busca(txt, p):
    q = [norm(x) for x in txt.split() if norm(x)]
    for i in range(p, len(toks) - len(q) + 1):
        if toks[i:i+len(q)] == q: return i
    raise SystemExit(f'ancla no encontrada: {txt}')
pos = 0; planos = []; caidos = []
for j, p in enumerate(F['planos']):
    if j == 0: planos.append(p); continue
    i = busca(p['a'], pos); pos = i + 1
    (caidos if sent_of[i] in quitar else planos).append(p)
F['planos'] = planos
for key in ('booms', 'flami'):
    F[key] = [b for b in F.get(key, []) if sent_of[busca(b, 0)] not in quitar]
json.dump(F, open(files['ficha'], 'w'), ensure_ascii=False, indent=1)
print(f"{vid}: {W[-1]['end']:.1f}s -> {nuevaW[-1]['end']:.1f}s, planos quitados: {[p.get('a') for p in caidos]}")
