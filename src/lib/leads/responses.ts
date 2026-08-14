export type LeadErrorCode =
  | 'METHOD_NOT_ALLOWED'
  | 'INVALID_CONTENT_TYPE'
  | 'PAYLOAD_TOO_LARGE'
  | 'INVALID_JSON'
  | 'INVALID_REQUEST'
  | 'INVALID_ORIGIN'
  | 'BOT_DETECTED'
  | 'FORM_TOO_FAST'
  | 'CAPTCHA_REJECTED'
  | 'RATE_LIMITED'
  | 'DUPLICATE_SUBMISSION'
  | 'SERVICE_UNAVAILABLE'
  | 'DELIVERY_FAILED';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  // A lead response must never sit in a shared cache.
  'Cache-Control': 'no-store',
};

export function leadError(
  status: number,
  code: LeadErrorCode,
  message: string,
  extra?: { headers?: HeadersInit; fieldErrors?: Record<string, string> },
): Response {
  const headers = new Headers(JSON_HEADERS);

  if (extra?.headers) {
    for (const [name, value] of new Headers(extra.headers)) headers.set(name, value);
  }

  return new Response(
    JSON.stringify({ ok: false, code, message, ...(extra?.fieldErrors ? { fieldErrors: extra.fieldErrors } : {}) }),
    { status, headers },
  );
}

export function leadSuccess(redirectTo: string): Response {
  return new Response(JSON.stringify({ ok: true, redirectTo }), {
    status: 201,
    headers: JSON_HEADERS,
  });
}
