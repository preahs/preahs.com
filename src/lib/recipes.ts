// ============================================================
//  Recipe helpers — shared by the homepage block and /recipes
// ============================================================

import { getCollection } from 'astro:content';

export type RecipeKind = 'main' | 'soup' | 'salad' | 'drink' | 'dessert';

export interface Recipe {
  id: string;
  title: string;
  url: string;
  made: Date;
  kind: RecipeKind;
  source: string;
  note?: string;
}

// YAML bare dates (2026-10-19) parse as UTC midnight, so format in UTC
// or they'd read as the day before in US timezones.
/** "Oct 19" */
export function formatMadeShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** "October 2026" — used to group the history page. */
export function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** All recipes, newest first; same-day entries alphabetical. */
export async function getRecipes(): Promise<Recipe[]> {
  const entries = await getCollection('recipes');
  const recipes = entries.map(({ id, data }) => ({
    id,
    title: data.title,
    url: data.url,
    made: data.made,
    kind: data.kind,
    source: new URL(data.url).hostname.replace(/^www\./, ''),
    note: data.note,
  }));
  return recipes.sort(
    (a, b) => b.made.valueOf() - a.made.valueOf() || a.title.localeCompare(b.title),
  );
}
