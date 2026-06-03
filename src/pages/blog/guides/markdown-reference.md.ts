import type { APIRoute } from 'astro';
import rawContent from '../../../content/blog/guides/markdown-reference.md?raw';

export const GET: APIRoute = () => {
  return new Response(rawContent, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="markdown-reference.md"',
    },
  });
};
