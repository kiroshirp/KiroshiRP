// Registro de acciones del equipo (solo lectura).
import { json } from '../http.mjs';
import { recentActions } from '../audit.mjs';

export async function registro({ store }) {
  return json({ items: await recentActions(store) });
}
