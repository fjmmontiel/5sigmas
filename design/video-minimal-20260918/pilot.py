#!/usr/bin/env python3
"""Review-only 5sigmas TTC prototype. Requires Pillow, ffmpeg and installed Inter.
No font binaries are bundled. Usage: python pilot.py --output ./review
"""
from pathlib import Path
from functools import lru_cache
import argparse,json,math,os,subprocess,hashlib
from PIL import Image,ImageDraw,ImageFont
W,H,FPS=1920,1080,30
BG='#ffffff';INK='#111111';MUTED='#666666';RULE='#dedede';EDGE='#888888'
FONTDIR=Path(os.environ.get('S5_INTER_DIR','/usr/share/fonts/opentype/inter'))
@lru_cache(None)
def font(n,weight='regular'):
    name={'regular':'Inter-Regular.otf','medium':'Inter-Medium.otf','bold':'Inter-SemiBold.otf'}[weight]
    p=FONTDIR/name
    if not p.exists():raise FileNotFoundError(f'Install Inter or set S5_INTER_DIR: {p}')
    return ImageFont.truetype(str(p),n)
def text(d,s,x,y,size=36,weight='regular',fill=INK,anchor=None):d.text((x,y),s,font=font(size,weight),fill=fill,anchor=anchor)
def line(d,a,b,fill=INK,width=3):d.line([a,b],fill=fill,width=width)
def center(d,s,x,y,size=30,fill=INK,weight='regular'):text(d,s,x,y,size,weight,fill,'mm')
def arrow(d,a,b,fill=INK,width=3):
    line(d,a,b,fill,width);th=math.atan2(b[1]-a[1],b[0]-a[0])
    for delta in [-.5,.5]:line(d,b,(b[0]-13*math.cos(th+delta),b[1]-13*math.sin(th+delta)),fill,width)
def ease(t):t=max(0.,min(1.,t));return t*t*(3-2*t)
def grow(d,a,b,p,fill=INK,width=4):
    p=ease(p)
    if p:line(d,a,(a[0]+(b[0]-a[0])*p,a[1]+(b[1]-a[1])*p),fill,width)
def wrap(s,w,size,weight='regular'):
    out=[];f=font(size,weight)
    for para in s.split('\n'):
        cur=''
        for word in para.split():
            if f.getlength(word)>w:raise ValueError('Unbreakable text overflow')
            candidate=(cur+' '+word).strip()
            if f.getlength(candidate)<=w:cur=candidate
            else:out.append(cur);cur=word
        out.append(cur)
    return out
def paragraph(d,s,x,y,w,size=36,weight='regular',fill=INK,leading=1.36,maxh=None):
    rows=wrap(s,w,size,weight);height=len(rows)*size*leading
    if maxh is not None and height>maxh:raise ValueError('Paragraph overflow: '+s)
    for i,r in enumerate(rows):text(d,r,x,y+i*size*leading,size,weight,fill)
    return y+height
def node(d,x,y,s='',active=False,r=23,size=24):
    d.ellipse((x-r,y-r,x+r,y+r),fill=INK if active else BG,outline=INK,width=3)
    center(d,s,x,y,size,BG if active else INK,'medium')
def rect(d,xy,s,active=False,size=32):
    d.rectangle(xy,outline=INK,width=3,fill=INK if active else BG)
    center(d,s,(xy[0]+xy[2])/2,(xy[1]+xy[3])/2,size,BG if active else INK,'medium')
def cross(d,x,y,size=14):
    line(d,(x-size,y-size),(x+size,y+size));line(d,(x-size,y+size),(x+size,y-size))
