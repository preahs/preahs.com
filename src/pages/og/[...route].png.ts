// ============================================================
//  /og/<route>.png — one social card per page, built statically.
// ============================================================

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { formatDate, readingTime } from '../../lib/blog';
import { renderOgCard, type OgCard } from '../../lib/og';

/** Cards for the hand-written pages, keyed by their ogPathFor() route. */
const STATIC_PAGES: { route: string; card: OgCard }[] = [
  {
    route: 'home',
    card: {
      title: "Hi, I'm Preah",
      meta: 'Infosec, homelab, tea, and the Texas Hill Country',
    },
  },
  {
    route: 'blog',
    card: { title: 'Blog', meta: 'Notes, writeups, essays, and rambling', section: 'Blog' },
  },
  {
    route: 'docs',
    card: { title: 'Docs', meta: 'Labs, runbooks, and reference material', section: 'Docs' },
  },
  {
    route: 'about',
    card: { title: 'About', meta: 'A bit more about me' },
  },
  {
    route: 'portfolio',
    card: { title: 'Portfolio', meta: 'Security, Linux, and self-hosted infrastructure' },
  },
  {
    route: 'homelab',
    card: { title: 'Homelab', meta: 'Hardware, services, networking, and what runs on them' },
  },
];

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const docs = await getCollection('docs', ({ data }) => !data.draft);

  const fromCollection = (
    entries: typeof posts | typeof docs,
    prefix: 'blog' | 'docs',
    section: string
  ) =>
    entries.map((e) => ({
      params: { route: `${prefix}/${e.id.replace(/\.mdx?$/, '')}` },
      props: {
        title: e.data.title,
        meta: `${formatDate(e.data.date)} · ${readingTime(e.body ?? '')}`,
        section,
      } satisfies OgCard,
    }));

  return [
    ...STATIC_PAGES.map((p) => ({ params: { route: p.route }, props: p.card })),
    ...fromCollection(posts, 'blog', 'Blog'),
    ...fromCollection(docs, 'docs', 'Docs'),
  ];
}

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOgCard(props as OgCard);
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
