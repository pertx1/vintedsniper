"""python3 entregar.py ID [ID...]  -> miniatura + copia al panel + entrada VIDS (listo, desc, tags, thumb, file)."""
import sys, json, re, shutil, subprocess, os
from PIL import Image, ImageDraw, ImageFont
SP='/tmp/claude-0/-home-user-vintedsniper/f149cbb4-300b-549b-a6bb-754b879e5cbb/scratchpad'
PANEL='/home/user/vintedsniper/gta6-roadmap'; PM=PANEL+'/panel-media'
META=json.load(open(SP+'/fichas/meta.json'))
ANTON='/root/.fonts/Anton-Regular.ttf'; INK=(12,4,26)
def cover_short(i,m):
    f=f"{SP}/cf/{i}_frame.png"
    subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',str(m.get('t',1.0)),'-i',f"{SP}/render/out/{i}.mp4",'-frames:v','1',f],check=True)
    im=Image.open(m['bg'] if 'bg' in m else f).convert('RGB')
    if 'bg' in m:
        w,h=im.size; cw=int(h*9/16); x=max(0,min(w-cw,int(m.get('cx',.5)*w-cw/2))); im=im.crop((x,0,x+cw,h))
    im=im.resize((1080,1920))
    g=Image.new('L',(1080,1920),0); d=ImageDraw.Draw(g)
    for y in range(1000,1920): d.line([(0,y),(1080,y)],fill=int(215*(y-1000)/920))
    im=Image.composite(Image.new('RGB',(1080,1920),INK),im,g); d=ImageDraw.Draw(im); y=1260
    for txt,col in zip(m['lineas'],[(255,255,255),(255,224,46),(236,81,125)]):
        size=190
        while True:
            fnt=ImageFont.truetype(ANTON,size); b=d.textbbox((0,0),txt,font=fnt)
            if b[2]-b[0]<=980 or size<90: break
            size-=10
        d.text(((1080-(b[2]-b[0]))//2-b[0],y),txt,font=fnt,fill=col,stroke_width=10,stroke_fill=INK); y+=(b[3]-b[1])+40
    fl=Image.open(SP+'/mascota/flami.png'); fl.thumbnail((260,440)); im.paste(fl,(800,860),fl)
    d.text((40,40),"@gtaoculto_es",font=ImageFont.truetype(ANTON,44),fill=(255,255,255),stroke_width=4,stroke_fill=INK)
    im.save(f"{PM}/{i}.jpg",quality=86)
def cover_largo(i,m):
    im=Image.open(SP+'/render/public/'+m['bg']).convert('RGB').resize((1280,720))
    g=Image.new('L',(1280,720)); d=ImageDraw.Draw(g)
    for x in range(1280):
        v=(m.get('dark',560)-x) if m.get('lado','izq')=='izq' else (x-m.get('dark',600))
        d.line([(x,0),(x,720)],fill=int(max(0,min(225,v*0.5))))
    im=Image.composite(Image.new('RGB',(1280,720),(14,6,40)),im,g); d=ImageDraw.Draw(im)
    x0=60 if m.get('lado','izq')=='izq' else 660
    fnt=ImageFont.truetype(ANTON,60); b=d.textbbox((x0,60),'GTA 6',font=fnt); d.rectangle([b[0]-16,b[1]-10,b[2]+16,b[3]+10],fill=(255,224,46)); d.text((x0,60),'GTA 6',font=fnt,fill=INK)
    y=150
    for txt,size,col in m['lineas']:
        fnt=ImageFont.truetype(ANTON,size); d.text((x0+6,y+8),txt,font=fnt,fill=(0,0,0)); d.text((x0,y),txt,font=fnt,fill=col,stroke_width=6,stroke_fill=INK); y+=int(size*1.12)
    im.save(f"{PM}/{i}.jpg",quality=90)
def panel(i,m,file_ok):
    p=PANEL+'/panel.html'; s=open(p).read()
    pat=re.compile(r' \{id:"%s",.*?\}(,?)\n(?= \{id|\])'%i, re.S)
    mm=pat.search(s, s.index('const VIDS=['))
    if not mm: print('no está en VIDS',i); return
    blk=mm.group(0); coma=mm.group(1)
    d=re.search(r'd:"([\d-]+)"',blk).group(1); h=re.search(r'h:"([\d:]+)"',blk).group(1); t=re.search(r'tipo:"(\w+)"',blk).group(1)
    tit=re.search(r'titulo:("(?:[^"\\]|\\.)*")',blk).group(1)
    tit=json.dumps(m['titulo'],ensure_ascii=False) if 'titulo' in m else tit
    new=f' {{id:"{i}",d:"{d}",h:"{h}",tipo:"{t}",listo:true,titulo:{tit},\n  desc:{json.dumps(m["desc"],ensure_ascii=False)}+FIRMA,\n  tags:{json.dumps(m["tags"],ensure_ascii=False)},thumb:"media/{i}.jpg"' + (f',file:"media/{i}.mp4"' if file_ok else '') + '}'+coma+'\n'
    s=s[:mm.start()]+new+s[mm.end():]; open(p,'w').write(s)
for i in sys.argv[1:]:
    m=META[i]; src=f"{SP}/entregas/{i}-gtaoculto.mp4"
    (cover_largo if m.get('largo') else cover_short)(i,m)
    ok=os.path.getsize(src)<=15_000_000
    if ok: shutil.copy(src,f"{PM}/{i}.mp4")
    panel(i,m,ok); print(i,'ok','(vídeo en panel)' if ok else '(vídeo por chat)')
