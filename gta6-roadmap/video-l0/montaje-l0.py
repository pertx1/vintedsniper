import json
SP='/tmp/claude-0/-home-user-vintedsniper/f149cbb4-300b-549b-a6bb-754b879e5cbb/scratchpad'
A=json.load(open(SP+'/render/src/l0a.json'))
WB=[x for x in json.load(open(SP+'/l0b_words_raw.json'))['words'] if x['type']=='word' and not x['text'].startswith('[')]
END=249.9
def img(n,top=None): d={'plantilla':'gta-plano','imageUrl':f'p/{n}.jpg'}; top and d.update(topText=top); return d
def pos(n,top=None): d={'plantilla':'gta-plano','imageUrl':n}; top and d.update(topText=top); return d
def vid(n,top=None): d={'plantilla':'gta-plano','videoUrl':f'h/{n}.mp4'}; top and d.update(topText=top); return d
def ficha(n,name,top,bottom,g=1): return {'plantilla':'gta-personaje','imageUrl':f'p/{n}.jpg','text':name,'topText':top,'bottomText':bottom,'grado':g}
def sello(n,t,acc='#FFE02E',g=-6): return {'plantilla':'gta-sello','imageUrl':f'p/{n}.jpg','text':t,'accent':acc,'grado':g}
def cita(t,who,src='web oficial de Rockstar'): return {'plantilla':'gta-cita','text':t,'topText':who,'bottomText':src}
# (inicio en s de la voz B, visual)
S=[
(0.0, ficha('Jason_Duval_02','Jason Duval','Protagonista','Quiere una vida fácil… pero todo se le complica')),
(3.24, img('Jason_Duval_01')),
(6.36, img('Jason_Duval_06')),
(9.16, img('Jason_Duval_17','EX MILITAR')),
(12.96, img('Jason_Duval_03','LOS CAYOS')),
(15.84, img('Jason_Duval_Video_Clip')),
(18.24, cita('Conocer a Lucía puede ser lo mejor o lo peor que le ha pasado nunca','Rockstar sobre Jason')),
(24.24, img('Jason_Duval_19')),
(26.88, sello('Jason_Duval_05','NADIE LO SABE','#EC517D',5)),
(29.6, ficha('Lucia_Caminos_13','Lucía Caminos','Protagonista','Su padre le enseñó a pelear en cuanto aprendió a andar',-1)),
(33.8, img('Lucia_Caminos_01')),
(37.08, img('Lucia_Caminos_05','CÁRCEL DE LEONIDA')),
(39.96, img('Lucia_Caminos_04')),
(42.0, img('Lucia_Caminos_12')),
(44.72, cita('Una vida con Jason podría ser su salida','Rockstar sobre Lucía')),
(49.76, img('Jason_and_Lucia_15','EL GOLPE')),
(51.88, vid('trailer-13')),
(53.2, img('Jason_and_Lucia_14')),
(55.2, vid('trailer-27')),
(57.32, img('Jason_and_Lucia_18')),
(59.92, sello('Vice_City_14','LOS SECUNDARIOS','#FFE02E',-5)),
(63.04, ficha('Cal_Hampton_01','Cal Hampton','El amigo de Jason','Paranoico profesional')),
(65.44, img('Cal_Hampton_02')),
(67.04, img('Cal_Hampton_04')),
(70.8, img('Cal_Hampton_03')),
(73.84, cita('Hay demasiados pájaros volando en formación perfecta','Cal Hampton','frase oficial del personaje')),
(77.36, ficha('Boobie_Ike_03','Boobie Ike','Leyenda de Vice City','De la calle a un imperio legal',-1)),
(80.32, img('Boobie_Ike_01')),
(83.36, img('Boobie_Ike_02')),
(85.56, img('Boobie_Ike_04','JACK OF HEARTS')),
(88.56, ficha('DreQuan_Priest_03',"Dre'Quan Priest",'Only Raw Records','Más buscavidas que gánster')),
(92.36, img('DreQuan_Priest_04')),
(95.28, img('DreQuan_Priest_02','ONLY RAW RECORDS')),
(97.44, ficha('Real_Dimez_04','Real Dimez','Bae-Luxe y Roxy','Amigas desde el instituto',-1)),
(101.76, img('Real_Dimez_01')),
(104.0, img('Real_Dimez_03')),
(106.56, img('Real_Dimez_02')),
(109.84, ficha('Raul_Bautista_04','Raul Bautista','Atracador de bancos','Siempre busca talento dispuesto a arriesgar')),
(113.28, img('Raul_Bautista_02')),
(115.0, vid('trailer-14')),
(116.08, img('Raul_Bautista_01')),
(118.88, ficha('Brian_Heder_01','Brian Heder','Traficante de los Cayos','De la época dorada del contrabando',-1)),
(123.84, img('Brian_Heder_04','CON LORI')),
(128.0, img('Brian_Heder_02')),
(131.44, sello('Brian_Heder_03','A CAMBIO DE…','#EC517D',6)),
(134.72, img('poster.13r')),
(137.0, vid('precarga-40')),
(139.68, {'plantilla':'gta-dato','topText':'LEONIDA','value':6,'unit':' ZONAS','text':'la Florida de GTA','lang':'es','fijo':True}),
(143.92, pos('postal-vicecity.jpg')),
(146.08, img('Vice_City_27','VICE CITY')),
(148.4, img('Vice_City_15')),
(150.24, img('Vice_City_08')),
(153.44, pos('postal-keys.jpg')),
(155.68, img('Leonida_Keys_01','LEONIDA KEYS')),
(158.08, img('Leonida_Keys_05')),
(159.68, pos('postal-grassrivers.jpg')),
(162.08, img('Grassrivers_03','GRASSRIVERS')),
(163.84, img('Grassrivers_01')),
(164.88, pos('postal-ambrosia.jpg')),
(166.4, img('Ambrosia_01','AMBROSIA')),
(168.32, pos('postal-portgellhorn.jpg')),
(169.68, img('Port_Gellhorn_01','PORT GELLHORN')),
(170.8, pos('postal-kalaga.jpg')),
(173.2, img('Mount_Kalaga_National_Park_04','MOUNT KALAGA')),
(175.76, {'plantilla':'gta-sinopsis','text':'¿Y EN LA VIDA REAL?','value':10,'items':['Vice City → Miami','Leonida Keys → Cayos de Florida','Grassrivers → Everglades']}),
(181.52, img('GTAVI_Pre_Load')),
(184.0, {'plantilla':'gta-dato','topText':'PRECARGA DESDE','value':10,'unit':' NOV','text':'en digital','lang':'es','fijo':True}),
(186.8, vid('precarga-38')),
(188.88, {'plantilla':'gta-sinopsis','text':'2 EDICIONES','value':10,'items':['Estándar','Ultimate']}),
(191.52, img('Jason_Lucia_Lock_And_Load_landscape','BONUS POR RESERVAR')),
(193.68, img('Vice_City_24')),
(196.24, img('The_Album_Cover_Art_landscape','BANDA SONORA OFICIAL')),
(199.36, vid('trailer-19')),
(202.0, img('Vice_City_13')),
(205.2, sello('Lucia_Caminos_11','EL DETALLE','#FFE02E',-6)),
(208.32, img('Lucia_Caminos_14','BIOGRAFÍA OFICIAL')),
(210.96, img('Lucia_Caminos_02')),
(213.12, cita('Lo que más quiere es la buena vida con la que su madre soñaba desde sus días en Liberty City','Biografía de Lucía','web oficial de Rockstar')),
(218.8, sello('Vice_City_27','LIBERTY CITY','#EC517D',-7)),
(220.24, {'plantilla':'gta-sinopsis','text':'LIBERTY CITY','value':10,'items':['GTA III (2001)','GTA IV (2008)']}),
(223.28, img('Lucia_Caminos_Video_Clip','SU FAMILIA')),
(226.0, img('Jason_Lucia_Rooftop_landscape','CONECTA LA SAGA')),
(229.2, sello('Lucia_Caminos_03','¿CONFIRMADO? NO','#EC517D',5)),
(233.36, img('Lucia_Caminos_13','LA PISTA ESTÁ AHÍ')),
(235.52, img('hero','GTA OCULTO')),
(238.32, vid('trailer-18')),
(240.0, img('Vice_City_01')),
(242.44, sello('Jason_and_Lucia_17','SUSCRÍBETE','#FFE02E',-6)),
(245.73, img('outro','¿JASON O LUCÍA?')),
]

