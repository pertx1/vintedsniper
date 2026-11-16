import json
SP='/tmp/claude-0/-home-user-vintedsniper/f149cbb4-300b-549b-a6bb-754b879e5cbb/scratchpad'
AW='p2/Artwork_Wallpapers_'; UE='p2/Ultimate_Edition_Benefits_ULTIMATE_EDITION_'
def P(n): return f'p/{n}.jpg'
def mk(sig): return {'tpl':'gta-marcador','topText':sig[0],'text':sig[1],'items':sig[2],'value':25}
F={}
F['S4']=dict(planos=[
 {'clip':'trailer-09','cx':0.3,'top':'HOY SALE GTA 6'},
 {'a':'horas y horas','img':AW+'Jason_and_Lucia_Beach_Jason_and_Lucia_Beach_portrait.jpg'},
 {'a':'Él es Jason','ficha':'Jason Duval','img':P('Jason_Duval_02'),'sub':'Protagonista','bot':'Creció entre timadores'},
 {'a':'pasó por el ejército','img':P('Jason_Duval_17')},
 {'a':'acabó en los Cayos','clip':'trailer-02','ss':1.0,'cx':0.55,'top':'LOS CAYOS'},
 {'a':'trabajando para','img':P('Jason_Duval_Video_Clip')},
 {'a':'Solo quiere','clip':'trailer-12','cx':0.4},
 {'a':'pero todo','sello':'TODO SE COMPLICA','img':P('Jason_Duval_19')},
 {'a':'Ella es Lucía','ficha':'Lucía Caminos','img':P('Lucia_Caminos_13'),'cx':0.32,'sub':'Protagonista','bot':'Aprendió a pelear al andar','g':-1},
 {'a':'Luchar por su familia','img':P('Lucia_Caminos_01')},
 {'a':'la cárcel','img':P('Lucia_Caminos_05'),'top':'CÁRCEL DE LEONIDA'},
 {'a':'por pura suerte','clip':'trailer-26','cx':0.5},
 {'a':'Ahora solo quiere','img':P('Lucia_Caminos_12')},
 {'a':'Rockstar lo resume','clip':'trailer-28','cx':0.55},
 {'a':'para él','sello':'LO MEJOR O LO PEOR','img':P('Jason_and_Lucia_14')},
 {'a':'Para ella','sello':'SU SALIDA','acc':'#EC517D','g':5,'img':P('Jason_and_Lucia_17')},
 {'a':'Con quién','tpl':'gta-marcador','topText':'te leo en comentarios','text':'¿JASON O LUCÍA?','items':['Jason','Lucía'],'value':25}],
 booms=['Él es Jason','Ella es Lucía'],flami=['Rockstar lo resume'],claves=['Jason','Lucía','cárcel','suerte.','salida.'])
F['S5']=dict(planos=[
 {'clip':'precarga-40','ss':0.5,'top':'¿Y EN PC?'},
 {'a':'pero no en PC','sello':'PC: NO','acc':'#EC517D','clip':'trailer-21','ss':1.9,'cx':0.45},
 {'a':'Cuándo llegará','img':P('Vice_City_27')},
 {'a':'Rockstar no ha dicho','clip':'trailer-04'},
 {'a':'su historial','clip':'trailer-29'},
 {'a':'GTA cuatro','tpl':'gta-dato','topText':'GTA IV EN PC','value':8,'unit':' MESES','text':'después de consolas'},
 {'a':'GTA cinco','tpl':'gta-dato','topText':'GTA V EN PC','value':19,'unit':' MESES','text':'de espera'},
 {'a':'Red Dead','tpl':'gta-dato','topText':'RDR2 EN PC','value':13,'unit':' MESES','text':'de espera'},
 {'a':'Si se repite','clip':'trailer-02','ss':1.0},
 {'a':'la versión de PC','tpl':'gta-dato','topText':'PC ESTIMADO','value':2027,'unit':'-28','text':'no es oficial','fijo':True},
 {'a':'Ojo','sello':'ESTIMACIÓN','img':P('Vice_City_15')},
 {'a':'Lo único oficial','tpl':'gta-sinopsis','text':'HOY SALE EN','items':['PlayStation 5','Xbox Series X|S'],'value':10},
 {'a':'Si juegas en PC','tpl':'gta-marcador','topText':'el día que se anuncie','text':'SÍGUEME','items':['Fecha de PC','Requisitos','Novedades'],'value':25}],
 booms=['pero no en PC','dos mil veintisiete'],flami=['Ojo'],claves=['PC.','ocho','diecinueve','trece.','estimación,'])
