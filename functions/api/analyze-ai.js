// functions/api/analyze-ai.js
// AI Analiz Worker — Grok (birincil) + Gemini (yedek)
// Claude/Anthropic kaldırıldı — sadece GROK_API_KEY ve GEMINI_API_KEY kullanılır

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { prompt } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt zorunludur' }),
        { status: 400, headers: CORS }
      );
    }

    // 1️⃣  Grok (xAI) — birincil
    const grokKey = context.env.GROK_API_KEY;
    if (grokKey) {
      const summary = await callGrok(prompt, grokKey);
      if (summary) {
        return new Response(
          JSON.stringify({ summary, model: 'grok-2' }),
          { headers: CORS }
        );
      }
    }

    // 2️⃣  Gemini — yedek
    const geminiKey = context.env.GEMINI_API_KEY;
    if (geminiKey) {
      const summary = await callGemini(prompt, geminiKey);
      if (summary) {
        return new Response(
          JSON.stringify({ summary, model: 'gemini-2.0-flash' }),
          { headers: CORS }
        );
      }
    }

    // Her iki key de yoksa → frontend kendi local özetini kullanır
    return new Response(
      JSON.stringify({ error: 'AI servisi yapılandırılmamış — GROK_API_KEY veya GEMINI_API_KEY gerekli' }),
      { status: 503, headers: CORS }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: CORS }
    );
  }
}

// ─── Grok (xAI) ──────────────────────────────────────────────────────────────
async function callGrok(prompt, apiKey) {
  try {
    const resp = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'grok-2-latest',
        messages: [
          {
            role: 'system',
            content: 'Sen Türkiye gayrimenkul piyasasında 20 yıllık deneyime sahip, SPK lisanslı değerleme uzmanısın. Profesyonel ve kurumsal Türkçe kullan. "AI", "yapay zeka", "dil modeli" gibi ifadeleri kullanma.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 650,
        temperature: 0.35
      }),
      signal: AbortSignal.timeout(14000)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Grok hata:', resp.status, errText);
      return null;
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || null;

  } catch (e) {
    console.error('Grok exception:', e.message);
    return null;
  }
}

// ─── Gemini 2.0 Flash ────────────────────────────────────────────────────────
async function callGemini(prompt, apiKey) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Sen Türkiye gayrimenkul piyasasında 20 yıllık deneyime sahip, SPK lisanslı değerleme uzmanısın. Profesyonel ve kurumsal Türkçe kullan.\n\n${prompt}`
          }]
        }],
        generationConfig: {
          maxOutputTokens: 650,
          temperature: 0.35,
          topP: 0.9
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
      }),
      signal: AbortSignal.timeout(14000)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Gemini hata:', resp.status, errText);
      return null;
    }

    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;

  } catch (e) {
    console.error('Gemini exception:', e.message);
    return null;
  }
}
