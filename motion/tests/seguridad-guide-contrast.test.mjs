import test from 'node:test';
import assert from 'node:assert/strict';
import {contrastRatio} from '../src/theme.mjs';
import {SEGURIDAD_THEME as GENERIC_THEME} from '../src/seguridad/render.mjs';
import {CHAPTER01_THEME} from '../src/seguridad/chapter01.mjs';
import {SEGURIDAD_THEME as CHAPTER02_THEME} from '../src/seguridad/theme.mjs';
import {CHAPTER03_THEME} from '../src/seguridad/chapter03.mjs';
import {CHAPTER03} from '../src/seguridad/chapter03-data.mjs';
import {beatState} from '../src/seguridad/semantic-beats.mjs';

const themes=[
  ['generic',GENERIC_THEME],
  ['prompt-injection',CHAPTER01_THEME],
  ['jailbreaks',CHAPTER02_THEME],
  ['poisoning',CHAPTER03_THEME],
];

test('Seguridad active reading guide is visibly distinct and high-contrast',()=>{
  for(const [name,theme] of themes){
    assert.match(theme.guideSurface,/^#[0-9A-F]{6}$/i,name);
    assert.match(theme.guideText,/^#[0-9A-F]{6}$/i,name);
    assert.ok(contrastRatio(theme.guideText,theme.guideSurface)>=6.5,`${name}: guide text contrast`);
    assert.ok(contrastRatio(theme.guideSurface,theme.background)>=1.9,`${name}: guide surface must remain visibly distinct`);
  }
});

test('active semantic beat carries strong guidance before mechanism settles',()=>{
  const scene=CHAPTER03.scenes[0];
  const state=beatState(scene,'es',scene.beats[0].at+.1);
  const cue=state.cues[0];
  assert.equal(cue.guideStrong,true);
  assert.ok(cue.guideAlpha>=.9);
  assert.ok(cue.emphasis>=.88);
  assert.ok(cue.text_at < cue.visual_at);
  assert.ok(cue.visual_at < scene.beats[0].settledAt);
});
