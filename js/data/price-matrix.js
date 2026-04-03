// price-matrix.js — Bölgesel Fiyat Matrisi (₺/m²)
// Veriler yaklaşık piyasa değerlerini yansıtmaktadır (2024 sonu)
// Gerçek emsal verisinin yokluğunda FALLBACK olarak kullanılır

export const PRICE_MATRIX = {
  // ---- İstanbul ----
  "istanbul": {
    "daire": { min: 45000, max: 180000, avg: 85000, stdDev: 0.3 },
    "villa": { min: 60000, max: 250000, avg: 120000, stdDev: 0.35 },
    "arsa": { min: 30000, max: 500000, avg: 90000, stdDev: 0.5 },
    "isyeri": { min: 50000, max: 220000, avg: 100000, stdDev: 0.35 },
    "dukkan": { min: 40000, max: 300000, avg: 110000, stdDev: 0.4 },
    "depo": { min: 15000, max: 60000, avg: 28000, stdDev: 0.3 },
    "tarla": { min: 5000, max: 50000, avg: 15000, stdDev: 0.5 },
    subRegions: {
      "Beşiktaş": 1.6, "Şişli": 1.4, "Sarıyer": 1.5, "Kadıköy": 1.45,
      "Fatih": 1.3, "Bakırköy": 1.35, "Ataşehir": 1.2, "Üsküdar": 1.15,
      "Maltepe": 1.05, "Kartal": 0.95, "Pendik": 0.9, "Sultangazi": 0.7,
      "Esenyurt": 0.65, "Bağcılar": 0.75, "Esenler": 0.7, "Arnavutköy": 0.85,
      "Beylikdüzü": 0.9, "Başakşehir": 1.0, "Çekmeköy": 0.95
    }
  },
  // ---- Ankara ----
  "ankara": {
    "daire": { min: 18000, max: 80000, avg: 38000, stdDev: 0.3 },
    "villa": { min: 25000, max: 120000, avg: 55000, stdDev: 0.35 },
    "arsa": { min: 8000, max: 150000, avg: 30000, stdDev: 0.5 },
    "isyeri": { min: 20000, max: 100000, avg: 45000, stdDev: 0.35 },
    "dukkan": { min: 15000, max: 120000, avg: 50000, stdDev: 0.4 },
    "depo": { min: 6000, max: 25000, avg: 12000, stdDev: 0.3 },
    "tarla": { min: 2000, max: 20000, avg: 7000, stdDev: 0.5 },
    subRegions: {
      "Çankaya": 1.5, "Keçiören": 0.9, "Yenimahalle": 1.0, "Mamak": 0.75,
      "Altındağ": 0.7, "Pursaklar": 0.85, "Etimesgut": 0.95, "Sincan": 0.75,
      "Gölbaşı": 1.1, "Kazan": 0.9
    }
  },
  // ---- İzmir ----
  "izmir": {
    "daire": { min: 20000, max: 100000, avg: 48000, stdDev: 0.3 },
    "villa": { min: 30000, max: 180000, avg: 75000, stdDev: 0.35 },
    "arsa": { min: 10000, max: 200000, avg: 45000, stdDev: 0.5 },
    "isyeri": { min: 25000, max: 120000, avg: 55000, stdDev: 0.35 },
    "dukkan": { min: 20000, max: 150000, avg: 60000, stdDev: 0.4 },
    "depo": { min: 8000, max: 30000, avg: 15000, stdDev: 0.3 },
    "tarla": { min: 3000, max: 40000, avg: 12000, stdDev: 0.5 },
    subRegions: {
      "Konak": 1.4, "Karşıyaka": 1.35, "Bornova": 1.1, "Buca": 0.9,
      "Karabağlar": 0.85, "Narlıdere": 1.25, "Güzelbahçe": 1.4,
      "Balçova": 1.2, "Bayraklı": 1.05, "Çiğli": 0.95, "Çeşme": 2.0,
      "Urla": 1.8, "Seferihisar": 1.5, "Foça": 1.6
    }
  },
  // ---- Antalya ----
  "antalya": {
    "daire": { min: 20000, max: 120000, avg: 52000, stdDev: 0.3 },
    "villa": { min: 35000, max: 250000, avg: 90000, stdDev: 0.4 },
    "arsa": { min: 8000, max: 300000, avg: 55000, stdDev: 0.55 },
    "isyeri": { min: 22000, max: 140000, avg: 60000, stdDev: 0.35 },
    "dukkan": { min: 18000, max: 160000, avg: 65000, stdDev: 0.4 },
    "depo": { min: 6000, max: 28000, avg: 13000, stdDev: 0.3 },
    "tarla": { min: 2000, max: 50000, avg: 15000, stdDev: 0.55 },
    subRegions: {
      "Muratpaşa": 1.3, "Konyaaltı": 1.25, "Kepez": 0.85, "Döşemealtı": 1.0,
      "Aksu": 1.1, "Alanya": 1.4, "Manavgat": 1.15, "Serik": 1.05,
      "Kemer": 1.6, "Kaş": 2.0, "Finike": 1.3
    }
  },
  // ---- Bursa ----
  "bursa": {
    "daire": { min: 15000, max: 65000, avg: 30000, stdDev: 0.28 },
    "villa": { min: 22000, max: 100000, avg: 48000, stdDev: 0.32 },
    "arsa": { min: 6000, max: 120000, avg: 22000, stdDev: 0.45 },
    "isyeri": { min: 18000, max: 80000, avg: 36000, stdDev: 0.32 },
    "dukkan": { min: 14000, max: 100000, avg: 40000, stdDev: 0.38 },
    "depo": { min: 5000, max: 20000, avg: 10000, stdDev: 0.28 },
    "tarla": { min: 2000, max: 15000, avg: 6000, stdDev: 0.45 },
    subRegions: {
      "Osmangazi": 1.3, "Nilüfer": 1.4, "Yıldırım": 0.9, "Mudanya": 1.5,
      "Gemlik": 1.2, "İnegöl": 0.85, "İznik": 1.1
    }
  },
  // ---- Muğla ----
  "mugla": {
    "daire": { min: 22000, max: 150000, avg: 65000, stdDev: 0.35 },
    "villa": { min: 40000, max: 400000, avg: 130000, stdDev: 0.45 },
    "arsa": { min: 15000, max: 500000, avg: 80000, stdDev: 0.6 },
    "isyeri": { min: 25000, max: 200000, avg: 80000, stdDev: 0.4 },
    "dukkan": { min: 20000, max: 250000, avg: 90000, stdDev: 0.45 },
    "depo": { min: 8000, max: 40000, avg: 18000, stdDev: 0.35 },
    "tarla": { min: 5000, max: 80000, avg: 25000, stdDev: 0.6 },
    subRegions: {
      "Bodrum": 2.5, "Marmaris": 2.0, "Fethiye": 1.8, "Datça": 1.6,
      "Milas": 1.0, "Menteşe": 0.9, "Ortaca": 1.1
    }
  },
  // ---- DEFAULT (diğer iller için) ----
  "default": {
    "daire": { min: 8000, max: 35000, avg: 16000, stdDev: 0.28 },
    "villa": { min: 12000, max: 60000, avg: 24000, stdDev: 0.32 },
    "arsa": { min: 3000, max: 40000, avg: 10000, stdDev: 0.5 },
    "isyeri": { min: 10000, max: 45000, avg: 20000, stdDev: 0.32 },
    "dukkan": { min: 8000, max: 55000, avg: 22000, stdDev: 0.38 },
    "depo": { min: 3000, max: 12000, avg: 6000, stdDev: 0.28 },
    "tarla": { min: 500, max: 8000, avg: 2500, stdDev: 0.55 },
    subRegions: {}
  }
};

