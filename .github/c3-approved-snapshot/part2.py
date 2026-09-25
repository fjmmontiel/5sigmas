def reconcile(g):
 a,b,c=g.p;g.heading('La identidad permite reconocer el mismo efecto','Identity lets us recognize the same side effect')
 g.label('CONSULTA','QUERY',0,55,col=MUTED,alpha=min(1,a*3),size=27)
 g.text('status(R-104)',20,112,size=56,alpha=min(1,a*3))
 g.label('BACKEND · REGISTRO EXISTENTE','BACKEND · EXISTING RECORD',0,245,col=MUTED,alpha=min(1,a*3),size=27)
 g.rect(0,305,1000,155,fill=WHITE,stroke=RULE,lw=2,alpha=min(1,a*3))
 g.arrow([(410,175),(885,175),(885,299)],a)
 path=[(410,175),(885,175),(885,299)];x,y=path_point(path,a)
 if 0<a<1:g.circle(x,y,12,fill=ACCENT)
 g.rect(0,305,1000,155,fill=SUCCESS_WASH,stroke=SUCCESS,lw=2,alpha=b)
 g.text('R-104',35,350,size=46,col=blend(INK,SUCCESS,b),alpha=min(1,a*3))
 g.label('CONFIRMADO','COMMITTED',620,358,align='center',size=39,col=SUCCESS,alpha=b)
 g.tick(946,381,alpha=b)
 g.arrow([(480,475),(480,528)],c,col=RED);g.cross(480,542,alpha=c)
 g.label('NO repetir el write','Do NOT repeat the write',500,602,align='center',size=42,col=RED,alpha=c)

def validpaths(g):
 if g.v:
  a,b,c=g.p;g.heading('Rutas distintas, mismas invariantes','Different routes, same invariants')
  chains=[[('Consultar','Query'),('Confirmado','Committed'),('Terminar','Finish')],[('Retry','Retry'),('Misma clave','Same key'),('Terminar','Finish')]]
  for k,chain in enumerate(chains):
   x=30+k*530;pp=a if k==0 else b
   for j,z in enumerate(chain):
    yy=80+j*167;g.box(x,yy,435,105,*z,'active' if j==2 else 'normal',pp,size=41)
    if j<2:g.arrow([(x+217,yy+105),(x+217,yy+155)],pp)
  g.label('Retry sólo con contrato de idempotencia','Retry only under an idempotency contract',500,572,align='center',width=960,size=30,col=MUTED,alpha=b)
  g.label('Un único efecto · estado final correcto','One side effect · correct final state',500,658,align='center',width=970,size=33,col=ACCENT,alpha=c)
  return
 a,b,c=g.p;g.heading('Rutas diferentes, mismas invariantes','Different routes, same invariants')
 for i,vals in enumerate([[('Consultar','Query'),('Confirmado','Committed'),('Terminar','Finish')],[('Reintento','Retry'),('Misma clave','Same key'),('Terminar','Finish')]]):
  y=130+i*265;pp=a if i==0 else b
  for j,(es,en) in enumerate(vals):
   x=25+j*340;g.box(x,y,275,112,es,en,'active' if j==2 else 'normal',pp,size=34)
   if j<2:g.arrow([(x+275,y+56),(x+325,y+56)],pp)
  if i==1:g.label('Sólo con idempotencia garantizada por la tool','Only when the tool guarantees idempotency',500,y+145,align='center',col=MUTED,alpha=b,width=980,size=28)
 g.badge('Estado final correcto · sin duplicados','Correct final state · no duplicates',600,'pass',c)

def trajectorygate(g):
 a,b,c=g.p;g.heading('Condiciones no compensatorias','Non-compensating conditions')
 for i,(es,en,ok) in enumerate([('Tarea resuelta','Task solved',True),('Acción autorizada','Action authorized',False),('Estado íntegro','State intact',True)]):
  y=70+i*150;pp=a if i==0 else b
  g.rect(45,y,910,112,fill=TINT if ok else ROSE,stroke=ACCENT if ok else RED,lw=2,alpha=pp)
  g.label(es,en,88,y+37,size=40,alpha=pp,col=ACCENT if ok else RED)
  if ok:g.tick(888,y+55,alpha=pp)
  else:g.cross(888,y+55,alpha=pp)
 g.badge('FAIL · falta autorización','FAIL · authorization missing',565,'fail',c)

def questions(g):
 a,b,c=g.p;g.heading('Elegir por la pregunta','Choose by the question')
 rows=[('SHADOW','SHADOW','¿Cómo se comporta?','How does it behave?',a),('CANARY','CANARY','¿Es seguro ampliar?','Is expansion safe?',b),('A/B','A/B','¿Cuál es el efecto?','What is the effect?',c)]
 for i,(es,en,ee,nn,pp) in enumerate(rows):
  y=75+i*187;g.box(20,y,320,115,es,en,'active',pp,size=40)
  g.label(ee,nn,415,y+22,size=39,width=550,alpha=pp)
  g.line(380,y+130,965,y+130,col=RULE,alpha=pp)

