import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {allowedPath,validateContent} from './content.mjs';
import {parse,stringify} from 'yaml';
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...extra}});
const hash=v=>createHash('sha256').update(String(v)).digest();
const equal=(a,b)=>timingSafeEqual(hash(a),hash(b));
const token=()=>randomBytes(32).toString('hex');
const MAX_AGE=7200;
export function createService({env,store,repo,assets,local=false}){
 return async function handle(request){
  const u=new URL(request.url);const path=u.pathname.replace(/\/$/,'');
  let response;
  try{
   if(!['GET','POST','PUT','DELETE'].includes(request.method))return finish(json({error:'Método no permitido.'},405));
   if(!path.startsWith('/admin'))return finish(new Response(null,{status:302,headers:{Location:'/admin/'}}));
   if(!path.startsWith('/admin/api/')){
    if(!['/admin','/admin/app.js','/admin/style.css'].includes(path))return finish(json({error:'No encontrado.'},404));
    return finish(await assets(path==='/admin'?'/index.html':path.slice(6)));
   }
   if(!env.ADMIN_USERNAME?.trim() || (env.ADMIN_PASSWORD?.length||0)<16)return finish(json({error:'Administrador pendiente de configurar: completa el .env privado y usa una contraseña de al menos 16 caracteres.'},503));
   const mutating=request.method!=='GET';
   if(mutating && (request.headers.get('origin')!==u.origin || !request.headers.get('content-type')?.startsWith('application/json')))return finish(json({error:'Solicitud de otro origen o formato no permitido.'},403));
   const cookieName=local?'krp_admin':'__Host-krp_admin';
   const cookie=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1);
   const session=cookie&&/^[a-f0-9]{64}$/.test(cookie)?await store.get('session:'+hash(cookie).toString('hex')):null;
   const credentialsVersion=hash(env.ADMIN_USERNAME+'\0'+env.ADMIN_PASSWORD).toString('hex');
   const valid=session&&session.expires>Date.now()&&session.credentialsVersion===credentialsVersion;
   let data={};
   if(mutating){
    if(Number(request.headers.get('content-length'))>6000000)return finish(json({error:'Solicitud demasiado grande.'},413));
    const reader=request.body?.getReader();let size=0;const chunks=[];
    if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>6000000){await reader.cancel();return finish(json({error:'Solicitud demasiado grande.'},413));}chunks.push(Buffer.from(value));}}
    try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return finish(json({error:'JSON no válido.'},400));}
   }
   if(path==='/admin/api/login'&&request.method==='POST'){
    const ip=request.headers.get('cf-connecting-ip')||'local';const key='attempt:'+hash(ip).toString('hex');const now=Date.now();
    let attempts=await store.get(key);if(!attempts||attempts.expires<now)attempts={count:0,expires:now+900000};
    if(attempts.count>=5)return finish(json({error:'Demasiados intentos. Espera 15 minutos.'},429));
    attempts.count++;await store.put(key,attempts);
    if(typeof data.username!=='string'||typeof data.password!=='string'||data.password.length>1024||!equal(data.username,env.ADMIN_USERNAME)||!equal(data.password,env.ADMIN_PASSWORD))return finish(json({error:'Usuario o contraseña incorrectos.'},401));
    const id=token();const csrf=token();await store.put('session:'+hash(id).toString('hex'),{csrf,credentialsVersion,expires:now+MAX_AGE*1000});
    await store.delete(key);
    if(cookie)await store.delete('session:'+hash(cookie).toString('hex'));
    return finish(json({csrf,mode:local?'local':'github'},200,{'Set-Cookie':`${cookieName}=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}${local?'':'; Secure'}`}));
   }
   if(!valid)return finish(json({error:'Inicia sesión para acceder.'},401));
   if(mutating&&!equal(request.headers.get('x-csrf-token')||'',session.csrf))return finish(json({error:'La sesión no autoriza esta solicitud.'},403));
   if(path==='/admin/api/logout'&&request.method==='POST'){
    await store.delete('session:'+hash(cookie).toString('hex'));
    response=json({ok:true},200,{'Set-Cookie':`${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${local?'':'; Secure'}`});
   }else if(path==='/admin/api/session'&&request.method==='GET')response=json({csrf:session.csrf,mode:local?'local':'github'});
   else if(path==='/admin/api/files'&&request.method==='GET')response=json({files:await repo.list()});
   else if(path==='/admin/api/file'){
    const p=mutating?data.path:u.searchParams.get('path');if(!allowedPath(p))return finish(json({error:'Ruta no permitida.'},400));
    if(request.method==='GET'){
     const f=await repo.read(p);let document;
     if(f&&p.endsWith('.md')){const text=f.bytes.toString('utf8');const match=text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);if(match)document={metadata:parse(match[1]),body:text.slice(match[0].length)};}
     response=f?json({path:p,version:f.version,content:p.startsWith('public/')?f.bytes.toString('base64'):f.bytes.toString('utf8'),binary:p.startsWith('public/'),document}):json({error:'No encontrado.'},404);
    }else if(['PUT','DELETE'].includes(request.method)){
     const old=await repo.read(p);
     if((old?.version||'')!==(data.version||''))return finish(json({error:'El archivo ha cambiado. Vuelve a cargarlo antes de guardar.'},409));
     if(request.method==='DELETE'){
      if(p.startsWith('src/data/'))return finish(json({error:'Los archivos centrales se pueden editar, pero no eliminar.'},400));
      if(data.confirm!==p)return finish(json({error:'Confirma la ruta exacta para eliminar.'},400));
      if(!old)return finish(json({error:'No encontrado.'},404));
      await repo.remove(p,old.version);response=json({ok:true});
     }else{
      if(data.document&&p.endsWith('.md')){
       if(typeof data.document.body!=='string'||!data.document.metadata||typeof data.document.metadata!=='object')return finish(json({error:'Documento no válido.'},400));
       data.content='---\n'+stringify(data.document.metadata)+'---\n'+data.document.body;
      }
      if(typeof data.content!=='string')return finish(json({error:'Falta el contenido.'},400));
      const bytes=Buffer.from(data.content,p.startsWith('public/')?'base64':'utf8');
      validateContent(p,bytes,old?.bytes);const result=await repo.write(p,bytes,old?.version);response=json({ok:true,...result});
     }
    }else response=json({error:'Método no permitido.'},405);
   }else response=json({error:'No encontrado.'},404);
  }catch(error){
   response=json({error:error.publicMessage||(error.name==='ZodError'?'Datos no válidos: '+error.issues.map(i=>i.path.join('.')+': '+i.message).join('; '):error.safe?error.message:'No se pudo completar la operación. Comprueba el contenido y la conexión del servicio.')},error.status||400);
  }
  return finish(response);
 };
}
function finish(response){
 const h=new Headers(response.headers);
 h.set('Cache-Control','no-store');h.set('X-Robots-Tag','noindex, nofollow');h.set('X-Content-Type-Options','nosniff');h.set('Referrer-Policy','no-referrer');h.set('X-Frame-Options','DENY');
 h.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
 return new Response(response.body,{status:response.status,headers:h});
}
