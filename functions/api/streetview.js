// functions/api/streetview.js — Google Street View Static API Proxy

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const location = url.searchParams.get('location') || '';
  const size = url.searchParams.get('size') || '600x200';
  const fov = url.searchParams.get('fov') || '90';
  const pitch = url.searchParams.get('pitch') || '0';

  const apiKey = context.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return new Response('Street View API key eksik', { status: 503, headers: CORS });
  }

  const svUrl = `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${encodeURIComponent(location)}&fov=${fov}&pitch=${pitch}&key=${apiKey}`;

  try {
    const resp = await fetch(svUrl, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return new Response('Street View alınamadı', { status: resp.status, headers: CORS });

    const img = await resp.arrayBuffer();
    return new Response(img, {
      headers: {
        ...CORS,
        'Content-Type': resp.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (err) {
    return new Response(err.message, { status: 500, headers: CORS });
  }
}