def shadow(g):
 a,b,c=g.p;g.heading('Observar sí; actuar sobre producción, no','Observe, but do not modify production')
 vis=min(1,a*4)
 g.box(285,42,430,86,'Request real','Real request','normal',vis,size=37)
 g.box(35,207,370,102,'Estable','Stable','active',vis,size=42)
 g.box(535,207,410,102,'Candidata','Candidate','normal',vis,size=42)
 g.box(35,424,370,100,'Usuario','User','active',vis,size=42)
 for path,col in [([(390,128),(235,194)],ACCENT), ([(610,128),(730,194)],MUTED)]:
  p=ease(a/.47);g.arrow(path,p,col=col)
  if 0<p<1:x,y=path_point(path,p);g.circle(x,y,11,fill=col)
 p=ease((a-.52)/.48);g.arrow([(220,309),(220,408)],p)
 if 0<p<1:g.circle(220,309+99*p,11,fill=ACCENT)
 g.box(690,424,285,100,'Logs','Logs','active',b,size=39)
 g.box(420,453,230,90,'Write','Write','normal',b,size=37)
 allowed=[(740,309),(740,360),(820,360),(820,408)]
 blocked=[(740,309),(740,360),(545,360),(545,401)]
 for path,col in [(allowed,ACCENT),(blocked,RED)]:
  g.arrow(path,b,col=col)
  if 0<b<1:x,y=path_point(path,b);g.circle(x,y,10,fill=col)
 g.cross(545,412,alpha=ease((b-.75)/.25),col=RED)
 g.label('BLOQUEADO','BLOCKED',535,560,align='center',col=RED,alpha=ease((b-.75)/.25),size=27)
 g.label('Shadow no mide directamente el efecto en el usuario','Shadow does not directly measure the user effect',500,640,align='center',width=980,size=29,col=MUTED,alpha=c)

def canary(g):
 a,b,c=g.p;g.heading('Exposición ilustrativa, no recomendación','Illustrative exposure, not a recommendation')
 for row in range(4):
  for col in range(5):
   x=280+col*112;y=95+row*104;idx=row*5+col;active=idx==0
   g.circle(x,y,27,fill=ACCENT if active else RULE,alpha=a)
 g.text('1 / 20 = 5%',500,470,align='center',size=58,bold=True,col=ACCENT,alpha=a)
 g.badge('Violación dura: ABORTAR','Hard violation: ABORT',552,'fail',b)
 g.label('Sin datos suficientes: PAUSA','Insufficient data: PAUSE',500,654,align='center',col=GOLD,size=32,alpha=c)

def ab(g):
 a,b,c=g.p;g.heading('Asignación estable por usuario: ejemplo','Stable user assignment: example')
 for i in range(4):
  x=80+i*255;group=i%2;col=ACCENT if group==0 else INK
  g.circle(x+35,95,24,fill=TINT if group==0 else WHITE,stroke=col,alpha=a)
  g.text('U'+str(i+1),x+35,135,align='center',size=29,alpha=a)
  for j in range(3):
   y=245+j*106;progress=ease((b-j*.22)/.5)
   g.line(x+35,y-63,x+35,y-10,col=RULE,alpha=a)
   if 0<progress<1:g.circle(x+35,y-63+53*progress,9,fill=col)
   g.box(x-15,y,100,70,'A' if group==0 else 'B','A' if group==0 else 'B','active' if group==0 else 'normal',progress,size=37)
 g.label('Turnos del mismo usuario, misma variante','Same user’s turns, same variant',500,598,align='center',width=980,size=33,col=ACCENT,alpha=c)

def health(g):
 a,b,c=g.p;g.heading('Distribución de asignación: ejemplo','Assignment distribution: example')
 g.label('Diseño esperado','Expected design',0,63,size=33,alpha=a)
 g.rect(0,125,1000,88,fill=RULE,alpha=a)
 g.rect(0,125,500,88,fill=ACCENT,alpha=a)
 g.text('A · 50%',250,147,size=38,align='center',col=WHITE,alpha=a)
 g.text('B · 50%',750,147,size=38,align='center',col=INK,alpha=a)
 g.label('Asignación observada','Observed assignment',0,283,size=33,alpha=b)
 g.rect(0,345,1000,88,fill=RULE,alpha=b)
 g.rect(0,345,700,88,fill=GOLD,alpha=b)
 g.text('A · 70%',350,367,size=38,align='center',col=WHITE,alpha=b)
 g.text('B · 30%',850,367,size=38,align='center',col=INK,alpha=b)
 g.line(500,111,500,450,col=INK,lw=2,dash=[7,7],alpha=b)
 g.label('El tamaño muestral y el diseño determinan la prueba','Sample size and design determine the diagnostic test',500,478,align='center',width=970,size=27,col=MUTED,alpha=b)
 g.badge('Investigar antes de interpretar el lift','Investigate before interpreting lift',586,'unknown',c)

