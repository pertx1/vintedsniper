import json,os,shutil
# id: (texto viejo a sustituir, texto nuevo, top del plano 0, retratoPrimero, {ancla_vieja: ancla_nueva}, {boom_viejo: boom_nuevo}, {plano1 extra})
G={
'S6':("Antes de salir, GTA seis ya había roto internet.","El primer tráiler de GTA seis le quitó un récord mundial a MrBeast.","90 M EN 24 H",False,{"ya había roto":"le quitó"},{},{"sello":"RÉCORD MUNDIAL"}),
'S7':("Este es el personaje más raro de GTA seis.","Este amigo de Jason espía a la Guardia Costera desde el sofá… con una cerveza en la mano.","ESPÍA DESDE EL SOFÁ",True,{},{},{}),
'S8':("Si Jason vive gratis, es gracias a este hombre.","En GTA seis, Jason no paga alquiler. Y es gracias a este hombre.","JASON NO PAGA ALQUILER",True,{},{},{}),
'S9':("¿Merece la pena la Ultimate de GTA seis? Esto es lo que trae.","Si compras la edición estándar de GTA seis, te pierdes cinco negocios enteros. Esto es lo que trae la Ultimate.","TE PIERDES 5 NEGOCIOS",False,{},{},{}),
'S13':("¿GTA seis tiene online? La respuesta corta: de momento, Rockstar no lo ha anunciado.","Si vas a comprar GTA seis para jugar online con tus amigos, cuidado: de momento, Rockstar no ha anunciado ningún online.","SIN ONLINE (DE MOMENTO)",False,{"La respuesta corta":"cuidado"},{"no lo ha anunciado":"no ha anunciado"},{}),
'S14':("Tres cosas de GTA seis que parecen inventadas… y pasan de verdad en Florida.","Si ves esto en GTA seis, no es un invento de Rockstar: pasa de verdad en Florida. Van tres.","NO ES INVENTADO",False,{},{},{}),
'S15':("Este detalle del tráiler de lanzamiento de GTA seis se le ha escapado a casi todo el mundo.","Pausa el tráiler de lanzamiento de GTA seis justo aquí: casi nadie lo ha visto.","PAUSA AQUÍ",False,{},{},{}),
'S16':("Él es Boobie Ike, y en Vice City manda él.","Si quieres triunfar en la música de Vice City, tienes que conocer a Boobie Ike.","EL QUE MANDA EN VICE CITY",True,{},{},{}),
'S17':("Dre'Quan Priest siempre fue más buscavidas que gánster.","Este chaval busca a sus artistas en un club de striptease… y quiere dominar la música de Vice City. Es Dre'Quan Priest, más buscavidas que gánster.","FICHA ARTISTAS EN UN CLUB",True,{},{},{}),
'S18':("Ellas son Real Dimez: Bae-Luxe y Roxy, amigas desde el instituto.","Estas dos raperas de GTA seis empezaron extorsionando a camellos. Son Real Dimez: Bae-Luxe y Roxy, amigas desde el instituto.","EMPEZARON EXTORSIONANDO",True,{},{},{}),
'S19':("Si en GTA seis hay atracos a bancos, la culpa la tiene este hombre.","Si sueñas con atracar bancos en GTA seis, este es tu hombre.","TU HOMBRE PARA LOS ATRACOS",True,{},{},{}),
'S20':("Hay una frase en la web oficial de GTA seis que casi nadie ha leído con atención.","Lucía esconde una pista sobre Liberty City… y está en la web oficial de Rockstar.","PISTA: LIBERTY CITY",True,{},{},{}),
'S21':("Vice City en dos mil dos, contra Vice City en dos mil veintiséis.","Así era Vice City hace veinticuatro años… y así es en GTA seis.","ASÍ HA CAMBIADO",False,{},{},{}),
'S22':("La música de los tráileres de GTA seis no es casualidad.","La canción del primer tráiler de GTA seis parece hablar de Lucía… y no es casualidad.","¿HABLA DE LUCÍA?",False,{},{},{}),
}
for vid,(old,new,top,retrato,anc,bm,p1) in G.items():
    g=f'guiones/{vid}.txt'
    if not os.path.exists(f'guiones/{vid}.v1.txt'): shutil.copy(g,f'guiones/{vid}.v1.txt')
    t=open(f'guiones/{vid}.v1.txt').read(); assert t.startswith(old),vid
    open(g,'w').write(new+t[len(old):])
    f=f'fichas/{vid}.json'
    if not os.path.exists(f'fichas/{vid}.v1.json'): shutil.copy(f,f'fichas/{vid}.v1.json')
    F=json.load(open(f'fichas/{vid}.v1.json')); P=F['planos']
    L=P[0]['lista']; L=[x for x in L if 'With_Logo' not in x.get('img','')]
    for x in L: x.pop('top',None)
    if retrato:
        imgs=[x for x in L if 'img' in x]; clips=[x for x in L if 'clip' in x]; L=imgs+clips
    L[0]['top']=top; P[0]['lista']=L
    for p in P:
        if p.get('a') in anc: p['a']=anc[p['a']]
    if p1: P[1].update(p1)
    F['booms']=[bm.get(b,b) for b in F.get('booms',[])]
    json.dump(F,open(f,'w'),ensure_ascii=False,indent=1)
    print(vid, json.dumps(P[0],ensure_ascii=False)[:150])
