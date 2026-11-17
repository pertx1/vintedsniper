#!/bin/bash
SP=/tmp/claude-0/-home-user-vintedsniper/f149cbb4-300b-549b-a6bb-754b879e5cbb/scratchpad
CH=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
cd $SP
for id in "$@"; do
  echo "$(date +%H:%M) start $id"
  if [ "$id" = "L0" ]; then
    (cd render && npx remotion render src/index.ts L0 out/L0.mp4 --browser-executable=$CH --concurrency=4 --log=error >/dev/null 2>&1) && ffmpeg -loglevel error -y -i render/out/L0.mp4 -c:v libx264 -b:v 4000k -maxrate 6000k -bufsize 8000k -c:a aac -b:a 160k -movflags +faststart entregas/L0-gtaoculto.mp4 && echo "$(date +%H:%M) OK L0" || echo "FAIL L0"
  else
    python3 tools/hacer.py fichas/$id.json --render > logs/$id.log 2>&1 && python3 tools/entregar.py $id >> logs/$id.log 2>&1 && echo "$(date +%H:%M) OK $id" || echo "$(date +%H:%M) FAIL $id"
  fi
done
