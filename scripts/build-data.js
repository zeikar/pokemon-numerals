// Regenerates data/pokemon.json from PokéAPI's species name table.
// Run again when a new generation lands: the numeral base grows with it.
import { mkdir, writeFile } from 'node:fs/promises';

const SOURCE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv';
const LANGUAGES = { 3: 'ko', 9: 'en' }; // PokéAPI local_language_id

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`Fetching ${SOURCE} failed: ${response.status}`);

const names = [];
for (const line of (await response.text()).trim().split('\n').slice(1)) {
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

const dataDir = new URL('../data/', import.meta.url);
await mkdir(dataDir, { recursive: true });
await writeFile(new URL('pokemon.json', dataDir), JSON.stringify(names) + '\n');
console.log(`Wrote ${names.length} Pokémon to data/pokemon.json`);