SCENES=[
{'kicker':'MODELOS RAZONADORES · CAPÍTULO 3','title':'Test-Time Compute','paragraphs':['La segunda ley de escala.','2026'],'source':''},
{'kicker':'DOS PRESUPUESTOS','title':'No solo entrenar más. Pensar más.','paragraphs':['Una palanca es el entrenamiento: más parámetros, más datos y más cómputo para construir el modelo. Las leyes de escala de Kaplan lo documentaron en 2020.','Pero hay una segunda dimensión. Cuánto cómputo se invierte en cada respuesta individual. Eso es test-time compute.'],'source':'Kaplan et al., 2020 · Snell et al., 2024'},
{'kicker':'MÁS PASOS','title':'Forzar al modelo a seguir pensando.','paragraphs':['Chain-of-thought descompone el problema en pasos intermedios. Los modelos razonadores pueden extender ese razonamiento. Una técnica llamada budget forcing suprime el token de fin y añade "Wait".','En el estudio de s1-32B, budget forcing elevó AIME24 de 50% a aproximadamente 57%. Más pasos pueden mejorar la respuesta; no lo garantizan.'],'source':'Muennighoff et al., 2025 · s1-32B'},
{'kicker':'MÁS CANDIDATOS','title':'Generar muchas respuestas. Quedarse con la mejor.','paragraphs':['Best-of-N genera varias respuestas y usa un evaluador para seleccionar la mejor. Otra estrategia es elegir por mayoría. El criterio de selección importa tanto como el número de candidatos.','En AIME 2024, o1 pasó de 74% con una muestra a 83% con consenso entre 64 muestras. Eso es selección por mayoría.'],'source':'OpenAI, 2024 · AIME 2024'},
{'kicker':'MÁS ESTRUCTURA','title':'Explorar ramas. Descartar las malas.','paragraphs':['La búsqueda en árbol no genera una única cadena lineal. Explora múltiples ramificaciones, evalúa cada una y poda las menos prometedoras. El coste depende de cuántas ramas se expanden.','Para planificación compleja, permite comparar rutas alternativas antes de continuar. La mejora no es automática: depende de la tarea, del evaluador y del presupuesto de búsqueda.'],'source':'Yao et al., 2023 · Tree of Thoughts'},
{'kicker':'COSTE Y LATENCIA','title':'El razonamiento es secuencial por construcción.','paragraphs':['Cada token depende del anterior. El paso 500 necesita los 499 previos. A una tasa fija de 100 tokens por segundo, generar una cadena de 5.000 tokens requiere 50 segundos.','Acortar la cadena o generar tokens más rápido reduce esa espera. La dependencia secuencial sigue existiendo. La latencia es una restricción de diseño real.'],'source':'Ejemplo calculado · tasa de generación fija'},
{'kicker':'ESCALA COMPLEMENTARIA','title':'Modelo grande o más tiempo de pensar.','paragraphs':['Test-time compute y preentrenamiento son complementarios. En ciertas tareas, un modelo pequeño con más cómputo puede superar a uno grande con menos. El coste ya no lo fija solo el tamaño.','Los sistemas eficientes ajustan el modelo y el presupuesto a cada problema. Esa decisión necesita evaluación por tarea. Eso es escala complementaria.'],'source':'Snell et al., 2024 · presupuesto por consulta'}]
STARTS=[0,5.4,16.4,27.4,38.4,49.4,60.4];NFRAMES=2141
STATIC=[];LAYOUT=[]
def prepare():
    for i,s in enumerate(SCENES):
        im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
        text(d,'5sigmas',96,48,31,'bold');text(d,s['kicker'],1824,53,24,'medium',MUTED,'ra')
        line(d,(96,109),(1824,109),RULE,2)
        text(d,'MODELOS RAZONADORES',96,1016,22,'medium',MUTED)
        text(d,f'{i+1:02d} / 07',1824,1016,22,'medium',MUTED,'ra')
        if i==0:
            text(d,'Test-Time',96,225,130,'bold');text(d,'Compute',96,365,130,'bold')
            text(d,'La segunda ley de escala.',96,570,43);text(d,'Más cómputo por respuesta.',96,638,35,fill=MUTED);text(d,'2026',96,756,29,fill=MUTED)
        else:
            head=paragraph(d,s['title'],96,182,930,72,'bold',leading=1.10,maxh=250);y=head+36
            for p in s['paragraphs']:y=paragraph(d,p,96,y,930,36,maxh=520)+24
            if y>934:raise RuntimeError(f'Scene {i} text overlaps source: {y}')
            text(d,s['source'],96,942,23,fill=MUTED);LAYOUT.append({'scene':i+1,'body_bottom':y,'body_font_px':36,'title_font_px':72})
        STATIC.append(im)
