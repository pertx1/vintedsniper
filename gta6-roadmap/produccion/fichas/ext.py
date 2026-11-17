import json
SP='/tmp/claude-0/-home-user-vintedsniper/f149cbb4-300b-549b-a6bb-754b879e5cbb/scratchpad'
AW='p2/Artwork_Wallpapers_'; U='p2/Ultimate_Edition_Benefits_ULTIMATE_EDITION_'
def P(n,top=None): d={'img':f'p/{n}.jpg'}; top and d.update(top=top); return d
def V(n,top=None): d={'img':f'vc/{n}.jpg'}; top and d.update(top=top); return d
def C(n,top=None,**k): d={'clip':n,**k}; top and d.update(top=top); return d
def S(t,img,acc='#FFE02E',g=-6): return {'sello':t,'img':img,'acc':acc,'g':g}
def SIN(t,items,v=14): return {'tpl':'gta-sinopsis','text':t,'items':items,'value':v}
def CITA(t,q,d='web oficial de Rockstar'): return {'cita':t,'quien':q,'donde':d}
def DATO(top,val,unit,txt): return {'tpl':'gta-dato','topText':top,'value':val,'unit':unit,'text':txt,'fijo':True}
PC=lambda z: f'{AW}Postcards_{z}_{z}_Postcard_landscape.jpg'
F={}
F['L0X']=dict(planos=[
 {'lista':[C('trailer-14','LEONIDA POR DENTRO'),P('Vice_City_09')]},
 {'a':'Según Rockstar, en una','lista':[P('Hero_BG','EL MAPA MÁS GRANDE DE ROCKSTAR'),P('Vice_City_21')]},
 {'a':'más o menos el doble',**DATO('TAMAÑO DEL MAPA',2,'x','el de GTA V (según Rockstar, Game Informer)')},
 {'a':'Y para crearlo','lista':[P('Vice_City_14','VIAJES A MIAMI · 2015'),P('Vice_City_24'),P('Leonida_Keys_04')]},
 {'a':'Vamos zona a zona','img':'GTAVI_Official_Cover_Art_Landscape.jpg' if False else 'p/GTAVI_Official_Cover_Art_Landscape.jpg','top':'ZONA A ZONA'},
 {'a':'Los Cayos: la','lista':[{'img':PC('Leonida_Keys'),'top':'LEONIDA KEYS'},P('Leonida_Keys_01')]},
 {'a':'Pero Rockstar avisa',**CITA('Algunas de las aguas más bonitas y más peligrosas de toda América','Rockstar sobre los Cayos')},
 {'a':'Grassrivers: la joya','lista':[{'img':PC('Grassrivers'),'top':'GRASSRIVERS'},P('Grassrivers_02')]},
 {'a':'pero entre los manglares',**S('DEPREDADORES MÁS LETALES','p/Grassrivers_08.jpg','#EC517D',5)},
 {'a':'Y hay hasta una agencia',**P('Grassrivers_04','POACH · AGENCIA DE FAUNA')},
 {'a':'Port Gellhorn es mi','lista':[{'img':PC('Port_Gellhorn'),'top':'PORT GELLHORN'},P('Port_Gellhorn_02')]},
 {'a':'moteles baratos','lista':[P('Port_Gellhorn_03'),P('Port_Gellhorn_05')]},
 {'a':'Y según la web',**SIN('LA ECONOMÍA DE PORT GELLHORN',['Cerveza barata','Analgésicos','Bebidas energéticas de gasolinera'])},
 {'a':'Ambrosia vive de','lista':[{'img':PC('Ambrosia'),'top':'AMBROSIA'},P('Ambrosia_02','ALLIED CRYSTAL')]},
 {'a':'y una banda de moteros',**P('Ambrosia_04','LA BANDA DE MOTEROS')},
 {'a':'Y en los bosques','lista':[{'img':PC('Mount_Kalaga_National_Park'),'top':'MOUNT KALAGA'},P('Mount_Kalaga_National_Park_02')]},
 {'a':'Allí podrás cazar','lista':[P('Mount_Kalaga_National_Park_04'),P('Mount_Kalaga_National_Park_05')]},
 {'a':'En las capturas oficiales',**S('UN PUMA ACECHANDO','p/Mount_Kalaga_National_Park_06.jpg','#EC517D',5)},
 {'a':'Vale, ¿y cómo','lista':[C('trailer-25','¿CÓMO SE VA A JUGAR?'),P('Jason_and_Lucia_16')]},
 {'a':'Uno: el nivel',**DATO('NIVEL DE BÚSQUEDA',6,' ★','hasta seis estrellas')},
 {'a':'Dos: la policía','lista':[P('Jason_and_Lucia_18','LA POLICÍA TE RECONOCE'),P('Lucia_Caminos_04')]},
 {'a':'Así que cambiar',**S('CAMBIA DE ROPA Y DE COCHE','p/Jason_and_Lucia_19.jpg')},
 {'a':'Tres: según Rob','lista':[P('Jason_and_Lucia_15','ATRACOS ESPONTÁNEOS'),C('trailer-19')]},
 {'a':'Cuatro: los pisos',**P('Jason_Duval_13','PISOS FRANCOS COMO EN RDR2')},
 {'a':'Y cinco: en','lista':[P('Vice_City_16','ACTIVIDADES'),P('Leonida_Keys_05'),P('Vice_City_19')]},
 {'a':'y sí, se puede acariciar',**S('SE PUEDE ACARICIAR A LOS PERROS','p/Jason_Duval_12.jpg','#EC517D',5)},
 {'a':'¿Y la parte técnica?',**DATO('RENDIMIENTO EN CONSOLAS',30,' FPS','más densidad y más detalle')},
 {'a':'En PS5 Pro',**{'img':'ds/ds5.jpg','top':'PS5 PRO · PSSR + TRAZADO DE RAYOS'}},
 {'a':'Y la descarga ocupa',**DATO('DESCARGA',212,' GB','según el dispositivo')},
 {'a':'Y un último detalle','lista':[C('trailer-07','PARODIAS DE FLORIDA'),C('trailer-10')]},
 {'a':'Un caimán sacado',**SIN('NOTICIAS REALES EN EL TRÁILER',['Caimán en una piscina','Hombre desnudo huyendo','El Joker de Florida'])},
 {'a':'Todo eso pasó','lista':[P('Vice_City_22'),P('Vice_City_25')]},
 {'a':'En el juego, el famoso',**S('FLORIDA MAN = LEONIDA MAN','p/Vice_City_26.jpg')},
],booms=['Vamos zona a zona','Vale, ¿y cómo'],flami=['Port Gellhorn es mi'],claves=['doble','paraíso.','letales.','olvidada','seis','treinta','Leonida Man.'])

