import sys; sys.path.insert(0,'tools')
from mini2 import *
from PIL import Image, ImageEnhance
M='mini2/'; P=PUB
# L0 B: cara de Jason + Leonida (postal) + fecha
im=fondo(P+'p2/Artwork_Wallpapers_Postcards_Vice_City_Vice_City_Postcard_landscape.jpg',oscuro=0.85,blur=0,sat=1.3).convert('RGBA')
lado_oscuro(im,True,0.55,200)
c=recorte(M+'cut_jason02.png',760,glow=(255,40,150)); im.alpha_composite(c,(-120,H-c.height+60))
texto(im,'19·11',W-40,40,150,(255,224,46),ancla='ra')
vineta(im,120); guardar(im,'L0_B')
# L1 B: Jason + Cheetah + "+20$"
im=fondo(P+'p2/Ultimate_Edition_Benefits_ULTIMATE_EDITION_GROTTI_CHEETAH_03.jpg',oscuro=0.6,blur=8,sat=1.3).convert('RGBA')
car=recorte(M+'cut_cheetah.png',420,borde=8,glow=(255,224,46)); im.alpha_composite(car,(W-car.width+80,H-car.height-20))
c=recorte(M+'cut_jason02.png',700,glow=(255,40,150)); im.alpha_composite(c,(-160,H-c.height+40))
texto(im,'+20$',W-60,40,170,(255,70,70),ancla='ra')
vineta(im,140); guardar(im,'L1_B')
# L0b B: cara de Tommy vs cara de Lucía
a=fondo(P+'vc/OceanBeach-GTAVC.jpg',oscuro=0.6,blur=6,sat=1.5); b=fondo(P+'p/Vice_City_08.jpg',oscuro=0.6,blur=6,sat=1.4)
im=Image.new('RGBA',(W,H)); im.paste(a.crop((0,0,W//2,H)),(0,0)); im.paste(b.crop((W//2,0,W,H)),(W//2,0))
t=recorte(M+'cut_tommy.png',1100,glow=(0,220,255)); t=t.crop((0,0,t.width,int(t.height*0.62))); im.alpha_composite(t,(W//2-t.width+70,H-t.height+30))
l=recorte(M+'cut_lucia13.png',H+80,glow=(255,40,150)); im.alpha_composite(l,(W//2-40,-40))
ImageDraw.Draw(im).line((W//2,0,W//2,H),fill=(255,255,255),width=8)
texto(im,'2002',30,24,110,(0,230,255)); texto(im,'2026',W-30,24,110,(255,80,170),ancla='ra')
guardar(im,'L0b_B')
# L2 B: iceberg + cara de Lucía en el fondo + interrogación
im=fondo(P+'iceberg.jpg',oscuro=0.75,sat=1.3).convert('RGBA')
l=recorte(M+'cut_lucia14.png',H+80,glow=(120,220,255)); l2=ImageEnhance.Color(l).enhance(0.7)
im.alpha_composite(l2,(W-int(l2.width*0.62),-40))
texto(im,'?',60,110,420,(255,224,46))
vineta(im,150); guardar(im,'L2_B')
