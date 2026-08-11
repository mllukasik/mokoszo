/**
 * Build-time validation: every ingredientId used in recipes must exist in ingredients.yaml.
 * Run with: node scripts/validate-ingredients.mjs
 * Called automatically from astro.config.mjs integration hook.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Load ingredients
const ingredientsRaw = readFileSync(join(root, 'src/data/ingredients.yaml'), 'utf-8');
const ingredients = yaml.load(ingredientsRaw);
const knownIds = new Set(ingredients.map((i) => i.id));

// Load all recipe files
const recipesDir = join(root, 'src/content/recipes');
const files = readdirSync(recipesDir).filter((f) => f.endsWith('.md'));

let errors = [];

for (const file of files) {
  const content = readFileSync(join(recipesDir, file), 'utf-8');

  // Extract frontmatter (between first --- and second ---)
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    errors.push(`${file}: brak frontmattera YAML`);
    continue;
  }

  const frontmatter = yaml.load(match[1]);
  const ingredients_list = frontmatter.ingredients ?? [];

  for (const entry of ingredients_list) {
    if (!knownIds.has(entry.ingredientId)) {
      errors.push(
        `${file}: nieznany ingredientId "${entry.ingredientId}" (nie istnieje w ingredients.yaml)`
      );
    }
  }
}

if (errors.length > 0) {
  console.error('\n❌ Błędy walidacji składników:\n');
  for (const err of errors) {
    console.error(`  • ${err}`);
  }
  console.error('');
  process.exit(1);
} else {
  console.log(`✅ Walidacja składników OK — ${files.length} przepisów, ${knownIds.size} składników`);
}
