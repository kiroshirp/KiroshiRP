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
  const { ui } = ctx;
  const slot = ctx.slot || 1;
  // Al cambiar de personaje se vuelve a montar: los oyentes del montaje anterior dejan de actuar.
  const tok = (root.__tok = {});
  const live = () => root.isConnected && root.__tok === tok;
  const reduce = ui.reduce;
  const draftKey = `krp-ficha-${ctx.user.id}` + (slot > 1 ? '-' + slot : '');
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
  const tabs = el('div', 'char-tabs');
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', 'Personajes de la cuenta');
  for (let n = 1; n <= 3; n++) {
    const info = ctx.session.characters?.[n - 1];
    const tab = el('button', 'char-tab', info?.alias || (info?.progress != null ? 'Personaje ' + n : 'Nuevo personaje'));
    tab.type = 'button';
    if (n === slot) tab.setAttribute('aria-current', 'true');
    tab.addEventListener('click', () => {
      if (n === slot) return;
      if (dirty() && !confirm('Tienes cambios sin guardar en este personaje. ¿Cambiar de todos modos?')) return;
      mount(root, { ...ctx, slot: n });
    });
    tabs.append(tab);
  }
  root.append(tabs);
  const skeleton = el('div', 'char-skel');
  skeleton.setAttribute('aria-hidden', 'true');
  skeleton.append(
    el('div', 'skel skel-hero'),
    el('div', 'skel skel-line'),
    el('div', 'skel skel-line short'),
  );
  root.append(skeleton);

  let data;
  try {
    data = await ctx.api('character?slot=' + slot);
    skeleton.remove();
  } catch (e) {
    skeleton.remove();
    const n = el('p', 'notice error', e.message || 'No se pudo cargar la ficha.');
    n.setAttribute('role', 'alert');
    root.append(n);
    return;
  }

  const { sections, maxTotal, maxImages } = data;
  let sheet = data.sheet;
  const fields = sections.flatMap((s) => s.fields);
  const inputs = {};

  // Tarjeta resumen: monograma vectorial + anillo de progreso
  const status = el('strong', 'char-status');
  const pct = el('span', 'ring-num');
  const ring = ui.ring(0, pct);
  ring.setAttribute('role', 'img');
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
  statRow.append(status);
  sumText.append(statRow);
  summary.append(ui.avatar(ui.initialsOf(ctx.user.name)), sumText, ring);
  root.append(summary);

  // Índice lateral (scrollspy) + formulario por pasos
  const layout = el('div', 'char-layout');
  const index = el('nav', 'char-index');
  index.setAttribute('aria-label', 'Secciones de la ficha');
  const indexList = el('ol');
  index.append(indexList);
  const steps = [];
  const addStep = (card, title, fieldsOf) => {
    const li = el('li');
    const btn = el('button');
    btn.type = 'button';
    const cnt = el('span', 'c');
    btn.append(
      el('span', 'n', String(steps.length + 1).padStart(2, '0')),
      el('span', 't', title),
      cnt,
    );
    btn.addEventListener('click', () => {
      card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      card.querySelector('input,textarea')?.focus({ preventScroll: true });
    });
    li.append(btn);
    indexList.append(li);
    steps.push({ card, btn, cnt, fieldsOf });
  };

  const form = el('form', 'char-form');
  form.noValidate = true;
  for (const s of sections) {
    const card = el('fieldset', 'card char-section');
    addStep(card, s.title, s.fields);
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
  addStep(imgCard, 'Imágenes', []);

  // Pie: barra de guardado fija
  const counter = el('p', 'char-counter');
  counter.setAttribute('aria-live', 'polite');
  const state = el('span', 'char-state');
  state.setAttribute('role', 'status');
  const savedLine = el('p', 'char-saved');
  const err = el('p', 'notice error');
  err.setAttribute('role', 'alert');
  err.hidden = true;
  const save = el('button', 'btn primary', 'Guardar historia');
  save.type = 'submit';
  const del = el('button', 'btn danger', 'Eliminar ficha');
  del.type = 'button';
  const actions = el('div', 'char-actions');
  actions.append(del);
  // Versiones anteriores (hasta 5): al elegir una se carga en el formulario y solo se guarda si pulsas Guardar.
  const versions = el('select');
  versions.setAttribute('aria-label', 'Cargar una versión anterior');
  const versionBox = el('label', 'char-versions', 'Versiones anteriores ');
  versionBox.append(versions);
  versionBox.hidden = true;
  const renderVersions = (history) => {
    versions.replaceChildren(new Option('Elegir…', ''));
    history.forEach((h, i) =>
      versions.append(
        new Option(new Date(h.updatedAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }), i),
      ),
    );
    versionBox.hidden = !history.length;
    versionBox.history = history;
  };
  const kbd = el('kbd', 'char-kbd', 'Ctrl+S');
  kbd.setAttribute('aria-hidden', 'true');
  const bar = el('div', 'char-savebar');
  bar.append(state, counter, kbd, save);
  form.append(
    el(
      'p',
      'char-private',
      'Solo tú puedes editarla. El equipo de administración puede leerla para moderar, salvo el apartado «Secretos», que solo ves tú.',
    ),
    savedLine,
    versionBox,
    err,
    actions,
    bar,
  );
  layout.append(index, form);
  root.append(layout);
  ui.reveal([summary, ...form.querySelectorAll('.char-section')]);

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
  let ringReady = false;

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
    const setRing = () => ring.style.setProperty('--p', p);
    if (reduce || ringReady) setRing();
    else {
      ringReady = true;
      requestAnimationFrame(() => requestAnimationFrame(setRing));
    }
    ring.setAttribute('aria-label', `Progreso de la ficha: ${p}%`);
    pct.textContent = `${p}%`;
    status.textContent = p === 100 ? 'Ficha completada' : 'Ficha sin completar';
    for (const st of steps) {
      if (!st.fieldsOf.length) continue;
      const d = st.fieldsOf.filter((f) => c.values[f.id].trim()).length;
      st.cnt.textContent = `${d}/${st.fieldsOf.length}`;
      st.btn.classList.toggle('done', d === st.fieldsOf.length);
    }
    const isDirty = dirty();
    state.textContent = isDirty ? 'Cambios sin guardar' : sheet ? 'Guardado' : 'Sin cambios';
    state.classList.toggle('dirty', isDirty);
    const total = fields.reduce((s, f) => s + c.values[f.id].trim().length, 0);
    counter.textContent = `${total} / ${maxTotal} caracteres`;
    counter.classList.toggle('char-over', total > maxTotal);
    save.disabled = total > maxTotal;
  };

  renderVersions(sheet?.history || []);
  versions.addEventListener('change', () => {
    const h = versionBox.history[Number(versions.value)];
    if (!h) return;
    fill(h.values, h.images);
    refresh();
    store.set(current());
    ui.toast('Versión cargada. Pulsa Guardar para conservarla.');
    versions.value = '';
  });
  fill(sheet?.values, sheet?.images);
  baseline = snap(current());
  const draft = store.get();
  if (draft && draft.values) {
    fill(draft.values, draft.images);
    if (!dirty()) store.del();
  }
  renderSaved();
  refresh();

  // Autoguardado en el servidor 30 s después del último cambio (además del borrador local).
  let autoTimer;
  let auto = false;
  form.addEventListener('input', () => {
    refresh();
    if (dirty()) store.set(current());
    else store.del();
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      if (live() && dirty() && !save.disabled) {
        auto = true;
        form.requestSubmit();
      }
    }, 30000);
  });
  window.addEventListener('beforeunload', (e) => {
    if (live() && dirty()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Scrollspy del índice lateral
  const setCurrent = (i) =>
    steps.forEach((st, k) =>
      k === i
        ? st.btn.setAttribute('aria-current', 'step')
        : st.btn.removeAttribute('aria-current'),
    );
  setCurrent(0);
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) setCurrent(steps.findIndex((st) => st.card === e.target));
      },
      { rootMargin: '-20% 0px -65% 0px' },
    );
    for (const st of steps) spy.observe(st.card);
  }
  // Ctrl+S guarda solo mientras esta sección está visible.
  document.addEventListener('keydown', (e) => {
    if (!live() || root.hidden) return;
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (!save.disabled) form.requestSubmit();
    }
  });

  const fail = (msg) => {
    err.textContent = msg;
    err.hidden = false;
    ui.toast(msg, 'error');
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const quiet = auto;
    auto = false;
    clearTimeout(autoTimer);
    err.hidden = true;
    save.disabled = true;
    state.textContent = 'Guardando…';
    try {
      const body = current();
      const r = await ctx.api('character', 'POST', { ...body, slot });
      const clean = Object.fromEntries(
        Object.entries(body.values)
          .map(([k, v]) => [k, v.trim()])
          .filter(([, v]) => v),
      );
      sheet = { values: clean, images: body.images, updatedAt: r.updatedAt, progress: r.progress };
      if (ctx.session.characters)
        ctx.session.characters[slot - 1] = { slot, progress: r.progress, updatedAt: r.updatedAt, alias: clean.alias || null };
      if (slot === 1) ctx.session.character = { progress: r.progress, updatedAt: r.updatedAt };
      // En el autoguardado no se reescribe el formulario: la persona puede haber seguido escribiendo.
      if (!quiet) fill(clean, body.images);
      baseline = quiet ? snap(body) : snap(current());
      if (!dirty()) store.del();
      renderSaved();
      ctx.api('character?slot=' + slot).then((d) => renderVersions(d.sheet?.history || [])).catch(() => {});
      ui.toast(quiet ? 'Guardado automático.' : 'Historia guardada.');
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
      await ctx.api('character-delete', 'POST', { slot });
      sheet = null;
      renderVersions([]);
      fill();
      baseline = snap(current());
      store.del();
      renderSaved();
      refresh();
      ui.toast('Ficha eliminada.');
    } catch (x) {
      fail(x.message || 'No se pudo eliminar.');
    }
  });
}