def onlinegate(g):
 a,b,c=g.p;g.heading('Mismo contexto; cambia una condición','Same context; change one condition')
 g.label('CASO A','CASE A',20,40,col=MUTED,size=26,alpha=a)
 g.label('CASO B','CASE B',20,335,col=MUTED,size=26,alpha=b)
 for row,y,pp in [(0,85,a),(1,380,b)]:
  g.box(20,y,255,100,'Reglas: OK' if row==0 else 'Reglas: FAIL','Rules: OK' if row==0 else 'Rules: FAIL','pass' if row==0 else 'fail',pp,size=32)
  g.box(305,y,255,100,'Fiabilidad: OK','Reliability: OK','pass',pp,size=30)
  g.box(590,y,300,100,'Evidencia: falta','Evidence: missing','unknown',pp,size=30)
  for xx in [147.5,432.5,740]:g.line(xx,y+100,xx,y+114,col=RULE,alpha=pp)
  g.line(147.5,y+114,740,y+114,col=RULE,alpha=pp)
  g.arrow([(495,y+114),(495,y+145)],pp,col=GOLD if row==0 else RED)
  g.box(230,y+153,530,78,'PAUSA' if row==0 else 'BLOQUEAR','PAUSE' if row==0 else 'BLOCK','unknown' if row==0 else 'fail',pp,size=36)
 g.rect(12,372,271,116,stroke=RED,lw=4,alpha=c)
 g.label('Resultados alternativos, no etapas obligatorias','Alternative outcomes, not mandatory stages',500,666,align='center',width=980,size=31,col=INK,alpha=c)

def signal(g):
 a,b,c=g.p;g.heading('Síntoma antes de hipótesis','Symptom before hypothesis')
 g.label('ERRORES OBSERVADOS','OBSERVED ERRORS',0,62,size=28,col=MUTED,alpha=a)
 xs=[50+i*90 for i in range(11)];ys=[285,290,280,286,274,250,100,170,260,275,281]
 for i in range(10):g.line(xs[i],ys[i],xs[i+1],ys[i+1],col=GOLD,lw=4,alpha=a)
 g.circle(xs[6],ys[6],11,fill=GOLD,alpha=b)
 g.arrow([(xs[6],ys[6]+20),(xs[6],340),(500,340),(500,407)],b,col=GOLD)
 g.box(90,425,820,105,'Reconstruir trace + versiones','Reconstruct trace + versions','normal',b,size=37)
 g.badge('El pico no demuestra una causa','The spike does not prove a cause',590,'unknown',c)

def cause(g):
 a,b,c=g.p;g.heading('Reconstruir el incidente','Reconstruct the incident')
 for i,z in enumerate([('Write','Write'),('Timeout','Timeout'),('Retry','Retry')]):
  x=30+i*335;pp=a if i<2 else b;g.box(x,85,270,110,*z,'unknown' if i==1 else 'normal',pp,size=39)
  if i<2:g.arrow([(x+270,140),(x+325,140)],pp,col=GOLD if i==0 else RED)
 for i in range(2):
  xx=100+i*480;pp=a if i==0 else b
  g.document(xx,305,330,180,'R-104',state='active' if i==0 else 'normal',alpha=pp)
  if i:g.cross(xx+300,327,alpha=b)
 g.arrow([(165,195),(265,295)],a);g.arrow([(835,195),(745,295)],b,col=RED)
 g.badge('Hipótesis: retry sin reconciliación','Hypothesis: retry without reconciliation',570,'unknown',c)

def neighbors(g):
 a,b,c=g.p;g.heading('Pruebas por mecanismo, no por anécdota','Tests by mechanism, not anecdote')
 for i in range(3):
  x=30+i*153+(620+i*114-(30+i*153))*a;y=75+30*a
  g.document(x,y,130-25*a,145-40*a,'I'+str(i+1),state='active',alpha=min(1,a*4))
 g.rect(600,85,370,210,stroke=ACCENT,lw=3,alpha=ease((a-.65)/.35))
 g.label('Un mecanismo','One mechanism',785,244,align='center',size=33,col=ACCENT,alpha=ease((a-.65)/.35))
 for i,z in enumerate([('Antes del write','Before write'),('Tras el write','After write'),('Sólo lectura','Read only')]):
  xx=25+i*335;pp=ease((b-i*.12)/.72)
  path=[(785,297),(785,331),(xx+142,331),(xx+142,370)]
  g.arrow(path,pp,col=ACCENT)
  if 0<pp<1:x,y=path_point(path,pp);g.circle(x,y,10,fill=ACCENT)
  g.box(xx,382,285,135,*z,'unknown' if i==1 else 'normal',pp,size=35)
 g.badge('El fix debe pasar las tres condiciones','The fix must pass all three conditions',600,'active',c)

