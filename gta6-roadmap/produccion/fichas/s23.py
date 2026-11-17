import json
SP='/tmp/claude-0/-home-user-vintedsniper/f149cbb4-300b-549b-a6bb-754b879e5cbb/scratchpad'
def P(n): return f'p/{n}.jpg'
def mk(a,txt,items,top='te leo en comentarios'): return {'a':a,'tpl':'gta-marcador','topText':top,'text':txt,'items':items,'value':25}
v=dict(planos=[
 {'img':'ds/ds2.jpg','top':'PS5 vs XBOX'},
 {'a':'Lo ha confirmado','sello':'ROCKSTAR NORTH','acc':'#EC517D','g':5,'img':P('GTAVI_Pre_Load')},
 {'a':'en una entrevista','cita':'Las vibraciones de los minijuegos y de los vehículos están todas ajustadas.','quien':'Rob Nelson','donde':'entrevista en Famitsu'},
 {'a':'En PS5, la vibración','img':'ds/ds5.jpg','top':'VIBRACIÓN POR ARMA'},
 {'a':'los minijuegos','img':P('Jason_and_Lucia_17')},
 {'a':'Y al conducir','img':'ds/ds1.jpg','top':'EL GATILLO = ACELERADOR'},
 {'a':'si lo aprietas a fondo','sello':'A FONDO = MÁS RÁPIDO','acc':'#EC517D','g':5,'img':P('Vice_City_17')},
 {'a':'Sony añade','tpl':'gta-sinopsis','text':'DUALSENSE EN GTA 6','items':['Gatillos adaptativos','Háptica','Altavoz del mando'],'value':14},
 {'a':'¿Y en Xbox?','img':'ds/ds9.jpg','top':'¿Y EN XBOX?'},
 {'a':'pero su mando','sello':'SIN GATILLOS ADAPTATIVOS','img':P('Vice_City_20')},
 {'a':'Así que','img':'ds/ds8.jpg','top':'SE SIENTE DISTINTO'},
 mk('¿Tú en cuál','¿DÓNDE VAS A JUGAR?',['PS5','Xbox'])],
 booms=['¿Y en Xbox?'],flami=['Así que'],claves=['Xbox','Famitsu.','gatillo:','resistencia,'])
v.update(id='S23',tipo='short',voz='voz-s23.mp3',words=f'{SP}/words/S23.json',fin=0.8)
json.dump(v,open(f'{SP}/fichas/S23.json','w'),ensure_ascii=False,indent=1)
m=json.load(open(f'{SP}/fichas/meta.json'))
m['S23']={"bg":f"{SP}/render/public/ds/ds2.jpg","cx":0.5,"lineas":["PS5","vs XBOX"],
 "desc":"Rob Nelson (Rockstar North) confirma a Famitsu que en PS5 la vibración del DualSense cambia según el arma y la actividad, y que al conducir aceleras según cuánto aprietes el gatillo. Sony confirma gatillos adaptativos, háptica y altavoz del mando. El mando de Xbox no tiene gatillos adaptativos.",
 "tags":"#gta6 #ps5 #dualsense #xbox #gta6español #shorts"}
json.dump(m,open(f'{SP}/fichas/meta.json','w'),ensure_ascii=False,indent=1)
