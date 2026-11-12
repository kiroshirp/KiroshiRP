import data from './data/portal.json';
import { settingsSchema, homeSchema } from '../admin/schema.mjs';
import homeData from './data/home.json';
import sectionsData from './data/sections.json';
import { z } from 'zod';
const home = homeSchema.parse(homeData);
export const brand = {
  primary: home.texts.titularCiudad + ' ' + home.texts.titularHistorias,
  secondary: home.texts.lemaSecundario,
};
const validated = settingsSchema.parse(data);
export const { site, leadership, phases } = validated;
type SectionID = 'lore' | 'mecanicas' | 'normativas' | 'facciones' | 'guias' | 'actualizaciones';
export const sections = validated.sections as (Omit<(typeof data.sections)[number], 'id'> & {
  id: SectionID;
})[];
export const url = (path = '') =>
  `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

const sectionExtrasSchema = z.record(
  z.enum(['lore', 'mecanicas', 'normativas', 'facciones', 'guias', 'actualizaciones']),
  z.strictObject({
    cover: z.string().optional(),
    picks: z.array(z.string()),
    note: z.string().min(1),
  }),
);
const parsedExtras = sectionExtrasSchema.parse(sectionsData);
for (const { id } of validated.sections)
  if (!(id in parsedExtras)) throw new Error('Falta src/data/sections.json para ' + id);
export const sectionExtras = parsedExtras as Record<
  SectionID,
  { cover?: string; picks: string[]; note: string }
>;
