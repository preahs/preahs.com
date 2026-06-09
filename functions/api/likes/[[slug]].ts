import type { KVNamespace } from '@cloudflare/workers-types';

interface Env {
  LIKES: KVNamespace;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://preahs.com',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

function resolveSlug(raw: string | string[]): string {
  return Array.isArray(raw) ? raw.join('/') : raw;
}

async function getCount(kv: KVNamespace, slug: string): Promise<number> {
  const val = await kv.get(slug);
  if (!val) return 0;
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const slug = resolveSlug(params.slug);
  const likes = await getCount(env.LIKES, slug);
  return new Response(JSON.stringify({ likes }), { headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async ({ params, env }) => {
  const slug = resolveSlug(params.slug);
  const likes = (await getCount(env.LIKES, slug)) + 1;
  await env.LIKES.put(slug, String(likes));
  return new Response(JSON.stringify({ likes }), { headers: corsHeaders });
};
