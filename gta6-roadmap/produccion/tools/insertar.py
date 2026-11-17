"""Inserta un bloque nuevo (generado con hacer.py) dentro de un vídeo ya montado.
Uso: python3 tools/insertar.py BASE.json EXT_ID "palabras ancla" OUT_ID [--render]
  BASE.json: datos montados (src/gen/L1.json o src/l0.json). Se pueden encadenar varias inserciones
  usando como base el resultado anterior (src/gen/OUT_ID.json).
  EXT_ID: id de la ficha de la ampliación ya pasada por hacer.py (src/gen/EXT_ID.json + voz).
  El bloque entra justo antes de la primera aparición de "palabras ancla" en la voz base.
"""
import json, sys, os, re, subprocess, unicodedata
SP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = SP + '/render'; PUB = R + '/public'
CHROME = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell'

def norm(w):
    w = unicodedata.normalize('NFD', w.lower()); w = ''.join(c for c in w if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9ñ]', '', w)

def dur(f):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]))

def main():
    base_p, ext_id, ancla, out_id = sys.argv[1:5]
    B = json.load(open(base_p)); E = json.load(open(f'{R}/src/gen/{ext_id}.json'))
    toks = [norm(p[0]) for p in B['palabras']]; a = [norm(x) for x in ancla.split()]
    k = next(i for i in range(len(toks)) if toks[i:i + len(a)] == a)
    t_word = B['palabras'][k][1]; t_prev = B['palabras'][k - 1][2] if k else 0
    # corte en la pausa anterior a la palabra; si hay un cambio de plano en esa pausa, se usa ese
    acc = 0; bounds = []
    for p in B['planos']:
        acc += p['segundos']; bounds.append(acc)
    cand = [b for b in bounds if t_prev - 0.25 <= b <= t_word + 0.15]
    cut = min(cand, key=lambda b: abs(b - (t_prev + t_word) / 2)) if cand else round((t_prev + t_word) / 2, 3)
    # partir planos en el corte
    pre, post = [], []; acc = 0
    for p in B['planos']:
        s, e = acc, acc + p['segundos']; acc = e
        if e <= cut + 1e-6: pre.append(p)
        elif s >= cut - 1e-6: post.append(p)
        else:
            p1 = dict(p); p1['segundos'] = round(cut - s, 3); p2 = dict(p); p2['segundos'] = round(e - cut, 3)
            pre.append(p1); post.append(p2)
    De = round(sum(p['segundos'] for p in E['planos']), 3)
    # audio
    vb = f"{PUB}/{B['voz']}"; ve = f"{PUB}/{E['voz']}"; vo = f"voz-{out_id.lower()}.mp3"
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', vb, '-i', ve, '-filter_complex',
                    f"[0]atrim=0:{cut},asetpts=PTS-STARTPTS[a];[1]apad,atrim=0:{De},asetpts=PTS-STARTPTS[b];"
                    f"[0]atrim=start={cut},asetpts=PTS-STARTPTS[c];[a][b][c]concat=n=3:v=0:a=1",
                    '-ar', '44100', '-b:a', '192k', f'{PUB}/{vo}'], check=True)
    sh = lambda t: t if t < cut else t + De
    pal = [p for p in B['palabras'] if p[1] < cut] + [[w, s + cut, e + cut] for w, s, e in E['palabras']] + \
          [[w, s + De, e + De] for w, s, e in B['palabras'] if s >= cut]
    booms = sorted([sh(b) for b in B['booms']] + [b + cut for b in E['booms']])
    fl = [dict(f, desde=sh(f['desde']), hasta=sh(f['hasta'])) for f in B['flami']] + \
         [dict(f, desde=f['desde'] + cut, hasta=f['hasta'] + cut) for f in E['flami'][1:]]
    D = {'voz': vo, 'planos': pre + E['planos'] + post, 'palabras': pal,
         'claves': list(dict.fromkeys(B['claves'] + E['claves'])), 'booms': booms, 'flami': sorted(fl, key=lambda f: f['desde'])}
    json.dump(D, open(f'{R}/src/gen/{out_id}.json', 'w'), ensure_ascii=False, indent=1)
    # registrar
    ti = f'{R}/src/gen/tipos.idx'; tipos = json.load(open(ti)); tipos[out_id] = 'largo'; json.dump(tipos, open(ti, 'w'))
    ids = sorted(f[:-5] for f in os.listdir(f'{R}/src/gen') if f.endswith('.json'))
    L = ['// generado por hacer.py', 'import { DatosShort } from "../ShortGTAOculto";'] + [f'import d_{i} from "./{i}.json";' for i in ids]
    L += ['export const GENERADOS: { id: string; tipo: string; datos: DatosShort }[] = ['] + \
         [f'  {{ id: "{i}", tipo: "{tipos.get(i, "short")}", datos: d_{i} as unknown as DatosShort }},' for i in ids] + ['];']
    open(f'{R}/src/gen/index.ts', 'w').write('\n'.join(L) + '\n')
    tot = sum(p['segundos'] for p in D['planos'])
    print(f'{out_id}: corte {cut:.2f}s, +{De:.2f}s, total {tot:.1f}s ({int(tot // 60)}:{int(tot % 60):02d}), voz {dur(PUB + "/" + vo):.1f}s')
    # tiempos para capítulos
    json.dump({'corte': cut, 'mas': De}, open(f'{SP}/logs/ins_{out_id}.json', 'w'))
    if '--render' in sys.argv:
        subprocess.run(['npx', 'remotion', 'render', 'src/index.ts', out_id, f'out/{out_id}.mp4', f'--browser-executable={CHROME}',
                        '--concurrency=4', '--log=error'], cwd=R, check=True, capture_output=True)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', f'{R}/out/{out_id}.mp4', '-c:v', 'libx264', '-b:v', '4000k', '-maxrate', '6000k',
                        '-bufsize', '8000k', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', f'{SP}/entregas/{out_id}-gtaoculto.mp4'], check=True)
        print('OK', f'{SP}/entregas/{out_id}-gtaoculto.mp4')

main()
