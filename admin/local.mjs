import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {createService} from './service.mjs';
import {allowedPath} from './content.mjs';
export const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function localRepository(root){
 const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 const resolve=async p=>{
  if(!allowedPath(p))throw new Error('Ruta no permitida.');
  const target=path.join(root,...p.split('/'));let current=root;
  for(const piece of p.split('/')){current=path.join(current,piece);try{if((await fs.lstat(current)).isSymbolicLink())throw new Error('Enlace simbólico no permitido.');}catch(e){if(e.code!=='ENOENT')throw e;}}
  return target;
 };
 const backup=async(p,bytes)=>{const name=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID();const file=path.join(root,'.admin-backups',name,p);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes);};
 const repo={
  async list(){let files=[];async function walk(dir){for(const e of await fs.readdir(path.join(root,dir),{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isSymbolicLink())continue;if(e.isDirectory())await walk(p);else if(allowedPath(p))files.push({path:p});}}
   for(const dir of ['src/content','src/data','public/images'])await walk(dir);return files;},
  async read(p){try{const bytes=await fs.readFile(await resolve(p));return {bytes,version:sha(bytes)};}catch(e){if(e.code==='ENOENT')return null;throw e;}},
  async write(p,bytes,version){const old=await repo.read(p);if((old?.version||'')!==(version||'')){const e=new Error();e.status=409;e.publicMessage='El archivo ha cambiado. Vuelve a cargarlo.';throw e;}if(old)await backup(p,old.bytes);const target=await resolve(p);await fs.mkdir(path.dirname(target),{recursive:true});const temp=target+'.'+randomUUID()+'.tmp';await fs.writeFile(temp,bytes,{flag:'wx'});await fs.rename(temp,target);return {version:sha(bytes)};},
  async remove(p,version){const old=await repo.read(p);if(!old||old.version!==version)throw new Error('El archivo ha cambiado.');await backup(p,old.bytes);await fs.unlink(await resolve(p));}
 };return repo;
}
export async function startLocal({root=project,env=process.env,port=Number(env.ADMIN_PORT||4310)}={}){
 const values=new Map();const store={async get(k){return values.get(k)},async put(k,v){values.set(k,v)},async delete(k){values.delete(k)}};
 const service=createService({env,store,repo:localRepository(root),local:true,assets:async p=>{
  const bytes=await fs.readFile(path.join(project,'admin/ui',p.slice(1)));
  return new Response(bytes,{headers:{'Content-Type':p.endsWith('.js')?'text/javascript; charset=utf-8':p.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8'}});
 }});
 let pending=Promise.resolve();
 const server=http.createServer((req,res)=>{
  const run=async()=>{
   const address=server.address();const origin=`http://127.0.0.1:${address.port}`;
   if(req.headers.host!==`127.0.0.1:${address.port}`){res.writeHead(403);res.end('Host no permitido.');return;}
   try{
    const request=new Request(origin+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:req,duplex:'half'}:{})});
    const response=await service(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
   }catch{res.writeHead(500);res.end('No se pudo atender la solicitud.');}
  };
  pending=pending.then(run,run);
 });
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{process.loadEnvFile(path.join(project,'.env'));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(!process.env.ADMIN_USERNAME || (process.env.ADMIN_PASSWORD?.length||0)<16){console.error('Completa ADMIN_USERNAME y ADMIN_PASSWORD (mínimo 16 caracteres) en el .env privado.');process.exitCode=1;}
 else{const server=await startLocal();console.log(`Administrador privado: http://127.0.0.1:${server.address().port}/admin/`);}
}
