// streetview.js — Google Street View Entegrasyonu

/**
 * Adres veya koordinattan Street View görüntüsü yükle
 */
export async function loadStreetView(params) {
  const { il, ilce, mahalle, adres, lat, lng } = params;

  if (!il && !lat) return null;

  // Street View Static API proxy üzerinden çek
  const location = lat && lng
    ? `${lat},${lng}`
    : buildAddressQuery(il, ilce, mahalle, adres);

  const proxyUrl = `/api/streetview?location=${encodeURIComponent(location)}&size=600x200&fov=90&pitch=0`;

  try {
    const response = await fetch(proxyUrl, {
      signal: (() => { const _c = new AbortController(); setTimeout(() => _c.abort(), 8000); return _c.signal; })()
    });

    if (response.ok) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
  } catch (e) {
    console.warn('Street View yüklenemedi:', e.message);
  }

  // Fallback: Statik harita oluştur
  return buildFallbackMapUrl(location);
}

function buildAddressQuery(il, ilce, mahalle, adres) {
  return [adres, mahalle, ilce, il, 'Turkey'].filter(Boolean).join(', ');
}

function buildFallbackMapUrl(location) {
  // OpenStreetMap tile placeholder
  return null;
}

/**
 * Street View container'ı güncelle
 */
export async function updateStreetView(params) {
  const container = document.getElementById('streetviewContainer');
  const placeholder = document.getElementById('streetviewPlaceholder');
  const img = document.getElementById('streetviewImg');

  if (!params.il) return;

  container.style.display = 'block';
  placeholder.style.display = 'flex';
  img.style.display = 'none';

  const url = await loadStreetView(params);

  if (url) {
    img.src = url;
    img.onload = () => {
      placeholder.style.display = 'none';
      img.style.display = 'block';
    };
    img.onerror = () => {
      placeholder.innerHTML = `<span class="sv-icon">⊙</span><span>Street View mevcut değil</span>`;
    };
  } else {
    placeholder.innerHTML = `<span class="sv-icon">⊙</span><span>Street View yüklenemedi</span>`;
  }
}
