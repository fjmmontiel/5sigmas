import {beat,show,text,small,caption,arrow,node,cross,clamp,tr} from './rich-core.mjs';

export function counterfactual(P,s,t){const T=P.T,a=beat(s,t,0),b=beat(s,t,1),c=beat(s,t,2);small(P,tr(P,'MISMA FORMA. CAMBIA SOLO EL FONDO.','SAME SHAPE. CHANGE ONLY THE BACKGROUND.'),65,44);
 const xs=[90,585];for(let i=0;i<2;i++){const x=xs[i];text(P,i?tr(P,'Prueba','Test'):tr(P,'Evaluación inicial','Initial evaluation'),x+160,125,350,34,T.ink,550,'center');P.rect(x,209,320,280,i&&b>.15?T.white:T.accentSurface,T.rule,12,2);P.circle(x+160,349,79,null,T.ink,5);small(P,tr(P,'Etiqueta correcta: círculo','Correct label: circle'),x+160,530,385,'center');}
 arrow(P,[[436,345],[551,345]],b);show(P,a,()=>{node(P,tr(P,'Atajo: fondo','Shortcut: background'),73,617,380,80,{active:true,size:30});});show(P,b,()=>{node(P,tr(P,'Falla tras el cambio','Fails after the change'),548,617,380,80,{active:true,warning:true,size:30});});show(P,c,()=>{P.circle(250,349,93,null,T.accentText,4);P.circle(745,349,93,null,T.accentText,4);P.path([[343,349],[652,349]],T.accentText,2,1,[4,7]);text(P,tr(P,'La característica relevante se conserva.','The relevant feature is preserved.'),500,579,940,26,T.accentText,550,'center');});caption(P,tr(P,'Contrafactual ilustrativo: no son imágenes ni resultados del estudio.','Illustrative counterfactual: not images or results from the study.'));
}

export function framingShift(P,s,t){const T=P.T,a=beat(s,t,0),b=beat(s,t,1),c=beat(s,t,2),d=beat(s,t,3);
 small(P,tr(P,'MISMO TEXTO, DISTINTO ENCUADRE','SAME TEXT, DIFFERENT FRAMING'),55,42);
 P.rect(345,167,310,321,T.white,T.rule,8);for(let i=0;i<7;i++)P.path([[378,204+i*36],[i%3===0?580:620,204+i*36]],T.rule,4);
 text(P,tr(P,'Texto a evaluar','Text to review'),500,519,435,36,T.ink,550,'center');
 show(P,a,()=>{node(P,tr(P,'«Me gusta»','“I like it”'),30,241,272,97,{active:true,size:36});node(P,tr(P,'«No me gusta»','“I dislike it”'),698,241,272,97,{active:true,size:33});});
 show(P,b,()=>{arrow(P,[[303,290],[346,290]],b);arrow(P,[[698,290],[655,290]],b);});
 P.path([[85,649],[915,649]],T.rule,3);P.path([[500,634],[500,664]],T.muted,2);small(P,tr(P,'Más crítico','More critical'),75,692,280);small(P,tr(P,'Más favorable','More positive'),925,692,300,'right');
 show(P,c,()=>{P.circle(500+300*c,649,13,T.accentText);arrow(P,[[500,649],[500+300*c,649]],c);});show(P,d,()=>{P.circle(500-300*d,649,13,T.amber);arrow(P,[[500,649],[500-300*d,649]],d,T.amber);});caption(P,tr(P,'Dirección cualitativa del sesgo; la distancia no representa un efecto medido.','Qualitative direction of bias; distance is not a measured effect size.'));
}

