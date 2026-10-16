import {defineCollection} from 'astro:content';
import {glob} from 'astro/loaders';
import {articleSchema as schema} from '../admin/schema.mjs';
export const collections = Object.fromEntries(['lore','mecanicas','normativas','facciones','guias','actualizaciones'].map(name=>[name,defineCollection({loader:glob({pattern:'**/*.md',base:`./src/content/${name}`}),schema})]));

