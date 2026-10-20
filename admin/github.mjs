import {allowedPath} from './content.mjs';
export function githubRepository(env,fetcher=fetch){
 const base='https://api.github.com/repos/kiroshirp/KiroshiRP';
 const api=async(path,options={},raw=false)=>{
  const r=await fetcher(base+path,{...options,headers:{Accept:raw?'application/vnd.github.raw+json':'application/vnd.github+json',Authorization:`Bearer ${env.GITHUB_TOKEN}`,'User-Agent':'KiroshiRP-Admin','X-GitHub-Api-Version':'2022-11-28',...(options.body?{'Content-Type':'application/json'}:{})}});
  if(r.status===404)return null;
  if(!r.ok){const e=new Error();e.status=r.status===409||r.status===422?409:502;e.publicMessage=e.status===409?'Conflicto de versión: vuelve a cargar el archivo.':'GitHub no pudo guardar o leer el contenido. Revisa el token y sus permisos.';throw e;}
  return raw?Buffer.from(await r.arrayBuffer()):r.status===204?{}:r.json();
 };
 return {
  async publication(){const r=await fetcher(base+'/actions/runs?per_page=1',{headers:{Accept:'application/vnd.github+json','User-Agent':'KiroshiRP-Admin'}});if(!r.ok)throw new Error('Estado no disponible.');const run=(await r.json()).workflow_runs?.[0];return run?{mode:'github',status:run.status,conclusion:run.conclusion,id:run.id}:{mode:'github',status:'completed',conclusion:null};},
  async list(){const result=await api('/git/trees/main?recursive=1');if(!result||result.truncated)throw new Error('No se pudo leer el árbol completo.');return result.tree.filter(f=>f.type==='blob'&&f.mode!=='120000'&&allowedPath(f.path)).map(f=>({path:f.path,version:f.sha}));},
  async read(path){const endpoint='/contents/'+path+'?ref=main';const f=await api(endpoint);if(!f)return null;if(f.type!=='file')throw new Error('Archivo no compatible.');return {version:f.sha,bytes:f.encoding==='none'?await api(endpoint,{},true):Buffer.from((f.content||'').replace(/\s/g,''),'base64')};},
  async write(path,bytes,version){const r=await api('/contents/'+path,{method:'PUT',body:JSON.stringify({message:`Portal: ${version?'actualizar':'crear'} ${path}`,content:bytes.toString('base64'),sha:version,branch:'main'})});if(!r)throw new Error();return {version:r.content.sha,commit:r.commit.sha};},
  async remove(path,version){const r=await api('/contents/'+path,{method:'DELETE',body:JSON.stringify({message:`Portal: eliminar ${path}`,sha:version,branch:'main'})});if(!r)throw new Error();}
 };
}
