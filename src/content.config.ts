import {defineCollection} from 'astro:content';
import {z} from 'astro/zod';
import {glob} from 'astro/loaders';
const schema = z.object({title:z.string(), image:z.object({path:z.string(),alt:z.string()}).optional(), history:z.array(z.object({date:z.coerce.date(),description:z.string()})).default([]), description:z.string(), category:z.string(), status:z.enum(['Borrador','Propuesta','Por documentar','Confirmado']), origin:z.enum(['CANON CYBERPUNK','LORE KIROSHIRP','GUÍA DEL PORTAL']), updated:z.coerce.date(), related:z.array(z.string()).default([]), order:z.number().default(100), factionStatus:z.enum(['Activa','Prevista','En desarrollo']).optional(), published:z.boolean().default(false), sources:z.array(z.object({label:z.string(),url:z.url()})).default([])});
export const collections = Object.fromEntries(['lore','mecanicas','normativas','facciones','guias','actualizaciones'].map(name=>[name,defineCollection({loader:glob({pattern:'**/*.md',base:`./src/content/${name}`}),schema})]));

