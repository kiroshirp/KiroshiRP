import data from './data/portal.json';
import {settingsSchema} from '../admin/schema.mjs';
const validated = settingsSchema.parse(data);
export const {site, leadership, phases} = validated;
type SectionID = 'lore'|'mecanicas'|'normativas'|'facciones'|'guias'|'actualizaciones';
export const sections = validated.sections as (Omit<typeof data.sections[number], 'id'> & {id:SectionID})[];
export const url = (path = '') => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