F['L1X']=dict(planos=[
 {'lista':[P('GTAVI_Official_Cover_Art_Landscape','LA EDICIÓN DE LA QUE NADIE HABLA'),P('Vice_City_09')]},
 {'a':'Se llama Goodtime',**DATO("COLLECTOR'S BOX",399,' $','Goodtime State · Vice City Collection')},
 {'a':'Y atento, porque',**S('NO INCLUYE EL JUEGO','p/Vice_City_13.jpg','#EC517D',5)},
 {'a':'Es una caja',**{'img':U+'GOODTIME_GEAR_01.jpg','top':'MACCA EL CAIMÁN'}},
 {'a':'Trae una figura',**SIN("QUÉ TRAE",['Figura de Macca + compartimento secreto','Vaso de Chunkee el Manatí','Gafas Oakley · gorra New Era','Llavero · espejo · póster del mapa'],12)},
 {'a':'¿Lo comprarías?','img':'p/Vice_City_25.jpg','top':'¿LO COMPRARÍAS?'},
 {'a':'Y como la edición','lista':[{'img':'ds/ds2.jpg','top':'PS5 vs XBOX'},{'img':'ds/ds6.jpg'}]},
 {'a':'En PS5, según',**SIN('DUALSENSE EN GTA 6',['Háptica','Gatillos adaptativos','Altavoz del mando'])},
 {'a':'Rob Nelson, de',**CITA('Las vibraciones de los minijuegos y de los vehículos están todas ajustadas.','Rob Nelson','entrevista en Famitsu')},
 {'a':'y que al conducir',**{'img':'ds/ds1.jpg','top':'EL GATILLO = ACELERADOR'}},
 {'a':'En PS5 Pro',**{'img':'ds/ds5.jpg','top':'PS5 PRO · MÁS NITIDEZ'}},
 {'a':'¿Y en Xbox?','lista':[P('Vice_City_20','¿Y EN XBOX?'),P('Vice_City_18')]},
 {'a':'Eso sí: en todas',**DATO('TODAS LAS CONSOLAS',30,' FPS','más densidad y más detalle')},
 {'a':'Otra cosa: el espacio',**DATO('DESCARGA',212,' GB','según el dispositivo')},
 {'a':'Y recuerda que',**S('LA FÍSICA NO TRAE DISCO','p/GTAVI_Pre_Load.jpg')},
 {'a':'Y un detalle de',**SIN('CLASIFICACIÓN OFICIAL',['Sangre · violencia intensa','Desnudos · drogas y alcohol','Compras dentro del juego'])},
 {'a':'Eso no significa',**S('SOLO UN JUGADOR','p/Jason_and_Lucia_17.jpg')},
 {'a':'Y una más','lista':[P('Vice_City_15','¿Y EL ONLINE?'),P('Vice_City_23')]},
 {'a':'Strauss Zelnick',**CITA('No se ha anunciado ningún online; sería prematuro hablar de su modelo de negocio.','Strauss Zelnick','Take-Two, septiembre de 2026')},
 {'a':'Así que lo que',**S('EXPERIENCIA PARA UN JUGADOR',f'{AW}Jason_and_Lucia_01_Jason_and_Lucia_01_landscape.jpg')},
 {'a':'Si algún día',**P('Jason_and_Lucia_20')},
],booms=['Y como la edición'],flami=['¿Lo comprarías?'],claves=['juego.','diferencias.','treinta','doscientos','online'])

