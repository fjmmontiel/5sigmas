import {clamp,phase,smooth} from '../paint.mjs';
export const en=P=>P.locale.startsWith('en');
export const tr=(P,es,eng)=>en(P)?eng:es;
/** Read the very same cue clock that reveals the associated sentence. */
export function beat(s,t,i,lead=.35){const q=s.cues?.[i];if(!q)return 0;return phase(t,q.at+lead,Math.max(.45,q.end-q.at-lead-.45));}
export function show(P,q,fn){if(q<=0)return;P.c.save();P.c.globalAlpha*=clamp(q);fn();P.c.restore();}
export function text(P,s,x,y,w=850,size=32,color=P.T.ink,weight=500,align='left'){return P.wrap(s,x,y,w,size,color,weight,1.24,align);}
export function small(P,s,x,y,w=880,align='left'){return text(P,s,x,y,w,25,P.T.muted,400,align);}
export function caption(P,s){small(P,s,500,754,940,'center');}
export function arrow(P,points,q=1,color=P.T.accentText,width=3){P.path(points,color,width,q);if(q>.98){const a=points.at(-2),b=points.at(-1),angle=Math.atan2(b[1]-a[1],b[0]-a[0]),r=10;P.path([[b[0]-r*Math.cos(angle-.5),b[1]-r*Math.sin(angle-.5)],b,[b[0]-r*Math.cos(angle+.5),b[1]-r*Math.sin(angle+.5)]],color,width);}}
export function node(P,label,x,y,w=260,h=96,{active=false,warning=false,size=32}={}){const T=P.T,c=warning?T.amber:T.accentText;P.rect(x,y,w,h,active?(warning?T.amberSurface:T.accentSurface):T.white,active?c:T.rule,10,active?2.5:1.5);const lines=P.lines(label,w-30,size,550);const yy=y+(h-lines.length*size*1.24)/2;text(P,label,x+w/2,yy,w-30,size,active?c:T.ink,550,'center');}
export function cross(P,x,y,r=10){P.path([[x-r,y-r],[x+r,y+r]],P.T.amber,3);P.path([[x+r,y-r],[x-r,y+r]],P.T.amber,3);}
export function circleArc(P,cx,cy,r,a,b,color=P.T.accentText,width=3){const c=P.c;c.beginPath();c.arc(cx,cy,r,a,b);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
export function bracket(P,x,y,w,label){P.path([[x,y-9],[x,y],[x+w,y],[x+w,y-9]],P.T.muted,2);text(P,label,x+w/2,y+14,w+60,29,P.T.muted,450,'center');}
export function tileGrid(P,x,y,cols,rows,size,active=0,split=cols){for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const on=(j*cols+i)<active;P.rect(x+i*size+(i>=split?15:0),y+j*size,size-4,size-4,on?(i<split?P.T.accentText:P.T.accent):P.T.white,P.T.rule,2,1);}}
export function iconLock(P,x,y,color=P.T.ink){P.path([[x-14,y],[x-14,y-14],[x-10,y-24],[x+10,y-24],[x+14,y-14],[x+14,y]],color,3);P.rect(x-22,y,44,35,P.T.background,color,6,3);P.circle(x,y+16,3,color);}
export {clamp,phase,smooth};
