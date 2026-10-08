// ============================================================
//  Open Graph card generation
//
//  Each page gets a 1200x630 social card rendered at build time.
//  satori lays the card out and converts every glyph to an SVG
//  <path>, so rasterising needs no system fonts — the output is
//  identical on a local Mac and on the Linux CI runner. sharp
//  (already present via Astro) turns that SVG into a PNG.
// ============================================================

import satori from 'satori';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// ------ Palette ----------------------------------------------
// sRGB equivalents of the OKLCH tokens in global.css; satori does
// not parse oklch(). Keep these in step with :root if the theme
// ever changes.
const C = {
  paper: '#faf9f5',
  ink: '#2e281e',
  inkSoft: '#5b5449',
  accent: '#822328',
  rule: '#bcb7ad',
} as const;

// ------ Fonts -------------------------------------------------
const font = (pkg: string, file: string) =>
  readFileSync(require.resolve(`${pkg}/files/${file}`));

const FONTS = [
  {
    name: 'Newsreader',
    data: font('@fontsource/newsreader', 'newsreader-latin-500-normal.woff'),
    weight: 500 as const,
    style: 'normal' as const,
  },
  {
    name: 'Spline Sans Mono',
    data: font('@fontsource/spline-sans-mono', 'spline-sans-mono-latin-400-normal.woff'),
    weight: 400 as const,
    style: 'normal' as const,
  },
];

// ------ Brand mark --------------------------------------------
// The same cup used in the site header, inlined as a data URI.
const CUP = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${C.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 1 1 1 0 8h-1"/><path d="M6 2v2"/></svg>`;
const CUP_URI = `data:image/svg+xml;base64,${Buffer.from(CUP).toString('base64')}`;

export interface OgCard {
  title: string;
  /** Small line under the rule, e.g. "Thu Apr. 9, 2026 · 6 min read". */
  meta?: string;
  /** Pill in the top-right, e.g. "Blog" or "Docs". */
  section?: string;
}

/** Long titles step down a size so they stay inside three lines. */
function titleSize(title: string): number {
  if (title.length <= 30) return 76;
  if (title.length <= 55) return 62;
  return 52;
}

export async function renderOgCard({ title, meta, section }: OgCard): Promise<Buffer> {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          // Explicit box-sizing: satori adds padding and border outside the
          // declared size otherwise, which pushes content off the canvas.
          boxSizing: 'border-box',
          width: '1200px',
          height: '630px',
          background: C.paper,
          padding: '56px 64px',
          // A hairline frame, echoing the bordered cards on the site.
          border: `2px solid ${C.rule}`,
        },
        children: [
          // ---- top row: brand + section pill ----
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'center', width: '100%' },
              children: [
                {
                  type: 'img',
                  props: { src: CUP_URI, width: 40, height: 40, style: { marginRight: '16px' } },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      fontFamily: 'Spline Sans Mono',
                      fontSize: 26,
                      color: C.inkSoft,
                      letterSpacing: '0.02em',
                    },
                    children: 'preahs.com',
                  },
                },
                ...(section
                  ? [{
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          marginLeft: 'auto',
                          fontFamily: 'Spline Sans Mono',
                          fontSize: 22,
                          color: C.accent,
                          border: `2px solid ${C.rule}`,
                          borderRadius: '6px',
                          padding: '4px 14px',
                        },
                        children: section,
                      },
                    }]
                  : []),
              ],
            },
          },

          // ---- title block, vertically centred ----
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                justifyContent: 'center',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      fontFamily: 'Newsreader',
                      fontSize: titleSize(title),
                      lineHeight: 1.12,
                      letterSpacing: '-0.02em',
                      color: C.ink,
                    },
                    children: title,
                  },
                },
                // accent rule under the title
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      width: '132px',
                      height: '5px',
                      background: C.accent,
                      marginTop: '28px',
                    },
                  },
                },
              ],
            },
          },

          // ---- bottom meta line ----
          ...(meta
            ? [{
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontFamily: 'Spline Sans Mono',
                    fontSize: 24,
                    color: C.inkSoft,
                  },
                  children: meta,
                },
              }]
            : []),
        ],
      },
    },
    { width: 1200, height: 630, fonts: FONTS }
  );

  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

// ------ Route mapping -----------------------------------------
/**
 * Maps a page path to its generated card, e.g.
 *   "/"                        -> "/og/home.png"
 *   "/blog/"                   -> "/og/blog.png"
 *   "/blog/homelab/my-rack/"   -> "/og/blog/homelab/my-rack.png"
 *
 * Both BaseHead and the /og endpoint use this, so the tag a page
 * emits and the file the build writes can never drift apart.
 */
export function ogPathFor(pathname: string): string {
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  return `/og/${clean === '' ? 'home' : clean}.png`;
}
