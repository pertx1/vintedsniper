import json,re,glob,os,random
SP='/tmp/claude-0/-home-user-vintedsniper/f149cbb4-300b-549b-a6bb-754b879e5cbb/scratchpad'
W=json.load(open(f'{SP}/words/L19.json'))
bad={'a21','a24','b03','b17','b19','ref_pesas','lo_reja'}
pool=[f'gpx/{os.path.basename(x)[:-4]}' for x in sorted(glob.glob(f'{SP}/render/public/gpx/*.mp4')) if os.path.basename(x)[:-4] not in bad]
pool+=[f'gp/{os.path.basename(x)[:-4]}' for x in sorted(glob.glob(f'{SP}/render/public/gp/*.mp4'))]
rnd=random.Random(19); rnd.shuffle(pool); pi=[0]
TEMA=[(r'moto|kayak|Ganado|camioneta|coche|Cheetah|Stainer|buggy|Dominator|taller',['gp/coche1','gp/coche2','gpx/a03','gpx/a06','gp2/pw_calle','gp2/pw_sale']),
 (r'lancha|Squalo|canal|pescar|buceo|agua|Cayos',['gp/barco','gp/mar1','gp/mar2','gpx/a10']),
 (r'ropa|tienda|maniquí|peluquer|tatuaje|estilo|armario',['gp/tienda','gp/tienda2','gp/calle','gp/villa']),
 (r'mapa|índice|menú|tienda del menú',['gp/mapa2','gp/menu']),
 (r'Vice City|Stockyard|Crosstown|Washington Beach|Vice Beach',['gp/noche1','gp/noche2','gp/atardecer','gp/playa','gp/playa2'])]
used={}
def clip_for(txt):
    for pat,cl in TEMA:
        if re.search(pat,txt,re.I):
            k=used.get(pat,0); used[pat]=k+1; return cl[k%len(cl)]
    c=pool[pi[0]%len(pool)]; pi[0]+=1; return c
fr=[];cur=[]
for i,w in enumerate(W):
    cur.append(i)
    if re.search(r'[.?!]$',w['text']) and len(cur)>=2: fr.append(cur); cur=[]
if cur: fr.append(cur)
SEL=[('Antes de nada, un truco','TRUCO'),('Vamos con el capítulo uno','CAPÍTULO 1'),('Y ahora, el extra que puedes perder','¡NO LO PIERDAS!'),('Vamos con el capítulo dos','CAPÍTULO 2'),('Capítulo tres.','CAPÍTULO 3'),('Capítulo cuatro, dos cosas.','CAPÍTULO 4'),('Y ahora sí, el mejor extra','CAPÍTULO 5'),('Resumiendo, por capítulos.','RESUMEN'),('Antes de terminar','3 ERRORES')]
MONEY=[('se activa la tienda del menú',11,'MISIÓN «COMING HOME»','ahí ves todos tus extras'),('con más de cincuenta tatuajes',50,'TATUAJES EXCLUSIVOS','Electric Fang'),('casi el noventa por ciento',90,'% ELIGIÓ LA ULTIMATE','según GamesRadar'),('La Ultimate cuesta cien',100,'$ CUESTA LA ULTIMATE','en Estados Unidos')]
planos=[]
for k,f in enumerate(fr):
    txt=' '.join(W[i]['text'] for i in f)
    a=None if k==0 else ' '.join(W[i]['text'] for i in f[:2])
    d=W[f[-1]]['end']-W[f[0]]['start']
    m=next((x for x in MONEY if x[0].lower() in txt.lower()),None)
    sel=next((s for s in SEL if txt.startswith(s[0])),None)
    if m: p={'tpl':'gta-grafico','tipo':'precio','value':m[1],'unit':'-','text':m[2],'topText':m[3],'imageUrl':'p/Vice_City_18.jpg'}
    elif sel: p={'sello':sel[1],'acc':'#3DDC84','g':-4,'clip':clip_for(txt)}
    elif k==0: p={'lista':[{'clip':'gp/coche1','top':'EXTRAS DE LA ULTIMATE'},{'clip':'gp/playa'}]}
    else:
        n=max(1,round(d/3.2)); p={'lista':[{'clip':clip_for(txt)} for _ in range(n)]}
    if a: p['a']=a
    planos.append(p)
planos[-1]={'a':planos[-1].get('a'),'tpl':'gta-marcador','topText':'cada día, lo nuevo de GTA 6','text':'SUSCRÍBETE','items':['Ultimate','Trucos','Secretos'],'value':25}
F={'id':'L19','tipo':'largo','voz':'voz-l19.mp3','words':f'{SP}/words/L19.json','fin':1.5,'planos':planos,'booms':[],'flami':[],'claves':[]}
json.dump(F,open(f'{SP}/fichas/L19.json','w'),ensure_ascii=False,indent=1)
print(len(planos),'planos',sum(1 for p in planos if p.get('tpl')=='gta-grafico'),'graf',sum(1 for p in planos if 'sello' in p),'sellos')