def opening(d,t):
    center(d,'Pesos fijos. Presupuesto variable.',1470,230,31,weight='medium');rect(d,(1360,320,1580,400),'Modelo',True)
    for k,(s,cx) in enumerate([('Más pasos',1200),('Más candidatos',1450),('Más estructura',1710)]):
        grow(d,(1470,400),(cx,492),(t-.25-k*.5)/.5);center(d,s,cx,543,27,weight='medium')
        if k==0:
            for j in range(3):
                node(d,cx-58+j*58,645,str(j+1),t>1+j*.2,r=18,size=21)
                if j<2:arrow(d,(cx-38+j*58,645),(cx-21+j*58,645),width=2)
        elif k==1:
            for j in range(3):
                d.ellipse((cx-64+j*58,619,cx-34+j*58,649),outline=INK,width=2);line(d,(cx-49+j*58,649),(cx,700),width=2)
            d.ellipse((cx-15,691,cx+15,721),fill=INK)
        else:
            for a,b in [((cx,600),(cx-60,655)),((cx,600),(cx+60,655)),((cx+60,655),(cx+25,712)),((cx+60,655),(cx+85,712))]:line(d,a,b,width=2)
            for x,y in [(cx,600),(cx-60,655),(cx+60,655),(cx+25,712),(cx+85,712)]:d.ellipse((x-9,y-9,x+9,y+9),fill=INK)
            cross(d,cx-60,655,9)
    center(d,'Tres formas de invertir cómputo',1470,855,31,MUTED)
def axes(d,t):
    center(d,'Dos decisiones distintas',1470,250,34,weight='medium')
    arrow(d,(1210,792),(1805,792));arrow(d,(1210,792),(1210,353))
    text(d,'Al entrenar',1660,825,28,fill=MUTED);text(d,'Al responder',1120,315,28,fill=MUTED)
    a=(1350,720);b=(1350,430);e=(1690,720);line(d,(1210,720),(1770,720),RULE,2);node(d,*a,active=True,r=11)
    if t>1:
        grow(d,a,e,(t-1)/1.6)
        if t>2.6:node(d,*e,active=True,r=11)
        text(d,'Más entrenamiento',1400,745,25,fill=MUTED)
    if t>3:
        grow(d,a,b,(t-3)/1.6,width=5)
        if t>4.6:node(d,*b,active=True,r=13)
        paragraph(d,'Mismo modelo.\nMás cómputo\npor respuesta.',1400,417,370,34,'medium',leading=1.35)
    text(d,'Esquema conceptual; no es una curva medida.',1120,917,24,fill=MUTED)
def chain(d,t):
    center(d,'Extender antes de responder',1470,241,32,weight='medium');p=min(5,int(max(0,t-.5)/.85))
    for j,label in enumerate(['Paso 1','Paso 2','Paso 3','FIN → Wait','Revisión','Respuesta']):
        x,y=1210,352+j*96
        if j:line(d,(x,y-73),(x,y-23),INK if j<=p else EDGE)
        node(d,x,y,str(j+1) if j!=3 else '+',j<=p)
        text(d,label,1270,y-23,38,'medium',INK if j<=p else MUTED)
        if j==3 and p>=3:text(d,'prolonga la generación',1270,y+20,23,fill=MUTED)
    text(d,'Intervención de presupuesto, no garantía de acierto.',1120,940,23,fill=MUTED)
def candidates(d,t):
    center(d,'17 × 6 = ?',1470,300,51,weight='medium')
    for j,(x,val) in enumerate(zip([1200,1470,1740],['102','104','102'])):
        active=t>1+j*.75
        if active:arrow(d,(1470,345),(x,431))
        center(d,f'Candidato {j+1}',x,455,25,MUTED);rect(d,(x-78,492,x+78,595),val if active else '…',active,51)
        if t>4:grow(d,(x,598),(1470,707),(t-4)/.7,width=3)
    d.rectangle((1258,658,1682,710),fill=BG);center(d,'Selección por mayoría',1470,683,30,weight='medium')
    rect(d,(1280,738,1660,858),'102  ·  2 de 3' if t>5 else 'Comparar',t>5,38)
    paragraph(d,'Ejemplo ilustrativo. Coincidir no demuestra que una respuesta sea correcta.',1120,909,704,24,fill=MUTED,leading=1.3)
def tree(d,t):
    center(d,'Evaluar antes de expandir',1470,235,34,weight='medium')
    root=(1460,335);a=(1250,487);b=(1660,487);a1=(1150,654);a2=(1350,654);b1=(1550,654);b2=(1770,654);end=(1550,832)
    for j,(p,q) in enumerate([(root,a),(root,b),(a,a1),(a,a2),(b,b1),(b,b2),(b1,end)]):
        col=INK if j in [1,4,6] and t>3.5 else EDGE
        if t>j*.42:grow(d,p,q,(t-j*.42)/.5,col,4 if col==INK else 3)
    for j,p in enumerate([root,a,b,a1,a2,b1,b2,end]):
        if t>j*.4:node(d,*p,active=p in [root,b,b1,end] and t>3.5,r=17)
    center(d,'Problema',1460,293,29);center(d,'Ruta A',1250,439,27);center(d,'Ruta B',1660,439,27)
    if t>3:cross(d,*a,19);center(d,'Descartada',1245,740,29,MUTED);center(d,'contradicción',1245,780,24,MUTED)
    if t>4.5:center(d,'Continuar',1675,707,28)
    if t>5.5:center(d,'Solución candidata',1550,878,29,weight='medium')
    text(d,'Árbol ilustrativo; la poda depende del evaluador.',1120,940,24,fill=MUTED)
