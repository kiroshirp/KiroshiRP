const input = document.querySelector<HTMLInputElement>('#filter-search')!;
const select = document.querySelector<HTMLSelectElement>('#filter-category');
const cards = [...document.querySelectorAll<HTMLElement>('[data-card]')];
const resultCount = document.querySelector<HTMLElement>('#result-count')!;
const initialCount = resultCount.textContent;
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const pending = document.querySelector<HTMLDetailsElement>('#pending-library');
const more = document.querySelector<HTMLDetailsElement>('#regulation-more');
function filter() {
  let count = 0;
  cards.forEach((c) => {
    const visible =
      normalize(c.dataset.search || '').includes(normalize(input.value)) &&
      (!select?.value || c.dataset.category === select.value);
    c.hidden = !visible;
    if (visible) count++;
  });
  const filtering = !!(input.value || select?.value);
  resultCount.textContent = filtering
    ? `${count} ${count === 1 ? 'ficha encontrada' : 'fichas encontradas'}`
    : initialCount;
  document.querySelector<HTMLElement>('#no-results')!.hidden = count !== 0 || cards.length === 0;
  if (more) {
    const matches = more.querySelectorAll('[data-card]:not([hidden])').length;
    more.hidden = filtering && !matches;
    more.open = filtering && !!matches;
    more.querySelector<HTMLElement>('summary .mono')!.textContent = filtering
      ? `${matches} ${matches === 1 ? 'resultado' : 'resultados'}`
      : `${more.querySelectorAll('[data-card]').length} apartados`;
  }
  if (pending) {
    const hasMatch = !!pending.querySelector('[data-card]:not([hidden])');
    pending.hidden = !hasMatch;
    if (filtering) pending.open = hasMatch;
    else pending.open = false;
  }
}
input.addEventListener('input', filter);
select?.addEventListener('change', filter);
