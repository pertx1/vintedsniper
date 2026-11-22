import json,re,glob,os,random
SP='/tmp/claude-0/-home-user-vintedsniper/f149cbb4-300b-549b-a6bb-754b879e5cbb/scratchpad'
W=json.load(open(f'{SP}/words/L11.json'))
bad={'a21','a24','b03','b17','b19','ref_pesas','lo_reja'}
pool=[f'gpx/{os.path.basename(x)[:-4]}' for x in sorted(glob.glob(f'{SP}/render/public/gpx/*.mp4')) if os.path.basename(x)[:-4] not in bad]
pool+=[f'gp/{os.path.basename(x)[:-4]}' for x in sorted(glob.glob(f'{SP}/render/public/gp/*.mp4'))]
pool+=[f'gp2/{os.path.basename(x)[:-4]}' for x in sorted(glob.glob(f'{SP}/render/public/gp2/*.mp4')) if os.path.basename(x)[:-4] not in bad]
rnd=random.Random(11); rnd.shuffle(pool); pi=[0]
def nxt():
    c=pool[pi[0]%len(pool)]; pi[0]+=1; return c
fr=[];cur=[]
for i,w in enumerate(W):
    cur.append(i)
    if re.search(r'[.?!]$',w['text']) and len(cur)>=2: fr.append(cur); cur=[]
if cur: fr.append(cur)
SEL=[('Lo primero','1. CUÁNDO'),('Lo segundo','2. DESBLOQUEAR'),('Lo tercero','3. ACTIVAR'),('Pero cuidado','OJO'),('Ahora sí,','LOS TRUCOS'),('Vamos con los trucos','COMBATE'),('Ahora, los','VEHÍCULOS'),('Vamos con el tiempo','CLIMA Y HORA'),('Y lo último,','FILTROS'),('Resumiendo.','RESUMEN')]
CARDS=[('el código es: arriba, derecha','💰 DINERO',['$250.000 · ↑ → ↓ ← ↑ ← ↓ →']),
 ('El código es: abajo, arriba, izquierda','🛡 CHALECO',['Chaleco · ↓ ↑ ← ↑ ↑ ↑ ↑ ↑ ↓ ↓']),
 ('Código: abajo, arriba, arriba','🎯 CONCENTRACIÓN',['Ilimitada · ↓ ↑ ↑ ↓ ↑ ↓ ↑ ↓ ↑ →']),
 ('Código: izquierda, abajo','🚔 BÚSQUEDA',['Subir nivel · ← ↓ → ↓ ↑ → ↑']),
 ('Munición infinita: veinticinco','🔫 MUNICIÓN',['Infinita · ↓ ↑ → ↓ ← ← ↑ ↓ ↓ ↓']),
 ('Y sin recargar','🔫 SIN RECARGAR',['Sin recargar · ↓ ↑ → ↓ ← ← ↑ ↓ ↓ ↑']),
 ('El Maibatsu Boomazoom','🚗 VEHÍCULOS',['Boomazoom · ← ↑ → ↓ ← ← ↑ ←']),
 ('El bulldozer HVY','🚜 VEHÍCULOS',['Bulldozer · ← ↑ → ↓ ← → → ↓']),
 ('Y el camión de bomberos','🚒 VEHÍCULOS',['Camión de bomberos · ← ↑ → ↓ ← → → ↑']),
 ('Cambiar el clima','🌦 CLIMA',['Cambiar clima · ↓ → ↑ ↓ → ↑ →']),
 ('mantén pulsado L uno','🎮 ACTIVAR',['PS5 · L1 + R1','Xbox · LB + RB'])]
planos=[]
for k,f in enumerate(fr):
    txt=' '.join(W[i]['text'] for i in f)
    a=None if k==0 else ' '.join(W[i]['text'] for i in f[:2])
    d=W[f[-1]]['end']-W[f[0]]['start']
    card=next((c for c in CARDS if c[0].lower() in txt.lower()),None)
    sel=next((s for s in SEL if txt.startswith(s[0])),None)
    if card:
        p={'tpl':'gta-sinopsis','text':card[1],'items':card[2],'value':9}
    elif sel:
        p={'sello':sel[1],'acc':'#FFE02E' if k%2 else '#EC517D','g':-4,'clip':nxt()}
    elif k==0:
        p={'lista':[{'clip':'gp/coche1','top':'61 TRUCOS'},{'clip':nxt()}]}
    else:
        n=max(1,round(d/3.2)); p={'lista':[{'clip':nxt()} for _ in range(n)]}
    if a: p['a']=a
    planos.append(p)
planos[-1]={'a':planos[-1].get('a'),'tpl':'gta-marcador','topText':'cada día, lo nuevo de GTA 6','text':'SUSCRÍBETE','items':['Trucos','Secretos','Guías'],'value':25}
F={'id':'L11','tipo':'largo','voz':'voz-l11.mp3','words':f'{SP}/words/L11.json','fin':1.5,'planos':planos,'booms':[],'flami':[],'claves':[]}
json.dump(F,open(f'{SP}/fichas/L11.json','w'),ensure_ascii=False,indent=1)
print(len(planos),'planos', sum(1 for p in planos if p.get('tpl')=='gta-sinopsis'),'cards', sum(1 for p in planos if 'sello' in p),'sellos')
