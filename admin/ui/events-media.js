import { state } from './state.js';
import { api } from './api.js';
import { refresh } from './catalog.js';
import { $, busy, fail, show } from './dom.js';
$('upload').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file || state.working) return;
  try {
    if (file.size > 4 * 1024 * 1024) throw new Error('La imagen supera 4 MB.');
    if (!/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|avif)$/.test(file.name))
      throw new Error(
        'Usa un nombre sin espacios ni acentos y una extensión de imagen en minúsculas.',
      );
    if (
      !confirm(
        state.mode === 'github'
          ? 'La imagen se guardará en GitHub e iniciará una publicación. ¿Continuar?'
          : '¿Guardar esta imagen en el proyecto local?',
      )
    )
      return;
    const path = 'public/images/' + file.name;
    let version = '';
    if (state.files.some((f) => f.path === path)) {
      if (!confirm('Ya existe esa imagen. ¿Sustituirla?')) return;
      version = (await api('file?path=' + encodeURIComponent(path))).version;
    }
    busy(true);
    const content = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.readAsDataURL(file);
    });
    await api('file', 'PUT', { path, version, content });
    await refresh();
    show('Imagen guardada: images/' + file.name);
  } catch (error) {
    fail(error);
  } finally {
    event.target.value = '';
    busy(false);
  }
});
