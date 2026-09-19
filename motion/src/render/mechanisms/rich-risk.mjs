import {beat,show,text,small,caption,arrow,node,cross,clamp,tr,iconLock} from './rich-core.mjs';
export function complexityRegimes(P,s,t){const T=P.T,qs=s.cues.map((_,i)=>beat(s,t,i));small(P,tr(P,'REGÍMENES DEL ESTUDIO · SIN MAGNITUDES INVENTADAS','STUDY REGIMES · NO INVENTED MEASUREMENTS'),40,43);
 const labels=tr(P,['Simple','Intermedio','Complejo'],['Simple','Intermediate','Complex']),x=[71,383,695];
 const comparisons=tr(P,[['Estándar','puede superar','al razonador'],['Razonar más','puede aportar','una ventaja'],['Ambos tipos','pueden llegar','al colapso']],[['Standard models','can outperform','reasoning models'],['Extra reasoning','can provide','an advantage'],['Both types','can reach','collapse']]);
 for(let i=0;i<3;i++){const q=qs[i+1]||0;P.rect(x[i],168,270,398,T.white,T.rule,8);text(P,labels[i],x[i]+135,197,245,36,T.ink,550,'center');
  show(P,q,()=>{const symbol=i===0?'≥':i===1?'>':'×';P.text(symbol,x[i]+135,283,96,i===2?T.amber:T.accentText,550,'center',240);comparisons[i].forEach((line,j)=>text(P,line,x[i]+135,422+j*37,244,25,i===2?T.amber:T.ink,500,'center'));});}
 show(P,qs[4],()=>{text(P,tr(P,'El esfuerzo también puede dejar de crecer.','Effort can stop increasing too.'),500,630,920,40,T.accentText,550,'center');});caption(P,tr(P,'Comparaciones cualitativas; los símbolos no representan medidas numéricas.','Qualitative comparisons; symbols do not represent numerical measurements.'));
}

