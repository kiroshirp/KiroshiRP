import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try{process.loadEnvFile(path.join(root,'.env'));}catch(e){if(e.code!=='ENOENT')throw e;}
// Lista explícita: nunca recorrer la raíz ni incluir .env, copias o capturas.
const files=[
 '.gitignore','.env.example','ADMIN.md','README.md','package.json','package-lock.json','astro.config.mjs','wrangler.jsonc',
 'admin/schema.mjs','admin/content.mjs','admin/service.mjs','admin/github.mjs','admin/worker.mjs','admin/local.mjs',
 'admin/ui/index.html','admin/ui/style.css','admin/ui/app.js','admin/tests/security.test.mjs',
 'scripts/deploy-admin.mjs','scripts/publish-admin-source.mjs',
 'src/config.ts','src/content.config.ts','src/data/portal.json','src/data/home.json','src/data/legal.json',
 'src/pages/admin.astro','src/pages/index.astro','src/pages/[info].astro'
];
const base='https://api.github.com/repos/kiroshirp/KiroshiRP';
async function api(endpoint,method='GET',body){
 const r=await fetch(base+endpoint,{method,headers:{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json','User-Agent':'KiroshiRP-Publisher','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(!r.ok)throw new Error(`GitHub no completó la publicación (HTTP ${r.status}). Revisa el token, la rama y sus permisos. No se fuerza ninguna actualización.`);
 return r.json();
}
if(!process.env.GITHUB_TOKEN?.trim()){console.error('Completa GITHUB_TOKEN en el .env privado.');process.exitCode=1;}
else try{
 const secrets=['ADMIN_PASSWORD','GITHUB_TOKEN','CLOUDFLARE_API_TOKEN'].map(k=>process.env[k]).filter(v=>v&&v.length>=8);
 const tree=[];
 for(const file of files){const content=await fs.readFile(path.join(root,file),'utf8');if(secrets.some(s=>content.includes(s)))throw new Error('Publicación detenida: se detectó un valor privado en un archivo de origen.');tree.push({path:file,mode:'100644',type:'blob',content});}
 const reference=await api('/git/ref/heads/main');const parent=reference.object.sha;
 const commit=await api('/git/commits/'+parent);
 const newTree=await api('/git/trees','POST',{base_tree:commit.tree.sha,tree});
 if(newTree.sha===commit.tree.sha){console.log('El código del administrador ya está publicado en main.');}
 else{
  const next=await api('/git/commits','POST',{message:'Añadir administración privada del portal en Cloudflare Workers',tree:newTree.sha,parents:[parent]});
  await api('/git/refs/heads/main','PATCH',{sha:next.sha,force:false});
  console.log('Código publicado: https://github.com/kiroshirp/KiroshiRP/commit/'+next.sha);
  console.log('Comprueba el despliegue del portal en https://github.com/kiroshirp/KiroshiRP/actions');
 }
}catch(error){console.error(error.message);process.exitCode=1;}
