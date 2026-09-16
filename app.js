import { toDigits, parseInteger } from './numerals.js';

const MISSINGNO = { en: 'MissingNo.', ko: 'MissingNo.' };
const lang = navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en';

const dateEl = document.getElementById('date');
const timeEl = document.getElementById('time');
const input = document.getElementById('number');
const convertedEl = document.getElementById('converted');
const noteEl = document.getElementById('note');
const generationSelect = document.getElementById('generation');
const hardcoreInput = document.getElementById('hardcore');

let pokemon = []; // pokemon[i] is No. i + 1
let generations = []; // generations[g - 1] is the last Pokédex number of generation g
let base = 0n;

function spriteUrl(n) {
  return n === 0
    ? 'assets/missingno.svg'
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${n}.png`;
}

function currentSystem() {
  return document.querySelector('input[name="system"]:checked').value;
}

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function digit(n) {
  const name = (n === 0 ? MISSINGNO : pokemon[n - 1])[lang];
  const img = element('img');
  img.src = spriteUrl(n);
  img.alt = name;
  img.width = img.height = 96;

  const label = element('figcaption', 'label');
  const nameEl = element('span', 'name', name);
  nameEl.lang = lang;
  label.append(element('span', 'dex', `No.${String(n).padStart(3, '0')}`), nameEl);

  const figure = element('figure', 'digit');
  figure.append(img, label);
  return figure;
}

// A non-negative BigInt as Pokémon digits, or as text zero-padded to fit `max` in another radix.
function numeral(value, system, max) {
  const el = element('span', 'numeral');
  if (system === 'pokemon') {
    el.append(...toDigits(value, base).map(digit));
  } else {
    const radix = Number(system);
    const width = max === undefined ? 1 : max.toString(radix).length;
    el.textContent = value.toString(radix).toUpperCase().padStart(width, '0');
  }
  return el;
}

function separator(text) {
  const el = element('span', 'separator', text);
  el.setAttribute('aria-hidden', 'true');
  return el;
}

// Replaces only the fields whose value changed, so unchanged sprites aren't rebuilt every second.
function renderReadout(el, fields, sep, system) {
  el.dataset.system = system;
  if (el.children.length !== fields.length * 2 - 1) {
    el.replaceChildren(...fields.flatMap((_, i) => [...(i > 0 ? [separator(sep)] : []), element('span')]));
  }
  fields.forEach(({ value, max }, i) => {
    const current = el.children[i * 2];
    const key = `${system}:${base}:${value}`;
    if (current.dataset.key === key) return;
    const next = numeral(BigInt(value), system, max);
    next.dataset.key = key;
    current.replaceWith(next);
  });
}

function renderClock() {
  const now = new Date();
  const system = currentSystem();

  renderReadout(dateEl, [
    { value: now.getFullYear() },
    { value: now.getMonth() + 1, max: 12 },
    { value: now.getDate(), max: 31 },
  ], '/', system);
  renderReadout(timeEl, [
    { value: now.getHours(), max: 23 },
    { value: now.getMinutes(), max: 59 },
    { value: now.getSeconds(), max: 59 },
  ], ':', system);
}

// Aligned to the start of each second; a plain 1s interval drifts and can skip a second.
function tick() {
  renderClock();
  timeEl.classList.remove('colons-off');
  setTimeout(() => timeEl.classList.add('colons-off'), 500);
  setTimeout(tick, 1000 - (Date.now() % 1000));
}

function formula(value, digits, negative) {
  const el = element('span', 'formula');
  const sign = negative ? '−' : '';
  el.append(`${sign}${value} = ${sign}${negative ? '(' : ''}`);
  digits.forEach((d, i) => {
    el.append(`${i > 0 ? ' + ' : ''}${d} × ${base}`, element('sup', '', String(digits.length - 1 - i)));
  });
  if (negative) el.append(')');
  return el;
}

function renderConverter() {
  const system = currentSystem();
  const text = input.value;
  const n = parseInteger(text);
  convertedEl.dataset.system = system;
  noteEl.replaceChildren();

  if (n === null) {
    convertedEl.replaceChildren();
    if (text.trim()) noteEl.textContent = 'Enter a whole number, like 25 or -7.';
    return;
  }

  const negative = n < 0n;
  const value = negative ? -n : n;
  const el = numeral(value, system);
  if (negative && system === 'pokemon') {
    // Pokémon Numerals write negatives upside down instead of with a sign.
    el.classList.add('negative');
    el.prepend(element('span', 'visually-hidden', 'minus'));
  } else if (negative) {
    el.prepend(element('span', 'separator', '−')); // inside the numeral so the sign wraps with it
  }
  convertedEl.replaceChildren(el);

  const digits = toDigits(value, base);
  if (system === 'pokemon' && digits.length > 1) noteEl.append(formula(value, digits, negative));
}

// Each generation counts in base (its last Pokédex number + 1).
function setBase() {
  base = BigInt(generationSelect.value);
  document.querySelectorAll('[data-max]').forEach((el) => { el.textContent = base - 1n; });
  document.querySelectorAll('[data-base]').forEach((el) => { el.textContent = base; });
}

// Mirrors the converter, generation and hardcore mode into the address (keeping #clock), so the view can be shared.
// Debounced because Safari throws after 100 replaceState calls in 10 seconds, which fast typing can reach.
let urlTimer;
function updateUrl() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    const query = new URLSearchParams({ n: input.value, gen: generationSelect.selectedIndex + 1 });
    if (hardcoreInput.checked) query.set('hardcore', '1');
    history.replaceState(null, '', `?${query}${location.hash}`);
  }, 300);
}

try {
  const response = await fetch('data/pokemon.json');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  ({ pokemon, generations } = await response.json());
} catch (error) {
  console.error('Loading data/pokemon.json failed:', error);
  dateEl.textContent = 'The Pokédex failed to load. Reload the page to try again.';
  throw error;
}

// A shared link like ?n=2026&gen=1&hardcore=1 presets the converter, generation and hardcore mode; otherwise Gen 1 is used.
const params = new URLSearchParams(location.search);
const gen = Number(params.get('gen'));
generationSelect.append(...generations.map((last, i) => new Option(`Gen ${i + 1}`, last + 1)));
generationSelect.selectedIndex = generations[gen - 1] ? gen - 1 : 0;
if (params.has('n')) input.value = params.get('n').slice(0, input.maxLength);
hardcoreInput.checked = params.get('hardcore') === '1';
setBase();

// Warm the cache for every minute so the clock never flashes an empty sprite.
for (let n = 1; n <= 59; n++) new Image().src = spriteUrl(n);

document.querySelectorAll('input[name="system"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    renderClock();
    renderConverter();
  });
});
generationSelect.addEventListener('change', () => {
  setBase();
  renderClock();
  renderConverter();
  updateUrl();
});
input.addEventListener('input', () => {
  renderConverter();
  updateUrl();
});
hardcoreInput.addEventListener('change', updateUrl);
// Back and Forward between the main and #clock views can land on an entry written before the latest change.
window.addEventListener('popstate', updateUrl);

// Touch screens have no hover, so tapping a sprite toggles its label; tapping elsewhere closes it.
document.addEventListener('click', (event) => {
  const tapped = event.target.closest('.digit');
  document.querySelectorAll('.digit.show-label').forEach((el) => {
    if (el !== tapped) el.classList.remove('show-label');
  });
  tapped?.classList.toggle('show-label');
});

tick();
renderConverter();
