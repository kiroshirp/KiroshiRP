import {parse} from 'yaml';
import {articleSchema,settingsSchema,homeSchema,legalSchema} from './schema.mjs';
export const allowedPath = p => typeof p==='string' && !p.includes('..') && (
 /^src\/content\/(lore|mecanicas|normativas|facciones|guias|actualizaciones)\/[a-z0-9/-]+\.md$/.test(p) ||
 /^src\/data\/(portal|home|legal)\.json$/.test(p) || /^public\/images\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|avif)$/.test(p));
export function validateContent(path,bytes,previous){
 if(!allowedPath(path))throw new Error('Ruta no permitida.');
 if(bytes.length>4*1024*1024)throw new Error('El archivo supera 4 MB.');
 if(path.startsWith('public/images/')){
   const h=Buffer.from(bytes);const ext=path.split('.').pop().toLowerCase();
   const ok=ext==='png'?h.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):
     ['jpg','jpeg'].includes(ext)?h[0]===255&&h[1]===216&&h[2]===255:
     ext==='webp'?h.toString('ascii',0,4)==='RIFF'&&h.toString('ascii',8,12)==='WEBP':
     h.toString('ascii',4,8)==='ftyp'&&['avif','avis'].includes(h.toString('ascii',8,12));
   if(!ok)throw new Error('El contenido no corresponde a una imagen admitida.');
   return;
 }
 const text=Buffer.from(bytes).toString('utf8');
 if(path.endsWith('.json')){(path.endsWith('/home.json')?homeSchema:path.endsWith('/legal.json')?legalSchema:settingsSchema).parse(JSON.parse(text));return;}
 if(bytes.length>600000)throw new Error('El artículo supera 600 KB.');
 const match=text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
 if(!match)throw new Error('Falta la cabecera YAML entre líneas --- .');
 const meta=articleSchema.parse(parse(match[1]));
 if(previous){
   const old=Buffer.from(previous).toString('utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
   if(old&&parse(old[1]).licensedText&&!meta.licensedText)throw new Error('No se puede retirar la atribución del texto adaptado.');
 }
 if(/<\s*(script|iframe|object|embed|style)\b|\bon\w+\s*=|javascript\s*:/i.test(text))throw new Error('No se admite contenido ejecutable en los artículos.');
}
