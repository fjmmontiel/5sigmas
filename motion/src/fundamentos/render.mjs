import {fundamentosFrameState,fundamentosRenderMatrix,validateFundamentosMechanismCoverage} from './engine.mjs';
import {FUNDAMENTOS_THEME,validateFundamentosTheme} from './theme.mjs';
import {computeFundamentosLayout,drawFundamentosEditorial,validateFundamentosLayout} from './layout.mjs';
import {drawFundamentosMechanism} from './visuals.mjs';

export function renderFundamentosFrame(canvas,register,jobId,timeSeconds,{reducedMotion=false}={}){
  const frame=fundamentosFrameState(register,jobId,timeSeconds,{reducedMotion});
  const {job,scene}=frame,W=job.width,H=job.height;if(canvas.width!==W)canvas.width=W;if(canvas.height!==H)canvas.height=H;
  const ctx=canvas.getContext('2d',{alpha:false});ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;
  const layout=computeFundamentosLayout(ctx,{title:scene.title,body:scene.body,orientation:job.orientation});
  drawFundamentosEditorial(ctx,FUNDAMENTOS_THEME,layout,{series:job.locale==='es'?'Fundamentos de IA e IA generativa':'AI and Generative AI Foundations',title:scene.title,body:scene.body,sceneIndex:scene.index,sceneCount:5,timeSeconds:frame.timeSeconds,totalSeconds:75,family:scene.perceptualFamily});
  const m=layout.mechanism;ctx.save();ctx.translate(m.x+(m.w-1000*m.scale)/2,m.y+(m.h-800*m.scale)/2);ctx.scale(m.scale,m.scale);drawFundamentosMechanism(ctx,FUNDAMENTOS_THEME,scene.mechanism);ctx.restore();
  const issues=validateFundamentosLayout(layout,scene.conceptId);
  return Object.freeze({jobId:job.id,locale:job.locale,orientation:job.orientation,scene:scene.conceptId,sceneIndex:scene.index,timeSeconds:frame.timeSeconds,localSeconds:frame.localSeconds,bodySize:layout.bodySize,mechanismScale:m.scale,metrics:layout.metrics,issues:Object.freeze(issues),family:scene.perceptualFamily,topology:scene.topology,mechanismId:scene.mechanism.mechanismId,visualStyle:scene.mechanism.style,reducedMotion});
}
export function validateFundamentosBrowserInputs(register){
  const themeIssues=validateFundamentosTheme();if(themeIssues.length)throw new Error(`fundamentos render: theme ${themeIssues.join(',')}`);
  const coverage=validateFundamentosMechanismCoverage(register);const jobs=fundamentosRenderMatrix(register);if(jobs.length!==20)throw new Error(`fundamentos render: expected 20 jobs, got ${jobs.length}`);return Object.freeze({...coverage,jobs:jobs.length});
}
export function validateFundamentosLayouts(canvas,register){const rows=[];for(const job of fundamentosRenderMatrix(register)){for(let scene=0;scene<5;scene++){for(const fraction of [.08,.45,.92])rows.push(renderFundamentosFrame(canvas,register,job.id,scene*15+fraction*15));}}return rows;}
