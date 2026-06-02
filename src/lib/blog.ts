// ============================================================
//  Blog helpers — shared between pages and layouts
// ============================================================

// ------ Category tree ----------------------------------------
// Define all categories here. `parent` is another category id,
// or null for a top-level folder.
export interface CategoryNode {
  id: string;
  label: string;
  parent: string | null;
}

export const CATEGORIES: CategoryNode[] = [
  { id: 'tech',     label: 'Tech',     parent: null },
  { id: 'recipes',  label: 'Recipes',  parent: null },
  { id: 'essays',   label: 'Essays',   parent: null },
  { id: 'homelab',  label: 'Homelab',  parent: null },
  { id: 'security', label: 'Security', parent: null },
  { id: 'tea',      label: 'Tea',      parent: null },
  { id: 'travel',   label: 'Travel',   parent: null },
  { id: 'guides',   label: 'Guides',   parent: null },
];

/** Returns the display label for a category id, falling back to the id itself. */
export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

// ------ Date formatting --------------------------------------
/** Formats a Date as "Wed May. 13, 2026" (matching the site style). */
export function formatDate(date: Date): string {
  const day = date.toLocaleDateString('en-US', { weekday: 'short' });
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const d = date.getDate();
  const year = date.getFullYear();
  return `${day} ${month}. ${d}, ${year}`;
}

// ------ Reading time -----------------------------------------
/** Estimates reading time from raw Markdown body text. */
export function readingTime(body: string): string {
  const words = body.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}
