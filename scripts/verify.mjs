import {readdirSync,readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
const root=resolve('dist');const base=(process.env.BASE_PATH||'/KiroshiRP').replace(/\/$/,'');
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]);
const files=walk(root).filter(f=>f.endsWith('.html'));let checked=0;const errors=[];
for(const file of files){const html=readFileSync(file,'utf8');for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){const link=m[1].replaceAll('&amp;','&');if(/^(?:https?:|mailto:|data:|tel:)/.test(link))continue;let [pathname,anchor]=link.split('#');pathname=pathname.split('?')[0];let target=pathname?(pathname.startsWith('/')?resolve(root,decodeURIComponent(pathname.startsWith(base+'/')?pathname.slice(base.length+1):pathname.replace(/^\//,''))):resolve(dirname(file),decodeURIComponent(pathname))):file;if(existsSync(target)&&statSync(target).isDirectory())target=join(target,'index.html');if(!existsSync(target)){errors.push(`${file}: falta ${link}`);continue}if(anchor&&target.endsWith('.html')&&!readFileSync(target,'utf8').includes(`id="${decodeURIComponent(anchor)}"`))errors.push(`${file}: ancla ausente ${link}`);checked++}}
if(existsSync(join(root,'actualizaciones/plantilla/index.html')))errors.push('La plantilla de noticias no debe publicarse.');
if(!existsSync(join(root,'pagefind/pagefind.js')))errors.push('Falta índice Pagefind.');
if(errors.length){console.error(errors.join('\n'));process.exit(1)}console.log(`${files.length} páginas; ${checked} enlaces, recursos y anclas comprobados. Índice presente y plantilla excluida.`);
