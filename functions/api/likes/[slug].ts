import type { KVNamespace } from '@cloudflare/workers-types';

interface Env {
  LIKES: KVNamespace;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://preahs.com',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

async function getCount(kv: KVNamespace, slug: string): Promise<number> {
  const val = await kv.get(slug);
  return val ? parseInt(val, 10) : 0;
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const slug = params.slug as string;
  const likes = await getCount(env.LIKES, slug);
  return new Response(JSON.stringify({ likes }), { headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async ({ params, env }) => {
  const slug = params.slug as string;
  const likes = (await getCount(env.LIKES, slug)) + 1;
  await env.LIKES.put(slug, String(likes));
  return new Response(JSON.stringify({ likes }), { headers: corsHeaders });
};