def fixture(g):
 a,b,c=g.p;g.heading('Snapshot mínimo reproducible','Minimal reproducible snapshot')
 g.box(70,55,860,520,'','','normal',a)
 rows=[('Estado inicial','Initial state','pending'),('Respuesta tool','Tool response','timeout'),('Versión sistema','System version','S-v1'),('Verificador','Verifier','state-v1')]
 for i,(es,en,val) in enumerate(rows):
  yy=94+i*110;pp=a if i==0 else b
  g.label(es,en,105,yy+10,size=34,alpha=pp);g.box(650,yy-3,240,72,val,val,'active' if i==3 else 'normal',pp,size=31)
  if i<3:g.line(105,yy+88,889,yy+88,col=RULE,alpha=pp)
 g.label('Sin datos personales innecesarios','No unnecessary personal data',500,625,align='center',col=ACCENT,alpha=c,size=33)

def repair(g):
 a,b,c=g.p;g.heading('Mismos casos y verificador','Same cases and verifier')
 g.label('ANTES','BEFORE',420,63,align='center',size=30,alpha=a)
 g.label('REPARACIÓN','REPAIR',780,63,align='center',size=30,alpha=a)
 rows=[('Fallo reproducido','Reproduced failure'),('Vecino: pre-write','Neighbor: pre-write'),('Vecino: lectura','Neighbor: read')]
 for i,z in enumerate(rows):
  yy=148+i*138;g.label(*z,20,yy+18,size=31,width=285,alpha=a)
  g.box(325,yy,195,87,'FAIL' if i==0 else 'PASS','FAIL' if i==0 else 'PASS','fail' if i==0 else 'pass',a,size=34)
  p=ease((b-i*.18)/.6)
  g.rect(680,yy,195,87,fill=WHITE,stroke=RULE,alpha=a,lw=2)
  g.arrow([(540,yy+43),(666,yy+43)],p,col=ACCENT)
  if 0<p<1:g.circle(540+126*p,yy+43,11,fill=ACCENT)
  g.box(680,yy,195,87,'PASS','PASS','pass',ease((p-.72)/.28),size=34)
 g.badge('No cambiar el grader para ocultar el fallo','Do not change the grader to hide failure',600,'normal',c)

def production(g):
 a,b,c=g.p;g.heading('El periodo de observación es otra evidencia','The observation period is additional evidence')
 g.label('PRE-RELEASE','PRE-RELEASE',180,70,size=29,align='center',col=MUTED,alpha=a)
 g.label('PRODUCCIÓN','PRODUCTION',720,70,size=29,align='center',col=MUTED,alpha=b)
 g.line(55,223,955,223,col=RULE,lw=4,alpha=a)
 g.circle(170,223,25,fill=TINT,stroke=ACCENT,alpha=a);g.tick(170,223,alpha=a)
 g.label('Regresión PASS','Regression PASS',170,280,align='center',size=31,alpha=a)
 g.line(425,138,425,323,col=GOLD,lw=3,alpha=b)
 g.label('Release','Release',425,348,align='center',size=32,col=GOLD,alpha=b)
 g.rect(480,162,465*b,122,fill=TINT,alpha=b)
 g.label('Ventana de observación','Observation window',720,191,align='center',width=445,size=29,col=ACCENT,alpha=b)
 g.label('Recurrencia / operaciones observadas','Recurrence / observed operations',500,473,align='center',width=970,size=38,col=INK,alpha=c)
 g.label('Sin exposición suficiente, no cerrar el incidente','Do not close the incident without sufficient exposure',500,551,align='center',width=970,size=29,col=GOLD,alpha=c)
 g.label('Responsable + evidencia de producción','Owner + production evidence',500,638,align='center',width=970,size=32,col=ACCENT,alpha=c)

DIAGRAMS={fn.__name__:fn for fn in [outcome,model,retrieval,workflow,trace,boundary,evalunit,coverage,hardnegative,familysplit,holdout,version,grader,rubric,agreement,position,variance,calibration,states,policy,timeout,reconcile,validpaths,trajectorygate,questions,shadow,canary,ab,health,onlinegate,signal,cause,neighbors,fixture,repair,production]}
