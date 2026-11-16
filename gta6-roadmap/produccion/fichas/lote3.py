import json
SP='/tmp/claude-0/-home-user-vintedsniper/f149cbb4-300b-549b-a6bb-754b879e5cbb/scratchpad'
AW='p2/Artwork_Wallpapers_'; UE='p2/Ultimate_Edition_Benefits_ULTIMATE_EDITION_'
def P(n): return f'p/{n}.jpg'
def mk(a,txt,items,top='te leo en comentarios'): return {'a':a,'tpl':'gta-marcador','topText':top,'text':txt,'items':items,'value':25}
SIG=lambda a: mk(a,'SÍGUEME',['Secretos','Trucos','Easter eggs'],'cada día, un secreto nuevo')
F={}
F['S13']=dict(planos=[{'clip':'precarga-40','top':'¿GTA 6 ONLINE?'},
 {'a':'La respuesta corta','sello':'NO ANUNCIADO','acc':'#EC517D','g':5,'img':P('Vice_City_06')},
 {'a':'La edición estándar','img':P('GTAVI_Pre_Load'),'cx':0.4,'top':'UN JUGADOR'},
 {'a':'y ni la Ultimate','img':UE+'01.jpg'},
 {'a':'Pero mira el historial','clip':'trailer-29'},
 {'a':'GTA Online llegó','tpl':'gta-dato','topText':'GTA ONLINE LLEGÓ','value':2,'unit':' SEMANAS','text':'después de GTA V (1/10/2013)','fijo':True},
 {'a':'Y Red Dead Online','tpl':'gta-dato','topText':'RED DEAD ONLINE','value':1,'unit':' MES','text':'después, en beta','fijo':True},
 {'a':'O sea','clip':'trailer-21','ss':1.9,'cx':0.45},
 {'a':'Es lo más probable','sello':'NO ES OFICIAL','img':P('Vice_City_17')},
 mk('El día que','SÍGUEME',['Fecha del Online','Novedades','Secretos'],'el día que se anuncie')],
 booms=['no lo ha anunciado'],flami=['O sea'],claves=['online?','semanas','mes','oficial.'])
F['S14']=dict(planos=[{'img':P('Leonida_Keys_02'),'cx':0.22,'top':'ESTO PASA EN FLORIDA'},
 {'a':'Una:','sello':'1 · IGUANAS','clip':'x-iguana','cx':0.62},
 {'a':'En Florida son','img':AW+'Postcards_Leonida_Keys_Leonida_Keys_Postcard_portrait.jpg'},
 {'a':'y caen de los árboles','sello':'CAEN DE LOS ÁRBOLES','acc':'#EC517D','g':5,'img':P('Leonida_Keys_05')},
 {'a':'Dos:','sello':'2 · CAIMANES','img':P('Grassrivers_01'),'cx':0.3},
 {'a':'Los pantanos','img':P('Grassrivers_04'),'top':'GRASSRIVERS = EVERGLADES'},
 {'a':'Y tres','sello':'3 · PEZ LEÓN','img':P('Leonida_Keys_07'),'cx':0.85},
 {'a':'y en la Florida real','img':P('Leonida_Keys_04'),'cx':0.55},
 {'a':'Rockstar no se lo ha inventado','img':AW+'Postcards_Vice_City_Vice_City_Postcard_portrait.jpg','top':'LEONIDA = FLORIDA'},
 SIG('Sígueme')],booms=['Una:'],flami=['Dos:'],claves=['iguanas.','árboles.','caimanes.','plaga'])
F['S15']=dict(planos=[{'lista':[{'clip':'trailer-22','top':'¿LO VISTE?'},{'clip':'precarga-37','cx':0.5}]},
 {'a':'Mira bien','clip':'x-keys','cx':0.55,'top':'THE KEYS'},
 {'a':'Y justo después','img':P('Leonida_Keys_03')},
 {'a':'Brian\'s Marina','lista':[{'clip':'x-marina','top':"BRIAN'S MARINA"},{'clip':'trailer-02','ss':2.6,'cx':0.6}]},
 {'a':'Brian es Brian Heder','ficha':'Brian Heder','img':P('Brian_Heder_01'),'cx':0.45,'sub':'Traficante de los Cayos','bot':'Dueño del puerto'},
 {'a':'sigue moviendo','img':P('Brian_Heder_04'),'top':'CON LORI'},
 {'a':'O sea, este puerto','sello':'SU NEGOCIO','img':P('Leonida_Keys_05')},
 {'a':'Y Jason vive gratis','img':P('Jason_Duval_14')},
 {'a':'Así que este sitio','img':P('Leonida_Keys_01')},
 mk('Lo habías visto','¿LO HABÍAS VISTO?',['Sí','No'])],booms=["Brian's Marina"],flami=['Así que este sitio'],claves=['Keys.','Marina.','gratis'])
