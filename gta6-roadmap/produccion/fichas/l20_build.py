import json,re,glob,os,random
SP='/tmp/claude-0/-home-user-vintedsniper/f149cbb4-300b-549b-a6bb-754b879e5cbb/scratchpad'
W=json.load(open(f'{SP}/words/L20.json'))
bad={'a21','a24','b03','b17','b19','ref_pesas','lo_reja'}
pool=[f'gpx/{os.path.basename(x)[:-4]}' for x in sorted(glob.glob(f'{SP}/render/public/gpx/*.mp4')) if os.path.basename(x)[:-4] not in bad]
pool+=[f'gp/{os.path.basename(x)[:-4]}' for x in sorted(glob.glob(f'{SP}/render/public/gp/*.mp4'))]
rnd=random.Random(20); rnd.shuffle(pool); pi=[0]
TEMA=[(r'banco|cámara|furgón|guardia|bolsas',['gp/calle','gp/noche1','gp/noche2','gp/noche4','gpx/a15','gpx/a19']),
 (r'caravana|lago|desguace|garaje|matrícula|Vamos|Moses',['gp/coche1','gp/coche2','gpx/a03','gpx/a06','gp2/pw_calle']),
 (r'mapa|Focus|sticks|sección',['gp/mapa2','gp/menu']),
 (r'Brooks|Port Gellhorn|Kolt|valla|azotea|Caracara',['gp/atardecer','gp/casas','gp/puente','gp/noche5']),
 (r'loro|Key Lento|motel|Cascara',['gp2/lo_oficina','gp2/lo_callejon','gp/villa'])]
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
SEL=[('Antes de nada, cómo funcionan','CÓMO FUNCIONAN'),('Ahora, cómo conseguir los códigos','CÓDIGOS QUE CAMBIAN'),('Vamos con los códigos fijos','CÓDIGOS FIJOS'),('El segundo, y el más importante','BROOKS BOATWORKS'),('Más códigos fijos.','MÁS CÓDIGOS'),('¿Y la casa de empeños?','CASA DE EMPEÑOS'),('Y ahora sí, lo que te prometí','CÁMARA DEL BANCO'),('Resumiendo, los códigos fijos','RESUMEN')]
MONEY=[('cero tres tres cero, según',330,'BOLERA KINGPIN','código fijo'),('El código es seis ocho dos tres',6823,'BROOKS BOATWORKS','código fijo'),('seis nueve seis nueve',6969,'MOTEL LA CASCARA','código fijo'),('cuatro cuatro cero uno siete',44017,'CARAVANA DEL LAGO','código fijo'),('siete siete siete siete',7777,'DESGUACE NOVA AUTO','código fijo'),('El código es dos siete dos siete',2727,'GARAJE DEL VAMOS','código fijo'),('puede tener cien mil dólares',100000,'$ EN UNA CÁMARA (O MÁS)','según PC Gamer'),('te ofrece un soplo por diez mil',10000,'$ EL SOPLO DE YASMANI','capítulo 4')]
planos=[]
for k,f in enumerate(fr):
    txt=' '.join(W[i]['text'] for i in f)
    a=None if k==0 else ' '.join(W[i]['text'] for i in f[:2])
    d=W[f[-1]]['end']-W[f[0]]['start']
    m=next((x for x in MONEY if x[0].lower() in txt.lower()),None)
    sel=next((s for s in SEL if txt.startswith(s[0])),None)
    if m: p={'tpl':'gta-grafico','tipo':'precio','value':m[1],'unit':('-' if m[1]>=10000 and m[1]!=44017 else ('cod5' if m[1]==44017 else 'cod4')),'text':m[2],'topText':m[3],'imageUrl':'p/Vice_City_18.jpg'}
    elif sel: p={'sello':sel[1],'acc':'#3DDC84','g':-4,'clip':clip_for(txt)}
    elif k==0: p={'lista':[{'clip':'gp/coche1','top':'CÓDIGOS DE CAJAS FUERTES'},{'clip':'gp/playa'}]}
    else:
        n=max(1,round(d/3.2)); p={'lista':[{'clip':clip_for(txt)} for _ in range(n)]}
    if a: p['a']=a
    planos.append(p)
planos[-1]={'a':planos[-1].get('a'),'tpl':'gta-marcador','topText':'cada día, lo nuevo de GTA 6','text':'SUSCRÍBETE','items':['Códigos','Trucos','Secretos'],'value':25}
F={'id':'L20','tipo':'largo','voz':'voz-l20.mp3','words':f'{SP}/words/L20.json','fin':1.5,'planos':planos,'booms':[],'flami':[],'claves':[]}
json.dump(F,open(f'{SP}/fichas/L20.json','w'),ensure_ascii=False,indent=1)
print(len(planos),'planos',sum(1 for p in planos if p.get('tpl')=='gta-grafico'),'graf',sum(1 for p in planos if 'sello' in p),'sellos')
