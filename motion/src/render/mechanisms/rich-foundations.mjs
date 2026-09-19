import {beat,show,text,small,caption,arrow,node,cross,circleArc,bracket,tileGrid,iconLock,clamp,phase,tr} from './rich-core.mjs';

/** The distributive law is shown as area partition, not a numbered list. */
export function areaPartition(P,s,t){const T=P.T,a=beat(s,t,0),b=beat(s,t,1),c=beat(s,t,2);
 small(P,tr(P,'EJEMPLO ILUSTRATIVO · DESCOMPONER','ILLUSTRATIVE EXAMPLE · DECOMPOSE'),65,40);
 P.text('17 × 6',500,105,82,T.ink,600,'center',860,T.headlineFont);
 const x=120,y=285,unit=42;tileGrid(P,x,y,17,6,unit,Math.round(102*a),10);
 bracket(P,x,y-30,10*unit-4,'10');bracket(P,x+10*unit+15,y-30,7*unit-4,'7');
 text(P,'6',75,380,60,38,T.muted,500,'center');
 show(P,a,()=>{P.text('60',x+5*unit,563,54,T.accentText,550,'center');P.text('+',x+10*unit+4,572,36,T.muted,400,'center');P.text('42',x+13.5*unit+15,563,54,T.accentText,550,'center');});
 show(P,b,()=>{P.path([[120,649],[851,649]],T.rule,2);P.path([[120,649],[851,649]],T.accentText,4,b);small(P,tr(P,'Cada celda representa una multiplicación elemental.','Each cell represents an elementary multiplication.'),500,680,920,'center');});
 show(P,c,()=>{P.rect(730,103,180,100,T.background);P.text('104',820,113,51,T.muted,450,'center');cross(P,896,140,12);P.text('102',500,193,49,T.accentText,600,'center');});
 caption(P,tr(P,'Geometría exacta: 17 × 6 = 10 × 6 + 7 × 6.','Exact geometry: 17 × 6 = 10 × 6 + 7 × 6.'));
}

/** A finite budget is distributed into actual resource channels. */
export function budgetAllocation(P,s,t){const T=P.T,a=beat(s,t,0),b=beat(s,t,1);small(P,tr(P,'CÓMPUTO DISPONIBLE','AVAILABLE COMPUTE'),60,48);P.text(tr(P,'Asignar, no solo aumentar.','Allocate, not just increase.'),60,96,48,T.ink,550,'left',900,T.headlineFont);
 const labels=tr(P,['Pasos','Muestras','Verificación'],['Steps','Samples','Verification']);
 for(let i=0;i<12;i++){const tx=120+i*63;P.circle(tx,250,17,T.accentSurface,T.accentText,1.5);const dest=i%3,xx=180+dest*318,yy=443+Math.floor(i/3)*42,q=clamp(a*1.45-i*.035);if(q>0)P.circle(tx+(xx-tx)*q,250+(yy-250)*q,14,T.accentText);}
 for(let k=0;k<3;k++){const x=65+k*318;P.rect(x,378,256,287,null,T.rule,9,2);text(P,labels[k],x+128,314,292,34,T.ink,550,'center');}
 show(P,b,()=>{text(P,tr(P,'Más presupuesto → más operaciones','Larger budget → more operations'),500,691,930,32,T.accentText,550,'center');});caption(P,tr(P,'Reparto ilustrativo, no una política óptima ni una medición de calidad.','Illustrative allocation, not an optimal policy or a quality measurement.'));
}

/** A editorial map: all five questions stay spatially stable. */
export function topicMap(P,s,t){const T=P.T,items=s.data.items,positions=[[500,104],[812,298],[710,567],[290,567],[188,298]];
 P.circle(500,351,95,T.accentSurface,T.accentText,2);text(P,tr(P,'Razonar','Reasoning'),500,331,180,36,T.accentText,550,'center');
 items.forEach((it,i)=>{const q=beat(s,t,i),[x,y]=positions[i];P.path([[500,351],[x,y+38]],T.rule,2);show(P,q,()=>{P.path([[500,351],[x,y+38]],T.accentText,3);});node(P,it.label,x-133,y,266,82,{active:q>.05,size:28});show(P,q,()=>{small(P,it.detail,x,y+99,290,'center');});});
 caption(P,s.data.note||tr(P,'Cinco preguntas conectadas; no una cadena causal.','Five connected questions, not a causal chain.'));
}