F['L0bX']=dict(planos=[
 {'lista':[P('Vice_City_01','LA VICE CITY DE 2026'),P('Vice_City_05')]},
 {'a':'La web oficial la',**S('TODO EN EXCESO','p/Vice_City_03.jpg')},
 {'a':'Y dice que',**CITA('Vice City sigue siendo la capital del sol y la diversión de América','Rockstar')},
 {'a':'Los barrios. Ocean','lista':[P('Vice_City_08','OCEAN BEACH'),V('OceanBeach-GTAVC','OCEAN BEACH · 2002')]},
 {'a':'Little Cuba','lista':[P('Vice_City_13','LITTLE CUBA'),P('Vice_City_17','TISHA-WOCKA')]},
 {'a':'Y el puerto','lista':[P('Vice_City_24','VC PORT'),P('Vice_City_19')]},
 {'a':'En los tráileres aparecen','lista':[C('trailer-17','LA PERLE'),C('x-tren')]},
 {'a':'y Stockyard','lista':[C('trailer-11','STOCKYARD'),P('Vice_City_22')]},
 {'a':'Y si conoces Miami',**P('Vice_City_02','¿TE SUENA?')},
 {'a':'Las cabinas de peaje',**SIN('MIAMI EN GTA 6',['Peajes = Venetian Islands','Avenida = Ocean Drive','Piscina = Fontainebleau'])},
 {'a':'Hay una avenida','lista':[P('Vice_City_06'),P('Vice_City_27')]},
 {'a':'Y una escena de lanchas','lista':[C('trailer-04','GUIÑO A MIAMI VICE (2006)'),P('Vice_City_09')]},
 {'a':'Y hay más nombres',**SIN('NOMBRES QUE SUENAN A 2002',['Washington Beach','Shore Drive','Gambit Bay','Southside'],12)},
 {'a':'La ciudad tiene metro','lista':[P('Vice_City_14','METRO'),P('Vice_City_09','AEROPUERTO')]},
 {'a':'Tiene dos policías',**P('Vice_City_20','VCPD + VICE BEACH PD')},
 {'a':'Y de noche','lista':[C('x-avioneta','NINE1NINE'),P('Jason_and_Lucia_16')]},
 {'a':'Lo curioso es que','lista':[V('GTA_Vice_City_Box_Art','¿VOLVER A VICE CITY?'),P('Vice_City_18')]},
 {'a':'En dos mil doce',**CITA('Volver a Vice City en otra época se sentiría raro.','Leslie Benzies, 2012','entrevista en Digital Trends')},
 {'a':'Según Bloomberg',**SIN('PROJECT AMERICAS',['Nombre en clave del proyecto','Norteamérica + Sudamérica','Se redujo a Miami'])},
 {'a':'Y para documentarse','lista':[P('Vice_City_04','VIAJES A MIAMI · 2015'),P('Vice_City_10' if False else 'Vice_City_21')]},
 {'a':'Y Vice City ya','lista':[P('Vice_City_07','VICE CITY EN LA VIDA REAL'),P('Vice_City_15')]},
 {'a':'En Miami, Rockstar',**SIN('MIAMI SE VUELVE VICE CITY',['Cartel en el pabellón de los Heat','Burger Shot y Cluckin\' Bell reales','Dirigible y murales en Wynwood'],12)},
 {'a':'Veinticuatro años después','lista':[V('TommyVercetti-Artwork'),{'img':f'{AW}Jason_and_Lucia_Beach_Jason_and_Lucia_Beach_landscape.jpg','top':'2002 → 2026'}]},
],booms=['Los barrios. Ocean','Lo curioso es que'],flami=['Y si conoces Miami'],claves=['exceso.','Miami','Benzies,','Americas,','Heat,'])

