// ============================================================
//  Blog helpers — shared between pages and layouts
// ============================================================

// ------ Date formatting --------------------------------------
/** Formats a Date as "Wed May. 13, 2026" (matching the site style). */
export function formatDate(date: Date): string {
  const day = date.toLocaleDateString('en-US', { weekday: 'short' });
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const d = date.getDate();
  const year = date.getFullYear();
  return `${day} ${month}. ${d}, ${year}`;
}

/** Formats a Date as "Wed May. 13, 2026, 3:45 PM" (matching the site style). */
export function formatDateTime(date: Date): string {
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${formatDate(date)}, ${time}`;
}

// ------ Reading time -----------------------------------------
/** Estimates reading time from raw Markdown body text. */
export function readingTime(body: string): string {
  const words = body.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

// ------ Tags --------------------------------------------------
/**
 * Collects every unique tag across a set of entries, ordered the way the
 * tag rail displays them: named tags alphabetically, then year tags newest
 * first.
 */
export function collectTags(entries: { data: { tags: string[] } }[]): string[] {
  const tagSet = new Set<string>();
  entries.forEach((e) => e.data.tags.forEach((t) => tagSet.add(t)));
  const isYear = (t: string) => /^\d{4}$/.test(t);
  const yearTags = [...tagSet].filter(isYear).sort((a, b) => Number(b) - Number(a));
  const otherTags = [...tagSet].filter((t) => !isYear(t)).sort();
  return [...otherTags, ...yearTags];
}