/** Qualitative trade-offs have named vertices, not invented quantitative axes. */
export function tradeoffMap(P,s,t){const T=P.T,items=s.data.items,xy=[[500,151],[168,574],[832,574]],qs=items.map((_,i)=>beat(s,t,i));
 P.path([[500,151],[168,574],[832,574],[500,151]],T.rule,2);
 items.forEach((it,i)=>{const [x,y]=xy[i];P.circle(x,y,32,qs[i]>.05?T.accentText:T.white,T.rule,2);show(P,qs[i],()=>{const ylab=i===0?58:628; text(P,it.label,x,ylab,330,36,T.ink,550,'center');small(P,it.detail,x,ylab+53,320,'center');});});
 const q=qs[2];show(P,Math.max(...qs),()=>{P.circle(500,420,62,T.accentSurface,T.accentText,2);text(P,tr(P,'Tarea','Task'),500,399,130,33,T.accentText,550,'center');xy.forEach(([x,y],i)=>P.path([[500,420],[x,y]],T.accentText,2,qs[i]));});
 caption(P,tr(P,'Relación cualitativa: la posición no representa una puntuación.','Qualitative relationship: position does not represent a score.'));
}

export function algebraProof(P,s,t){const T=P.T,a=beat(s,t,0),b=beat(s,t,1),c=beat(s,t,2);small(P,tr(P,'UN PROBLEMA, TRANSFORMACIONES VERIFICABLES','ONE PROBLEM, CHECKABLE TRANSFORMATIONS'),60,40);
 P.text('17 × 6',500,157,92,T.ink,600,'center',900,T.headlineFont);
 show(P,a,()=>{P.text('(10 + 7) × 6',500,327,73,T.accentText,550,'center',900);P.path([[207,279],[793,279]],T.rule,2);});
 show(P,b,()=>{P.text('60 + 42 = 102',500,503,66,T.ink,550,'center',900);arrow(P,[[500,428],[500,470]],b);});
 show(P,c,()=>{P.rect(99,635,801,70,T.accentSurface,null,6);text(P,tr(P,'Comprobar cada igualdad evita propagar el error.','Check each equality before carrying an error forward.'),500,652,770,29,T.accentText,550,'center');});caption(P,tr(P,'Ejemplo exacto, no una cadena interna observada en un LLM.','Exact example, not an observed internal chain of an LLM.'));
}

export function learningPhases(P,s,t){const T=P.T,train=s.cues.findIndex(q=>q.actions.some(a=>a.target==='pipeline.train')),infer=s.cues.findIndex(q=>q.actions.some(a=>a.target==='pipeline.infer')),a=beat(s,t,Math.max(0,train)),b=beat(s,t,infer<0?2:infer);const d=s.data.items;
 text(P,d[0].label,230,55,415,33,T.ink,600,'center');text(P,d[1].label,762,55,415,33,T.ink,600,'center');P.path([[500,126],[500,686]],T.rule,1.5,1,[6,7]);
 [230,762].forEach((cx,side)=>{const q=side?b:a;show(P,q,()=>{P.text('W',cx,135,62,T.ink,550,'center',190,T.headlineFont);for(let y=0;y<5;y++)for(let x=0;x<5;x++){const on=side?((x+y)%3===0):((x+y+Math.floor(a*5))%3===0);P.rect(cx-116+x*48,225+y*48,39,39,on?T.accentSurface:T.white,on?T.accentText:T.rule,3,1.8);}text(P,d[side].detail,cx,514,409,32,T.muted,400,'center');text(P,d[side].output||'',cx,639,425,34,T.accentText,550,'center');});});
 show(P,a,()=>{arrow(P,[[70,330],[40,330],[40,173],[196,173]],a);small(P,tr(P,'Actualizar','Update'),35,123,170);});show(P,b,()=>{iconLock(P,916,190,T.accentText);arrow(P,[[762,466],[762,607]],b);});caption(P,tr(P,'Esquema: aprender modifica pesos; inferir usa el modelo ya entrenado.','Schematic: learning changes weights; inference uses the trained model.'));
}

export function evaluationMatrix(P,s,t){const T=P.T,a=beat(s,t,0),b=beat(s,t,1),c=beat(s,t,2);const rows=tr(P,['Tarea','Presupuesto','Verificación'],['Task','Budget','Verification']),cols=tr(P,['Condición A','Condición B','Condición C'],['Condition A','Condition B','Condition C']);small(P,tr(P,'CAMBIAR UNA CONDICIÓN. VOLVER A EVALUAR.','CHANGE A CONDITION. EVALUATE AGAIN.'),60,48);
 cols.forEach((v,i)=>text(P,v,392+i*213,165,203,27,T.muted,500,'center'));
 rows.forEach((v,j)=>{text(P,v,50,277+j*153,221,33,T.ink,550);for(let i=0;i<3;i++){const q=[a,b,c][j],x=291+i*213,y=247+j*153;P.rect(x,y,200,119,T.white,T.rule,6);show(P,q,()=>{P.path([[x+32,y+35],[x+168,y+35]],T.accentText,4);P.path([[x+32,y+65],[x+105,y+65]],T.muted,3);P.text('?',x+167,y+72,24,T.muted,400,'center');});}});
 caption(P,tr(P,'Diseño del experimento: estas celdas no son resultados medidos.','Experimental design: these cells are not measured results.'));
}
