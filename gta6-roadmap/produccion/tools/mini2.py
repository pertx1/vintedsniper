"""Miniaturas de alto CTR para vídeos largos: personaje recortado enorme + 2-4 palabras gigantes.
Uso: python3 tools/mini2.py ID   (lee la receta de RECETAS)"""
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageOps
SP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = SP + '/render/public/'
FONT = PUB + 'Pricedown.otf'
W, H = 1280, 720

def fondo(path, oscuro=0.55, blur=0, sat=1.3, tinte=None, crop=None):
    im = Image.open(path).convert('RGB')
    if crop: im = im.crop(crop)
    im = ImageOps.fit(im, (W, H), Image.LANCZOS)
    if blur: im = im.filter(ImageFilter.GaussianBlur(blur))
    im = ImageEnhance.Color(im).enhance(sat)
    im = ImageEnhance.Brightness(im).enhance(oscuro)
    if tinte:
        t = Image.new('RGB', (W, H), tinte); im = Image.blend(im, t, 0.25)
    return im

def recorte(path, alto, borde=10, col_borde=(255, 255, 255), glow=(255, 60, 160)):
    c = Image.open(path).convert('RGBA'); c = c.crop(c.getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox())
    r = alto / c.height; c = c.resize((int(c.width * r), alto), Image.LANCZOS)
    a = c.getchannel('A').point(lambda v: 255 if v > 100 else 0)
    pad = borde * 4
    big = Image.new('RGBA', (c.width + 2 * pad, c.height + 2 * pad), (0, 0, 0, 0))
    am = Image.new('L', big.size, 0); am.paste(a, (pad, pad))
    # glow de color
    g = am.filter(ImageFilter.MaxFilter(borde * 2 + 1)).filter(ImageFilter.GaussianBlur(borde * 2))
    glow_l = Image.new('RGBA', big.size, glow + (0,)); glow_l.putalpha(g.point(lambda v: min(255, v * 2)))
    # borde blanco
    s = am.filter(ImageFilter.MaxFilter(borde + (borde % 2 == 0)))
    st = Image.new('RGBA', big.size, col_borde + (0,)); st.putalpha(s)
    out = Image.alpha_composite(glow_l, st)
    cc = Image.new('RGBA', big.size, (0, 0, 0, 0)); cc.paste(c, (pad, pad), c)
    return Image.alpha_composite(out, cc)

def texto(im, txt, x, y, size, col=(255, 255, 255), stroke=None, ancla='la', rot=0, caja=None, sombra=True):
    f = ImageFont.truetype(FONT, size)
    stroke = stroke if stroke is not None else max(4, size // 11)
    d0 = ImageDraw.Draw(im)
    bb = d0.textbbox((0, 0), txt, font=f, stroke_width=stroke)
    w, h = bb[2] - bb[0] + 40, bb[3] - bb[1] + 40
    L = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
    if caja:
        d.rectangle((0, 8, w, h - 8), fill=caja)
    if sombra:
        sh = Image.new('RGBA', (w, h), (0, 0, 0, 0)); ds = ImageDraw.Draw(sh)
        ds.text((20 - bb[0] + 8, 20 - bb[1] + 10), txt, font=f, fill=(0, 0, 0, 200), stroke_width=stroke, stroke_fill=(0, 0, 0, 200))
        L = Image.alpha_composite(L, sh.filter(ImageFilter.GaussianBlur(6))); d = ImageDraw.Draw(L)
    d.text((20 - bb[0], 20 - bb[1]), txt, font=f, fill=col, stroke_width=stroke, stroke_fill=(0, 0, 0))
    if rot: L = L.rotate(rot, expand=True, resample=Image.BICUBIC)
    if ancla == 'ra': x -= L.width
    if ancla == 'ma': x -= L.width // 2
    im.alpha_composite(L, (int(x), int(y)))
    return L.size

def flecha(im, x0, y0, x1, y1, col=(255, 30, 30), ancho=26):
    import math
    d = ImageDraw.Draw(im)
    for dx, dy, c, wd in [(0, 0, (255, 255, 255), ancho + 14), (0, 0, col, ancho)]:
        d.line((x0, y0, x1, y1), fill=c, width=wd)
        ang = math.atan2(y1 - y0, x1 - x0); L = wd * 2.4
        p1 = (x1 + L * 0.9 * math.cos(ang), y1 + L * 0.9 * math.sin(ang))
        p2 = (x1 + L * math.cos(ang + 2.2), y1 + L * math.sin(ang + 2.2))
        p3 = (x1 + L * math.cos(ang - 2.2), y1 + L * math.sin(ang - 2.2))
        d.polygon([p1, p2, p3], fill=c)

def vineta(im, fuerza=170):
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    d.ellipse((-W * 0.25, -H * 0.3, W * 1.25, H * 1.3), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(120))
    neg = Image.new('RGBA', (W, H), (0, 0, 0, fuerza)); neg.putalpha(m.point(lambda v: int((255 - v) * fuerza / 255)))
    im.alpha_composite(neg)

def lado_oscuro(im, desde_izq=True, ancho=0.6, fuerza=220):
    g = Image.new('L', (W, 1))
    for x in range(W):
        t = x / (W * ancho) if desde_izq else (W - x) / (W * ancho)
        g.putpixel((x, 0), int(max(0, 1 - t) * fuerza))
    g = g.resize((W, H)); n = Image.new('RGBA', (W, H), (8, 0, 20, 0)); n.putalpha(g); im.alpha_composite(n)

def guardar(im, nombre):
    out = SP + '/mini2/' + nombre + '.jpg'
    im.convert('RGB').save(out, quality=92); print(out); return out