F['S6']=dict(planos=[
 {'clip':'trailer-22','top':'RÉCORD MUNDIAL'},
 {'a':'ya había roto','sello':'ROMPIÓ INTERNET','clip':'trailer-06'},
 {'a':'El primer tráiler','img':P('Lucia_Caminos_05'),'top':'TRÁILER 1 · DIC 2023'},
 {'a':'noventa millones','tpl':'gta-dato','topText':'EN 24 HORAS','value':90,'unit':' M','text':'visitas en YouTube'},
 {'a':'Récord Guinness','sello':'RÉCORD GUINNESS','img':P('Jason_and_Lucia_20')},
 {'a':'por encima del récord','tpl':'gta-barras','topText':'visitas en 24 h','text':'YOUTUBE','unit':'M','items':[{'t':'MrBeast','v':59.4,'en':0.3},{'t':'GTA 6','v':90,'en':1.0}]},
 {'a':'Y el segundo tráiler','clip':'trailer-18','top':'TRÁILER 2 · MAYO 2025'},
 {'a':'cuatrocientos setenta','tpl':'gta-dato','topText':'EN SU PRIMER DÍA','value':475,'unit':' M','text':'en todas las plataformas'},
 {'a':'El mayor lanzamiento','sello':'RÉCORD ABSOLUTO','clip':'precarga-38'},
 {'a':'Y ahora','clip':'precarga-34','top':'YA DISPONIBLE'},
 {'a':'Sígueme','tpl':'gta-marcador','topText':'cada día, un secreto nuevo','text':'SÍGUEME','items':['Secretos','Trucos','Easter eggs'],'value':25}],
 booms=['noventa millones','cuatrocientos setenta'],flami=['Récord Guinness'],claves=['noventa','Guinness','MrBeast,','cuatrocientos','historia.'])
F['S7']=dict(planos=[
 {'img':AW+'Cal_Hampton_Cal_Hampton_portrait.jpg','top':'EL MÁS RARO'},
 {'a':'Cal Hampton','ficha':'Cal Hampton','img':P('Cal_Hampton_01'),'sub':'Amigo de Jason','bot':'Conspiranoico profesional'},
 {'a':'Rockstar lo presenta','img':P('Cal_Hampton_02')},
 {'a':'y si todo','cita':'¿Y si todo lo que hay en internet fuera verdad?','quien':'Cal Hampton'},
 {'a':'Se siente más seguro','img':AW+'Cal_Hampton_Cal_Hampton_landscape.jpg'},
 {'a':'espiando','sello':'MODO ESPÍA','img':P('Cal_Hampton_04')},
 {'a':'pestañas privadas','clip':'trailer-24'},
 {'a':'Sus frases','sello':'FRASES OFICIALES','img':AW+'Cal_Hampton_Cal_Hampton_square.jpg'},
 {'a':'hay demasiados','cita':'Hay demasiados pájaros volando en formación perfecta','quien':'Cal Hampton'},
 {'a':'los psicópatas','cita':'Los psicópatas mandan. Acostúmbrate.','quien':'Cal Hampton'},
 {'a':'Según Rockstar','img':P('Cal_Hampton_03'),'top':'MAREA BAJA'},
 {'a':'Lo quieres','tpl':'gta-marcador','topText':'¿lo quieres en tu banda?','text':'SÍGUEME','items':['Cal','Brian','Boobie'],'value':25}],
 booms=['Cal Hampton','hay demasiados'],flami=['hay demasiados'],claves=['raro','internet','psicópatas','feliz'])
