import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base=new URL('../',import.meta.url);
const original=readFileSync(new URL('public/landing-pages/inner-green-3d.original.html',base),'utf8');
const adapted=readFileSync(new URL('public/landing-pages/inner-green-3d.html',base),'utf8');
test('original Sylva source matches preserved provenance hash',()=>{
 const manifest=JSON.parse(readFileSync(new URL('public/landing-pages/source-manifest.json',base),'utf8'));
 assert.equal(createHash('sha256').update(original).digest('hex'),manifest.original_sha256);
});
test('native liquid-metal renderer and all authored Three.js shader blocks are unchanged',()=>{
 const native=s=>[...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('function mountLiquidMetal'));
 assert.ok(native(original));assert.equal(native(original),native(adapted));
 const shaders=s=>[...s.matchAll(/\b(?:vertexShader|fragmentShader):\s*\[[\s\S]*?\]\.join\('\\n'\)/g)].map(m=>m[0]);
 assert.ok(shaders(original).length>5);assert.deepEqual(shaders(original),shaders(adapted));
});
test('all authored media is packaged locally and the shared-renderer hook occurs once',()=>{
 for(const asset of ['three.min.js','lexend-latin.woff2','card-ecostove.jpg','card-ethos.jpg'])assert.ok(existsSync(new URL(`public/landing-pages/inner-green-assets/${asset}`,base)));
 assert.equal((adapted.match(/window\.sylvaFrame\(dt, uTime.value\)/g)||[]).length,1);
 assert.equal((adapted.match(/window\.sylvaWorld =/g)||[]).length,1);
 assert.equal(/(?:src=|url\()['"]?https:\/\//.test(adapted),false);
});
