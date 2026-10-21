const embedded=window.parent!==window;
document.documentElement.classList.toggle('optic-embedded',embedded);
const dialog=document.querySelector<HTMLDialogElement>('.optic-dialog')!;
const frame=dialog.querySelector<HTMLIFrameElement>('iframe')!;
const viewPath=location.pathname;
const originalTitle=document.title;
const key=()=>`kiroshi:view:${viewPath}`;
function saveView(){
 try{sessionStorage.setItem(key(),JSON.stringify({y:scrollY,fields:[...document.querySelectorAll<HTMLInputElement|HTMLSelectElement>('input[id],select[id]')].filter(e=>e.type!=='password').map(e=>({id:e.id,value:e.value})),details:[...document.querySelectorAll<HTMLDetailsElement>('main details')].map((e,i)=>({i,open:e.open}))}));}catch{}
}
function restoreView(){
 try{const raw=sessionStorage.getItem(key());if(!raw)return;const state=JSON.parse(raw);for(const f of state.fields){const el=document.getElementById(f.id);if(el instanceof HTMLInputElement||el instanceof HTMLSelectElement){el.value=f.value;el.dispatchEvent(new Event(el instanceof HTMLSelectElement?'change':'input',{bubbles:true}));}}const details=document.querySelectorAll<HTMLDetailsElement>('main details');for(const d of state.details)if(details[d.i])details[d.i].open=d.open;if(!location.hash)requestAnimationFrame(()=>scrollTo(0,state.y));}catch{}
}
window.addEventListener('pagehide',saveView);
window.addEventListener('load',restoreView);
let depth=0;
let trail:string[]=[];
let opener:HTMLElement|null=null;
const base=import.meta.env.BASE_URL.replace(/\/$/,'')+'/';
const homePath=base;
function allowed(raw:string){const u=new URL(raw,location.href);return u.origin===location.origin&&u.pathname.startsWith(base)&&!u.pathname.includes('/admin')&&!/\.[a-z0-9]+$/i.test(u.pathname);}
function renderPanel(target:string){
 if(!dialog.open){opener=document.activeElement instanceof HTMLElement?document.activeElement:null;dialog.showModal();document.body.classList.add('panel-is-open');}
 frame.contentWindow?.location.replace(target);
 dialog.querySelector('[data-panel-title]')!.textContent='ARCHIVO KIROSHIRP';
}
function openPanel(target:string){
 if(!depth)saveView();trail.push(target);const state={kiroshiPanel:true,target,trail:[...trail]};
 if(depth)history.replaceState(state,'',target);else history.pushState(state,'',target);
 depth=1;renderPanel(target);
}
function closePanel(){if(depth>0)history.back();else dismiss();}
function dismiss(){dialog.close();document.body.classList.remove('panel-is-open');document.title=originalTitle;depth=0;trail=[];opener?.focus({preventScroll:true});}
document.addEventListener('click',event=>{
 if(!(event instanceof MouseEvent)||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
 const a=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[href]'):null;
 if(!a||a.target||a.hasAttribute('download')||!allowed(a.href))return;
 const target=new URL(a.href);
 if(target.pathname===location.pathname&&target.hash){if(embedded){event.preventDefault();location.replace(a.href);}return;}
 if(embedded){event.preventDefault();saveView();parent.postMessage({type:'kiroshi:navigate',url:a.href},location.origin);return;}
 if(target.pathname===homePath||a.closest('.direct-panel-bar'))return;
 event.preventDefault();openPanel(a.href);
});
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
 if(event.data?.type==='kiroshi:navigate'&&typeof event.data.url==='string'&&allowed(event.data.url))openPanel(event.data.url);
 if(event.data?.type==='kiroshi:escape'&&dialog.open)closePanel();
});
window.addEventListener('popstate',event=>{if(embedded)return;if(event.state?.kiroshiPanel){depth=1;trail=event.state.trail||[event.state.target];renderPanel(event.state.target);}else dismiss();});
dialog.querySelector('[data-panel-close]')?.addEventListener('click',closePanel);
dialog.querySelector('[data-panel-back]')?.addEventListener('click',()=>{if(trail.length<2){closePanel();return;}trail.pop();const target=trail[trail.length-1];history.replaceState({kiroshiPanel:true,target,trail:[...trail]},'',target);renderPanel(target);});
dialog.addEventListener('cancel',event=>{event.preventDefault();closePanel();});
dialog.querySelector('[data-panel-size]')?.addEventListener('click',event=>{const button=event.currentTarget as HTMLButtonElement;const expanded=dialog.classList.toggle('is-expanded');button.setAttribute('aria-pressed',String(expanded));button.textContent=expanded?'Reducir':'Ampliar';});
frame.addEventListener('load',()=>{try{const title=frame.contentDocument?.title.replace(/ \| KiroshiRP$/,'');if(title){document.title=title+' | KiroshiRP';frame.title=title;dialog.querySelector('[data-panel-title]')!.textContent=title;}frame.contentDocument?.querySelector<HTMLElement>('h1')?.setAttribute('tabindex','-1');frame.contentDocument?.querySelector<HTMLElement>('h1')?.focus({preventScroll:true});}catch{}});
if(embedded){document.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();parent.postMessage({type:'kiroshi:escape'},location.origin);}});}
