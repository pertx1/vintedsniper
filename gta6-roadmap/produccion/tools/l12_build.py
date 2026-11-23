import json,re,glob,os,random
SP='/tmp/claude-0/-home-user-vintedsniper/f149cbb4-300b-549b-a6bb-754b879e5cbb/scratchpad'
W=json.load(open(f'{SP}/words/L12.json'))
bad={'a21','a24','b03','b17','b19','ref_pesas','lo_reja'}
pool=[f'gpx/{os.path.basename(x)[:-4]}' for x in sorted(glob.glob(f'{SP}/render/public/gpx/*.mp4')) if os.path.basename(x)[:-4] not in bad]
pool+=[f'gp/{os.path.basename(x)[:-4]}' for x in sorted(glob.glob(f'{SP}/render/public/gp/*.mp4'))]
rnd=random.Random(12); rnd.shuffle(pool); pi=[0]
TEMA=[(r'loro|licorería|Three Sheets|trastienda|caja fuerte',['gp2/lo_oficina','gp2/lo_mapa','gp2/lo_callejon','gp/tienda2']),
 (r'Kenton|tesoro|bucear|buceo|barco',['gp/barco','gp/mar2','gpx/a10','gpx/b09','gpx/b25','gp/mar1']),
 (r'coche|Moses|Pay and Spray|ganzúa',['gp/coche1','gp/coche2','gpx/a03','gpx/a04','gpx/a06','gpx/a07','gp2/pw_sale','gp2/pw_calle']),
 (r'derbi|circuito|Ambrosia',['gpx/a05','gpx/a16','gpx/a18','gp/atardecer']),
 (r'caza|jabalí|animales|Bret',['gpx/b05','gpx/b26','gpx/b07','gpx/b11']),
 (r'banco|joyería|tienda|puerta de atrás|robos',['gp/tienda','gpx/a15','gpx/a19','gpx/a26','gpx/a29']),
 (r'piloto|aéreos|avión',['gp/avion1','gp/avion2','gpx/a08','gpx/a09'])]
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
SEL=[('Lo primero, en el capítulo uno','CAPÍTULO 1'),('Vamos con el capítulo dos','CAPÍTULO 2'),('Capítulo tres.','CAPÍTULO 3'),('Y unos cuantos extras','EXTRAS'),('Un último consejo','CONSEJO'),('Resumiendo.','RESUMEN')]
MONEY=[('un buen coche te puede dar',20000,'$ POR COCHE (MÁX.)','Moses, capítulo 2'),('cada victoria paga',6300,'$ POR VICTORIA (MÁX.)','derbi de Ambrosia'),('le pagaron dos mil quinientos',2500,'$ POR UN JABALÍ','caza con Bret'),('puedes sacar entre mil y quince mil',15000,'$ ROBANDO A CRIMINALES','según PC Gamer'),('botines de entre seis mil',15000,'$ POR ROBO (MÁX.)','puerta de atrás'),('pagan entre diez mil y veinte mil',20000,'$ POR VIAJE (MÁX.)','repartos aéreos')]
planos=[]
for k,f in enumerate(fr):
    txt=' '.join(W[i]['text'] for i in f)
    a=None if k==0 else ' '.join(W[i]['text'] for i in f[:2])
    d=W[f[-1]]['end']-W[f[0]]['start']
    m=next((x for x in MONEY if x[0].lower() in txt.lower()),None)
    sel=next((s for s in SEL if txt.startswith(s[0])),None)
    if m: p={'tpl':'gta-grafico','tipo':'precio','value':m[1],'unit':'-','text':m[2],'topText':m[3],'imageUrl':'p/Vice_City_18.jpg'}
    elif sel: p={'sello':sel[1],'acc':'#3DDC84','g':-4,'clip':clip_for(txt)}
    elif k==0: p={'lista':[{'clip':'gp/coche1','top':'DINERO RÁPIDO'},{'clip':clip_for(txt)}]}
    else:
        n=max(1,round(d/3.2)); p={'lista':[{'clip':clip_for(txt)} for _ in range(n)]}
    if a: p['a']=a
    planos.append(p)
planos[-1]={'a':planos[-1].get('a'),'tpl':'gta-marcador','topText':'cada día, lo nuevo de GTA 6','text':'SUSCRÍBETE','items':['Dinero','Trucos','Secretos'],'value':25}
F={'id':'L12','tipo':'largo','voz':'voz-l12.mp3','words':f'{SP}/words/L12.json','fin':1.5,'planos':planos,'booms':[],'flami':[],'claves':[]}
json.dump(F,open(f'{SP}/fichas/L12.json','w'),ensure_ascii=False,indent=1)
print(len(planos),'planos',sum(1 for p in planos if p.get('tpl')=='gta-grafico'),'graf',sum(1 for p in planos if 'sello' in p),'sellos')
