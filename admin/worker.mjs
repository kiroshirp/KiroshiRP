import {createService} from './service.mjs';
import {githubRepository} from './github.mjs';

export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.protocol!=='https:'){url.protocol='https:';return Response.redirect(url.toString(),308);}
  if(!env.ADMIN_STATE || !env.GITHUB_TOKEN)return new Response('Administrador pendiente de configurar.',{status:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
  const response=await env.ADMIN_STATE.get(env.ADMIN_STATE.idFromName('portal')).fetch(request);
  const headers=new Headers(response.headers);headers.set('Strict-Transport-Security','max-age=31536000');
  return new Response(response.body,{status:response.status,headers});
 }
};
export class AdminState {
 constructor(state,env){
  this.state=state;
  this.handle=createService({env,store:state.storage,repo:githubRepository(env),assets:async path=>env.ASSETS.fetch(new Request('https://assets.internal'+path))});
 }
 async fetch(request){
  // Serializar las escrituras evita conflictos entre ediciones y eliminaciones en GitHub.
  return this.state.blockConcurrencyWhile(async()=>{
   if(!await this.state.storage.getAlarm())await this.state.storage.setAlarm(Date.now()+3600000);
   return this.handle(request);
  });
 }
 async alarm(){
  const records=await this.state.storage.list();
  for(const [key,value] of records)if(value.expires<Date.now())await this.state.storage.delete(key);
  await this.state.storage.setAlarm(Date.now()+3600000);
 }
}
