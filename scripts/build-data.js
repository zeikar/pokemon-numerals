// Regenerates data/pokemon.json from PokéAPI's species tables.
// Run again when a new generation lands: the numeral base grows with it.
import { mkdir, writeFile } from 'node:fs/promises';

const CSV = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/';
const LANGUAGES = { 3: 'ko', 9: 'en' }; // PokéAPI local_language_id

async function fetchRows(file) {
  const response = await fetch(CSV + file);
  if (!response.ok) throw new Error(`Fetching ${CSV + file} failed: ${response.status}`);
  return (await response.text()).trim().split('\n').slice(1);
}

const [nameRows, speciesRows] = await Promise.all([
  fetchRows('pokemon_species_names.csv'),
  fetchRows('pokemon_species.csv'),
]);

const names = [];
for (const line of nameRows) {
  const [id, languageId, name] = line.split(',');
  const lang = LANGUAGES[languageId];
  if (!lang) continue;
  // Plain comma splitting is only safe while these rows have no quoted fields.
  if (line.includes('"')) throw new Error(`Quoted CSV row needs a real parser: ${line}`);
  (names[id - 1] ??= {})[lang] = name;
}

for (let i = 0; i < names.length; i++) {
  if (!names[i]?.en || !names[i]?.ko) throw new Error(`Missing names for No. ${i + 1}`);
}

// generations[g - 1] is the last Pokédex number introduced in generation g.
// The id, identifier and generation_id columns come first and are never quoted.
const generations = [];
for (const line of speciesRows) {
  const [id, , generationId] = line.split(',');
  generations[generationId - 1] = Math.max(generations[generationId - 1] ?? 0, Number(id));
}

// The two tables update separately, so a new species can appear in one before the other.
if (generations.at(-1) !== names.length) {
  throw new Error(`Species end at No. ${generations.at(-1)} but names end at No. ${names.length}`);
}

const dataDir = new URL('../data/', import.meta.url);
await mkdir(dataDir, { recursive: true });
await writeFile(new URL('pokemon.json', dataDir), JSON.stringify({ generations, pokemon: names }) + '\n');
console.log(`Wrote ${names.length} Pokémon from ${generations.length} generations to data/pokemon.json`);