F['L2X']=dict(planos=[
 {'lista':[{'img':'iceberg.jpg','top':'¿ESO ERA TODO?'},P('Vice_City_26')]},
 {'a':'Hay un nivel más',**S('HAY UN NIVEL MÁS','iceberg.jpg','#EC517D',5)},
 {'a':'Nivel seis',**S('NIVEL 6 · EL ABISMO','iceberg.jpg','#7FDBFF',-4)},
 {'a':'Primera pista','lista':[{'img':PC('Vice_City'),'top':'PISTA 1 · LEONIDA'},P('Vice_City_10' if False else 'Leonida_Keys_02')]},
 {'a':'Y fíjate en esto',**S('¿ANDRÉS DE LEÓN?','p/Vice_City_16.jpg','#EC517D',5)},
 {'a':'Segunda: Duval','lista':[P('Jason_Duval_15','PISTA 2 · DUVAL'),P('Leonida_Keys_03')]},
 {'a':'Y Jason vive',**S('TEORÍA','p/Jason_Duval_18.jpg','#EC517D',5)},
 {'a':'Tercera: Grassrivers','lista':[{'img':PC('Grassrivers'),'top':'PISTA 3 · GRASSRIVERS'},P('Grassrivers_01')]},
 {'a':'Río de hierba',**S('RIVER OF GRASS → GRASSRIVERS','p/Grassrivers_03.jpg')},
 {'a':'Cuarta: Port','lista':[{'img':PC('Port_Gellhorn'),'top':'PISTA 4 · PORT GELLHORN'},P('Port_Gellhorn_04')]},
 {'a':'Y la ciudad real',**S('PANAMA CITY, FLORIDA','p/Port_Gellhorn_07.jpg')},
 {'a':'Quinta: Real','lista':[P('Real_Dimez_01','PISTA 5 · REAL DIMEZ'),{'img':f'{AW}Real_Dimez_Real_Dimez_landscape.jpg'}]},
 {'a':'Sexta: Gloriana','lista':[P('Mount_Kalaga_National_Park_01','PISTA 6 · GLORIANA'),P('Mount_Kalaga_National_Park_03')]},
 {'a':'Séptima: Bonnie','lista':[{'img':f'{AW}Jason_and_Lucia_Robbery_Jason_and_Lucia_Robbery_landscape.jpg','top':'PISTA 7 · ¿BONNIE Y CLYDE?'},P('Jason_and_Lucia_15')]},
 {'a':'Pero una pareja',**S('LA COMUNIDAD LO TIENE CLARO','p/Jason_and_Lucia_19.jpg')},
 {'a':'Octava: saldremos','lista':[P('Hero_BG','PISTA 8 · ¿FUERA DE LEONIDA?'),P('Vice_City_21')]},
 {'a':'Según Bloomberg',**SIN('PROJECT AMERICAS',['Norteamérica + Sudamérica','Se redujo a Miami','¿Ampliaciones? · deseo'])},
 {'a':'Novena: Megamundo','lista':[P('Vice_City_12' if False else 'Vice_City_04','PISTA 9 · MEGAMUNDO'),P('Vice_City_23')]},
 {'a':'Y la descripción oficial',**CITA('Una conspiración criminal que se extiende por todo el estado de Leonida','descripción oficial')},
 {'a':'Décima: el ascensor','lista':[P('Lucia_Caminos_13','PISTA 10 · EL ASCENSOR'),P('Lucia_Caminos_02')]},
 {'a':'Otros piensan',**S('LO SABREMOS JUGANDO','p/Lucia_Caminos_06.jpg')},
 {'a':'Undécima: el pasado','lista':[P('Jason_Duval_16','PISTA 11 · EL EJÉRCITO'),P('Jason_Duval_03')]},
 {'a':'Y la duodécima','lista':[P('Lucia_Caminos_01','PISTA 12 · KATIE'),P('Lucia_Caminos_03')]},
 {'a':'No hay ninguna prueba',**S('EL FONDO DEL ABISMO','iceberg.jpg','#7FDBFF',-4)},
],booms=['Nivel seis'],flami=['Nivel seis'],claves=['abismo.','León.','Duval','Grassrivers.','Panamá.','Gloriana.','Clyde.','Megamundo.','ascensor.'])

for k,v in F.items():
    v.update(id=k,tipo='largo',voz=f'voz-{k.lower()}.mp3',words=f'{SP}/words/{k}.json',fin=0.3)
    json.dump(v,open(f'{SP}/fichas/{k}.json','w'),ensure_ascii=False,indent=1)
print(list(F))
