import {createHash,randomBytes} from 'node:crypto';
import {parse,stringify} from 'yaml';
import {allowedPath,validateContent} from './content.mjs';
const digest=value=>createHash('sha256').update(value).digest('hex');
const error=(message,status=400)=>Object.assign(new Error(message),{status,publicMessage:message});
export const draftKey=path=>'draft:'+digest(path);
export async function clearPublishedDraft(store,path,revision){if(!revision)return;const key=draftKey(path);const old=await store.get(key);if(old?.revision!==revision)return;await store.delete(key);await store.put('draft-index',(await store.get('draft-index')||[]).filter(d=>d.path!==path));}
export async function editorialOperation({route,url,method,data,repo,store}){
 if(route==='/admin/api/catalog'&&method==='GET'){
  const offset=Number(url.searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0)throw error('Página de catálogo no válida.');
  const all=(await repo.list()).filter(f=>allowedPath(f.path)&&f.path.endsWith('.md')).sort((a,b)=>a.path.localeCompare(b.path));const batch=all.slice(offset,offset+10);const items=[];
  for(const file of batch){const key='catalog:'+digest(file.path);let cached=await store.get(key);if(!cached||!file.version||cached.version!==file.version||cached.expires<Date.now()){
   const f=await repo.read(file.path);if(!f)continue;const text=f.bytes.toString('utf8');const match=text.match(/^---\r?\n([\s\S]*?)\r?\n---/);let metadata={};try{metadata=match?parse(match[1]):{};}catch{}
   const fields=['title','description','category','status','origin','updated','published','factionStatus'];const info={};for(const field of fields)if(['string','boolean','number'].includes(typeof metadata?.[field]))info[field]=metadata[field];
   cached={path:file.path,version:f.version,metadata:info,expires:Date.now()+3600000};await store.put(key,cached);
  }items.push({path:cached.path,version:cached.version,metadata:cached.metadata});}
  return {items,total:all.length,nextOffset:offset+10<all.length?offset+10:null};
 }
 if(route==='/admin/api/drafts'&&method==='GET')return {drafts:await store.get('draft-index')||[]};
 if(!['/admin/api/draft','/admin/api/validate'].includes(route))return null;
 const path=method==='GET'?url.searchParams.get('path'):data.path;if(!allowedPath(path)||path.startsWith('public/'))throw error('Solo se admiten borradores de artículos o configuración.');
 const key=draftKey(path);const stored=await store.get(key);
 if(route==='/admin/api/draft'&&method==='GET'){if(!stored)throw error('No hay un borrador privado para este archivo.',404);return stored;}
 if(route==='/admin/api/draft'&&method==='DELETE'){if(!stored)throw error('No existe ese borrador.',404);if(data.draftRevision!==stored.revision)throw error('El borrador ha cambiado. Vuelve a abrirlo antes de eliminarlo.',409);await clearPublishedDraft(store,path,stored.revision);return {ok:true};}
 if(!((route==='/admin/api/draft'&&method==='PUT')||(route==='/admin/api/validate'&&method==='POST')))throw error('Método no permitido.',405);
 const previous=await repo.read(path);let content=data.content;if(data.document&&path.endsWith('.md')){if(typeof data.document.body!=='string'||!data.document.metadata||Array.isArray(data.document.metadata)||typeof data.document.metadata!=='object')throw error('Documento no válido.');content='---\n'+stringify(data.document.metadata)+'---\n'+data.document.body;}
 if(typeof content!=='string')throw error('Falta el contenido.');validateContent(path,Buffer.from(content),previous?.bytes);
 if(route==='/admin/api/validate')return {ok:true,currentVersion:previous?.version||'',conflict:(previous?.version||'')!==(data.version||'')};
 if(stored&&stored.revision!==data.draftRevision)throw error('Hay una versión más reciente del borrador. Vuelve a abrirla para conservar sus cambios.',409);
 const record={path,baseVersion:data.version||'',content,...(data.document?{document:data.document}:{}),savedAt:new Date().toISOString(),revision:randomBytes(16).toString('hex')};
 await store.put(key,record);const entry={path,title:data.document?.metadata?.title||path.split('/').pop(),savedAt:record.savedAt,revision:record.revision};const index=(await store.get('draft-index')||[]).filter(d=>d.path!==path);index.push(entry);await store.put('draft-index',index);return {ok:true,...record};
}
