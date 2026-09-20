const clamp=v=>Math.max(0,Math.min(1,v));
const mix=(a,b,t)=>a+(b-a)*t;
const pos=(a,b,t)=>[mix(a[0],b[0],t),mix(a[1],b[1],t)];
const dot=(P,p,r=10)=>P.circle(p[0],p[1],r,P.T.accentText,P.T.surface,2);
const segment=(P,a,b,t)=>{const p=pos(a,b,clamp(t));P.path([a,p],P.T.accentText,5);dot(P,p,9);};
const cyclePoint=(points,t)=>{
  const n=points.length;const u=((t%1)+1)%1*n;const i=Math.floor(u)%n;return pos(points[i],points[(i+1)%n],u-Math.floor(u));
};

/**
 * Low-level semantic choreography shared across distinct explanatory topologies.
 * It never changes the topology; it animates flow, allocation or state through the already-authored mechanism.
 */
export function drawFromCaveSemanticMotion(P,m){
  if(m.reducedMotion) return;
  const t=clamp(m.progress), style=m.style;
  if(style==='sequence'){segment(P,[110,400],[890,400],t);return;}
  if(style==='stack'){const p=[840,mix(205,600,t)];P.path([[840,205],p],P.T.accentText,4);dot(P,p);return;}
  if(style==='split'){const lane=t<.5?260:535;const u=(t<.5?t:t-.5)*2;segment(P,[170,lane],[820,lane],u);return;}
  if(style==='converge'){const outer=[[150,150],[850,150],[150,650],[850,650]];const i=Math.min(3,Math.floor(t*4));const u=t*4-i;dot(P,pos(outer[i],[500,400],u),11);return;}
  if(style==='radial-loop'){const a=-Math.PI/2+t*Math.PI*2;dot(P,[500+Math.cos(a)*250,400+Math.sin(a)*250],11);return;}
  if(style==='grid'){const cells=[[245,265],[497,265],[749,265],[245,457],[497,457],[749,457]];const i=Math.min(cells.length-1,Math.floor(t*cells.length));P.circle(cells[i][0],cells[i][1],68+8*Math.sin(t*Math.PI*12),null,P.T.accentText,4);return;}
  if(style==='transform'){segment(P,[150,400],[850,400],t);return;}
  if(style==='dag'){const route=[[120,390],[360,220],[650,390],[870,390]];dot(P,cyclePoint(route,t*.75),11);return;}
  if(style==='dual-curve'||style==='dual-growth'){const x=mix(140,850,t);P.path([[x,210],[x,650]],P.T.accentText,2,[5,7]);dot(P,[x,mix(590,260,t)],9);return;}
  if(style==='boundary'){const y=mix(205,610,t);dot(P,[835,y],11);return;}
  if(style==='stream'){const rows=[221,346,471,596];const i=Math.min(3,Math.floor(t*4)),u=t*4-i;dot(P,pos([335,rows[i]],[570,rows[i]],u),10);return;}
  if(style==='mapping'){const route=[[315,375],[430,375],[503,245],[650,365],[750,375],[920,375]];dot(P,cyclePoint(route,t*.72),10);return;}
  if(style==='counterexample-loop'){dot(P,cyclePoint([[445,360],[445,490],[650,490],[650,360]],t),10);return;}
  if(style==='cycle'||style==='cycle-sidechannel'){dot(P,cyclePoint([[500,212],[748,390],[500,568],[252,390]],t),10);return;}
  if(style==='remap'){const route=[[330,400],[460,400],[540,400],[680,400],[755,400]];dot(P,cyclePoint(route,t*.8),10);return;}
  if(style==='benchmark'){
    const a=clamp(t*1.4),b=clamp((t-.25)*1.4);P.rect(300,650-330*a,160,330*a,'rgba(38,166,154,0.10)',P.T.accentText,16,2);P.rect(600,650-190*b,160,190*b,'rgba(38,166,154,0.20)',P.T.accentText,16,3);return;
  }
  if(style==='race'){const x=mix(255,775,t);dot(P,[x,230],10);for(let r=0;r<3;r++)dot(P,[x,480+r*85],6);return;}
  if(style==='hub'){const outer=[[180,190],[820,190],[180,610],[820,610]];const i=Math.min(3,Math.floor(t*4)),u=t*4-i;dot(P,pos([500,400],outer[i],u),10);return;}
  if(style==='surface'){dot(P,[mix(310,690,t),520-250*Math.sin(Math.PI*t)],12);return;}
  if(style==='lattice'){const ys=[220,400,580];const i=Math.min(2,Math.floor(t*3)),u=t*3-i;dot(P,pos([190,ys[i]],[400,mix(ys[i],400,.45)],u),10);return;}
  if(style==='constraint-field'){const target=[[500,125],[155,625],[845,625]][Math.min(2,Math.floor(t*3))];const u=t*3-Math.floor(t*3);dot(P,pos([500,450],target,u),10);return;}
  if(style==='tree-feedback'){dot(P,cyclePoint([[150,400],[360,260],[590,330],[830,330]],t*.72),10);return;}
  if(style==='tiers'){segment(P,[500,220],[500,660],t);return;}
  if(style==='rollout'){const target=[[760,150],[760,400],[760,650]][Math.min(2,Math.floor(t*3))];const u=t*3-Math.floor(t*3);dot(P,pos([190,400],target,u),10);return;}
  if(style==='control-loop'){dot(P,cyclePoint([[235,330],[385,205],[615,165],[765,330],[570,610],[165,370]],t),10);return;}
}
