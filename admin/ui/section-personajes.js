// Sección «Mis personajes» de /cuenta/. Todo dato de usuario entra por textContent/value.
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

export async function mount(root, ctx) {
  if (!document.querySelector('link[href="/cuenta/section-personajes.css"]')) {
    const link = el('link');
    link.rel = 'stylesheet';
    link.href = '/cuenta/section-personajes.css';
    document.head.append(link);
  }
  root.replaceChildren();
  const draftKey = `krp-ficha-${ctx.user.id}`;
  const store = {
    get() {
      try {
        return JSON.parse(localStorage.getItem(draftKey));
      } catch {
        return null;
      }
    },
    set(v) {
      try {
        localStorage.setItem(draftKey, JSON.stringify(v));
      } catch {}
    },
    del() {
      try {
        localStorage.removeItem(draftKey);
      } catch {}
    },
  };

  const head = el('header', 'view-head');
  head.append(
    el('p', 'eyebrow', 'REGISTRO CIUDADANO'),
    el('h1', null, 'Mis personajes.'),
    el('p', 'lead', 'Una cuenta, distintas historias. Cada identidad conserva sus propios datos.'),
  );
  root.append(head);

  let data;
  try {
    data = await ctx.api('character');
  } catch (e) {
    const n = el('p', 'notice error', e.message || 'No se pudo cargar la ficha.');
    n.setAttribute('role', 'alert');
    root.append(n);
    return;
  }

  const { sections, maxTotal, maxImages } = data;
  let sheet = data.sheet;
  const fields = sections.flatMap((s) => s.fields);
  const inputs = {};

  // Tarjeta resumen
  const initials =
    (ctx.user.name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'TP';
  const badge = el('span', 'badge char-badge', initials);
  badge.setAttribute('aria-hidden', 'true');
  const status = el('strong', 'char-status');
  const pct = el('span', 'char-pct');
  const bar = el('progress', 'progress');
  bar.max = 100;
  bar.setAttribute('aria-label', 'Progreso de la ficha');
  const summary = el('div', 'card char-summary');
  const sumText = el('div', 'char-summary-text');
  sumText.append(
    el('p', 'eyebrow', 'FICHA'),
    el('h2', null, 'Tu personaje'),
    el(
      'p',
      null,
      'Prepara su historia antes de la apertura. Guardarla no crea el personaje ni concede acceso al juego.',
    ),
  );
  const statRow = el('div', 'char-stat');
  statRow.append(status, pct);
  sumText.append(statRow, bar);
  summary.append(badge, sumText);
  root.append(summary);

  // Formulario
  const form = el('form', 'char-form');
  form.noValidate = true;
  let n = 0;
  for (const s of sections) {
    const card = el('fieldset', 'card char-section');
    card.append(el('legend', 'char-legend', s.title));
    if (s.intro) card.append(el('p', 'char-intro', s.intro));
    const grid = el('div', 'char-fields');
    for (const f of s.fields) {
      const id = `char-${f.id}`;
      const wrap = el('div', `field char-field${f.type === 'long' ? ' char-long' : ''}`);
      const label = el('label', null, f.label);
      label.htmlFor = id;
      const input = el(f.type === 'long' ? 'textarea' : 'input');
      if (f.type === 'long') input.rows = 5;
      else input.type = 'text';
      input.id = id;
      input.name = f.id;
      input.maxLength = f.max;
      input.autocomplete = 'off';
      if (f.hint) {
        input.placeholder = f.hint;
        const h = el('small', 'char-hint', f.hint);
        h.id = `${id}-hint`;
        input.setAttribute('aria-describedby', h.id);
        wrap.append(label, input, h);
      } else wrap.append(label, input);
      inputs[f.id] = input;
      grid.append(wrap);
      n++;
    }
    card.append(grid);
    form.append(card);
  }

  // Imágenes
  const imgCard = el('fieldset', 'card char-section');
  imgCard.append(
    el('legend', 'char-legend', 'Imágenes'),
    el('p', 'char-intro', 'Solo enlaces: no se suben archivos.'),
  );
  const imgWrap = el('div', 'field char-field char-long');
  const imgLabel = el('label', null, 'Fotos del personaje (enlaces)');
  imgLabel.htmlFor = 'char-images';
  const imgs = el('textarea');
  imgs.id = 'char-images';
  imgs.name = 'images';
  imgs.rows = 4;
  imgs.placeholder = 'https://';
  imgs.setAttribute('aria-describedby', 'char-images-hint');
  const imgHint = el(
    'small',
    'char-hint',
    `Pega un enlace por línea, hasta ${maxImages}. Deben empezar por https://`,
  );
  imgHint.id = 'char-images-hint';
  imgWrap.append(imgLabel, imgs, imgHint);
  const imgList = el('ul', 'char-links');
  imgCard.append(imgWrap, imgList);
  form.append(imgCard);

  // Pie
  const counter = el('p', 'char-counter');
  counter.setAttribute('aria-live', 'polite');
  const savedLine = el('p', 'char-saved');
  const err = el('p', 'notice error');
  err.setAttribute('role', 'alert');
  err.hidden = true;
  const save = el('button', 'btn primary', 'Guardar historia');
  save.type = 'submit';
  const del = el('button', 'btn danger', 'Eliminar ficha');
  del.type = 'button';
  const actions = el('div', 'char-actions');
  actions.append(save, del);
  form.append(
    counter,
    el(
      'p',
      'char-private',
      'Solo tú puedes editarla. El equipo de administración puede leerla para moderar, salvo el apartado «Secretos», que solo ves tú.',
    ),
    savedLine,
    err,
    actions,
  );
  root.append(form);

  const current = () => ({
    values: Object.fromEntries(fields.map((f) => [f.id, inputs[f.id].value])),
    images: imgs.value
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean),
  });
  const snap = (c) =>
    JSON.stringify({
      v: fields.map((f) => (c.values[f.id] || '').trim()),
      i: c.images,
    });
  const fill = (values = {}, images = []) => {
    for (const f of fields) inputs[f.id].value = values[f.id] || '';
    imgs.value = images.join('\n');
  };
  let baseline;

  const renderLinks = (list) => {
    imgList.replaceChildren(
      ...list.map((u) => {
        const li = el('li');
        const a = el('a', null, u);
        a.href = u;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        li.append(a);
        return li;
      }),
    );
  };
  const renderSaved = () => {
    del.hidden = !sheet;
    savedLine.textContent = sheet
      ? `Guardada el ${new Date(sheet.updatedAt).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}`
      : 'Tu historia todavía no está guardada.';
    renderLinks(sheet?.images || []);
  };
  const dirty = () => snap(current()) !== baseline;
  const refresh = () => {
    const c = current();
    const filled = fields.filter((f) => c.values[f.id].trim()).length;
    const p = Math.round((filled / fields.length) * 100);
    bar.value = p;
    pct.textContent = `${p}%`;
    status.textContent = p === 100 ? 'Ficha completada' : 'Ficha sin completar';
    const total = fields.reduce((s, f) => s + c.values[f.id].trim().length, 0);
    counter.textContent = `${total} / ${maxTotal} caracteres`;
    counter.classList.toggle('char-over', total > maxTotal);
    save.disabled = total > maxTotal;
  };

  fill(sheet?.values, sheet?.images);
  baseline = snap(current());
  const draft = store.get();
  if (draft && draft.values) {
    fill(draft.values, draft.images);
    if (!dirty()) store.del();
  }
  renderSaved();
  refresh();

  form.addEventListener('input', () => {
    refresh();
    if (dirty()) store.set(current());
    else store.del();
  });
  window.addEventListener('beforeunload', (e) => {
    if (root.isConnected && dirty()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  const fail = (msg) => {
    err.textContent = msg;
    err.hidden = false;
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    save.disabled = true;
    try {
      const body = current();
      const r = await ctx.api('character', 'POST', body);
      const clean = Object.fromEntries(
        Object.entries(body.values)
          .map(([k, v]) => [k, v.trim()])
          .filter(([, v]) => v),
      );
      sheet = { values: clean, images: body.images, updatedAt: r.updatedAt, progress: r.progress };
      fill(clean, body.images);
      baseline = snap(current());
      store.del();
      renderSaved();
    } catch (x) {
      fail(x.message || 'No se pudo guardar.');
    }
    refresh();
  });
  del.addEventListener('click', async () => {
    if (
      !confirm('¿Eliminar la ficha? Se borrará toda tu historia guardada y no se puede deshacer.')
    )
      return;
    err.hidden = true;
    try {
      await ctx.api('character-delete', 'POST', {});
      sheet = null;
      fill();
      baseline = snap(current());
      store.del();
      renderSaved();
      refresh();
    } catch (x) {
      fail(x.message || 'No se pudo eliminar.');
    }
  });
}