F['S16']=dict(planos=[{'img':AW+'Boobie_Ike_Boobie_Ike_portrait.jpg','top':'EL REY DE VICE CITY'},
 {'a':'Según Rockstar','ficha':'Boobie Ike','img':P('Boobie_Ike_03'),'cx':0.4,'sub':'Leyenda de Vice City','bot':'De la calle a un imperio'},
 {'a':'Es de los pocos','img':P('Boobie_Ike_01'),'cx':0.35},
 {'a':'inmobiliarias','img':P('Boobie_Ike_04'),'top':'JACK OF HEARTS'},
 {'a':'Su lema','cita':'Todo va de corazón. Del Jack of Hearts.','quien':'Boobie Ike'},
 {'a':'Pero lo que más','img':P('Boobie_Ike_02'),'cx':0.45,'top':'ONLY RAW RECORDS'},
 {'a':'junto a un joven','img':P('DreQuan_Priest_04'),'cx':0.4},
 {'a':'Ahora solo les falta','sello':'FALTA UN ÉXITO','img':P('Vice_City_13')},
 mk('Será Boobie','¿ALIADO O ENEMIGO?',['Aliado','Enemigo'])],booms=['Boobie Ike'],flami=['Ahora solo les falta'],claves=['Boobie','imperio','corazón.','éxito.'])
F['S17']=dict(planos=[{'img':AW+'DreQuan_Priest_DreQuan_Priest_portrait.jpg','top':'EL MAGNATE'},
 {'a':'Su sueño es la música','ficha':"Dre'Quan Priest",'img':P('DreQuan_Priest_03'),'cx':0.4,'sub':'Only Raw Records','bot':'Más buscavidas que gánster'},
 {'a':'y es el socio','img':P('DreQuan_Priest_04'),'cx':0.4},
 {'a':'Según la web oficial','img':P('DreQuan_Priest_01')},
 {'a':'acaba de fichar','img':P('Real_Dimez_04'),'cx':0.4,'top':'FICHAJE: REAL DIMEZ'},
 {'a':'y apunta','img':P('DreQuan_Priest_02'),'cx':0.6},
 {'a':'Su frase','cita':'Las bailarinas son mis cazatalentos. Si un tema pega en el club, los DJ lo van a pinchar.','quien':"Dre'Quan Priest"},
 mk('Será el próximo','SÍGUEME',['Boobie','Real Dimez','Raul'],'conoce a todos')],booms=['acaba de fichar'],flami=['Su frase'],claves=['música,','Raw','cazatalentos.'])
F['S18']=dict(planos=[{'img':AW+'Real_Dimez_Real_Dimez_portrait.jpg','top':'VIRALES'},
 {'a':'Bae-Luxe y Roxy','ficha':'Real Dimez','img':P('Real_Dimez_04'),'cx':0.35,'sub':'Bae-Luxe y Roxy','bot':'Amigas desde el instituto'},
 {'a':'Según Rockstar','img':P('Real_Dimez_01')},
 {'a':'a base de rap','img':P('Real_Dimez_03')},
 {'a':'Su primer éxito','sello':'PRIMER ÉXITO','img':P('Real_Dimez_02')},
 {'a':'Cinco años','img':P('Vice_City_07')},
 {'a':'han fichado','img':P('DreQuan_Priest_04'),'cx':0.4,'top':'ONLY RAW RECORDS'},
 {'a':'Rockstar las resume','cita':'Vídeos virales. Estribillos virales.','quien':'Rockstar sobre Real Dimez'},
 mk('Las vas a escuchar','¿LAS ESCUCHARÁS?',['Sí','No'])],booms=['Real Dimez'],flami=['Su primer éxito'],claves=['Dimez:','redes','Downplay,','virales.'])
F['S19']=dict(planos=[{'img':AW+'Raul_Bautista_Raul_Bautista_portrait.jpg','top':'EL ATRACADOR'},
 {'a':'Raul Bautista:','ficha':'Raul Bautista','img':P('Raul_Bautista_04'),'sub':'Atracador de bancos','bot':'Siempre busca talento'},
 {'a':'Según Rockstar','img':P('Raul_Bautista_03')},
 {'a':'Pero su temeridad','clip':'trailer-14','top':'CADA GOLPE, MÁS RIESGO'},
 {'a':'y tarde o temprano','img':P('Raul_Bautista_02'),'cx':0.4},
 {'a':'Su frase oficial','cita':'La vida está llena de sorpresas, amigo. Sería sabio que todos lo recordáramos.','quien':'Raul Bautista'},
 {'a':'Jason y Lucía en la banda','sello':'HUELE A PROBLEMAS','acc':'#EC517D','g':5,'img':P('Jason_and_Lucia_15')},
 mk('Sígueme','SÍGUEME',['Boobie','Cal','Brian'],'conoce a todos')],booms=['Raul Bautista'],flami=['Su frase oficial'],claves=['atracos','temeridad','sorpresas,','problemas.'])
