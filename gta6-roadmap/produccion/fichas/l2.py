import json
SP='/tmp/claude-0/-home-user-vintedsniper/f149cbb4-300b-549b-a6bb-754b879e5cbb/scratchpad'
AW='p2/Artwork_Wallpapers_'; U='p2/Ultimate_Edition_Benefits_ULTIMATE_EDITION_'
def P(n,top=None): d={'img':f'p/{n}.jpg'}; top and d.update(top=top); return d
def V(n,top=None): d={'img':f'vc/{n}.jpg'}; top and d.update(top=top); return d
def S(t,img,acc='#FFE02E',g=-6): return {'sello':t,'img':img,'acc':acc,'g':g}
def N(n,txt): return S(f'NIVEL {n} · {txt}','iceberg.jpg','#7FDBFF',-4)
def SIN(t,items): return {'tpl':'gta-sinopsis','text':t,'items':items,'value':14}
def CITA(t,q,d='web oficial de Rockstar'): return {'cita':t,'quien':q,'donde':d}
pl=[
 {'lista':[{'img':'iceberg.jpg','top':'EL ICEBERG DE GTA 6'},P('Jason_and_Lucia_14'),P('Vice_City_08'),{'clip':'trailer-22'}]},
 {'a':'Antes de empezar','tpl':'gta-sinopsis','text':'LA REGLA','items':['OFICIAL · lo dice Rockstar','PISTA · hay indicios','TEORÍA · especulación'],'value':16},
 {'a':'Tú decides','img':'iceberg.jpg','top':'VAMOS A BAJAR'},
 {'a':'Nivel uno',**N(1,'LA SUPERFICIE')},
 {'a':'Primera teoría','lista':[P('Jason_and_Lucia_20','TEORÍA 1'),{'img':AW+'Jason_and_Lucia_Robbery_Jason_and_Lucia_Robbery_landscape.jpg'}]},
 {'a':'En GTA cuatro',**SIN('FINALES DE ROCKSTAR',['GTA IV · alguien muere sí o sí','GTA V · elegir a quién matar'])},
 {'a':'Y en GTA seis',**CITA('Jason y Lucía acaban en el lado más oscuro del lugar más soleado de América','Rockstar')},
 {'a':'Muchos fans creen',**S('¿NO SALEN LOS DOS VIVOS?','p/Jason_and_Lucia_14.jpg','#EC517D',5)},
 {'a':'Segunda teoría','lista':[P('Lucia_Caminos_12','TEORÍA 2'),P('Jason_Duval_19')]},
 {'a':'Su salida. No',**S('¿SU PROPIO PLAN?','p/Lucia_Caminos_11.jpg','#EC517D',5)},
 {'a':'Tercera teoría',**P('Vice_City_27','TEORÍA 3 · ¿LIBERTY CITY?')},
 {'a':'Y esta tiene una pista',**CITA('Su madre soñaba con la buena vida desde sus días en Liberty City','Biografía de Lucía')},
 {'a':'Volveremos allí',**S('SIN CONFIRMAR','p/Lucia_Caminos_14.jpg')},
 {'a':'Nivel dos',**N(2,'HACE FRÍO')},
 {'a':'Cuarta teoría','lista':[P('Jason_Duval_17','TEORÍA 4 · ¿POLICÍA INFILTRADO?'),P('Jason_Duval_05')]},
 {'a':'No hay ninguna prueba',**S('TEORÍA','p/Jason_Duval_11.jpg','#EC517D',5)},
 {'a':'Quinta teoría',**V('TommyVercetti-Artwork','TEORÍA 5 · TOMMY VERCETTI')},
 {'a':'Y aquí hay algo oficial',**{'img':U+'HAWK_AND_LITTLE_MORGAN_REVOLVERS_01.jpg','top':'OFICIAL · REVÓLVERES VERCETTI'}},
 {'a':'Muchos fans creen que la mansión',**V('VercettiEstate-GTAVC-Exterior-Front','MANSIÓN VERCETTI · 2002')},
 {'a':'Lo de la mansión es oficial',**SIN('VEREDICTO',['Mansión Vercetti · OFICIAL','Familia Vercetti · TEORÍA'])},
 {'a':'Sexta teoría',**V('PhilCassidy-GTAVC-artwork','TEORÍA 6 · PHIL CASSIDY')},
 {'a':'En el segundo tráiler',**P('Grassrivers_07')},
 {'a':'No está confirmado',**S('SIN CONFIRMAR','p/Grassrivers_03.jpg')},
 {'a':'Nivel tres',**N(3,'CASI NADIE LLEGA')},
 {'a':'Séptima teoría',**{'img':AW+'Jason_and_Lucia_Rooftop_Jason_Lucia_Rooftop_landscape.jpg','top':'TEORÍA 7 · LOS TRES PÁJAROS'}},
 {'a':'Y hay dos lecturas',**SIN('DOS LECTURAS',['Jason + Lucía + un traidor','Michael + Franklin + Trevor'])},
 {'a':'Y aquí viene lo inquietante',**CITA('Hay demasiados pájaros volando en formación perfecta','Cal Hampton','frase oficial')},
 {'a':'Octava teoría',**P('Cal_Hampton_02','TEORÍA 8 · CAL SABE MÁS')},
 {'a':'y si todo lo que hay',**CITA('¿Y si todo lo que hay en internet fuera verdad?','Rockstar sobre Cal')},
 {'a':'Se pasa el día',**P('Cal_Hampton_04')},
 {'a':'La teoría dice que Cal',**P('Cal_Hampton_01')},
 {'a':'Lo de la conspiración es oficial',**SIN('VEREDICTO',['Conspiración en Leonida · OFICIAL','Cal como pieza clave · TEORÍA'])},
 {'a':'Nivel cuatro',**N(4,'EL FONDO SE VE')},
 {'a':'Novena teoría',**S('TEORÍA 9 · MANHUNT','p/Vice_City_21.jpg')},
 {'a':'Algunos fans creen haber visto',**P('Vice_City_20')},
 {'a':'Es de las teorías más débiles',**S('TEORÍA DÉBIL','p/Vice_City_06.jpg','#EC517D',5)},
 {'a':'Décima teoría',**SIN('TEORÍA 10',['GTA V · Michael acaba en el cine','GTA VI · ¿su película en el tráiler?'])},
 {'a':'Y los fans creen haber visto',**P('Vice_City_09')},
 {'a':'Si fuera verdad',**S('¿MISMO UNIVERSO?','p/Vice_City_15.jpg')},
 {'a':'Nivel cinco',**N(5,'EL FONDO')},
 {'a':'Undécima teoría',**S('TEORÍA 11 · ¿NIKO BELLIC?','p/Vice_City_27.jpg')},
 {'a':'Y como la familia',**P('Lucia_Caminos_02')},
 {'a':'No hay ni una sola pista',**S('CERO PISTAS','p/Vice_City_08.jpg','#EC517D',5)},
 {'a':'Duodécima teoría',**SIN('TEORÍA 12 · FINALES',['GTA V · 3 finales','GTA VI · ¿un final secreto?'])},
 {'a':'Muchos fans creen que GTA seis tendrá',**P('Jason_and_Lucia_16')},
 {'a':'Y la última',**S('LA MÁS LOCA','p/Lucia_Caminos_13.jpg','#EC517D',5)},
 {'a':'Como su familia viene',**P('Lucia_Caminos_Video_Clip')},
 {'a':'Y aquí termina','lista':[{'img':'iceberg.jpg','top':'FIN DEL DESCENSO'},P('Vice_City_15'),{'clip':'precarga-40'}]},
 {'a':'Así que dime','tpl':'gta-marcador','topText':'te leo en comentarios','text':'¿CUÁL ES VERDAD?','items':['Muere uno','Liberty City','Cal lo sabe todo'],'value':25},
 {'a':'Y si quieres saber',**{'img':AW+'Jason_and_Lucia_Beach_Jason_and_Lucia_Beach_landscape.jpg','top':'SUSCRÍBETE'}},
]
F=dict(id='L2',tipo='largo',voz='voz-l2.mp3',words=f'{SP}/words/L2.json',fin=1.5,planos=pl,
 booms=['Nivel uno','Nivel dos','Nivel tres','Nivel cuatro','Nivel cinco'],flami=['Nivel cinco'],
 claves=['iceberg','oficial,','Liberty','Vercetti.','pájaros','Manhunt','Niko','loca'])
json.dump(F,open(f'{SP}/fichas/L2.json','w'),ensure_ascii=False,indent=1); print(len(pl))
