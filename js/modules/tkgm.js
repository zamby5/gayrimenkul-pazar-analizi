// tkgm.js — TKGM WFS Entegrasyonu

const TKGM_PROXY = 'https://tkgm-proxy.miyicioglu.workers.dev';

/**
 * Ada/Parsel ile TKGM sorgulama
 */
export async function queryParcel(ilCode, ilceCode, ada, parsel) {
  if (!ada || !parsel) throw new Error('Ada ve parsel numarası zorunludur');

  const url = `${TKGM_PROXY}/parsel?il=${ilCode}&ilce=${ilceCode}&ada=${ada}&parsel=${parsel}`;

  const response = await fetch(url, {
    signal: (() => { const _c = new AbortController(); setTimeout(() => _c.abort(), 10000); return _c.signal; })()
  });

  if (!response.ok) {
    throw new Error(`TKGM sorgu hatası: ${response.status}`);
  }

  const data = await response.json();
  return parseParcelData(data);
}

/**
 * TKGM GeoJSON verisini parse et
 */
function parseParcelData(raw) {
  if (!raw || !raw.features || raw.features.length === 0) {
    return null;
  }

  const feature = raw.features[0];
  const props = feature.properties || {};

  // Alan hesapla (GeoJSON geometry'den)
  let alan = props.alan || props.parselAlani || 0;
  if (alan === 0 && feature.geometry) {
    alan = estimateAreaFromGeometry(feature.geometry);
  }

  return {
    ada: props.ada || '',
    parsel: props.parsel || '',
    il: props.il || '',
    ilce: props.ilce || '',
    mahalle: props.mahalle || props.muhtarlik || '',
    alan: alan ? Math.round(alan) : 0,
    imDurumu: props.imDurumu || props.imar || 'Bilinmiyor',
    paftaNo: props.pafta || '',
    tapuCinsi: props.nitelik || props.cins || 'Bilinmiyor',
    koordinat: feature.geometry?.coordinates?.[0]?.[0] || null,
    geometry: feature.geometry,
    raw: props
  };
}

function estimateAreaFromGeometry(geom) {
  // Basit polyon alan tahmini (Shoelace formülü, yaklaşık)
  if (geom.type !== 'Polygon' || !geom.coordinates?.[0]) return 0;
  const coords = geom.coordinates[0];
  let area = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    area += coords[i][0] * coords[i + 1][1];
    area -= coords[i + 1][0] * coords[i][1];
  }
  // Lat/lon'dan m² (yaklaşık, Türkiye orta enlemi için)
  const degToM = 111320;
  return Math.abs(area / 2) * degToM * degToM;
}

/**
 * Parsel bilgilerini HTML formatında göster
 */
export function formatParcelResult(data) {
  if (!data) return '<span style="color:var(--red)">Parsel bulunamadı</span>';

  const rows = [
    ['Ada / Parsel', `${data.ada} / ${data.parsel}`],
    ['Alan', data.alan > 0 ? `${data.alan.toLocaleString('tr-TR')} m²` : 'Bilinmiyor'],
    ['Tapu Cinsi', data.tapuCinsi],
    ['İmar Durumu', data.imDurumu],
    ['Mahalle', data.mahalle || '—'],
    ['Pafta', data.paftaNo || '—']
  ];

  return rows.map(([k, v]) =>
    `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
      <span style="color:var(--text-3)">${k}</span>
      <span style="color:var(--gold-light);font-family:var(--font-mono)">${v}</span>
    </div>`
  ).join('');
}