# ===== Bloque C: detalles de los tráileres (voz-l0c.mp3), entre Leonida y la precarga =====
CUT=181.36; GAP=0.2; LC=117.0; D=GAP+LC
WC=[x for x in json.load(open(SP+'/l0c_words_raw.json'))['words'] if x['type']=='word' and not x['text'].startswith('[')]
C=[
(0.0, sello('Vice_City_01','8 DETALLES OCULTOS','#FFE02E',-6)),
(5.28, vid('x-keys','TRÁILER DE LANZAMIENTO')),
(6.52, vid('x-marina',"BRIAN'S MARINA")),
(8.06, img('Brian_Heder_02')),
(11.0, img('Brian_Heder_03')),
(13.2, img('Leonida_Keys_01','LOS CAYOS')),
(16.16, vid('x-keys')),
(17.76, vid('x-marina')),
(19.32, img('Grassrivers_02','LA FAUNA')),
(22.08, vid('x-iguana')),
(25.5, vid('trailer-10')),
(26.9, img('Leonida_Keys_02')),
(27.8, img('Grassrivers_01','CAIMANES')),
(32.4, img('Vice_City_19')),
(34.75, vid('x-avioneta')),
(38.4, img('Vice_City_05')),
(41.72, vid('x-tren')),
(44.32, vid('precarga-40')),
(48.6, vid('trailer-20')),
(50.3, img('Vice_City_25')),
(52.0, {'plantilla':'gta-sinopsis','text':'LA MÚSICA','value':10,'items':['Tráiler 1 · Love Is a Long Road (Tom Petty)','Tráiler 2 · Hot Together (The Pointer Sisters)']}),
(58.5, img('GTAVI_Launch_Trailer_poster','ESTÉTICA 80s')),
(62.64, sello('Lucia_Caminos_01','TRÁILER 1','#EC517D',5)),
(64.8, img('Lucia_Caminos_05','CÁRCEL DE LEONIDA')),
(71.12, sello('Cal_Hampton_04','FRASES OFICIALES','#FFE02E',-5)),
(74.0, cita('¿Y si todo lo que hay en internet fuera verdad?','Cal Hampton')),
(79.5, cita('Los psicópatas mandan. Acostúmbrate.','Cal Hampton')),
(83.36, img('Brian_Heder_01')),
(85.2, cita('Transporté tanta hierba en ese avión que podría hacer levitar el estado de Leonida','Brian Heder')),
(89.88, img('Jason_Duval_14')),
(92.96, img('Brian_Heder_04','LETRA PEQUEÑA')),
(97.4, sello('Leonida_Keys_03','LA SANGRÍA DE LORI','#EC517D',5)),
(101.28, vid('trailer-25')),
(104.3, img('Real_Dimez_02')),
(107.8, cita('Vídeos virales. Estribillos virales.','Rockstar sobre Real Dimez')),
(113.1, img('Vice_City_03')),
]
# reconstruye S: B hasta CUT, luego C, luego el resto de B desplazado
S2=[]
for t,v in S:
    if t < CUT: S2.append((t,v))
