import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try{process.loadEnvFile(path.join(root,'.env'));}catch(e){if(e.code!=='ENOENT')throw e;}
const required=['ADMIN_USERNAME','ADMIN_PASSWORD','GITHUB_TOKEN','CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN'];
const missing=required.filter(key=>!process.env[key]?.trim());
if(missing.length){console.error('Completa estos campos del .env privado: '+missing.join(', '));process.exitCode=1;}
else if(process.env.ADMIN_PASSWORD.length<13){console.error('ADMIN_PASSWORD necesita al menos 13 caracteres.');process.exitCode=1;}
else{
 const cli=path.join(root,'node_modules/wrangler/bin/wrangler.js');
 async function run(args,input){
  return new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,[cli,...args],{cwd:root,env:process.env,stdio:[input?'pipe':'ignore','pipe','pipe'],windowsHide:true});
   let output='';child.stdout.on('data',v=>{output+=v});child.stderr.on('data',v=>{output+=v});
   child.on('error',reject);child.on('close',code=>{if(code!==0)reject(new Error('Cloudflare no completó la operación. Revisa la cuenta y los permisos del token.'));else resolve(output);});
   if(input)child.stdin.end(input);
  });
 }
 try{
  console.log('Publicando el servicio privado…');
  const output=await run(['deploy']);
  await run(['secret','bulk'],JSON.stringify(Object.fromEntries(['ADMIN_USERNAME','ADMIN_PASSWORD','GITHUB_TOKEN'].map(k=>[k,process.env[k]]))));
  const address=output.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/gi)?.at(-1);
  console.log('Administrador desplegado. '+(address?'Dirección: '+address+'/admin/':'Consulta su dirección en Cloudflare Workers.'));
  console.log('Configura site.adminUrl en src/data/portal.json con esa dirección verificada y publica el portal.');
 }catch(error){console.error(error.message);process.exitCode=1;}
}
