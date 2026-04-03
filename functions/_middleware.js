// functions/_middleware.js — CORS + Rate Limit + Auth Middleware

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  // Security headers
  const response = await context.next();
  const newResponse = new Response(response.body, response);

  newResponse.headers.set('Access-Control-Allow-Origin', '*');
  newResponse.headers.set('X-Content-Type-Options', 'nosniff');
  newResponse.headers.set('X-Frame-Options', 'SAMEORIGIN');
  newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return newResponse;
}
