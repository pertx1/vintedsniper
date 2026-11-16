import json
SP='/tmp/claude-0/-home-user-vintedsniper/f149cbb4-300b-549b-a6bb-754b879e5cbb/scratchpad'
AW='p2/Artwork_Wallpapers_'; UE='p2/Ultimate_Edition_Benefits_ULTIMATE_EDITION_'; VV='p2/Vintage_Vice_City_Pack_VINTAGE_VICE_CITY_'
def P(n): return f'p/{n}.jpg'
F={}
F['S10']=dict(planos=[
 {'clip':'portada','ss':8,'cx':0.5,'top':'¿LO COMPRAS EN TIENDA?'},
 {'a':'ojo','sello':'SIN DISCO','acc':'#EC517D','g':5,'img':AW+'Official_Cover_Art_Official_Cover_Art_portrait.jpg'},
 {'a':'La versión física','img':P('GTAVI_Pre_Load'),'cx':0.4,'top':'CÓDIGO EN LA CAJA'},
 {'a':'y estaba a la venta','tpl':'gta-dato','topText':'EN TIENDAS DESDE','value':12,'unit':' NOV','text':'para poder precargarlo','fijo':True},
 {'a':'O sea','clip':'precarga-34','cx':0.5},
 {'a':'La edición estándar','tpl':'gta-sinopsis','text':'EDICIONES','items':['Estándar · física y digital','Ultimate · solo digital'],'value':12},
 {'a':'Y si compras la física','img':UE+'01.jpg','top':'MEJORA A ULTIMATE'},
 {'a':'en cuanto canjees','clip':'precarga-40','ss':3},
 {'a':'Tú lo compras','tpl':'gta-marcador','topText':'te leo en comentarios','text':'¿CAJA O DIGITAL?','items':['Caja','Digital'],'value':25}],
 booms=['no trae disco'],flami=['O sea'],claves=['disco.','código','doce','digital.'])
F['S11']=dict(planos=[
 {'clip':'x-iguana','cx':0.6,'top':'5 ANIMALES OCULTOS'},
 {'a':'y casi nadie','img':AW+'Postcards_Grassrivers_Grassrivers_Postcard_portrait.jpg'},
 {'a':'Uno','sello':'1 · IGUANA','img':P('Leonida_Keys_02'),'cx':0.22},
 {'a':'y en el tráiler','clip':'x-iguana','cx':0.62},
 {'a':'Dos','sello':'2 · CAIMANES','img':P('Grassrivers_01'),'cx':0.3},
 {'a':'En los pantanos','img':P('Grassrivers_08'),'cx':0.55},
 {'a':'Tres','sello':'3 · SERPIENTE','img':P('Grassrivers_07'),'cx':0.22},
 {'a':'Cuatro','sello':'4 · TORTUGA','img':P('Leonida_Keys_04'),'cx':0.55},
 {'a':'peces león','img':P('Leonida_Keys_07'),'cx':0.85,'top':'PEZ LEÓN'},
 {'a':'Y cinco','sello':'5 · CIERVOS','img':P('Mount_Kalaga_National_Park_05'),'cx':0.62},
 {'a':'Ah, y un pitbull','img':P('Vice_City_19'),'cx':0.3,'top':'BONUS'},
 {'a':'Cuál quieres','tpl':'gta-marcador','topText':'te leo en comentarios','text':'¿CUÁL PRIMERO?','items':['Iguana','Caimán','Pez león'],'value':25}],
 booms=['Uno','Y cinco'],flami=['Ah, y un pitbull'],claves=['iguana.','caimanes.','serpiente','tortugas','ciervos','pitbull'])
F['S12']=dict(planos=[
 {'img':P('Vice_City_01'),'cx':0.45,'top':'4 GUIÑOS A VICE CITY'},
 {'a':'Uno','sello':'1 · LA CIUDAD','img':P('Vice_City_27')},
 {'a':'ya no es','img':'vc/OceanDrive-GTAVC.jpg','top':'VICE CITY · 1986'},
 {'a':'es la Vice City de hoy','img':P('Vice_City_15'),'top':'VICE CITY · 2026'},
 {'a':'Dos','sello':'2 · WASHINGTON BEACH','img':'vc/OceanBeach-GTAVC.jpg'},
 {'a':'Es un barrio','img':'vc/GTATrilogyDE-GTAVC-Screenshot2.jpg','top':'GTA VICE CITY (2002)'},
 {'a':'la descripción oficial','img':UE+'SQUALO_02.jpg','top':'SHITZU SQUALO'},
 {'a':'Tres','sello':'3 · MANSIÓN VERCETTI','img':UE+'HAWK_AND_LITTLE_MORGAN_REVOLVERS_02.jpg'},
 {'a':'Sí: la mansión','img':'vc/Artwork-GTAVC-TommyVercetti.jpg','top':'TOMMY VERCETTI'},
 {'a':'Y cuatro','sello':'4 · VINTAGE VICE CITY','img':VV+'PACK_01.jpg'},
 {'a':'con trajes pastel','img':VV+'PACK_EXCLUSIVE_LOOKS_01.jpg'},
 {'a':'Te acuerdas','tpl':'gta-marcador','topText':'te leo en comentarios','text':'¿TE ACUERDAS?','items':['Tommy','Lance','Ken'],'value':25}],
 booms=['Uno','Tommy Vercetti'],flami=['Sí: la mansión'],claves=['Vice','Washington','Vercetti.','ochenteros.'])
for k,v in F.items():
    v.update(id=k,tipo='short',voz=f'voz-{k.lower()}.mp3',words=f'{SP}/words/{k}.json',fin=0.8)
    json.dump(v,open(f'{SP}/fichas/{k}.json','w'),ensure_ascii=False,indent=1)
print(list(F))
