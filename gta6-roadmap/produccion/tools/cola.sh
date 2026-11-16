#!/bin/bash
# Renderiza en serie las fichas indicadas: cola.sh S4 S5 ...
cd /tmp/claude-0/-home-user-vintedsniper/f149cbb4-300b-549b-a6bb-754b879e5cbb/scratchpad
for id in "$@"; do
  echo "$(date +%H:%M) start $id"
  python3 tools/hacer.py fichas/$id.json --render > logs/$id.log 2>&1 && echo "$(date +%H:%M) OK $id" || echo "$(date +%H:%M) FAIL $id"
done
