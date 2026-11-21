"""Primer plano = sello grande con el dato encima de un clip en movimiento (gancho del fotograma 0).
Uso: python3 tools/sello_inicio.py ID "TEXTO" clip"""
import sys, json, os
SP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
vid, txt, clip = sys.argv[1], sys.argv[2], sys.argv[3]
p = f'{SP}/fichas/{vid}.json'; f = json.load(open(p))
f['planos'][0] = {'sello': txt, 'acc': '#FFE02E', 'g': -5, 'clip': clip}
json.dump(f, open(p, 'w'), ensure_ascii=False, indent=1); print(vid, f['planos'][0])
