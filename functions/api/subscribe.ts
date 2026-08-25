interface Env {
  BUTTONDOWN_API_KEY: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://preahs.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let email: string | undefined;
  try {
    const body = (await request.json()) as { email?: string };
    email = body.email?.trim();
  } catch {
    return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400, headers: corsHeaders });
  }

  if (!email || !EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400, headers: corsHeaders });
  }

  const res = await fetch('https://api.buttondown.email/v1/subscribers', {
    method: 'POST',
    headers: {
      Authorization: `Token ${env.BUTTONDOWN_API_KEY}`,
      'Content-Type': 'application/json',
    },
    // NB: confirm the field name against current Buttondown API docs when you
    // set up the account — recent API uses `email_address`; older used `email`.
    body: JSON.stringify({ email_address: email }),
  });

  // 200/201 = subscribed (pending double opt-in). 409 = already on the list —
  // treat as success so we don't leak who is already subscribed.
  const ok = res.ok || res.status === 409;
  if (ok) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }
  return new Response(JSON.stringify({ ok: false }), { status: 502, headers: corsHeaders });
};
