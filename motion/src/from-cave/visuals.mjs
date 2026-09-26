const pretty=value=>String(value??'').replaceAll('_',' ').replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());
const active=(m,i)=>Boolean(m.nodes[i]?.active);
const cue=(m,i)=>pretty(m.nodes[i]?.label??'');
const q=m=>m.reducedMotion?1:m.progress;

function label(P,text,x,y,w=180,size=20,weight=600,color=P.T.muted){
  const lines=P.lines(pretty(text),w,size,weight).slice(0,2);
  lines.forEach((line,i)=>P.text(line,x,y+i*(size+4),size,color,weight,'center',w));
}
function box(P,x,y,w,h,text,on=false){
  P.rect(x,y,w,h,on?P.T.accentSurface:P.T.surface,on?P.T.accentText:P.T.rule,18,on?4:2);
  label(P,text,x+w/2,y+h/2-12,w-24,20,on?700:550,on?P.T.accentText:P.T.muted);
}
function dot(P,x,y,on=false,r=13){P.circle(x,y,r,on?P.T.accentText:P.T.surface,on?P.T.accentText:P.T.rule,on?2:2);}
function arrow(P,a,b,on=true,width=3){
  P.path([a,b],on?P.T.accentText:P.T.rule,on?width:2,on?1:.35);
  if(!on)return;const ang=Math.atan2(b[1]-a[1],b[0]-a[0]),r=13;
  P.path([[b[0]-Math.cos(ang-.55)*r,b[1]-Math.sin(ang-.55)*r],b,[b[0]-Math.cos(ang+.55)*r,b[1]-Math.sin(ang+.55)*r]],P.T.accentText,Math.max(2,width-1));
}
function axes(P,x,y,w,h){P.path([[x,y],[x,y-h]],P.T.rule,2);P.path([[x,y],[x+w,y]],P.T.rule,2);}
function curve(P,points,color=P.T.accentText,width=4){
  const c=P.c;c.save();c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];const mx=(a[0]+b[0])/2;c.bezierCurveTo(mx,a[1],mx,b[1],b[0],b[1]);}c.stroke();c.restore();
}
function title(P,m){P.text(pretty(m.style),500,742,19,P.T.muted,600,'center',700);}