F['S8']=dict(planos=[
 {'img':AW+'Brian_Heder_Brian_Heder_portrait.jpg','top':'EL CASERO DE JASON'},
 {'a':'Brian Heder','ficha':'Brian Heder','img':P('Brian_Heder_01'),'sub':'Traficante de los Cayos','bot':'De la vieja escuela'},
 {'a':'Sigue moviendo','clip':'trailer-02','ss':2.6,'top':"BRIAN'S MARINA"},
 {'a':'tercera esposa','img':P('Brian_Heder_04'),'top':'CON LORI'},
 {'a':'transporté','cita':'Transporté tanta hierba en ese avión que podría hacer levitar el estado de Leonida','quien':'Brian Heder'},
 {'a':'Rockstar dice','img':P('Brian_Heder_02')},
 {'a':'tiburón blanco','sello':'TIBURÓN BLANCO','acc':'#EC517D','g':5,'img':P('Brian_Heder_03')},
 {'a':'Y el trato','img':P('Jason_Duval_14'),'top':'EL TRATO'},
 {'a':'a cambio','sello':'EXTORSIONES','img':P('Leonida_Keys_03')},
 {'a':'y de pasarse','sello':'SANGRÍA DE LORI','acc':'#EC517D','g':5,'img':AW+'Brian_Heder_Brian_Heder_landscape.jpg'},
 {'a':'Sígueme','tpl':'gta-marcador','topText':'conoce a todos','text':'SÍGUEME','items':['Cal','Boobie','Raul'],'value':25}],
 booms=['Brian Heder','sangría'],flami=['tiburón'],claves=['gratis,','hierba','levitar','tiburón','sangría'])
F['S9']=dict(planos=[
 {'img':UE+'01.jpg','top':'ULTIMATE EDITION'},
 {'a':'Esto es lo que trae','img':UE+'02.jpg'},
 {'a':'Grotti Cheetah','img':UE+'GROTTI_CHEETAH_01.jpg','top':"'95 GROTTI CHEETAH"},
 {'a':'lancha Squalo','img':UE+'SQUALO_01.jpg','top':'SHITZU SQUALO'},
 {'a':'buggy','img':UE+'VAPID_BUGGY_01.jpg','top':'DOMINATOR BUGGY'},
 {'a':'revólveres','img':UE+'HAWK_AND_LITTLE_MORGAN_REVOLVERS_01.jpg','top':'REVÓLVERES VERCETTI'},
 {'a':'cinco negocios','sello':'SOLO ULTIMATE','img':P('Vice_City_22')},
 {'a':'Rideout','img':UE+'RIDEOUT_CUSTOMS_01.jpg','top':'RIDEOUT CUSTOMS'},
 {'a':'el salón de Sara','img':UE+'SARAS_SALON_01.jpg','top':"SARA'S SALON"},
 {'a':'la tienda Stock','img':UE+'STOCK_305_01.jpg','top':'STOCK 305'},
 {'a':'el estudio de tatuajes','img':UE+'ELECTRIC_FANG_01.jpg','top':'ELECTRIC FANG'},
 {'a':'el taller todoterreno','img':UE+'ONE_EYED_WILLIE_01.jpg','top':"ONE-EYED WILLIE'S"},
 {'a':'La diferencia','tpl':'gta-dato','topText':'DIFERENCIA DE PRECIO','value':20,'unit':' $','text':'79,99 $ → 99,99 $'},
 {'a':'si tienes la estándar','sello':'SE PUEDE MEJORAR','img':UE+'02.jpg'},
 {'a':'Te compensa','tpl':'gta-marcador','topText':'te leo en comentarios','text':'¿TE COMPENSA?','items':['Sí','No','Ya la tengo'],'value':25}],
 booms=['cinco negocios'],flami=['cinco negocios'],claves=['Cheetah','Squalo','buggy','cincuenta','veinte'])
for k,v in F.items():
    v.update(id=k,tipo='short',voz=f'voz-{k.lower()}.mp3',words=f'{SP}/words/{k}.json',fin=0.8)
    json.dump(v,open(f'{SP}/fichas/{k}.json','w'),ensure_ascii=False,indent=1)
print(list(F))
