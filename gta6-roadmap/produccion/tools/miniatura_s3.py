import sys; sys.path.insert(0,'tools')
from mini2 import recorte, texto, PUB, SP
from PIL import Image, ImageOps, ImageEnhance, ImageFilter, ImageDraw
W,H=1080,1920
def fondo(p,osc=0.55,sat=1.3,blur=0):
    im=ImageOps.fit(Image.open(PUB+p).convert('RGB'),(W,H),Image.LANCZOS)
    if blur: im=im.filter(ImageFilter.GaussianBlur(blur))
    im=ImageEnhance.Brightness(ImageEnhance.Color(im).enhance(sat)).enhance(osc)
    return im.convert('RGBA')
def grad(im,top=True,f=230,alto=0.45):
    g=Image.new('L',(1,H))
    for y in range(H):
        t=(y/(H*alto)) if top else ((H-y)/(H*alto))
        g.putpixel((0,y),int(max(0,1-t)*f))
    n=Image.new('RGBA',(W,H),(10,0,25,0));n.putalpha(g.resize((W,H)));im.alpha_composite(n)
def poner(im,c,x,y): im.alpha_composite(c,(int(x),int(y)))
def handle(im): texto(im,'@gtaoculto_es',W-40,40,44,ancla='ra',stroke=4)
def fla(im,x,y,h=330):
    f=Image.open(PUB+'flami.png').convert('RGBA'); f=f.resize((int(f.width*h/f.height),h)); im.alpha_composite(f,(x,y))
def save(im,n): im.convert('RGB').save(f'{SP}/mini3/s3/{n}.jpg',quality=92); print(n)

# A: Lucía enorme + 13 AÑOS
im=fondo('p/Vice_City_15.jpg',0.6); grad(im,True,235,0.5); grad(im,False,200,0.3)
c=recorte(SP+'/mini2/cut_lucia14.png',1250,borde=12,glow=(255,60,160)); poner(im,c,(W-c.width)//2+60,H-c.height-160)
texto(im,'13 AÑOS',W//2,150,250,col=(255,224,46),ancla='ma',rot=-4)
texto(im,'ESPERANDO',W//2,440,120,ancla='ma',rot=-4)
texto(im,'¿POR QUÉ?',W//2,1430,150,col=(255,255,255),ancla='ma',caja=(236,81,125,255),rot=3)
handle(im); save(im,'S3_A')

# B: 2013 vs 2026 (Tommy/VC antiguo arriba en gris, Lucía abajo)
im=Image.new('RGBA',(W,H))
a=ImageOps.fit(Image.open(PUB+'p/Vice_City_02.jpg').convert('RGB'),(W,H//2)); b=ImageOps.fit(Image.open(PUB+'vc/Artwork-GTAVC-TommyVercetti.jpg').convert('RGB'),(W,H//2),centering=(0.5,0.25))
b=ImageEnhance.Color(b).enhance(0.15); b=ImageEnhance.Brightness(b).enhance(0.6)
im.paste(b,(0,0)); im.paste(ImageEnhance.Brightness(a).enhance(0.75),(0,H//2))
c=recorte(SP+'/mini2/cut_lucia14.png',900,borde=10); poner(im,c,W-c.width+40,H-c.height-120)
d=ImageDraw.Draw(im); d.rectangle((0,H//2-10,W,H//2+10),fill=(255,224,46))
texto(im,'2013',60,560,230,col=(200,200,200),rot=4)
texto(im,'2026',60,1000,230,col=(255,224,46),rot=-4)
texto(im,'13 AÑOS',W//2,140,170,ancla='ma',caja=(236,81,125,255))
texto(im,'¿QUÉ PASÓ?',60,1330,120,rot=-3)
handle(im); save(im,'S3_B')

# C: reloj de arena / sello RETRASADO
im=fondo('p/Vice_City_07.jpg',0.5,blur=2); grad(im,True,220,0.45); grad(im,False,220,0.35)
c=recorte(SP+'/mini2/cut_robbery.png',1150,borde=12,glow=(255,200,40)); poner(im,c,(W-c.width)//2,H-c.height-200)
texto(im,'13',W//2,90,430,col=(255,224,46),ancla='ma')
texto(im,'AÑOS DE ESPERA',W//2,560,110,ancla='ma')
texto(im,'NO FUE VAGANCIA',W//2,1400,105,col=(255,255,255),ancla='ma',caja=(220,20,40,255),rot=-5)
fla(im,40,1500,360)
handle(im); save(im,'S3_C')
