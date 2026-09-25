def chapter_duration(ch):return sum(s['duration'] for s in ch['scenes'])
def locate(ch,t):
 acc=0
 for i,s in enumerate(ch['scenes']):
  if t<acc+s['duration'] or i==len(ch['scenes'])-1:return i,s,t-acc
  acc+=s['duration']
 raise AssertionError

def render_frame(ch,lang,orientation,t,scale=1.,audit=False):
 W,H=(1920,1080) if orientation=='h' else (1080,1920)
 surface=cairo.ImageSurface(cairo.FORMAT_RGB24,round(W*scale),round(H*scale));ctx=cairo.Context(surface);ctx.scale(scale,scale)
 d=Draw(ctx,W,H,lang,orientation=='v');d.color(BG);ctx.paint();v=d.v
 i,s,local=locate(ch,t);duration=chapter_duration(ch)
 margin=66 if v else 70
 d.text('5sigmas',margin,37 if not v else 47,30 if not v else 36,bold=True)
 series=L(lang,'EVALUAR SISTEMAS DE IA','EVALUATING AI SYSTEMS')
 d.text(series,220 if not v else 250,45 if not v else 58,17 if not v else 21,col=MUTED)
 d.text(f'{i+1:02} / {len(ch["scenes"]):02}',W-margin,46 if not v else 59,17 if not v else 21,col=MUTED,align='right')
 d.line(margin,89 if not v else 111,W-margin,89 if not v else 111,col=RULE,lw=1.5)
 if v:
  tx,ty,tw=margin,153,W-2*margin;title_size=100;body_size=48;body_leading=1.2
  graph_x=margin;graph_y=995;graph_w=W-2*margin;graph_h=730
 else:
  reverse=i in (2,4);tx=1095 if reverse else margin;ty=142;tw=755;title_size=77;body_size=40;body_leading=1.24
  graph_x=margin if reverse else 930;graph_y=237;graph_w=920;graph_h=714
 title_lines=d.lines(s['title'][lang],tw,title_size,True,True)
 while len(title_lines)>3 and title_size>66:
  title_size-=2;title_lines=d.lines(s['title'][lang],tw,title_size,True,True)
 title_h=len(title_lines)*title_size*1.05
 for j,line in enumerate(title_lines):d.text(line,tx,ty+j*title_size*1.05,title_size,col=ACCENT if j==len(title_lines)-1 else INK,serif=True,bold=True,leading=1.05)
 body_y=ty+title_h+(36 if v else 34)
 active=max([-1]+[k for k,x in enumerate(s['cue_times']) if local>=x])
 y=body_y
 for k,text in enumerate(s['cues'][lang]):
  ls=d.lines(text,tw-25,body_size);hh=len(ls)*body_size*body_leading
  reveal=ease((local-s['cue_times'][k])/.3)
  if reveal>0:
   if k==active:
    d.rect(tx-7,y-5,tw+7,hh+9,fill=TINT,alpha=reveal)
    d.line(tx-14,y-5,tx-14,y+hh+4,col=ACCENT,lw=3,alpha=reveal)
   d.text(text,tx+5,y,body_size,col=ACCENT if k==active else INK,width=tw-25,leading=body_leading,alpha=reveal)
  y+=hh+27
 if y>(1070 if v else 944):d.failures.append(('body_overflow',i,lang,orientation,y))
 if v:
  graph_y=max(965,y+26);graph_h=1760-graph_y
 speeds=MOTION_SECONDS.get(s['id'],[1.15,1.15,1.15])
 ps=[ease((local-x)/dt) for x,dt in zip(s['visual_times'],speeds)]
 g=Graph(d,graph_x,graph_y,graph_w,graph_h,ps);DIAGRAMS[s['id']](g);g.finish()
 foot_y=1786 if v else 982
 d.line(margin,foot_y-20,W-margin,foot_y-20,col=RULE,lw=1.2)
 provenance=L(lang,f'CAPÍTULO {ch["chapter"]:02} · '+ch['title']['es'],f'CHAPTER {ch["chapter"]:02} · '+ch['title']['en'])
 d.text(provenance,margin,foot_y,20 if v else 17,col=MUTED,width=W-2*margin)
 note=L(lang,'Ejemplo ilustrativo · no es un resultado de benchmark','Illustrative example · not a benchmark result') if s['illustrative'] else L(lang,'Basado en el artículo de 5sigmas · fuentes y alcance en la serie','Based on the 5sigmas article · sources and scope in the series')
 d.text(note,margin,foot_y+(41 if v else 28),20 if v else 16,col=MUTED,width=W-2*margin)
 ybar=1873 if v else 1052
 for q,ss in enumerate(ch['scenes']):
  segment=(W-2*margin-5*(len(ch['scenes'])-1))/len(ch['scenes']);xx=margin+q*(segment+5)
  d.line(xx,ybar,xx+segment,ybar,col=RULE,lw=2)
  proportion=1 if q<i else clamp(local/ss['duration']) if q==i else 0
  if proportion:d.line(xx,ybar,xx+segment*proportion,ybar,col=SERIES_BLUE,lw=2)
 if audit:return surface,d.failures,d.bounds
 return surface

def sha256(path):
 h=hashlib.sha256()
 with open(path,'rb') as f:
  for buf in iter(lambda:f.read(1024*1024),b''):h.update(buf)
 return h.hexdigest()

def render_video(ch,lang,orientation,out,fps=60,limit=None):
 w,h=(1920,1080) if orientation=='h' else (1080,1920)
 duration=chapter_duration(ch) if limit is None else min(limit,chapter_duration(ch));n=round(duration*fps)
 out=Path(out);out.parent.mkdir(parents=True,exist_ok=True);tmp=out.with_name(out.stem+'.partial.mp4')
 cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','bgr0','-s',f'{w}x{h}','-r',str(fps),'-i','-','-an','-vf','scale=out_color_matrix=bt709:out_range=tv,format=yuv420p','-c:v','libx264','-preset',os.environ.get('ENCODE_PRESET','veryfast'),'-crf','18','-pix_fmt','yuv420p','-r',str(fps),'-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-movflags','+faststart','-threads',os.environ.get('ENCODE_THREADS','2'),str(tmp)]
 log=out.with_suffix('.encode.log');start=time.monotonic()
 with open(log,'wb') as err:
  p=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=err)
  try:
   for frame in range(n):
    surface=render_frame(ch,lang,orientation,frame/fps);surface.flush();p.stdin.write(surface.get_data())
    if frame%600==0:print(f'{out.stem} {frame}/{n}',flush=True)
   p.stdin.close();code=p.wait()
   if code:raise RuntimeError(f'ffmpeg exit {code}: {log.read_text()}')
  except BaseException:
   p.kill();p.wait();raise
 tmp.replace(out)
 return {'file':out.name,'sha256':sha256(out),'size':out.stat().st_size,'duration':duration,'fps':fps,'width':w,'height':h}
