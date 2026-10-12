import {rm,mkdir,cp,readFile,writeFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const entry of ['index.html','public','src'])await cp(entry,`dist/${entry}`,{recursive:true});
const p='.openai/hosting.json';let manifest={};try{manifest=JSON.parse(await readFile(p,'utf8'))}catch{}
manifest.static={directory:'dist'};await mkdir('.openai',{recursive:true});await writeFile(p,JSON.stringify(manifest,null,2)+'\n');
console.log('SYLVA built: local media, authored renderer, game, and DSA modules.');
