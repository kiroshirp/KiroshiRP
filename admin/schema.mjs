import {z} from 'zod';

export const sections = ['lore','mecanicas','normativas','facciones','guias','actualizaciones'];
const publicURL = z.url().refine(v => /^https?:\/\//i.test(v), 'Solo se permiten enlaces HTTP o HTTPS');
export const articleSchema = z.object({
  title:z.string().min(1).max(250), description:z.string().min(1).max(2000), category:z.string().min(1),
  status:z.enum(['Documentado','Borrador','Propuesta','Por documentar','Confirmado']),
  origin:z.enum(['CANON CYBERPUNK','LORE KIROSHIRP','GUÍA DEL PORTAL']),
  updated:z.coerce.date(), universeScope:z.string().optional(), licensedText:z.boolean().default(false),
  image:z.object({path:z.string().regex(/^images\/[a-zA-Z0-9_./-]+$/).refine(v=>!v.includes('..')),alt:z.string().min(1)}).optional(),
  history:z.array(z.object({date:z.coerce.date(),description:z.string()})).default([]),
  related:z.array(z.string().regex(/^(lore|mecanicas|normativas|facciones|guias|actualizaciones)\/[a-z0-9/-]+$/)).default([]),
  order:z.number().default(100), factionStatus:z.enum(['Activa','Prevista','En desarrollo']).optional(),
  published:z.boolean().default(false), sources:z.array(z.object({label:z.string().min(1),url:publicURL})).default([])
}).strict().superRefine((data,ctx)=>{
  if(data.licensedText && !data.sources.length)ctx.addIssue({code:'custom',message:'El texto con licencia debe conservar sus fuentes.',path:['sources']});
});
export const settingsSchema = z.object({
  site:z.object({name:z.string().min(1),discord:z.union([publicURL,z.literal('')]),contact:z.union([publicURL,z.email().transform(v=>'mailto:'+v),z.literal(''),z.string().regex(/^mailto:[^\s]+@[^\s]+$/)]),description:z.string().min(1),adminUrl:z.union([z.url().refine(v=>v.startsWith('https://')),z.literal('')])}).strict(),
  sections:z.array(z.object({id:z.enum(sections),title:z.string().min(1),subtitle:z.string(),code:z.string(),label:z.string()}).strict()).length(6).refine(v=>new Set(v.map(s=>s.id)).size===6,'Debe aparecer cada sección una sola vez.'),
  leadership:z.object({status:z.string(),minimumMerits:z.number().nonnegative().nullable(),veteranEligibility:z.string().nullable(),quorum:z.number().nonnegative().nullable(),challengeCooldown:z.number().nonnegative().nullable(),inactivityDays:z.number().nonnegative().nullable(),rules:z.array(z.tuple([z.string(),z.string()]))}).strict(),
  phases:z.array(z.tuple([z.string(),z.string()]))
}).strict();
export const homeSchema = z.object({
 texts:z.record(z.string(),z.string()),
 principles:z.array(z.tuple([z.string(),z.string(),z.string()])),
 discovery:z.array(z.tuple([z.string().regex(/^(lore|mecanicas|normativas|facciones|guias|actualizaciones)\/[a-z0-9/-]*$/),z.string(),z.string(),z.string(),z.string()])),
 journey:z.array(z.string())
}).strict();
const infoPage=z.object({title:z.string().min(1),sections:z.array(z.object({title:z.string().min(1),paragraphs:z.array(z.string())}).strict())}).strict();
export const legalSchema=z.object({contacto:infoPage,'aviso-legal':infoPage,privacidad:infoPage}).strict();
