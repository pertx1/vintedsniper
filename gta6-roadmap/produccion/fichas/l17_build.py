import json,re,glob,os,random
SP='/tmp/claude-0/-home-user-vintedsniper/f149cbb4-300b-549b-a6bb-754b879e5cbb/scratchpad'
W=json.load(open(f'{SP}/words/L17.json'))
bad={'a21','a24','b03','b17','b19','ref_pesas','lo_reja'}
pool=[f'gpx/{os.path.basename(x)[:-4]}' for x in sorted(glob.glob(f'{SP}/render/public/gpx/*.mp4')) if os.path.basename(x)[:-4] not in bad]
pool+=[f'gp/{os.path.basename(x)[:-4]}' for x in sorted(glob.glob(f'{SP}/render/public/gp/*.mp4'))]
rnd=random.Random(17); rnd.shuffle(pool); pi=[0]
TEMA=[(r'carretera|conducir|acelerador|gatillo|coches|tráfico',['gp/coche1','gp/coche2','gpx/a03','gpx/a06','gp2/pw_calle','gp/puente']),
 (r'playa|bañador',['gp/playa','gp/playa2','gp/mar1']),
 (r'mando|DualSense|menú|Ajustes|Perfil',['gp/menu','gp/mapa2']),
 (r'gente|personas|ciudad|Vice City|Leonida',['gp/calle','gp/noche1','gp/noche2','gp/atardecer','gp/casas']),
 (r'avión|nube',['gp/avion1','gp/avion2','gp/helico'])]
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
SEL=[('Lo primero, lo que es igual','30 FPS EN TODAS'),('Vamos con la mejor versión','PS5 PRO'),('Segunda: la PS','PS5'),('Y la PS cinco, normal o Pro, tiene algo','DUALSENSE'),('Tercera: Xbox Series X','SERIES X'),('Cuarta: Xbox Series S','SERIES S'),('Y quinta, la sorpresa','XBOX ONE'),('Antes del veredicto','ESPACIO'),('Vamos con el veredicto','VEREDICTO')]
MONEY=[('GTA seis va a treinta fotogramas',30,'FPS EN TODAS','sin modo rendimiento'),('pero en la Pro parece casi cuatro',1440,'P (PARECE 4K)','PS5 Pro + PSSR'),('hasta unos veinticuatro',24,'FPS (SOLO CON EXPLOSIONES)','PS5 Pro'),('hasta mil cuatrocientos euros',1400,'€ LLEGÓ A COSTAR','PS5 Pro sin stock'),('la de la Pro, sesenta',60,'UNIDADES DE CÁLCULO (PRO)','PS5: 36'),('se queda en unos treinta y seis',36,'FPS DE MEDIA','glitch de Xbox'),('a la zona de los veinte',20,'FPS EN ACCIÓN','Xbox Series S'),('hasta quince con el Ultimate',15,'HORAS AL MES (MÁX.)','nube en Xbox One'),('necesita hasta doscientos doce',212,'GB DE DESCARGA','GTA 6'),('un modo a cuarenta',40,'FPS: ¿EL FUTURO?','según Digital Foundry')]
planos=[]
for k,f in enumerate(fr):
    txt=' '.join(W[i]['text'] for i in f)
    a=None if k==0 else ' '.join(W[i]['text'] for i in f[:2])
    d=W[f[-1]]['end']-W[f[0]]['start']
    m=next((x for x in MONEY if x[0].lower() in txt.lower()),None)
    sel=next((s for s in SEL if txt.startswith(s[0])),None)
    if m: p={'tpl':'gta-grafico','tipo':'precio','value':m[1],'unit':'-','text':m[2],'topText':m[3],'imageUrl':'p/Vice_City_18.jpg'}
    elif sel: p={'sello':sel[1],'acc':'#3DDC84','g':-4,'clip':clip_for(txt)}
    elif k==0: p={'lista':[{'clip':'gp/coche1','top':'¿QUÉ CONSOLA?'},{'clip':'gp/playa'}]}
    else:
        n=max(1,round(d/3.2)); p={'lista':[{'clip':clip_for(txt)} for _ in range(n)]}
    if a: p['a']=a
    planos.append(p)
planos[-1]={'a':planos[-1].get('a'),'tpl':'gta-marcador','topText':'cada día, lo nuevo de GTA 6','text':'SUSCRÍBETE','items':['Consolas','Trucos','Secretos'],'value':25}
F={'id':'L17','tipo':'largo','voz':'voz-l17.mp3','words':f'{SP}/words/L17.json','fin':1.5,'planos':planos,'booms':[],'flami':[],'claves':[]}
json.dump(F,open(f'{SP}/fichas/L17.json','w'),ensure_ascii=False,indent=1)
print(len(planos),'planos',sum(1 for p in planos if p.get('tpl')=='gta-grafico'),'graf',sum(1 for p in planos if 'sello' in p),'sellos')
