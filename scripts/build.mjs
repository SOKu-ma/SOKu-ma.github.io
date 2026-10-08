import {readFile,stat,rm,mkdir,cp} from 'node:fs/promises';
const catalog=JSON.parse(await readFile('apps/catalog.json','utf8'));
const ids=new Set();
for(const app of catalog.apps){
 if(ids.has(app.id)) throw new Error('Duplicate app ID');ids.add(app.id);
 for(const path of [app.icon,...Object.values(app.screenshots).flatMap(group=>group.paths)]) await stat('apps/'+path);
 for(const lang of ['en',...Object.keys(app.copy)]) if(!app.copy[lang]?.name || !app.copy[lang]?.description) throw new Error(`Missing ${app.id}/${lang}`);
 for(const url of Object.values(app.stores)){const parsed=new URL(url);if(parsed.protocol!=='https:'||!['apps.apple.com','play.google.com'].includes(parsed.hostname))throw new Error('Invalid store URL');}
}
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const path of ['index.html','styles.css','favicon.svg','CNAME','privacy','support','apps']) await cp(path,'dist/'+path,{recursive:true});
console.log(`Static build verified: ${catalog.apps.length} apps / ${Object.keys(catalog.languages).length} languages`);