function sequence(P,m){
  const y=400,x0=110,x1=890;P.path([[x0,y],[x1,y]],P.T.rule,5);
  m.nodes.forEach((n,i)=>{const x=x0+i*(x1-x0)/(m.nodes.length-1);const on=active(m,i);dot(P,x,y,on,18);label(P,n.label,x,y+38,150,18,on?700:550,on?P.T.accentText:P.T.muted);if(i<m.nodes.length-1&&on)P.rect(x,y-4,(x1-x0)/(m.nodes.length-1),8,P.T.accent,null,4);});
}
function stack(P,m){
  const n=m.nodes.length,h=86,g=18,total=n*h+(n-1)*g,y0=(720-total)/2;
  m.nodes.forEach((node,i)=>{const on=active(m,i);const inset=(n-1-i)*18;box(P,190+inset,y0+i*(h+g),620-2*inset,h,node.label,on);});
}
function split(P,m){
  const ys=[260,535];P.text('A',100,ys[0]-16,22,P.T.muted,700,'center',60);P.text('B',100,ys[1]-16,22,P.T.muted,700,'center',60);
  m.nodes.forEach((node,i)=>{const lane=i%2,row=Math.floor(i/2),x=220+row*245,y=ys[lane];box(P,x,y-48,190,96,node.label,active(m,i));if(row>0)arrow(P,[x-55,y],[x,y],active(m,i));});
}
function converge(P,m){
  const cx=500,cy=400;P.circle(cx,cy,62,P.T.accentSurface,P.T.accentText,4);P.text('Σ',cx,cy-22,42,P.T.accentText,700,'center',80);
  const pos=[[150,150],[850,150],[150,650],[850,650],[500,120]];
  m.nodes.forEach((node,i)=>{const [x,y]=pos[i%pos.length];const on=active(m,i);box(P,x-90,y-42,180,84,node.label,on);arrow(P,[x+(x<cx?90:x>cx?-90:0),y+(y<cy?42:-42)],[cx+(x<cx?-62:x>cx?62:0),cy+(y<cy?-62:62)],on);});
}
function radial(P,m){
  const cx=500,cy=400,r=250;P.circle(cx,cy,72,P.T.accentSurface,P.T.accentText,4);P.text('MODEL',cx,cy-12,22,P.T.accentText,700,'center',130);
  m.nodes.forEach((node,i)=>{const a=-Math.PI/2+i*2*Math.PI/m.nodes.length,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r,on=active(m,i);P.circle(x,y,37,on?P.T.accentSurface:P.T.surface,on?P.T.accentText:P.T.rule,on?4:2);label(P,node.label,x,y+52,160,18,on?700:550,on?P.T.accentText:P.T.muted);arrow(P,[cx+Math.cos(a)*72,cy+Math.sin(a)*72],[x-Math.cos(a)*37,y-Math.sin(a)*37],on);});
}
function grid(P,m){
  const cols=3,w=210,h=150,gx=42,gy=42,x0=140,y0=190;
  m.nodes.forEach((node,i)=>{const col=i%cols,row=Math.floor(i/cols);box(P,x0+col*(w+gx),y0+row*(h+gy),w,h,node.label,active(m,i));});
  P.path([[110,130],[890,130]],P.T.rule,2);P.text('POSITION',500,92,20,P.T.muted,650,'center',180);
}
function transform(P,m){
  const n=m.nodes.length,w=160,g=45,total=n*w+(n-1)*g,x0=(1000-total)/2,y=350;
  m.nodes.forEach((node,i)=>{box(P,x0+i*(w+g),y,w,100,node.label,active(m,i));if(i<n-1)arrow(P,[x0+i*(w+g)+w,y+50],[x0+(i+1)*(w+g),y+50],active(m,i+1));});
  P.path([[185,520],[815,520]],P.T.rule,2);P.text('equivalence preserved',500,536,20,P.T.muted,600,'center',280);
}
function dag(P,m){
  const pos=[[120,390],[360,220],[360,560],[650,390],[870,390]];
  m.nodes.forEach((node,i)=>{const [x,y]=pos[i%pos.length];box(P,x-80,y-44,160,88,node.label,active(m,i));});
  [[0,1],[0,2],[1,3],[2,3],[3,4]].forEach(([a,b])=>{if(a<m.nodes.length&&b<m.nodes.length)arrow(P,[pos[a][0]+80,pos[a][1]],[pos[b][0]-80,pos[b][1]],active(m,b));});
}
function dualCurve(P,m){
  axes(P,120,650,760,470);curve(P,[[140,570],[280,490],[420,420],[560,330],[700,260],[850,215]],P.T.accentText,5);curve(P,[[140,620],[280,600],[420,550],[560,470],[700,360],[850,230]],P.T.muted,4);
  const x=150+q(m)*690;P.path([[x,190],[x,660]],P.T.rule,2,[6,8]);P.circle(x,620-(x-150)*.52,10,P.T.accentText);label(P,cue(m,Math.min(m.nodes.length-1,Math.floor(q(m)*m.nodes.length))),x,680,170,18,650,P.T.accentText);
}
function boundary(P,m){
  P.rect(165,150,670,500,P.T.surface,P.T.rule,28,3);P.text('CAPABILITY',500,180,22,P.T.muted,650,'center',180);
  m.nodes.forEach((node,i)=>{const inside=i<m.nodes.length-1;const x=inside?280+i*150:865,y=390,on=active(m,i);box(P,x-70,y-48,140,96,node.label,on&&inside);if(!inside){P.path([[835,205],[835,610]],P.T.accentText,5);P.text('LIMIT',835,620,18,P.T.accentText,700,'center',80);}});
}
function stream(P,m){
  P.rect(570,225,250,350,P.T.surface,P.T.accentText,28,4);P.text('EXECUTOR',695,370,24,P.T.accentText,700,'center',160);
  m.nodes.forEach((node,i)=>{const y=180+i*125,on=active(m,i);box(P,105,y,230,82,node.label,on);arrow(P,[335,y+41],[570,y+41],on);});
}
function mapping(P,m){
  box(P,85,315,230,120,cue(m,0),active(m,0));P.text('→',365,346,52,P.T.accentText,700,'center',80);
  const gates=[[465,245],[465,485],[650,365]];gates.forEach(([x,y],i)=>{P.circle(x,y,38,P.T.accentSurface,P.T.accentText,4);P.text(i<2?'⊕':'∧',x,y-18,30,P.T.accentText,700,'center',60);});
  arrow(P,[503,245],[620,350],q(m)>.3);arrow(P,[503,485],[620,380],q(m)>.45);box(P,750,315,170,120,cue(m,m.nodes.length-1),q(m)>.65);
}
function counterLoop(P,m){
  const x0=90,y=260,w=105;for(let i=0;i<7;i++){P.rect(x0+i*w,y,w-5,100,i===3?P.T.accentSurface:P.T.surface,i===3?P.T.accentText:P.T.rule,8,i===3?4:2);}
  P.text('TAPE',500,220,20,P.T.muted,650,'center',100);P.path([[445,360],[445,490],[650,490],[650,360]],P.T.accentText,4);arrow(P,[650,490],[445,490],q(m)>.65);label(P,cue(m,m.nodes.length-1),550,530,250,20,700,P.T.accentText);
}
function cycle(P,m,side=false){
  const pos=[[500,170],[790,390],[500,610],[210,390]];m.nodes.slice(0,4).forEach((node,i)=>{const [x,y]=pos[i];box(P,x-80,y-42,160,84,node.label,active(m,i));arrow(P,[x+(i===0?80:i===1?0:i===2?-80:0),y+(i===0?0:i===1?42:i===2?0:-42)],[pos[(i+1)%4][0]-(i===0?80:i===1?0:i===2?-80:0),pos[(i+1)%4][1]-(i===0?0:i===1?42:i===2?0:-42)],active(m,(i+1)%4));});
  if(side&&m.nodes[4]){box(P,820,610,150,80,m.nodes[4].label,active(m,4));P.path([[790,432],[895,570]],P.T.muted,3);}
}
function dualGrowth(P,m){
  axes(P,130,650,750,470);curve(P,[[140,590],[300,520],[460,440],[620,385],[850,350]],P.T.accentText,5);curve(P,[[140,625],[300,600],[460,540],[620,390],[850,190]],P.T.muted,5);P.text('coverage',785,365,19,P.T.accentText,650,'center',150);P.text('maintenance',770,175,19,P.T.muted,650,'center',180);
}
function remap(P,m){
  P.text('INPUT',245,160,20,P.T.muted,650,'center',120);P.text('HIDDEN',500,160,20,P.T.muted,650,'center',120);P.text('REMAPPED',755,160,20,P.T.muted,650,'center',150);
  [[195,300],[295,300],[195,500],[295,500]].forEach(([x,y],i)=>P.circle(x,y,17,i%2?P.T.accentSurface:P.T.surface,i%2?P.T.accentText:P.T.rule,3));
  [270,400,530].forEach(y=>P.circle(500,y,26,P.T.accentSurface,P.T.accentText,3));arrow(P,[330,400],[460,400],q(m)>.3);arrow(P,[540,400],[680,400],q(m)>.55);
  [[705,260],[805,330],[705,470],[805,540]].forEach(([x,y],i)=>P.circle(x,y,17,i<2?P.T.accentSurface:P.T.surface,i<2?P.T.accentText:P.T.rule,3));P.path([[755,220],[755,580]],P.T.accentText,4);
}
function benchmark(P,m){
  axes(P,170,650,680,430);const bars=[{x:300,h:330,label:'26.2%'},{x:600,h:190,label:'15.3%'}];bars.forEach((b,i)=>{P.rect(b.x,650-b.h,160,b.h,i?P.T.accentSurface:'#F3F4F3',i?P.T.accentText:P.T.rule,16,i?4:2);P.text(b.label,b.x+80,650-b.h-45,32,i?P.T.accentText:P.T.muted,750,'center',140);label(P,i?'AlexNet':'Runner-up',b.x+80,675,150,20,i?700:550,i?P.T.accentText:P.T.muted);});
}
function race(P,m){
  P.text('SERIAL',100,208,19,P.T.muted,700,'left',120);P.text('PARALLEL',100,500,19,P.T.muted,700,'left',140);
  for(let i=0;i<5;i++){const x=255+i*130;dot(P,x,230,i/5<q(m),15);if(i<4)arrow(P,[x+15,230],[x+115,230],(i+1)/5<q(m));}
  for(let r=0;r<3;r++)for(let c=0;c<5;c++){const x=255+c*130,y=480+r*85;P.circle(x,y,10,(c/5)<q(m)?P.T.accentText:P.T.surface,(c/5)<q(m)?P.T.accentText:P.T.rule,2);if(c<4)P.path([[x+10,y],[x+120,y]],P.T.rule,1.5);}
}
function hub(P,m){
  P.circle(500,400,92,P.T.accentSurface,P.T.accentText,5);P.text('BASE',500,382,25,P.T.accentText,750,'center',120);const pos=[[180,190],[820,190],[180,610],[820,610]];m.nodes.forEach((node,i)=>{const [x,y]=pos[i%4];box(P,x-90,y-42,180,84,node.label,active(m,i));arrow(P,[500+(x<500?-92:92),400+(y<400?-35:35)],[x+(x<500?90:-90),y],active(m,i));});
}
function surface(P,m){
  const A=[500,135],B=[160,630],C=[840,630];P.path([A,B,C,A],P.T.rule,3);P.text('PARAMETERS',500,90,18,P.T.muted,650,'center',160);P.text('TOKENS',110,645,18,P.T.muted,650,'center',100);P.text('COMPUTE',890,645,18,P.T.muted,650,'center',110);
  const t=q(m),x=310+380*t,y=520-250*Math.sin(Math.PI*t);P.circle(x,y,22,P.T.accentSurface,P.T.accentText,4);curve(P,[[270,545],[390,450],[510,380],[630,330],[745,300]],P.T.accentText,4);
}
function lattice(P,m){
  const inputs=[[120,220],[120,400],[120,580]],outputs=[[880,220],[880,400],[880,580]];P.rect(400,250,200,300,P.T.accentSurface,P.T.accentText,28,4);P.text('SHARED\nBASE',500,350,26,P.T.accentText,750,'center',160);
  inputs.forEach(([x,y],i)=>{box(P,x-70,y-38,140,76,cue(m,i),active(m,i));arrow(P,[x+70,y],[400,y+(400-y)*.45],active(m,i));});outputs.forEach(([x,y],i)=>{P.circle(x,y,25,P.T.surface,P.T.accentText,3);arrow(P,[600,y+(400-y)*.45],[x-25,y],q(m)>.55);});
}
function constraint(P,m){
  const p=[[500,125],[155,625],[845,625]];P.path([p[0],p[1],p[2],p[0]],P.T.rule,3);m.nodes.slice(0,3).forEach((node,i)=>{const [x,y]=p[i];P.circle(x,y,32,active(m,i)?P.T.accentSurface:P.T.surface,active(m,i)?P.T.accentText:P.T.rule,4);label(P,node.label,x,y+(i===0?48:42),190,19,650,active(m,i)?P.T.accentText:P.T.muted);});P.circle(500,450,70,P.T.accentSurface,P.T.accentText,4);P.text('BASE',500,435,22,P.T.accentText,700,'center',100);
}
function treeFeedback(P,m){
  const nodes=[[150,400],[360,260],[360,540],[590,175],[590,330],[590,490],[590,645],[830,330]];const edges=[[0,1],[0,2],[1,3],[1,4],[2,5],[2,6],[4,7]];edges.forEach(([a,b],i)=>arrow(P,nodes[a],nodes[b],q(m)>(i+1)/edges.length,2));nodes.forEach(([x,y],i)=>P.circle(x,y,i===7?25:18,i===7?P.T.accentSurface:P.T.surface,i===7?P.T.accentText:P.T.rule,i===7?4:2));P.rect(760,545,170,90,P.T.surface,P.T.accentText,18,3);P.text('EVALUATOR',845,575,19,P.T.accentText,700,'center',140);P.path([[845,545],[830,355]],P.T.accentText,3,[6,7]);
}
function tiers(P,m){
  const rows=[{y:155,h:130,w:720,label:'CONTEXT'},{y:335,h:170,w:580,label:'STATE'},{y:555,h:140,w:430,label:'MEMORY'}];rows.forEach((r,i)=>{const x=(1000-r.w)/2;P.rect(x,r.y,r.w,r.h,i===2?P.T.accentSurface:P.T.surface,i===2?P.T.accentText:P.T.rule,24,i===2?4:2);P.text(r.label,500,r.y+22,20,i===2?P.T.accentText:P.T.muted,700,'center',150);if(m.nodes[i])label(P,m.nodes[i].label,500,r.y+65,260,18,600,i===2?P.T.accentText:P.T.muted);if(i<2)arrow(P,[500,r.y+r.h],[500,rows[i+1].y],q(m)>(i+1)*.28);});
}
function rollout(P,m){
  P.circle(190,400,45,P.T.accentSurface,P.T.accentText,4);P.text('STATE',190,386,19,P.T.accentText,700,'center',90);const mid=[[430,210],[430,400],[430,590]],end=[[760,150],[760,290],[760,400],[760,510],[760,650]];mid.forEach((p,i)=>{arrow(P,[235,400],p,q(m)>.18+i*.12);P.circle(...p,22,P.T.surface,P.T.accentText,3);});end.forEach((p,i)=>{const src=mid[i%3];arrow(P,src,p,q(m)>.55+i*.06,2);P.circle(...p,16,i===2?P.T.accentSurface:P.T.surface,i===2?P.T.accentText:P.T.rule,2);});P.text('SELECT',760,690,20,P.T.accentText,700,'center',100);
}
function controlLoop(P,m){
  const boxes=[['SENSE',165,330],['MODEL',385,165],['PLAN',615,165],['ACT',835,330],['WORLD',500,610]];boxes.forEach(([t,x,y],i)=>box(P,x-70,y-40,140,80,m.nodes[i]?.label||t,active(m,Math.min(i,m.nodes.length-1))));arrow(P,[235,330],[385,205],q(m)>.15);arrow(P,[455,165],[545,165],q(m)>.3);arrow(P,[685,205],[765,330],q(m)>.5);arrow(P,[835,370],[570,610],q(m)>.68);arrow(P,[430,610],[165,370],q(m)>.82);}

export function drawFromCaveMechanism(P,m){
  const draw={
    sequence,stack,split,converge,'radial-loop':radial,grid,transform,dag,'dual-curve':dualCurve,boundary,stream,mapping,'counterexample-loop':counterLoop,cycle,'dual-growth':dualGrowth,'cycle-sidechannel':(P,m)=>cycle(P,m,true),remap,benchmark,race,hub,surface,lattice,'constraint-field':constraint,'tree-feedback':treeFeedback,tiers,rollout,'control-loop':controlLoop
  }[m.style];
  if(!draw) throw new Error(`from-cave visuals: unsupported style ${m.style}`);
  draw(P,m);title(P,m);
}
