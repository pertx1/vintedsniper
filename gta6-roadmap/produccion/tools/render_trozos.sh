#!/bin/bash
# Render reanudable por trozos: bash tools/render_trozos.sh ID [FRAMES_POR_TROZO]
SP=/tmp/claude-0/-home-user-vintedsniper/f149cbb4-300b-549b-a6bb-754b879e5cbb/scratchpad
CH=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
ID=$1; N=${2:-1500}
ffprobe -v error -show_entries format=duration -of csv=p=0 $SP/entregas/$ID-gtaoculto.mp4 >/dev/null 2>&1 && grep -q "OK $ID" $SP/logs/trozos.log && [ ! -f $SP/entregas/.$ID.redo ] && exit 0
cd $SP/render; mkdir -p out/trozos/$ID
TOTAL=$(npx remotion compositions src/index.ts --browser-executable=$CH 2>/dev/null | awk -v id=$ID '$1==id{print $4}')
echo "$(date +%H:%M) $ID total=$TOTAL" >> $SP/logs/trozos.log
[ -z "$TOTAL" ] && { echo "sin total" >> $SP/logs/trozos.log; exit 1; }
k=0; s=0
while [ $s -lt $TOTAL ]; do
  e=$((s+N-1)); [ $e -ge $TOTAL ] && e=$((TOTAL-1))
  f=out/trozos/$ID/$(printf %03d $k).mp4
  if [ ! -f $f.ok ]; then
    npx remotion render src/index.ts $ID $f --frames=$s-$e --browser-executable=$CH --concurrency=3 --log=error > $SP/logs/${ID}_trozo.log 2>&1 && touch $f.ok && echo "$(date +%H:%M) $ID trozo $k ($s-$e) ok" >> $SP/logs/trozos.log || { echo "$(date +%H:%M) $ID trozo $k FAIL" >> $SP/logs/trozos.log; exit 1; }
  fi
  k=$((k+1)); s=$((e+1))
done
ls out/trozos/$ID/*.mp4 | sort | sed "s|^|file '$PWD/|;s|$|'|" > out/trozos/$ID/lista.txt
ffmpeg -nostdin -loglevel error -y -f concat -safe 0 -i out/trozos/$ID/lista.txt -c:v libx264 -b:v 3500k -maxrate 5000k -bufsize 8000k -c:a aac -b:a 160k -movflags +faststart $SP/entregas/$ID-tmp.mp4 && mv $SP/entregas/$ID-tmp.mp4 $SP/entregas/$ID-gtaoculto.mp4 && echo "$(date +%H:%M) OK $ID" >> $SP/logs/trozos.log
