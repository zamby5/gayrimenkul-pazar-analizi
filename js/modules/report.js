// report.js — Profesyonel Rapor Oluşturma Modülü

import { fmtCurrency, fmtDate, fmtNumber } from './ui.js';

/**
 * Tam rapor HTML'i oluştur (PDF ve ekran için)
 */
export function generateReportHTML(data) {
  const {
    property, emsaller, iqr, valueOpinions,
    confidenceScore, incomeData, riskData,
    adjustedMedian, cleanMedian, analysisDate
  } = data;

  const now = analysisDate || new Date();

  return `
<div class="report-template" id="reportContent">

  <!-- KAPAK -->
  <div class="report-cover">
    <div class="report-cover-brand">TURYAP QUEEN — Gayrimenkul Danışmanlık</div>
    <div class="report-cover-title">Pazar Değerleme Analiz Raporu</div>
    <div class="report-cover-subtitle">Emsal Karşılaştırma Yöntemi (Sales Comparison Approach)</div>
    <div class="report-cover-meta">
      <div class="report-meta-item">
        <div class="report-meta-label">Taşınmaz</div>
        <div class="report-meta-value">${property.tipiLabel} — ${property.alan} m²</div>
      </div>
      <div class="report-meta-item">
        <div class="report-meta-label">Lokasyon</div>
        <div class="report-meta-value">${[property.mahalle, property.ilce, property.il].filter(Boolean).join(', ')}</div>
      </div>
      <div class="report-meta-item">
        <div class="report-meta-label">Rapor Tarihi</div>
        <div class="report-meta-value">${fmtDate(now)}</div>
      </div>
      <div class="report-meta-item">
        <div class="report-meta-label">Güven Skoru</div>
        <div class="report-meta-value">${confidenceScore} / 10</div>
      </div>
    </div>
  </div>

  <!-- UYARI -->
  <div style="background:#FEF3C7;border-left:4px solid #D97706;padding:10px 20px;font-size:11px;color:#92400E;line-height:1.6">
    <strong>SPK UYARISI:</strong> Bu rapor yalnızca bilgilendirme amaçlı hazırlanmış olup Sermaye Piyasası Kurulu lisanslı değerleme raporu niteliği taşımamaktadır.
    Tüm değerler piyasa emsallerine dayalı tahmindir. Resmi işlemler için bağımsız gayrimenkul değerleme uzmanına başvurulması zorunludur.
  </div>

  <div class="report-body">

    <!-- YÖNETİCİ ÖZETİ -->
    <div class="report-section">
      <div class="report-section-title">Yönetici Özeti (Executive Summary)</div>
      <table class="report-table" style="margin-bottom:12px">
        <tbody>
          <tr><td><strong>En Muhtemel Piyasa Değeri</strong></td><td><span class="report-value-box">${fmtCurrency(valueOpinions.median.totalValue)}</span></td></tr>
          <tr><td>Brüt Birim Değer</td><td><strong>${fmtCurrency(valueOpinions.median.unitPriceBrut)} / m²</strong></td></tr>
          <tr><td>Net Birim Değer (tahmini)</td><td>${fmtCurrency(valueOpinions.median.unitPriceNet)} / m²</td></tr>
          <tr><td>Değer Aralığı</td><td>${fmtCurrency(valueOpinions.conservative.totalValue)} — ${fmtCurrency(valueOpinions.optimistic.totalValue)}</td></tr>
          <tr><td>Analiz Edilen Emsal Sayısı</td><td>${emsaller.length} (${emsaller.filter(e => !e.isOutlier).length} adet kullanıldı)</td></tr>
          <tr><td>Medyan Emsal Birim Fiyatı</td><td>${fmtCurrency(cleanMedian)} / m²</td></tr>
          <tr><td>Düzeltilmiş Medyan Birim Fiyatı</td><td>${fmtCurrency(adjustedMedian)} / m²</td></tr>
          ${property.talepFiyat ? `<tr><td>Talep / İlan Fiyatı</td><td>${fmtCurrency(property.talepFiyat)}</td></tr>` : ''}
          ${property.talepFiyat ? `<tr><td>Talep / Değer Farkı</td><td style="color:${property.talepFiyat > valueOpinions.median.totalValue ? '#DC2626' : '#16A34A'}">${property.talepFiyat > valueOpinions.median.totalValue ? '+' : ''}${fmtNumber(((property.talepFiyat / valueOpinions.median.totalValue) - 1) * 100, 1)}%</td></tr>` : ''}
        </tbody>
      </table>
    </div>

    <!-- TAŞINMAZ BİLGİLERİ -->
    <div class="report-section">
      <div class="report-section-title">1. Taşınmaz Bilgileri</div>
      <table class="report-table">
        <tbody>
          <tr><td>Taşınmaz Tipi</td><td>${property.tipiLabel}</td></tr>
          <tr><td>İl / İlçe / Mahalle</td><td>${[property.il, property.ilce, property.mahalle].filter(Boolean).join(' / ')}</td></tr>
          ${property.ada ? `<tr><td>Ada / Parsel</td><td>${property.ada} / ${property.parsel}</td></tr>` : ''}
          <tr><td>Brüt Alan</td><td>${property.alan} m²</td></tr>
          ${property.oda ? `<tr><td>Oda Sayısı</td><td>${property.oda}</td></tr>` : ''}
          ${property.kat !== undefined ? `<tr><td>Kat</td><td>${property.kat}</td></tr>` : ''}
          ${property.yas !== undefined ? `<tr><td>Bina Yaşı</td><td>${property.yas} yıl</td></tr>` : ''}
          ${property.ozellikler?.length ? `<tr><td>Özellikler</td><td>${property.ozellikler.join(', ')}</td></tr>` : ''}
          ${property.arsaData ? buildArsaReportRows(property.arsaData, property.alan) : ''}
        </tbody>
      </table>
    </div>

    <!-- EMSAL KARŞILAŞTIRMA -->
    <div class="report-section">
      <div class="report-section-title">2. Emsal Karşılaştırma Analizi</div>
      <table class="report-table">
        <thead>
          <tr>
            <th>#</th><th>Kaynak</th><th>Alan (m²)</th><th>Fiyat</th>
            <th>₺/m² (Ham)</th><th>Düzeltme</th><th>₺/m² (Düz.)</th>
            <th>İlan Süresi</th><th>Durum</th>
          </tr>
        </thead>
        <tbody>
          ${emsaller.map((e, i) => `
          <tr style="${e.isOutlier ? 'color:#9CADC6;background:#1a0808' : ''}">
            <td>${i + 1}</td>
            <td>${e.kaynakId ? e.kaynak : e.kaynak}</td>
            <td>${e.alan} m²</td>
            <td>${fmtCurrency(e.fiyat)}</td>
            <td>${fmtCurrency(e.birimFiyat)}</td>
            <td style="color:${e.adjustmentTotal > 0 ? '#16A34A' : e.adjustmentTotal < 0 ? '#DC2626' : '#9CADC6'}">
              ${e.adjustmentTotal > 0 ? '+' : ''}${e.adjustmentTotal || 0}%
            </td>
            <td style="color:#C49A38;font-weight:600">${fmtCurrency(e.adjustedBirimFiyat || e.birimFiyat)}</td>
            <td>${e.ilanGun} gün</td>
            <td style="color:${e.isOutlier ? '#DC2626' : '#16A34A'}">${e.isOutlier ? 'AYIRIK DEĞER' : 'Normal'}</td>
          </tr>`).join('')}
        </tbody>
      </table>

      <table class="report-table">
        <thead>
          <tr><th colspan="2">IQR İstatistikleri</th></tr>
        </thead>
        <tbody>
          <tr><td>Q1 (Alt Çeyrek)</td><td>${fmtCurrency(iqr.q1)} / m²</td></tr>
          <tr><td>Medyan</td><td><strong>${fmtCurrency(iqr.median)} / m²</strong></td></tr>
          <tr><td>Q3 (Üst Çeyrek)</td><td>${fmtCurrency(iqr.q3)} / m²</td></tr>
          <tr><td>IQR (Q3 - Q1)</td><td>${fmtCurrency(iqr.iqr)} / m²</td></tr>
          <tr><td>Alt Sınır (Q1 - 1.5×IQR)</td><td>${fmtCurrency(iqr.lowerFence)} / m²</td></tr>
          <tr><td>Üst Sınır (Q3 + 1.5×IQR)</td><td>${fmtCurrency(iqr.upperFence)} / m²</td></tr>
          <tr><td>Aykırı Değer Sayısı</td><td>${iqr.outlierCount}</td></tr>
          <tr><td>Varyasyon Katsayısı</td><td>%${fmtNumber(iqr.cv, 1)}</td></tr>
        </tbody>
      </table>
    </div>

    <!-- DEĞER GÖRÜŞÜ -->
    <div class="report-section">
      <div class="report-section-title">3. Üç Değer Görüşü</div>
      <table class="report-table">
        <thead>
          <tr><th>Görüş</th><th>Birim (₺/m²)</th><th>Toplam Değer</th><th>Senaryo</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Konservatif (Alt)</td>
            <td>${fmtCurrency(valueOpinions.conservative.unitPriceBrut)}</td>
            <td>${fmtCurrency(valueOpinions.conservative.totalValue)}</td>
            <td style="font-size:11px">${valueOpinions.conservative.scenario}</td>
          </tr>
          <tr style="background:#0D1A0A">
            <td><strong>En Muhtemel (Medyan)</strong></td>
            <td><strong style="color:#C49A38">${fmtCurrency(valueOpinions.median.unitPriceBrut)}</strong></td>
            <td><strong style="color:#C49A38">${fmtCurrency(valueOpinions.median.totalValue)}</strong></td>
            <td style="font-size:11px">${valueOpinions.median.scenario}</td>
          </tr>
          <tr>
            <td>İyimser (Üst)</td>
            <td>${fmtCurrency(valueOpinions.optimistic.unitPriceBrut)}</td>
            <td>${fmtCurrency(valueOpinions.optimistic.totalValue)}</td>
            <td style="font-size:11px">${valueOpinions.optimistic.scenario}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- GELİR YAKLAŞIMI -->
    ${incomeData ? `
    <div class="report-section">
      <div class="report-section-title">4. Gelir Yaklaşımı</div>
      <table class="report-table">
        <tbody>
          <tr><td>Aylık Kira (Beyan)</td><td>${fmtCurrency(property.kira)} / ay</td></tr>
          <tr><td>Yıllık Brüt Kira</td><td>${fmtCurrency(incomeData.yillikKira)}</td></tr>
          <tr><td>Brüt Kira Çarpanı (GKÇ)</td><td>${incomeData.gkc} yıl</td></tr>
          <tr><td>Brüt Kapitalizasyon Oranı</td><td>%${incomeData.kapOrani}</td></tr>
          <tr><td>Net İşletme Geliri (%80)</td><td>${fmtCurrency(incomeData.nig)}</td></tr>
          <tr><td>Net Kapitalizasyon Oranı</td><td>%${incomeData.netKapOrani}</td></tr>
          <tr><td>Tahmini Geri Ödeme Süresi</td><td>${incomeData.geriOdeme} yıl</td></tr>
        </tbody>
      </table>
    </div>` : ''}

    <!-- RİSK & FIRSAT -->
    <div class="report-section">
      <div class="report-section-title">5. Risk ve Fırsat Matrisi</div>
      <table class="report-table">
        <thead><tr><th colspan="2">⚠ Risk Faktörleri</th></tr></thead>
        <tbody>
          ${riskData.risks.map(r => `<tr><td style="color:#DC2626">▼ ${r.label}</td><td style="font-size:11px">${r.detail}</td></tr>`).join('')}
        </tbody>
      </table>
      <table class="report-table">
        <thead><tr><th colspan="2">✓ Fırsat Faktörleri</th></tr></thead>
        <tbody>
          ${riskData.opportunities.map(o => `<tr><td style="color:#16A34A">▲ ${o.label}</td><td style="font-size:11px">${o.detail}</td></tr>`).join('')}
        </tbody>
      </table>
      <table class="report-table">
        <tbody>
          <tr><td>Tahmini Likidite Süresi</td><td>${riskData.liquidityDays} gün</td></tr>
          <tr><td>Önerilen Pazarlık Marjı</td><td>%3 — %8</td></tr>
          <tr><td>Değerleme Güven Skoru</td><td>${confidenceScore} / 10</td></tr>
        </tbody>
      </table>
    </div>

    <!-- SONUÇ VE TAVSİYE -->
    <div class="report-section">
      <div class="report-section-title">6. Sonuç ve Tavsiye</div>
      <table class="report-table">
        <tbody>
          <tr>
            <td style="width:40%"><strong>En Muhtemel Piyasa Değeri</strong></td>
            <td><span class="report-value-box">${fmtCurrency(valueOpinions.median.totalValue)}</span></td>
          </tr>
          <tr><td>Brüt Birim Değer</td><td>${fmtCurrency(valueOpinions.median.unitPriceBrut)} / m²</td></tr>
          <tr><td>Kısa Vade Tavsiyesi</td><td>${valueOpinions.median.horizon.short}</td></tr>
          <tr><td>Orta Vade Tavsiyesi</td><td>${valueOpinions.median.horizon.mid}</td></tr>
          <tr><td>Uzun Vade Tavsiyesi</td><td>${valueOpinions.median.horizon.long}</td></tr>
          <tr><td>Önerilen Müzakere Marjı</td><td>%3 — %8 (piyasa koşullarına göre)</td></tr>
        </tbody>
      </table>
    </div>

    <!-- SPK UYARISI (Sonunda) -->
    <div class="report-spk">
      <strong>YASAL UYARI:</strong> Bu değerleme analizi Turyap Queen Gayrimenkul Danışmanlık tarafından piyasa bilgilendirme amacıyla hazırlanmıştır.
      Sermaye Piyasası Kurulu (SPK) Gayrimenkul Değerleme Lisansı gerektiren resmi değerleme raporu niteliği taşımamaktadır.
      Tüm değerler emsal karşılaştırma ve istatistiksel analiz yöntemleri ile hesaplanmış olup gerçek satış fiyatı garanti edilemez.
      Yatırım, kredi, hukuki ve vergi işlemleri için bağımsız, lisanslı değerleme uzmanına başvurulması zorunludur.
      Rapor içeriğinin doğruluğundan Turyap Queen sorumlu tutulamaz.
    </div>

    <!-- İMZA BLOĞU -->
    <div class="report-signature">
      <div>
        <div class="report-sig-brand">TURYAP QUEEN</div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px">Gayrimenkul Danışmanlık ve Yatırım</div>
      </div>
      <div class="report-sig-info">
        Rapor No: TQ-${Date.now().toString(36).toUpperCase()}<br>
        Tarih: ${fmtDate(now)}<br>
        Analiz Motoru: Medyan / IQR v2.0
      </div>
    </div>

  </div>
</div>`;
}

