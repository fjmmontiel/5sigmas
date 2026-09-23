import test from 'node:test';
import assert from 'node:assert/strict';
import {cardEdgeSegment} from '../src/seguridad/chapter02.mjs';

const centers=[[500,115],[815,340],[500,565],[185,340]];
const inside=(p,c)=>Math.abs(p[0]-c[0])<125 && Math.abs(p[1]-c[1])<48;
function crossesLabel(a,b,c){
 for(let k=0;k<=100;k++){
  const p=[a[0]+(b[0]-a[0])*k/100,a[1]+(b[1]-a[1])*k/100];
  if(inside(p,c))return true;
 }
 return false;
}
for(let i=0;i<4;i++)test(`feedback edge ${i}: every sampled path point stays outside both cards`,()=>{
 const a=centers[i],b=centers[(i+1)%4],[start,end]=cardEdgeSegment(a,b);
 assert.equal(crossesLabel(start,end,a),false);assert.equal(crossesLabel(start,end,b),false);
 assert.equal(crossesLabel(a,b,a),true); // Negative control: the rejected center-to-center path.
 const reverse=cardEdgeSegment(b,a);
 for(let j=0;j<2;j++){assert.ok(Math.abs(start[j]-reverse[1][j])<1e-9);assert.ok(Math.abs(end[j]-reverse[0][j])<1e-9);}
});
test('axis-aligned cards retain a positive label-free gap',()=>{
 assert.deepEqual(cardEdgeSegment([0,0],[400,0]),[[137,0],[263,0]]);
 assert.deepEqual(cardEdgeSegment([0,0],[0,200]),[[0,60],[0,140]]);
});
test('invalid, overlapping and coincident card geometry fails closed',()=>{
 for(const args of [[[0,0],[0,0]],[[0,0],[10,0]],[[NaN,0],[300,0]],[[0,0],[400,0],125,48,-1]])assert.throws(()=>cardEdgeSegment(...args));
});
