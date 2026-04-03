// analysis.js — Medyan / IQR / Outlier / Değerleme Hesaplama Motoru

/**
 * Median hesaplama (n+1/2 formülü)
 * @param {number[]} arr - Sayısal dizi
 * @returns {number}
 */
export function calcMedian(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  if (n % 2 === 1) {
    return sorted[Math.floor(n / 2)];
  } else {
    return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  }
}

/**
 * Aritmetik ortalama
 */
export function calcMean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Standart sapma
 */
export function calcStdDev(arr) {
  if (!arr || arr.length < 2) return 0;
  const mean = calcMean(arr);
  const variance = arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * Yüzdelik hesaplama (Q1=25, Q3=75)
 */
export function calcPercentile(sortedArr, pct) {
  if (!sortedArr || sortedArr.length === 0) return 0;
  const n = sortedArr.length;
  const idx = (pct / 100) * (n - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sortedArr[lower];
  return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (idx - lower);
}

/**
 * IQR Analizi ve Outlier Tespiti
 * @param {number[]} values
 * @returns {{ q1, q3, iqr, lowerFence, upperFence, outliers, clean, stats }}
 */
export function calcIQR(values) {
  if (!values || values.length < 3) {
    return { insufficient: true, message: 'Yetersiz Veri — En az 3 emsal gereklidir' };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = calcPercentile(sorted, 25);
  const q3 = calcPercentile(sorted, 75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outliers = values.filter(v => v < lowerFence || v > upperFence);
  const clean = values.filter(v => v >= lowerFence && v <= upperFence);
  const median = calcMedian(sorted);
  const mean = calcMean(values);
  const stdDev = calcStdDev(values);
  return {
    q1, q3, iqr,
    lowerFence: Math.max(0, lowerFence),
    upperFence,
    outliers,
    clean,
    sorted,
    median,
    mean,
    stdDev,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: values.length,
    cleanCount: clean.length,
    outlierCount: outliers.length,
    cv: mean > 0 ? (stdDev / mean) * 100 : 0 // Varyasyon katsayısı
  };
}

/**
 * Emsal verilerinden m²/fiyat hesapla ve analiz yap
 * @param {Array} emsaller - [{fiyat, alan, ...}, ...]
 * @returns {Object} - Tam analiz sonucu
 */
export function analyzeEmsaller(emsaller, targetAlan, tipi = 'daire') {
  // Filtrele: geçerli fiyat ve alan olan
  const valid = emsaller.filter(e =>
    e.fiyat > 0 && e.alan > 0 && !isNaN(e.fiyat) && !isNaN(e.alan)
  );

  if (valid.length < 1) {
    return { error: 'Geçerli emsal verisi bulunamadı' };
  }

  // m² fiyatları hesapla
  const emsellerWithUnitPrice = valid.map(e => ({
    ...e,
    birimFiyat: Math.round(e.fiyat / e.alan)
  }));

  const birimFiyatlar = emsellerWithUnitPrice.map(e => e.birimFiyat);

  // IQR Analizi
  const iqrResult = calcIQR(birimFiyatlar);

  if (iqrResult.insufficient) {
    return {
      warning: iqrResult.message,
      emsaller: emsellerWithUnitPrice,
      insufficient: true
    };
  }

  // Outlier işaretle
  const annotated = emsellerWithUnitPrice.map(e => ({
    ...e,
    isOutlier: e.birimFiyat < iqrResult.lowerFence || e.birimFiyat > iqrResult.upperFence
  }));

  // Temiz verilerden median m² fiyatı
  const cleanBirimFiyatlar = annotated.filter(e => !e.isOutlier).map(e => e.birimFiyat);
  const cleanMedian = calcMedian(cleanBirimFiyatlar.length > 0 ? cleanBirimFiyatlar : birimFiyatlar);
  const cleanMean = calcMean(cleanBirimFiyatlar.length > 0 ? cleanBirimFiyatlar : birimFiyatlar);

  // Düzeltilmiş değerler hesapla
  const adjusted = annotated.map(e => ({
    ...e,
    adjustmentTotal: calcAdjustmentTotal(e, tipi),
    adjustedBirimFiyat: 0
  })).map(e => ({
    ...e,
    adjustedBirimFiyat: Math.round(e.birimFiyat * (1 + e.adjustmentTotal / 100))
  }));

  const adjustedPrices = adjusted.filter(e => !e.isOutlier).map(e => e.adjustedBirimFiyat);
  const adjustedMedian = calcMedian(adjustedPrices.length > 0 ? adjustedPrices : [cleanMedian]);
  const adjustedMean = calcMean(adjustedPrices.length > 0 ? adjustedPrices : [cleanMedian]);

  // Üç Değer Görüşü
  const valueOpinions = calcValueOpinions(adjustedMedian, targetAlan, iqrResult, tipi);

  // Güven skoru
  const confidenceScore = calcConfidenceScore(valid.length, iqrResult.cv, iqrResult.outlierCount);

  return {
    emsaller: adjusted,
    iqr: iqrResult,
    cleanMedian,
    cleanMean,
    adjustedMedian,
    adjustedMean,
    valueOpinions,
    confidenceScore,
    targetAlan,
    birimFiyatlar,
    cleanBirimFiyatlar,
    adjustedPrices
  };
}

/**
 * Düzeltme katsayıları hesapla (emsal ile hedef taşınmaz farkı)
 */
function calcAdjustmentTotal(emsal, tipi) {
  let total = 0;
  const adjustments = [];

  // Kat düzeltmesi (konut için)
  if (['daire', 'villa'].includes(tipi) && emsal.kat !== undefined) {
    const kat = Number(emsal.kat);
    if (kat === 0 || kat === -1) { total -= 5; adjustments.push({ label: 'Zemin/Bodrum', pct: -5 }); }
    else if (kat >= 2 && kat <= 5) { total += 3; adjustments.push({ label: 'Orta kat', pct: 3 }); }
    else if (kat > 8) { total -= 3; adjustments.push({ label: 'Üst kat (asansör riski)', pct: -3 }); }
  }

  // Bina yaşı düzeltmesi
  if (emsal.yas !== undefined) {
    const yas = Number(emsal.yas);
    if (yas > 25) { total -= 8; adjustments.push({ label: 'Eski bina (>25 yıl)', pct: -8 }); }
    else if (yas > 15) { total -= 4; adjustments.push({ label: 'Orta yaşlı bina', pct: -4 }); }
    else if (yas <= 3) { total += 5; adjustments.push({ label: 'Yeni bina (≤3 yıl)', pct: 5 }); }
  }

  // İlan süresi düzeltmesi (uzun süre bekleyen = pazarlık marjı var)
  if (emsal.ilanGun !== undefined) {
    const gun = Number(emsal.ilanGun);
    if (gun > 180) { total -= 5; adjustments.push({ label: 'Uzun süreli ilan (>6 ay)', pct: -5 }); }
    else if (gun > 90) { total -= 3; adjustments.push({ label: 'Orta süreli ilan', pct: -3 }); }
    else if (gun <= 14) { total += 2; adjustments.push({ label: 'Taze ilan', pct: 2 }); }
  }

  emsal._adjustments = adjustments;
  return total;
}

/**
 * Üç Değer Görüşü (Konservatif / Medyan / İyimser)
 */
function calcValueOpinions(medianUnitPrice, alan, iqrResult, tipi) {
  const isArsa = tipi === 'arsa' || tipi === 'tarla';
  // Konservatif: IQR alt çeyreği (Q1) - risk primi
  const conservativeUnit = Math.round(iqrResult.q1 * 0.95);
  // Medyan bazlı (en muhtemel)
  const medianUnit = Math.round(medianUnitPrice);
  // İyimser: IQR üst çeyreği (Q3) + prim senaryosu
  const optimisticUnit = Math.round(iqrResult.q3 * 1.05);

  const brut = alan;
  // Net alan tahmini (konutlarda brüt/net farkı ~%10-15)
  const net = isArsa ? alan : Math.round(alan * 0.88);

  return {
    conservative: {
      label: "Konservatif (Alt)",
      unitPriceBrut: conservativeUnit,
      unitPriceNet: isArsa ? conservativeUnit : Math.round(conservativeUnit / 0.88),
      totalValue: conservativeUnit * brut,
      scenario: "Risk senaryoları, olumsuz piyasa koşulları dahil",
      advice: "Acil satış / garantili değer tabanı",
      horizon: {
        short: "Piyasa koşullarını izle, satış için acele etme",
        mid: "Yapısal iyileştirmelerle değer artırılabilir",
        long: "Bölge gelişimine göre orta vadede değer potansiyeli var"
      }
    },
    median: {
      label: "En Muhtemel (Medyan)",
      unitPriceBrut: medianUnit,
      unitPriceNet: isArsa ? medianUnit : Math.round(medianUnit / 0.88),
      totalValue: medianUnit * brut,
      scenario: "Mevcut piyasa koşullarına göre gerçekçi değer",
      advice: "Makul beklenti; %3–5 pazarlık marjı önerilir",
      horizon: {
        short: "Fiyat makul, kısa vadede talep beklenir",
        mid: "Orta vadede enflasyon üzerinde getiri potansiyeli",
        long: "Bölgesel gelişim ve altyapı yatırımları ile değer artışı"
      }
    },
    optimistic: {
      label: "İyimser (Üst)",
      unitPriceBrut: optimisticUnit,
      unitPriceNet: isArsa ? optimisticUnit : Math.round(optimisticUnit / 0.88),
      totalValue: optimisticUnit * brut,
      scenario: "Lokasyon primi, nadir aranan ürün, yoğun talep senaryosu",
      advice: "Piyasa koşullarının elverdiği maksimum fiyat",
      horizon: {
        short: "Acele alıcı olmaz; sabır gerekir",
        mid: "Doğru alıcıyla hedefe ulaşılabilir",
        long: "Büyük kentlerde uzun vadede muhtemelen realize edilebilir"
      }
    },
    brut, net
  };
}

/**
 * Analiz güven skoru (1-10)
 */
function calcConfidenceScore(emsalCount, cv, outlierCount) {
  let score = 5;
  // Emsal sayısı
  if (emsalCount >= 5) score += 2;
  else if (emsalCount >= 3) score += 1;
  else score -= 1;
  // Varyasyon katsayısı (düşük = tutarlı = güvenilir)
  if (cv < 15) score += 2;
  else if (cv < 25) score += 1;
  else if (cv > 40) score -= 2;
  else if (cv > 30) score -= 1;
  // Aykırı değer cezası
  score -= Math.min(outlierCount, 2);
  return Math.max(1, Math.min(10, score));
}

/**
 * Gelir Yaklaşımı Hesapları
 */
export function calcIncomeApproach(totalValue, monthlyRent) {
  if (!monthlyRent || monthlyRent <= 0) return null;
  const yillikKira = monthlyRent * 12;
  const gkc = totalValue / yillikKira; // Brüt Kira Çarpanı
  const kapOrani = (yillikKira / totalValue) * 100; // Kapitalizasyon oranı (brüt)
  // Net İşletme Geliri (%20 gider varsayımı)
  const nig = yillikKira * 0.80;
  const netKapOrani = (nig / totalValue) * 100;
  // Geri ödeme süresi
  const geriOdeme = Math.round(totalValue / yillikKira);
  return {
    yillikKira,
    gkc: Math.round(gkc * 10) / 10,
    kapOrani: Math.round(kapOrani * 100) / 100,
    netKapOrani: Math.round(netKapOrani * 100) / 100,
    nig,
    geriOdeme
  };
}

/**
 * Risk & Fırsat Faktörleri
 */
export function generateRiskFactors(props) {
  const { tipi, yas, kat, ozellikler = [], il, ilce, talepFiyat, medianValue } = props;
  const risks = [];
  const opportunities = [];

  // RISKLER
  if (yas > 25) risks.push({ label: `Bina yaşı yüksek (${yas} yıl)`, detail: 'Deprem güçlendirme ve tadilat maliyeti risk oluşturabilir', severity: 'high' });
  else if (yas > 15) risks.push({ label: `Orta yaşlı yapı (${yas} yıl)`, detail: 'Kısa vadede bakım giderleri beklenebilir', severity: 'medium' });

  if (tipi === 'arsa') risks.push({ label: 'İmar durumu değişkenliği', detail: 'Yasal düzenlemeler inşaat haklarını kısıtlayabilir', severity: 'high' });
  if (tipi === 'tarla') risks.push({ label: 'Tarımsal koruma mevzuatı', detail: 'Kullanım amacı kısıtlamaları olabilir', severity: 'high' });
  if ((tipi === 'arsa' || tipi === 'tarla') && props.arsaData?.imarDurumu === 'imarsiz') {
    risks.push({ label: 'İmarsız Parsel — yapılaşma yasağı', detail: 'İmar beklentisi gerçekleşmezse değer potansiyeli sınırlıdır', severity: 'high' });
  }

  if (talepFiyat && medianValue && talepFiyat > medianValue * 1.1) {
    const fark = Math.round(((talepFiyat - medianValue) / medianValue) * 100);
    risks.push({ label: `Talep fiyatı piyasanın %${fark} üzerinde`, detail: 'Satış süresi uzayabilir; alıcı havuzu daralabilir', severity: 'medium' });
  }

  if (!ozellikler.includes('deprem')) risks.push({ label: 'Yeni deprem yönetmeliği uyumu belirsiz', detail: 'Binanın TBDY-2018 uyumluluğu teyit edilmeli', severity: 'medium' });
  if (!ozellikler.includes('otopark')) risks.push({ label: 'Otopark eksikliği', detail: 'Talep daralması ve yeniden satışta fiyat baskısı', severity: 'low' });

  risks.push({ label: 'Faiz oranı riski', detail: 'Yüksek konut kredi faizleri alıcı talebini sınırlayabilir', severity: 'medium' });

  // FIRSATLAR
  if (ozellikler.includes('denizmanzara')) opportunities.push({ label: 'Deniz/doğa manzarası', detail: 'Prim yaratan özellik; hedef alıcı kitlesini genişletir' });
  if (ozellikler.includes('siteicinde')) opportunities.push({ label: 'Site içinde güvenlik ve sosyal donatı', detail: 'Kiracı/alıcı tercih kalitesini artırır' });
  if (ozellikler.includes('deprem')) opportunities.push({ label: 'Yeni deprem yönetmeliğine uyumlu', detail: 'Piyasada önemli rekabet avantajı ve fiyat primi' });
  if (yas <= 5) opportunities.push({ label: 'Yeni/sıfır bina avantajı', detail: 'Uzun vadeli bakım maliyeti düşük, cazip finansman seçenekleri' });
  if (tipi === 'arsa') opportunities.push({ label: 'Geliştirme potansiyeli', detail: 'İmar hakkının tam kullanımı ile değer artışı mümkün' });

  opportunities.push({ label: 'Turizm/şehir büyümesi trendleri', detail: 'Bölgesel nüfus artışı uzun vadede talep sağlar' });
  opportunities.push({ label: 'Enflasyona karşı reel varlık', detail: 'Gayrimenkul tarihsel olarak enflasyonu aşan reel getiri sağlar' });

  // Likidite tahmini
  const liquidityDays = calcLiquidityDays(tipi, il, talepFiyat, medianValue);

  return {
    risks: risks.slice(0, 5),
    opportunities: opportunities.slice(0, 4),
    liquidityDays
  };
}

function calcLiquidityDays(tipi, il, talepFiyat, medianValue) {
  let baseDays = 60;
  // Büyük şehirler daha likit
  const buyukSehirler = ['İstanbul', 'Ankara', 'İzmir', 'Antalya', 'Bursa'];
  if (buyukSehirler.includes(il)) baseDays = 30;
  // Arsa/tarla daha az likit
  if (tipi === 'arsa' || tipi === 'tarla') baseDays *= 2;
  if (tipi === 'depo') baseDays *= 1.5;
  // Talep fiyatı piyasanın üzerindeyse daha uzun
  if (talepFiyat && medianValue) {
    const oran = talepFiyat / medianValue;
    if (oran > 1.15) baseDays = Math.round(baseDays * 2);
    else if (oran > 1.05) baseDays = Math.round(baseDays * 1.4);
  }
  return baseDays;
}


// ─── Canvas roundRect polyfill (Safari <16, Chrome <99) ─────────────────────
if (typeof CanvasRenderingContext2D !== 'undefined' &&
    !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    this.beginPath();
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
  };
}

/**
 * Box plot canvas çizimi
 */
export function drawBoxPlot(canvas, iqrData, unitPrices) {
  if (!canvas || !iqrData || iqrData.insufficient) return;

  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth || 600;
  const H = canvas.height = 160;
  ctx.clearRect(0, 0, W, H);

  const { min, max, q1, q3, median, lowerFence, upperFence, outliers, sorted } = iqrData;

  // Renk paleti
  const GOLD = '#C49A38';
  const GOLD_DIM = 'rgba(196,154,56,0.15)';
  const TEXT = '#9CADC6';
  const RED = '#DC2626';
  const GREEN = '#16A34A';
  const LINE = 'rgba(255,255,255,0.1)';
  const BG = '#111D33';

  // Padding
  const padL = 60, padR = 30, padT = 30, padB = 36;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const midY = padT + plotH / 2;

  // Scale
  const dataMin = Math.min(lowerFence, sorted[0]) * 0.95;
  const dataMax = Math.max(upperFence, sorted[sorted.length - 1]) * 1.05;
  const scale = v => padL + ((v - dataMin) / (dataMax - dataMin)) * plotW;

  // Background
  ctx.fillStyle = BG;
  ctx.roundRect(2, 2, W - 4, H - 4, 6);
  ctx.fill();

  // Grid lines
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  const nTicks = 5;
  for (let i = 0; i <= nTicks; i++) {
    const v = dataMin + (dataMax - dataMin) * (i / nTicks);
    const x = scale(v);
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + plotH);
    ctx.stroke();
    // Tick label
    ctx.fillStyle = TEXT;
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(fmtK(v), x, H - 6);
  }

  // Whisker range (lowerFence to upperFence)
  ctx.strokeStyle = 'rgba(156,173,198,0.5)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(scale(lowerFence), midY);
  ctx.lineTo(scale(upperFence), midY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Whisker end caps
  [[lowerFence, 'lower'], [upperFence, 'upper']].forEach(([v]) => {
    ctx.strokeStyle = 'rgba(156,173,198,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scale(v), midY - 10);
    ctx.lineTo(scale(v), midY + 10);
    ctx.stroke();
  });

  // IQR Box
  const boxX = scale(q1);
  const boxW = scale(q3) - scale(q1);
  const boxH = 38;
  const boxY = midY - boxH / 2;
  ctx.fillStyle = GOLD_DIM;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 4);
  ctx.fill();
  ctx.stroke();

  // Median line
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(scale(median), boxY);
  ctx.lineTo(scale(median), boxY + boxH);
  ctx.stroke();

  // Individual data points (jitter)
  unitPrices.forEach((v, i) => {
    const isOut = v < lowerFence || v > upperFence;
    const jitter = (i % 3 - 1) * 5;
    ctx.beginPath();
    ctx.arc(scale(v), midY + jitter, isOut ? 5 : 4, 0, Math.PI * 2);
    ctx.fillStyle = isOut ? RED : GREEN;
    ctx.fill();
    if (isOut) {
      ctx.strokeStyle = 'rgba(220,38,38,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });

  // Labels: Q1, Median, Q3
  [
    [q1, 'Q1', 'left'],
    [median, 'Med', 'center'],
    [q3, 'Q3', 'right']
  ].forEach(([v, lbl, align]) => {
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 10px DM Sans, sans-serif';
    ctx.textAlign = align;
    const offset = align === 'left' ? 2 : align === 'right' ? -2 : 0;
    ctx.fillText(lbl, scale(v) + offset, boxY - 4);
  });

  // Title
  ctx.fillStyle = TEXT;
  ctx.font = '10px DM Sans, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('₺/m² Dağılım Analizi (IQR)', padL, 18);
}

function fmtK(v) {
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
  return v.toFixed(0);
}