F['S20']=dict(planos=[{'img':P('Lucia_Caminos_14'),'top':'LA PISTA'},
 {'a':'Está en la biografía','ficha':'Lucía Caminos','img':P('Lucia_Caminos_13'),'cx':0.32,'sub':'Biografía oficial','bot':'Su madre y Liberty City'},
 {'a':'lo que más quiere','cita':'Lo que más quiere es la buena vida con la que su madre soñaba desde sus días en Liberty City','quien':'Biografía de Lucía'},
 {'a':'Liberty City. La ciudad','sello':'LIBERTY CITY','acc':'#EC517D','g':5,'img':P('Vice_City_27')},
 {'a':'O sea: la familia','img':P('Lucia_Caminos_02')},
 {'a':'Es la primera conexión','img':P('Jason_and_Lucia_20')},
 {'a':'Significa que veremos','sello':'¿CONFIRMADO? NO','acc':'#EC517D','g':5,'img':P('Lucia_Caminos_03')},
 {'a':'Pero la pista','img':P('Lucia_Caminos_Video_Clip'),'cx':0.55},
 mk('Tú qué crees','¿LA VEREMOS?',['Sí','No'])],booms=['Liberty City. La ciudad'],flami=['Pero la pista'],claves=['Liberty','madre','pista'])
F['S21']=dict(planos=[{'img':'vc/OceanDrive-GTAVC.jpg','top':'2002 VS 2026'},
 {'a':'El original salió','tpl':'gta-dato','topText':'GTA VICE CITY SALIÓ EN','value':2002,'unit':'','text':'29 de octubre','fijo':True},
 {'a':'ambientado','img':'vc/Screenshot__1__GTAVC.jpg','top':'AMBIENTADO EN 1986'},
 {'a':'Protagonista','img':'vc/Artwork-GTAVC-TommyVercetti.jpg','top':'TOMMY VERCETTI · RAY LIOTTA'},
 {'a':'Costó cinco','tpl':'gta-sinopsis','text':'VICE CITY 2002','items':['Presupuesto: 5 M$','Metacritic: 95','500.000 copias en 24 h'],'value':14},
 {'a':'Veinticuatro años después','img':P('Vice_City_15'),'top':'VICE CITY · 2026'},
 {'a':'dentro de un estado','img':AW+'Postcards_Vice_City_Vice_City_Postcard_portrait.jpg','top':'LEONIDA'},
 {'a':'y con dos protagonistas','img':AW+'Jason_and_Lucia_Rooftop_Jason_Lucia_Rooftop_portrait.jpg'},
 mk('Con cuál te quedas','¿2002 O 2026?',['2002','2026'])],booms=['Veinticuatro años después'],flami=['Veinticuatro años después'],claves=['Vercetti,','Liotta.','noventa','Leonida,'])
F['S22']=dict(planos=[{'clip':'trailer-28','cx':0.55,'top':'NO ES CASUALIDAD'},
 {'a':'El primero usó','tpl':'gta-sinopsis','text':'TRÁILER 1','items':['Love Is a Long Road','Tom Petty · 1989'],'value':14},
 {'a':'Su primera frase','clip':'trailer-09','cx':0.3},
 {'a':'justo cuando aparece','img':P('Lucia_Caminos_05'),'cx':0.4,'top':'LUCÍA, TRÁILER 1'},
 {'a':'El segundo tráiler','tpl':'gta-sinopsis','text':'TRÁILER 2','items':['Hot Together','The Pointer Sisters · 1986'],'value':14},
 {'a':'el mismo año','img':'vc/OceanBeach-GTAVC.jpg','top':'VICE CITY · 1986'},
 {'a':'Y Rockstar ya ha publicado','img':AW+'The_Album_Cover_Art_The_Album_Cover_Art_portrait.jpg','top':'BANDA SONORA OFICIAL'},
 {'a':'con su propio álbum','clip':'precarga-38'},
 mk('Cuál de las dos','¿CUÁL TE GUSTA?',['Tom Petty','Pointer Sisters'])],booms=['El segundo tráiler'],flami=['Y Rockstar ya ha publicado'],claves=['Petty,','pueblo','Sisters,','álbum.'])
for k,v in F.items():
    v.update(id=k,tipo='short',voz=f'voz-{k.lower()}.mp3',words=f'{SP}/words/{k}.json',fin=0.8)
    json.dump(v,open(f'{SP}/fichas/{k}.json','w'),ensure_ascii=False,indent=1)
print(list(F))