// İl adı → matrix key eşlemesi
export const IL_TO_MATRIX_KEY = {
  "İstanbul": "istanbul",
  "Ankara": "ankara",
  "İzmir": "izmir",
  "Antalya": "antalya",
  "Bursa": "bursa",
  "Muğla": "mugla"
};

export function getMatrixKey(ilName) {
  return IL_TO_MATRIX_KEY[ilName] || "default";
}

export function getPriceRange(ilName, tipi, ilceName = "") {
  const key = getMatrixKey(ilName);
  const matrix = PRICE_MATRIX[key] || PRICE_MATRIX["default"];
  const typeData = matrix[tipi] || matrix["daire"];
  const subMult = matrix.subRegions?.[ilceName] || 1.0;
  return {
    min: Math.round(typeData.min * subMult),
    max: Math.round(typeData.max * subMult),
    avg: Math.round(typeData.avg * subMult),
    stdDev: typeData.stdDev
  };
}

// Emsal kaynakları
export const EMSAL_SOURCES = [
  { id: "sahibinden", name: "Sahibinden.com", url: "https://www.sahibinden.com" },
  { id: "emlakjet", name: "Emlakjet.com", url: "https://www.emlakjet.com" },
  { id: "hurriyet", name: "Hurriyet Emlak", url: "https://www.hurriyetemlak.com" },
  { id: "zingat", name: "Zingat.com", url: "https://www.zingat.com" },
  { id: "hepsiemlak", name: "Hepsiemlak.com", url: "https://www.hepsiemlak.com" }
];

// Taşınmaz tipi etiketleri
export const TIPI_LABELS = {
  "arsa": "Arsa",
  "daire": "Daire/Konut",
  "villa": "Villa/Müstakil",
  "isyeri": "İşyeri/Ofis",
  "dukkan": "Dükkan/Mağaza",
  "depo": "Depo/Antrepo",
  "tarla": "Tarla/Arazi"
};
