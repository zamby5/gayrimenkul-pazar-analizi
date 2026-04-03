// functions/api/tkgm-proxy.js — TKGM WFS CORS Proxy

export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { il, ilce, ada, parsel } = await context.request.json();

    if (!ada || !parsel) {
      return new Response(JSON.stringify({ error: 'Ada ve parsel zorunludur' }), { status: 400, headers: corsHeaders });
    }

    // TKGM WFS URL — Tapu ve Kadastro Genel Müdürlüğü
    const TKGM_WFS = 'https://cbsservis.tkgm.gov.tr/megsiswebapi.3/api/parsel';
    const url = `${TKGM_WFS}/${il}/${ilce}/${ada}/${parsel}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TuryapQueen/2.0'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      // Fallback: alternatif TKGM endpoint
      const altUrl = `https://parselsorgu.tkgm.gov.tr/api/parsel?il=${il}&ilce=${ilce}&ada=${ada}&parsel=${parsel}`;
      const altResp = await fetch(altUrl, { signal: AbortSignal.timeout(6000) });
      if (!altResp.ok) {
        return new Response(JSON.stringify({ error: 'TKGM verisi alınamadı', status: response.status }), { status: 502, headers: corsHeaders });
      }
      const altData = await altResp.json();
      return new Response(JSON.stringify(altData), { headers: corsHeaders });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), { headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  const url = new URL(context.request.url);
  const il = url.searchParams.get('il');
  const ilce = url.searchParams.get('ilce');
  const ada = url.searchParams.get('ada');
  const parsel = url.searchParams.get('parsel');

  if (!ada || !parsel) {
    return new Response(JSON.stringify({ error: 'Ada ve parsel zorunludur' }), { status: 400, headers: corsHeaders });
  }

  try {
    const tkgmUrl = `https://cbsservis.tkgm.gov.tr/megsiswebapi.3/api/parsel/${il}/${ilce}/${ada}/${parsel}`;
    const resp = await fetch(tkgmUrl, { signal: AbortSignal.timeout(8000) });
    const data = await resp.json();
    return new Response(JSON.stringify(data), { headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
