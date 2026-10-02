import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {renderDay,dayKey} from '../dist/index.js';
const date='2024-05-10',start=Date.parse(date+'T00:00:00Z');
const fixture={date,quakes:[
 {time:start+1000,mag:2.5,depth:10,lat:-65,lon:-140,place:'Fixture A'},
 {time:start+21600000,mag:5.8,depth:50,lat:20,lon:130,place:'Fixture B'},
 {time:start+43200000,mag:4,depth:300,lat:60,lon:40,place:'Fixture C'},
 {time:start+86399000,mag:3,depth:600,lat:-10,lon:-40,place:'Fixture D'}
]};
function hash(audio){const h=createHash('sha256');for(const channel of [audio.left,audio.right]){const bytes=Buffer.allocUnsafe(channel.length*4);for(let i=0;i<channel.length;i++)bytes.writeFloatLE(channel[i],i*4);h.update(bytes)}return h.digest('hex')}
test('identical ordered input gives identical stereo PCM hashes',()=>{
 const a=renderDay(structuredClone(fixture)),b=renderDay(structuredClone(fixture));
 assert.equal(hash(a),hash(b));assert.equal(a.sampleRate,24000);assert.equal(a.duration,60);
 for(const channel of [a.left,a.right]){assert.equal(channel.length,1440000);assert.ok(channel.every(Number.isFinite));assert.ok(channel.some(x=>x!==0));assert.ok(channel.every(x=>Math.abs(x)<=.820001))}
 assert.notEqual(hash(a),hash(renderDay({...fixture,quakes:fixture.quakes.map((q,i)=>i===1?{...q,lon:40}:q)})));
});
test('an empty UTC day is silent',()=>{const a=renderDay({date,quakes:[]});assert.ok(a.left.every(x=>x===0));assert.ok(a.right.every(x=>x===0))});
test('key sectors and depth thresholds follow the specification',()=>{
 const q=fixture.quakes[1];
 assert.equal(dayKey([{...q,depth:34.99}]).mode,'dorian');assert.equal(dayKey([{...q,depth:35}]).mode,'aeolian');assert.equal(dayKey([{...q,depth:70}]).mode,'phrygian');assert.equal(dayKey([{...q,depth:600}]).mode,'phrygian');
 assert.equal(dayKey([{...q,lon:-180}]).root,'C');assert.equal(dayKey([{...q,lon:180}]).root,'C');assert.equal(dayKey([{...q,lon:-150}]).root,'G');
 assert.equal(dayKey([{...q,lon:-180},{...q,lon:130}]).root,'C');
});
