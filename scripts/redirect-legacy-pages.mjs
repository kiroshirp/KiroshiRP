import { readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const root=process.argv[2]||'dist';
const walk=async dir=>{
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const file=join(dir,entry.name);
  if(entry.isDirectory()){await walk(file);continue;}
  if(!entry.name.endsWith('.html'))continue;
  const path=relative(root,file).split(sep).join('/');
  const target='https://kiroshirp.pages.dev/'+path.replace(/index\.html$/,'').replace(/\.html$/,'/');
  const redirect=path==='404.html'
   ? `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><script>location.replace('https://kiroshirp.pages.dev'+location.pathname.replace(/^\\/KiroshiRP(?=\\/|$)/,'')+location.search+location.hash)</script><a href="https://kiroshirp.pages.dev/">Ir a KiroshiRP</a>`
   : `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><link rel="canonical" href="${target}"><meta http-equiv="refresh" content="0;url=${target}"><a href="${target}">Ir a KiroshiRP</a>`;
  await writeFile(file,redirect);
 }
};
await walk(root);
