"""Convierte el último plano de una ficha de Short en un sello grande con la pregunta para comentar.
Uso: python3 tools/sello_final.py ID "TEXTO DEL SELLO" """
import sys, json, os
SP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
vid, txt = sys.argv[1], sys.argv[2]
p = f'{SP}/fichas/{vid}.json'; f = json.load(open(p))
u = f['planos'][-1]
clip = next((q['clip'] for q in u.get('lista', []) if 'clip' in q), u.get('clip', 'x-avioneta'))
f['planos'][-1] = {'a': u.get('a'), 'sello': txt, 'acc': '#FFE02E', 'g': -4, 'clip': clip}
f['fin'] = 1.2
json.dump(f, open(p, 'w'), ensure_ascii=False, indent=1); print(vid, f['planos'][-1])