for c,v in C: S2.append((CUT+GAP+c if c>0 else CUT+GAP,v))
for t,v in S:
    if t >= CUT: S2.append((t+D,v))
S=S2; END=END+D
WB=[dict(w) for w in WB]
for w in WB:
    if w['start']>=CUT: w['start']+=D; w['end']+=D
WB=sorted(WB+[dict(w,start=w['start']+CUT+GAP,end=w['end']+CUT+GAP) for w in WC],key=lambda w:w['start'])

OB=sum(p['segundos'] for p in A['planos'])
planos=[]
for i,(t,v) in enumerate(S):
    nt=S[i+1][0] if i+1<len(S) else END
    v=dict(v); v['segundos']=round(nt-t,3); planos.append(v)
pal=[[w['text'],round(w['start']+OB,3),round(w['end']+OB,3)] for w in WB]
claves=['Jason','Lucía','Cal','Boobie','Dre\'Quan','Dimez.','Raul','Brian','seis','Liberty','caimanes.','diez','Suscríbete','prometí','gratis','Uno.','Dos.','Tres.','Cuatro.','Cinco.','Seis.','Siete.','Ocho.','iguana','Marina.']
claves=[c for c in claves]
booms=[0.0, 29.6, 63.04, 139.68, CUT+GAP, 205.2+D, 218.8+D, 242.44+D]
flami=[{'desde':59.92,'hasta':63.0,'x':1500,'y':560,'h':460,'rot':-6},
       {'desde':139.7,'hasta':143.8,'x':1520,'y':580,'h':440,'rot':6},
       {'desde':205.25+D,'hasta':208.3+D,'x':1480,'y':540,'h':500,'rot':-5},
       {'desde':242.5+D,'hasta':249.8+D,'x':1480,'y':520,'h':520,'rot':-4}]
full={'voz':'voz-l0.mp3','planos':A['planos']+planos,'palabras':A['palabras']+pal,
      'claves':sorted(set(A['claves']+claves)),'booms':A['booms']+[b+OB for b in booms],
      'flami':A['flami']+[dict(f,desde=f['desde']+OB,hasta=f['hasta']+OB) for f in flami]}
json.dump(full,open(SP+'/render/src/l0.json','w'),ensure_ascii=False,indent=1)
print('OB',OB,'total',OB+END, 'planos',len(full['planos']))
import os
for p in planos:
    u=p.get('imageUrl') or p.get('videoUrl')
    if u and not os.path.exists(SP+'/render/public/'+u): print('MISSING',u)