export function trustBoundary(P,s,t){const T=P.T,a=beat(s,t,0),b=beat(s,t,1),c=beat(s,t,2),d=beat(s,t,3);small(P,tr(P,'LOS DATOS NO HEREDAN AUTORIDAD','DATA DOES NOT INHERIT AUTHORITY'),50,40);
 P.rect(40,186,388,446,T.white,T.rule,9);P.rect(569,186,388,446,T.white,T.rule,9);text(P,tr(P,'Contenido externo','External content'),234,211,360,33,T.ink,550,'center');text(P,tr(P,'Instrucciones','Instructions'),763,211,357,36,T.ink,550,'center');
 show(P,a,()=>{for(let i=0;i<5;i++)P.path([[79,307+i*44],[366-(i%2)*55,307+i*44]],T.rule,5);});
 show(P,b,()=>{P.rect(71,378,324,62,T.amberSurface,T.amber,4,2);text(P,tr(P,'Orden no confiable','Untrusted command'),233,395,308,28,T.amber,550,'center');});
 P.path([[498,151],[498,664]],T.accentText,3,1,[8,9]);show(P,c,()=>{arrow(P,[[396,411],[575,411]],c,T.amber,4);node(P,tr(P,'Confusión de autoridad','Authority confusion'),596,370,335,107,{active:true,warning:true,size:31});});
 show(P,d,()=>{arrow(P,[[763,480],[763,554]],d,T.amber);text(P,'API',763,563,200,43,T.amber,550,'center');});caption(P,tr(P,'Esquema defensivo de una frontera rota; no incluye una carga de ataque.','Defensive schematic of a broken boundary; no attack payload is included.'));
}
export function retrievalSubstitution(P,s,t){const T=P.T,a=beat(s,t,0),b=beat(s,t,1),c=beat(s,t,2),d=beat(s,t,3);small(P,tr(P,'UNA CONSULTA BENIGNA RECUPERA OTRO CONTEXTO','A BENIGN QUERY RETRIEVES A DIFFERENT CONTEXT'),43,41);
 node(P,tr(P,'Consulta benigna','Benign query'),60,134,872,82,{active:true,size:38});
 const ys=[276,375,474];ys.forEach((y,i)=>{const selected=i===1&&a>.1;P.rect(81,y,376,72,selected?T.amberSurface:T.white,selected?T.amber:T.rule,5);text(P,i===1?tr(P,'Contexto contaminado','Contaminated context'):tr(P,'Documento normal','Ordinary document'),269,y+21,352,27,selected?T.amber:T.muted,500,'center');});
 show(P,a,()=>arrow(P,[[458,411],[563,411]],a,T.amber));node(P,tr(P,'Criterios de seguridad','Safety criteria'),581,312,351,169,{active:b>.1,size:37});
 show(P,b,()=>{arrow(P,[[758,481],[758,582]],b,T.amber);text(P,tr(P,'Negativa','Refusal'),758,593,373,49,T.amber,550,'center');});show(P,c,()=>{P.path([[585,297],[932,297]],T.rule,2);small(P,tr(P,'Transferible entre modelos','Transfer across models'),756,244,407,'center');});caption(P,tr(P,'El fallo mostrado afecta a disponibilidad, no produce una salida dañina.','The illustrated failure affects availability; it does not produce harmful output.'));
}
export function stoppingRegions(P,s,t){const T=P.T,a=beat(s,t,0),b=beat(s,t,1),c=beat(s,t,2),d=beat(s,t,3);small(P,tr(P,'PARAR POR SUFICIENCIA O POR AGOTAMIENTO','STOP FOR SUFFICIENCY OR EXHAUSTION'),45,42);
 P.rect(87,182,826,397,T.white,T.rule,0,1);P.rect(87,182,826,91,T.accentSurface);P.rect(87,489,826,90,T.amberSurface);P.path([[87,273],[913,273]],T.accentText,2,1,[5,7]);P.path([[87,489],[913,489]],T.amber,2,1,[5,7]);
 text(P,tr(P,'Confianza suficiente','Sufficient confidence'),790,200,228,28,T.accentText,550,'center');text(P,tr(P,'Seguir evaluando','Continue evaluating'),790,350,228,28,T.muted,500,'center');text(P,tr(P,'Caso irresoluble','Unsolvable instance'),790,500,228,28,T.amber,550,'center');
 show(P,b,()=>{P.path([[144,420],[306,394],[461,325],[613,240]],T.accentText,4,b);if(b>.98)P.check(613,240,T.accentText,1.4);});show(P,c,()=>{P.path([[144,420],[294,445],[461,466],[644,543]],T.amber,4,c);if(c>.98)cross(P,644,543,14);});
 show(P,d,()=>text(P,tr(P,'Calibrar la regla con datos de validación.','Calibrate the rule using validation data.'),500,650,928,36,T.accentText,550,'center'));caption(P,tr(P,'Señales esquemáticas: no son probabilidades ni umbrales calibrados reales.','Schematic signals: not actual calibrated probabilities or thresholds.'));
}
export function defenseLayers(P,s,t){const T=P.T,qs=s.cues.map((_,i)=>beat(s,t,i));small(P,tr(P,'ACOTAR CONSECUENCIAS CON BARRERAS DISTINTAS','BOUND CONSEQUENCES WITH DIFFERENT BARRIERS'),44,41);
 const titles=tr(P,['Permisos','Contexto','Verificación'],['Permissions','Context','Verification']);for(let i=0;i<3;i++){const x=183+i*263;P.rect(x,177,19,406,T.accentSurface,T.accentText,2,2);text(P,titles[i],x+8,110,245,31,T.ink,550,'center');P.path([[x-43,397],[x+65,397]],T.background,36);if(qs[i]>.1){P.path([[x+9,366],[x+9,429]],T.accentText,4);P.check(x+9,455,T.accentText,1.1);}}
 const path=[[65,398],[901,398]];P.path(path,T.rule,3);const progress=.16*(qs[0]||0)+.30*(qs[1]||0)+.30*(qs[2]||0);P.traveler(path,Math.min(.99,progress),T.accent,12);
 show(P,qs[3],()=>{P.rect(68,633,858,65,T.white,T.rule,4);text(P,tr(P,'Tiempo · Tokens · Herramientas','Time · Tokens · Tools'),500,649,808,34,T.ink,500,'center');});show(P,qs[4],()=>{iconLock(P,879,324,T.accentText);text(P,tr(P,'Actuar o abstenerse','Act or abstain'),832,512,302,31,T.accentText,550,'center');});caption(P,tr(P,'Las barreras tienen funciones diferentes; ninguna garantiza seguridad por sí sola.','The barriers have different functions; none guarantees safety on its own.'));
}