/**
 * PDF olarak indir
 */
export async function downloadPDF(reportHTML, filename) {
  if (typeof html2pdf === 'undefined') {
    throw new Error('html2pdf.js yüklenmedi');
  }

  const container = document.createElement('div');
  container.innerHTML = reportHTML;
  container.style.cssText = `
    position: absolute; left: -9999px; top: 0;
    font-family: 'DM Sans', sans-serif;
    width: 210mm;
  `;
  document.body.appendChild(container);

  const opt = {
    margin: 0,
    filename: filename || `TuryapQueen_Rapor_${new Date().toISOString().slice(0,10)}.pdf`,
    image: { type: 'jpeg', quality: 0.96 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      backgroundColor: '#070B14'
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  try {
    await html2pdf().set(opt).from(container.firstChild).save();
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * E-Posta ile gönder (mailto)
 */
export function sendByEmail(property, valueOpinions) {
  const subject = encodeURIComponent(`Gayrimenkul Pazar Analizi — ${property.tipiLabel} ${property.alan}m² ${property.il}`);
  const body = encodeURIComponent(
    `Sayın Yetkili,\n\n` +
    `Turyap Queen Gayrimenkul Danışmanlık tarafından hazırlanan pazar analiz raporu ektedir.\n\n` +
    `Taşınmaz: ${property.tipiLabel} — ${property.alan} m²\n` +
    `Lokasyon: ${[property.mahalle, property.ilce, property.il].filter(Boolean).join(', ')}\n` +
    `En Muhtemel Değer: ${fmtCurrency(valueOpinions.median.totalValue)}\n` +
    `Değer Aralığı: ${fmtCurrency(valueOpinions.conservative.totalValue)} — ${fmtCurrency(valueOpinions.optimistic.totalValue)}\n\n` +
    `TURYAP QUEEN — Gayrimenkul Danışmanlık ve Yatırım\n`
  );
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

/**
 * Arsa/Tarla bilgileri → rapor tablo satırları
 */
function buildArsaReportRows(a, alan) {
  if (!a) return '';
  const imarLabel = {
    'imarsiz': 'İmarsız',
    'imarlı-konut': 'İmarlı — Konut',
    'imarlı-ticari': 'İmarlı — Ticari',
    'imarlı-karma': 'İmarlı — Karma'
  }[a.imarDurumu] || a.imarDurumu;

  const altyapiList = Object.entries({
    yol:'Yol', su:'Su', elektrik:'Elektrik',
    kanalizasyon:'Kanalizasyon', dogalgaz:'Doğalgaz', fiber:'Fiber'
  }).filter(([k]) => a.altyapi?.[k]).map(([,v]) => v).join(', ') || 'Yok';

  const tabanAlan  = a.taks > 0 ? Math.round(alan * a.taks)  : null;
  const insaatAlan = a.kaks > 0 ? Math.round(alan * a.kaks)  : null;

  let rows = `
    <tr><td>İmar Durumu</td><td><strong>${imarLabel}</strong></td></tr>
    <tr><td>Köşe Parsel</td><td>${a.koseParsel ? '✓ Evet (+%5–10 prim)' : 'Hayır'}</td></tr>
    <tr><td>Altyapı</td><td>${altyapiList}</td></tr>
  `;
  if (a.taks > 0)       rows += `<tr><td>TAKS</td><td>${a.taks} → ${tabanAlan?.toLocaleString('tr-TR')} m² taban</td></tr>`;
  if (a.kaks > 0)       rows += `<tr><td>KAKS (Emsal)</td><td>${a.kaks} → ${insaatAlan?.toLocaleString('tr-TR')} m² inşaat</td></tr>`;
  if (a.katSayisi > 0)  rows += `<tr><td>Kat Sayısı</td><td>${a.katSayisi} kat</td></tr>`;
  if (a.cepheMesafe > 0) rows += `<tr><td>Cephe Mesafesi</td><td>${a.cepheMesafe} m</td></tr>`;
  if (a.bodrumM2 > 0)   rows += `<tr><td>Bodrum Kat</td><td>${a.bodrumM2.toLocaleString('tr-TR')} m²</td></tr>`;
  if (a.asmaKatM2 > 0)  rows += `<tr><td>Asma Kat</td><td>${a.asmaKatM2.toLocaleString('tr-TR')} m²</td></tr>`;
  if (a.zeminM2 > 0)    rows += `<tr><td>Zemin Kat</td><td>${a.zeminM2.toLocaleString('tr-TR')} m²${a.tavanYukseklik > 0 ? ' | Tavan: ' + a.tavanYukseklik + ' m' : ''}</td></tr>`;
  if (a.normalKatM2 > 0 && a.katSayisi > 1) {
    const topKat = Math.max(0, a.katSayisi - 1);
    rows += `<tr><td>Normal Katlar (${topKat} × ${a.normalKatM2} m²)</td><td>${(a.normalKatM2 * topKat).toLocaleString('tr-TR')} m²</td></tr>`;
  }
  if (a.zeminCephe > 0) rows += `<tr><td>Zemin Ticari Cephe</td><td>${a.zeminCephe} m</td></tr>`;
  return rows;
}