export function objectiveBypass(P,s,t){const T=P.T,a=beat(s,t,0),b=beat(s,t,1),c=beat(s,t,2),d=beat(s,t,3);
 small(P,tr(P,'OBJETIVO REAL ≠ ESTADO DE VICTORIA','REAL OBJECTIVE ≠ A WIN FLAG'),50,44);
 const x=80,y=180,z=42;for(let j=0;j<8;j++)for(let i=0;i<8;i++)P.rect(x+i*z,y+j*z,z,z,(i+j)%2?T.accentSurface:T.white,T.rule,0,1);
 P.circle(x+3.5*z,y+5.5*z,12,T.ink);P.rect(x+3.5*z-9,y+5.5*z+12,18,21,T.ink,null,2);
 text(P,tr(P,'Ganar jugando','Win by playing'),248,553,377,34,T.ink,550,'center');
 node(P,tr(P,'Reglas del juego','Game rules'),558,222,367,99,{active:a>.1,size:36});node(P,tr(P,'victoria = true','win = true'),558,445,367,110,{active:b>.1,warning:b>.1,size:37});
 arrow(P,[[420,348],[500,348],[500,271],[558,271]],a);show(P,b,()=>{arrow(P,[[247,587],[247,657],[741,657],[741,555]],b,T.amber,4);small(P,tr(P,'El proxy cambia; el tablero no.','The proxy changes; the board does not.'),500,699,925,'center');});
 show(P,c,()=>{P.text('o3',742,86,41,T.muted,500,'center');});show(P,d,()=>{P.text(`${s.data.evidenceMetric?.value??88}%`,742,130,73,T.accentText,600,'center');});caption(P,tr(P,'Esquema de bypass; el porcentaje corresponde al estudio citado.','Bypass schematic; the percentage belongs to the cited study.'));
}

export function errorPropagation(P,s,t){const T=P.T,a=beat(s,t,0),b=beat(s,t,1),c=beat(s,t,2);small(P,tr(P,'LOCALIZAR EL ERROR ANTES DE PROPAGARLO','LOCATE THE ERROR BEFORE PROPAGATING IT'),55,43);
 P.text('17 × 6',500,158,89,T.ink,550,'center',900,T.headlineFont);
 show(P,a,()=>{P.text('60 +',362,345,79,T.ink,500,'center');P.text(c>.7?'42':'44',639,345,79,c>.7?T.accentText:T.amber,600,'center');P.path([[548,441],[730,441]],c>.7?T.accentText:T.amber,4);});
 show(P,b,()=>{arrow(P,[[500,443],[500,525]],b,b>.05&&c<.7?T.amber:T.accentText);P.text(c>.7?'102':'104',500,549,98,c>.7?T.accentText:T.amber,600,'center');});
 show(P,c,()=>{text(P,'7 × 6 = 42',775,235,400,35,T.accentText,550,'center');arrow(P,[[807,284],[807,389],[731,389]],c);if(c>=.7)P.check(786,589,T.accentText,1.7);});caption(P,tr(P,'Ejemplo aritmético exacto; no muestra una traza interna de un modelo.','Exact arithmetic example; not an internal model trace.'));
}

export function verificationMatrix(P,s,t){const T=P.T,qs=s.cues.map((_,i)=>beat(s,t,i));small(P,tr(P,'BUSCAR INVARIANTES, NO UNA SOLA RESPUESTA','LOOK FOR INVARIANTS, NOT JUST ONE ANSWER'),55,39);
 const labels=tr(P,['Formato','Pasos','Muestras','Fuera de distribución'],['Format','Steps','Samples','Out of distribution']);
 const values=[['102','102','102'],['60','42','102'],['102','104','102'],['?','?','?']];
 for(let j=0;j<4;j++){const y=177+j*118;text(P,labels[j],37,y+34,267,30,T.ink,500);for(let i=0;i<3;i++){const x=346+i*201;P.rect(x,y,177,95,T.white,T.rule,7,1.6);show(P,qs[Math.min(j,qs.length-1)],()=>{P.text(values[j][i],x+88,y+24,43,j===2&&i===1?T.amber:T.accentText,550,'center',160);});}}
 show(P,qs.at(-1),()=>{P.path([[329,665],[918,665]],T.accentText,3);text(P,tr(P,'Verificador externo antes de actuar','External verification before acting'),500,700,920,32,T.accentText,550,'center');});caption(P,tr(P,'Matriz ilustrativa de comprobaciones; «?» significa no verificado.','Illustrative check matrix; “?” means not verified.'));
}
