import {LABELS} from '../labels.mjs';
export const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));
export const smooth = t => {t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
export const phase = (t,start,duration=0.8) => smooth((t-start)/duration);
export const lerp=(a,b,t)=>a+(b-a)*t;
export const mixHex=(a,b,t)=>'#'+[1,3,5].map(i=>Math.round(lerp(parseInt(a.slice(i,i+2),16),parseInt(b.slice(i,i+2),16),clamp(t))).toString(16).padStart(2,'0')).join('');
export const number=(n,locale='es')=>new Intl.NumberFormat(locale,{maximumFractionDigits:0}).format(n);
export class Paint {
  constructor(ctx,theme,issues=[],locale='es',labels={}) {this.c=ctx;this.T=theme;this.issues=issues;this.locale=locale;this.labels={...(LABELS[locale.split('-')[0]]||LABELS.en),...labels};}
  l(key){return this.labels[key];}
  font(size,weight=400,family=this.T.bodyFont) {this.c.font=`${weight} ${size}px "${family}", ${family===this.T.headlineFont?"Georgia, serif":"Arial, sans-serif"}`;}
  measure(s,size,weight=400,family=this.T.bodyFont) {this.font(size,weight,family);return this.c.measureText(String(s)).width;}
  text(s,x,y,size=28,color=this.T.ink,weight=400,align='left',maxWidth=10000,family=this.T.bodyFont) {
    const c=this.c;this.font(size,weight,family);c.fillStyle=color;c.textAlign=align;c.textBaseline='top';
    const w=c.measureText(String(s)).width;
    if(w>maxWidth+1)this.issues.push({type:'text-overflow',text:String(s),width:w,maxWidth,size});
    c.fillText(String(s),x,y);return w;
  }
  lines(text,maxWidth,size,weight=400,family=this.T.bodyFont) {
    const words=String(text).split(/\s+/).filter(Boolean);const result=[];let line='';
    for(const word of words){const next=line?line+' '+word:word;if(line&&this.measure(next,size,weight,family)>maxWidth){result.push(line);line=word;}else line=next;}
    if(line)result.push(line);return result;
  }
  wrap(s,x,y,maxWidth,size=28,color=this.T.ink,weight=400,lineHeight=1.38,align='left') {
    const lines=this.lines(s,maxWidth,size,weight);for(const [i,line] of lines.entries())this.text(line,x,y+i*size*lineHeight,size,color,weight,align,maxWidth);
    return y+lines.length*size*lineHeight;
  }
  rect(x,y,w,h,fill=null,stroke=null,r=0,lw=2) {
    const c=this.c;c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}
  }
  circle(x,y,r,fill=null,stroke=null,lw=2) {const c=this.c;c.beginPath();c.arc(x,y,r,0,2*Math.PI);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
  path(points,color=this.T.ink,width=2,progress=1,dash=[]) {
    const c=this.c;let lengths=[],total=0;
    for(let i=1;i<points.length;i++){const l=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);lengths.push(l);total+=l;}
    let remain=total*clamp(progress);c.beginPath();c.moveTo(...points[0]);
    for(let i=1;i<points.length&&remain>0;i++){const a=points[i-1],b=points[i],r=Math.min(1,remain/lengths[i-1]);c.lineTo(lerp(a[0],b[0],r),lerp(a[1],b[1],r));remain-=lengths[i-1];}
    c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.setLineDash(dash);c.stroke();c.setLineDash([]);
  }
  traveler(points,t,color=this.T.accent,r=6) {
    if(t<=0||t>=1)return;let total=0;const ls=[];
    for(let i=1;i<points.length;i++){const l=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);ls.push(l);total+=l;}
    let left=t*total;
    for(let i=1;i<points.length;i++){if(left<=ls[i-1]){const q=left/ls[i-1];this.circle(lerp(points[i-1][0],points[i][0],q),lerp(points[i-1][1],points[i][1],q),r,color);return;}left-=ls[i-1];}
  }
  check(x,y,color=this.T.accentText,scale=1) {this.path([[x-9*scale,y],[x-2*scale,y+7*scale],[x+12*scale,y-9*scale]],color,3);}
  enter(t,start,x,y,draw,duration=0.6) {const q=phase(t,start,duration);if(!q)return;const c=this.c;c.save();c.globalAlpha*=q;c.translate(x,y+12*(1-q));draw(q);c.restore();}
}
