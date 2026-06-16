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
