// functions/api/scrape-mock.js — Mock Emsal Veri Worker

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json'
};

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    // Mock data — gerçek scraping çalışmadığında frontend'in kendi
    // mock generator'ı devreye girer. Bu endpoint placeholder'dır.
    return new Response(JSON.stringify({
      emsaller: [],
      message: 'Mock endpoint — frontend generator kullanılıyor'
    }), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
}
