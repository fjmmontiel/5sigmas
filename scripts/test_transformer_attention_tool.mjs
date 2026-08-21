#!/usr/bin/env node
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../docs/assets/javascripts/tools/transformer-attention-core.js');
const failures = [];
const assert = (condition, label) => { if (!condition) failures.push(label); };
const close = (actual, expected, tolerance, label) => { if (Math.abs(actual - expected) > tolerance) failures.push(`${label}: expected ${expected}, got ${actual}`); };

const tokens = core.tokenize('the cat saw the cat');
assert(tokens.length === 5, 'tokenizer should split illustrative sequence on whitespace');
assert(core.normalizeToken('Cat,') === 'cat', 'token normalization should strip surrounding punctuation');
const base = core.analyze({ tokens, head: 'local', queryIndex: 3, causal: true, temperature: 1 });
close(base.weights.reduce((a,b)=>a+b,0), 1, 1e-12, 'softmax normalization');
assert(base.weights[4] === 0, 'causal mask must assign zero weight to future keys');
assert(base.allowedKeys === 4, 'query 3 should expose exactly four causal keys');
const noMask = core.analyze({ tokens, head: 'local', queryIndex: 3, causal: false, temperature: 1 });
assert(noMask.weights[4] > 0, 'disabling causal masking should expose future keys');
const cold = core.analyze({ tokens, head: 'local', queryIndex: 4, causal: true, temperature: 0.4 });
const hot = core.analyze({ tokens, head: 'local', queryIndex: 4, causal: true, temperature: 2 });
assert(cold.entropy < hot.entropy, 'higher educational temperature should make distribution less concentrated');
const repeat = core.analyze({ tokens, head: 'repeat', queryIndex: 4, causal: true, temperature: 1 });
assert(repeat.topIndex === 1, `repeat toy head should prefer previous matching token, got ${repeat.topIndex}`);
const previous = core.analyze({ tokens, head: 'previous', queryIndex: 4, causal: true, temperature: 1 });
assert(previous.topIndex === 3, `previous-token toy head should peak at index 3, got ${previous.topIndex}`);
const custom = core.analyze({ tokens:['a','b','c'], head:'local', queryIndex:2, causal:true, temperature:1, logits:[-2,0,2], values:[-1,0,1] });
close(custom.output, custom.contributions.reduce((a,b)=>a+b,0), 1e-12, 'output equals weighted value contributions');
assert(custom.weights[2] > custom.weights[1] && custom.weights[1] > custom.weights[0], 'custom logits should preserve softmax ordering');
const matrix = core.matrix({ tokens, head:'local', causal:true, temperature:1 });
assert(matrix.length === tokens.length && matrix.every((row)=>row.length===tokens.length), 'attention matrix should be square');
for (let i=0;i<matrix.length;i+=1) { close(matrix[i].reduce((a,b)=>a+b,0),1,1e-12,`matrix row ${i} normalization`); for (let j=i+1;j<matrix.length;j+=1) assert(matrix[i][j]===0,`matrix row ${i} must mask future column ${j}`); }
const heads = core.compareHeads({ tokens, queryIndex:4, causal:true, temperature:1 });
assert(heads.length===3 && new Set(heads.map((item)=>item.head)).size===3, 'head comparison should expose three distinct toy heads');
for (const [label,path] of [['ES','docs/herramientas/atencion-transformer.md'],['EN','locales/en/tools/transformer-attention.md']]) {
  const text = fs.readFileSync(path,'utf8');
  assert(text.includes('https://arxiv.org/abs/1706.03762'), `${label} page must cite Attention Is All You Need`);
  assert(text.includes('https://docs.pytorch.org/docs/main/generated/torch.nn.functional.scaled_dot_product_attention.html'), `${label} page must cite PyTorch SDPA docs`);
  assert(text.includes('softmax'), `${label} page must explain softmax`);
}
if (failures.length) { console.error('Transformer attention visualizer tests failed:'); for (const failure of failures) console.error(` - ${failure}`); process.exit(1); }
console.log('Transformer attention visualizer tests passed: masking, softmax, temperature, head presets, value mixing, matrix normalization and provenance verified.');