def latency(d,t):
    center(d,'La tasa importa',1470,243,35,weight='medium');center(d,'5.000 tokens',1470,372,62,weight='medium')
    line(d,(1190,433),(1760,433));center(d,'100 tokens/s',1470,487,44);center(d,'= 50 s',1470,614,84,weight='medium')
    left,right,y=1130,1800,772;line(d,(left,y),(right,y),RULE,12);p=ease((t-1)/5.)
    if p:line(d,(left,y),(left+(right-left)*p,y),INK,12)
    for j in range(6):
        x=left+j*(right-left)/5;line(d,(x,y-11),(x,y+15),width=2);center(d,str(j*10)+' s',x,y+44,23,MUTED)
    center(d,'Simulación acelerada · tasa fija',1470,875,27,MUTED)
    paragraph(d,'El cálculo no incluye red, colas, prefill ni herramientas.',1120,924,704,24,fill=MUTED,leading=1.3)
def routing(d,t):
    center(d,'Elegir una combinación',1470,237,33,weight='medium');center(d,'MODELO',1470,337,24,MUTED,'medium')
    rect(d,(1140,387,1438,486),'Pequeño',t<2.7);rect(d,(1498,387,1796,486),'Grande',2.7<=t<4.6)
    center(d,'+',1470,544,47);center(d,'CÓMPUTO POR CONSULTA',1470,608,24,MUTED,'medium')
    rect(d,(1140,658,1438,757),'Menor',2.7<=t<4.6);rect(d,(1498,658,1796,757),'Mayor',t<2.7)
    center(d,'Validar por tarea',1470,866,40,weight='medium');text(d,'No hay una combinación óptima para todo.',1120,936,25,fill=MUTED)
DRAW=[opening,axes,chain,candidates,tree,latency,routing]
def frame(i,t):
    im=STATIC[i].copy();DRAW[i](ImageDraw.Draw(im),t);return im

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--output',type=Path,required=True);args=ap.parse_args();o=args.output;o.mkdir(parents=True,exist_ok=True);prepare()
    for i in range(7):frame(i,7.2).save(o/f'escena-{i+1:02d}.png')
    frame(0,4.7).save(o/'poster-despues.jpg',quality=94)
    path=o/'5sigmas-test-time-compute-despues.mp4'
    cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1920x1080','-r','30','-i','-','-an','-c:v','libx264','-preset','veryfast','-crf','18','-threads','2','-pix_fmt','yuv420p','-movflags','+faststart',str(path)]
    p=subprocess.Popen(cmd,stdin=subprocess.PIPE);idx=0;cache={}
    try:
        for n in range(NFRAMES):
            t=n/FPS
            while idx+1<7 and t>=STARTS[idx+1]:idx+=1
            local=t-STARTS[idx]
            if local>7.2:
                if idx not in cache:cache[idx]=frame(idx,7.2).tobytes()
                raw=cache[idx]
            else:raw=frame(idx,local).tobytes()
            p.stdin.write(raw)
    finally:p.stdin.close()
    if p.wait():raise RuntimeError('ffmpeg failed')
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(path)]))
    v=probe['streams'][0]
    assert v['width']==W and v['height']==H and v['codec_name']=='h264'
    assert abs(float(probe['format']['duration'])-NFRAMES/FPS)<.04
    assert len(probe['streams'])==1
    report={'duration_seconds':NFRAMES/FPS,'frames':NFRAMES,'width':W,'height':H,'fps':FPS,'audio_streams':0,'source_original_words':300,'proposed_words':sum(len((s['title']+' '+' '.join(s['paragraphs'])).split()) for s in SCENES),'layout':LAYOUT,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'scenes':SCENES,'scene_starts':STARTS,'status':'prototype only; not deployed'}
    (o/'pilot-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({k:v for k,v in report.items() if k not in ['scenes','layout']},ensure_ascii=False))
if __name__=='__main__':main()
