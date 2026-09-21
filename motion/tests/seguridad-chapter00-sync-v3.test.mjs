import test from 'node:test';
import assert from 'node:assert/strict';
import {SEGURIDAD_SYNC_PROFILE,seguridadMechanismSeconds,seguridadTextState} from '../src/seguridad/timeline.mjs';
const es={
 'S00-C1':'Instrucciones privilegiadas y datos externos llegan al modelo por el mismo medio: lenguaje natural.',
 'S00-C2':'Una señal no confiable puede viajar por retrieval, memoria o tools antes de afectar una decisión.',
 'S00-C3':'La influencia no determina por sí sola el daño: los permisos deciden qué datos y acciones quedan al alcance.',
 'S00-C4':'Prompt injection, jailbreaks y persistencia son mecanismos distintos que pueden encadenarse.',
 'S00-C5':'Una defensa robusta combina controles de influencia con fronteras independientes de autorización.'
};
test('chapter 00 exposes three progressive text beats per scene',()=>{for(const [id,text] of Object.entries(es)){const s=seguridadTextState(text,id,0,12,{locale:'es'});assert.equal(s.cues.length,3,id);assert.deepEqual(s.cues.map(x=>x.text_at),[.55,3.5,6.45]);assert.deepEqual(s.cues.map(x=>x.visual_at),[1.25,4.2,7.15]);assert.equal(s.cues[0].range.start,0);assert.equal(s.cues.at(-1).range.end,text.length);for(let i=1;i<s.cues.length;i++)assert.equal(s.cues[i-1].range.end,s.cues[i].range.start);}});
test('each text beat leads the corresponding visual phase',()=>{for(const [id,text] of Object.entries(es)){const s=seguridadTextState(text,id,5,12,{locale:'es'});for(const c of s.cues)assert.ok(c.text_at<c.visual_at,`${id}/${c.id}`);}});
test('mechanism maps semantic phases to separate motion windows',()=>{assert.equal(seguridadMechanismSeconds(1.25,12,{storyMode:true}),0);assert.ok(seguridadMechanismSeconds(3,12,{storyMode:true})>0);assert.ok(seguridadMechanismSeconds(4.2,12,{storyMode:true})>=4-1e-9);assert.ok(seguridadMechanismSeconds(7.15,12,{storyMode:true})>=8-1e-9);assert.equal(seguridadMechanismSeconds(10.25,12,{storyMode:true}),12);});
test('reduced motion resolves text and mechanism to final state',()=>{const s=seguridadTextState(es['S00-C1'],'S00-C1',0,12,{locale:'es',reducedMotion:true});assert.ok(s.cues.every(c=>c.visible&&c.alpha===1));assert.equal(seguridadMechanismSeconds(0,12,{storyMode:true,reducedMotion:true}),12);});
test('profile version is explicit',()=>assert.equal(SEGURIDAD_SYNC_PROFILE.version,'seguridad-semantic-sync-v3'));
