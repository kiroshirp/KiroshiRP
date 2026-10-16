'use strict';
const $=id=>document.getElementById(id);
let csrf='',mode='local',files=[],current=null,dirty=false,working=false;
let messageTimer;
const known=['title','description','category','status','origin','updated'];
const labels={lore:'Lore',mecanicas:'Mecánicas',normativas:'Normativas',facciones:'Facciones',guias:'Guías',actualizaciones:'Actualizaciones'};
const show=(message)=>{clearTimeout(messageTimer);$('message').textContent=message;if(message)messageTimer=setTimeout(()=>{$('message').textContent='';},10000);};
const fail=e=>show(e.message||'No se pudo completar la operación.');
function setDirty(v){dirty=v;$('dirty').textContent=v?'Cambios sin guardar':'';}
function resetSession(){csrf='';files=[];current=null;setDirty(false);$('workspace').hidden=true;$('logout').hidden=true;$('login').hidden=false;$('editor-form').reset();$('files').replaceChildren();$('image-preview').removeAttribute('src');}
async function api(endpoint,method='GET',data){
 const r=await fetch('/admin/api/'+endpoint,{method,credentials:'same-origin',headers:method==='GET'?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf},...(data?{body:JSON.stringify(data)}:{})});
 const body=await r.json();if(!r.ok){if(r.status===401&&endpoint!=='login')resetSession();throw new Error(body.error||'Error del servicio.');}return body;
}
function group(path){return path.startsWith('public/')?'media':path.includes('/data/')?'settings':path.split('/')[2];}
function renderFiles(){
 const query=$('search').value.toLocaleLowerCase('es');const filter=$('filter').value;
 const visible=files.filter(f=>(!filter||group(f.path)===filter)&&f.path.toLocaleLowerCase('es').includes(query));
 $('count').textContent=visible.length+' archivos';$('files').replaceChildren();
 for(const f of visible){const b=document.createElement('button');b.type='button';b.classList.toggle('active',f.path===current?.path);b.setAttribute('aria-current',f.path===current?.path?'true':'false');
  const name=document.createElement('span');name.textContent=f.path.split('/').pop();const tag=document.createElement('small');tag.textContent=labels[group(f.path)]|| (group(f.path)==='media'?'Imágenes':'Configuración');b.append(name,tag);b.addEventListener('click',()=>loadFile(f.path).catch(fail));$('files').append(b);}
}
async function refresh(){files=(await api('files')).files;files.sort((a,b)=>a.path.localeCompare(b.path));renderFiles();}
async function enter(session){
 csrf=session.csrf;mode=session.mode;$('login-form').reset();$('login').hidden=true;$('workspace').hidden=false;$('logout').hidden=false;
 $('mode').textContent=mode==='github'?'CONECTADO A GITHUB':'EDICIÓN LOCAL';
 $('save-note').textContent=mode==='github'?'Cada guardado crea una revisión en GitHub e inicia la publicación. La web se actualizará cuando termine su comprobación. El historial del repositorio permite recuperar versiones anteriores.':'Los cambios se guardan en este ordenador, con copia de seguridad local. Para verlos en Internet hace falta publicarlos. No se modificará la web pública desde este modo.';
 $('save').textContent=mode==='github'?'Guardar y publicar':'Guardar cambios';await refresh();
}
function discardOK(){return !dirty||confirm('Hay cambios sin guardar. ¿Quieres descartarlos?');}
async function loadFile(path){if(!discardOK())return;const data=await api('file?path='+encodeURIComponent(path));openEditor(data);}
function openEditor(file){
 current=file;setDirty(false);show('');$('welcome').hidden=true;$('editor-form').hidden=false;$('file-path').textContent=file.path;$('file-title').textContent=file.path.split('/').pop();
 const article=Boolean(file.document);const binary=file.binary;
 $('kind').textContent=article?'DOCUMENTO EDITORIAL':binary?'RECURSO VISUAL':'CONFIGURACIÓN CENTRAL';
 $('article-fields').hidden=!article;$('json-fields').hidden=article||binary;$('image-fields').hidden=!binary;
 for(const control of $('article-fields').querySelectorAll('input,textarea,select'))control.disabled=!article;
 $('settings').disabled=article||binary;$('save').hidden=binary;$('discard').hidden=binary;$('delete').hidden=!file.version||file.path.startsWith('src/data/');
 if(article){
  const meta=file.document.metadata;for(const key of known)$(key).value=key==='updated'?String(meta[key]||'').slice(0,10):meta[key]||'';
  $('body').value=file.document.body;$('metadata').value=JSON.stringify(Object.fromEntries(Object.entries(meta).filter(([key])=>!known.includes(key))),null,2);
 }else if(binary){const ext=file.path.split('.').pop();$('image-preview').src='data:image/'+(ext==='jpg'?'jpeg':ext)+';base64,'+file.content;}
 else $('settings').value=file.content;
 renderFiles();
}
$('login-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;show('');try{const data=Object.fromEntries(new FormData(event.target));await enter(await api('login','POST',data));show('Acceso autorizado.');}catch(e){fail(e);}finally{button.disabled=false;}});
$('logout').addEventListener('click',async()=>{if(!discardOK())return;try{await api('logout','POST',{});resetSession();show('Sesión cerrada.');}catch(e){fail(e);}});
$('search').addEventListener('input',renderFiles);$('filter').addEventListener('change',renderFiles);
$('reload').addEventListener('click',async()=>{if(!discardOK())return;try{await refresh();if(current)await loadFile(current.path);show('Archivo actualizado.');}catch(e){fail(e);}});
$('editor-form').addEventListener('input',()=>setDirty(true));
$('discard').addEventListener('click',()=>{if(!discardOK())return;if(current?.version){setDirty(false);loadFile(current.path).catch(fail);}else{current=null;setDirty(false);$('editor-form').hidden=true;$('welcome').hidden=false;}});
$('editor-form').addEventListener('submit',async event=>{
 event.preventDefault();if(working||!current)return;working=true;$('save').disabled=true;show('Guardando…');
 try{
  const data={path:current.path,version:current.version||''};
  if(current.document){let extra;try{extra=JSON.parse($('metadata').value);}catch{throw new Error('Los campos adicionales no contienen JSON válido.');}
   if(!extra||Array.isArray(extra)||typeof extra!=='object')throw new Error('Los campos adicionales deben ser un objeto JSON.');
   const metadata={...extra};for(const key of known)metadata[key]=$(key).value;data.document={metadata,body:$('body').value};
  }else{try{JSON.parse($('settings').value);}catch{throw new Error('La configuración no contiene JSON válido.');}data.content=$('settings').value;}
  await api('file','PUT',data);setDirty(false);await refresh();openEditor(await api('file?path='+encodeURIComponent(current.path)));
  show(mode==='github'?'Revisión guardada en GitHub. Publicación en curso: consulta su resultado en GitHub Actions.':'Cambios guardados en este ordenador.');
 }catch(e){fail(e);}finally{working=false;$('save').disabled=false;}
});
$('delete').addEventListener('click',async()=>{
 if(working||!current)return;
 const confirmation=prompt('Eliminar este archivo también puede afectar a enlaces o imágenes del portal. Se conservará su versión anterior. Escribe la ruta completa para confirmar:\n'+current.path);
 if(confirmation!==current.path){if(confirmation!==null)show('La ruta no coincide. No se ha eliminado nada.');return;}
 working=true;try{await api('file','DELETE',{path:current.path,version:current.version,confirm:confirmation});current=null;setDirty(false);$('editor-form').hidden=true;$('welcome').hidden=false;await refresh();show('Archivo eliminado. Puedes recuperarlo desde el historial o la copia local.');}catch(e){fail(e);}finally{working=false;}
});
$('new').addEventListener('click',()=>{if(discardOK())$('create-dialog').showModal();});
$('cancel-create').addEventListener('click',()=>$('create-dialog').close());
$('create-form').addEventListener('submit',event=>{
 event.preventDefault();const data=Object.fromEntries(new FormData(event.target));const path='src/content/'+data.section+'/'+data.slug+'.md';
 if(files.some(f=>f.path===path)){show('Ya existe un artículo con ese identificador.');return;}
 $('create-dialog').close();openEditor({path,version:'',document:{metadata:{title:'',description:'',category:labels[data.section],status:'Borrador',origin:'LORE KIROSHIRP',updated:new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(new Date()),published:false,related:[],sources:[],history:[]},body:''}});$('title').focus();setDirty(true);
});
$('upload').addEventListener('change',async event=>{
 const file=event.target.files[0];if(!file)return;
 try{
  if(file.size>4*1024*1024)throw new Error('La imagen supera 4 MB.');
  if(!/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|avif)$/.test(file.name))throw new Error('Usa un nombre sin espacios ni acentos y una extensión PNG, JPG, JPEG, WEBP o AVIF en minúsculas.');
  const path='public/images/'+file.name;const existing=files.find(f=>f.path===path);let version='';
  if(existing){if(!confirm('Ya existe esa imagen. ¿Quieres sustituirla?'))return;version=(await api('file?path='+encodeURIComponent(path))).version;}
  const content=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('No se pudo leer la imagen.'));reader.readAsDataURL(file);});
  await api('file','PUT',{path,version,content});await refresh();show('Imagen guardada. Ruta para usar en los artículos: images/'+file.name);
 }catch(e){fail(e);}finally{event.target.value='';}
});
window.addEventListener('beforeunload',event=>{if(dirty)event.preventDefault();});
api('session').then(enter).catch(error=>{if(error.message!=='Inicia sesión para acceder.')fail(error);});
