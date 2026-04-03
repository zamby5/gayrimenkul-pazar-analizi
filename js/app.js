// app.js — Ana Uygulama Modülü
// Turyap Queen | Gayrimenkul Pazar Analizi v2.0

import { IL_LIST, getDistricts, getIlName } from './data/turkey-data.js';
import { TIPI_LABELS } from './data/price-matrix.js';
import { analyzeEmsaller, calcIQR, calcIncomeApproach, generateRiskFactors, drawBoxPlot } from './modules/analysis.js';
import { fetchEmsaller, validateEmsaller } from './modules/scraper.js';
import { queryParcel, formatParcelResult } from './modules/tkgm.js';
import { generateReportHTML, downloadPDF, sendByEmail } from './modules/report.js';
import { updateStreetView } from './modules/streetview.js';
import {
  fmtCurrency, fmtNumber, showToast, setLoading, showResults,
  initTabs, activateTab, showModal, hideModal, renderEmsalRow,
  getSelectedOzellikler, updateHeaderDate
} from './modules/ui.js';

// ======================================================
//  UYGULAMA DURUMU
// ======================================================
let state = {
  emsaller: [],
  analysisResult: null,
  selectedIl: null,
  selectedIlce: null,
  reportHTML: null
};

function emptyEmsal(id) {
  return {
    id: id || `emsal_${Date.now()}`,
    kaynak: 'Manuel', kaynakId: 'manuel',
    il: '', ilce: '', mahalle: '',
    alan: 0, fiyat: 0, birimFiyat: 0,
    ilanGun: 0, kat: undefined, yas: undefined,
    ozellikler: [], ilanTarihi: '', ilanUrl: '', not: ''
  };
}

// ======================================================
//  BAŞLANGIÇ
// ======================================================
document.addEventListener('DOMContentLoaded', () => {
  updateHeaderDate();
  populateIlSelect();
  initTabs();
  bindEvents();
  renderEmsalList();
  // İlk yüklemede doğru panel göster
  handleTipiChange(document.getElementById('tipiSelect').value);
});

// ======================================================
//  İL / İLÇE CASCADE
// ======================================================
function populateIlSelect() {
  const sel = document.getElementById('ilSelect');
  IL_LIST.forEach(il => {
    const opt = document.createElement('option');
    opt.value = il.code;
    opt.textContent = il.name;
    sel.appendChild(opt);
  });
}

function populateIlceSelect(ilCode) {
  const sel = document.getElementById('ilceSelect');
  sel.innerHTML = '<option value="">— İlçe Seçiniz —</option>';
  sel.disabled = true;
  if (!ilCode) return;
  const districts = getDistricts(ilCode);
  districts.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    sel.appendChild(opt);
  });
  sel.disabled = false;
}

// ======================================================
//  EMSAL LİSTESİ
// ======================================================
function renderEmsalList() {
  const list = document.getElementById('emsalList');
  if (!state.emsaller.length) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-4);font-size:12px">Emsal eklemek için "Otomatik Çek" veya "Emsal Ekle" kullanın</div>';
    return;
  }
  list.innerHTML = state.emsaller.map((e, i) => renderEmsalRow(e, i)).join('');

  list.querySelectorAll('[data-id]').forEach(row => {
    const id = row.dataset.id;
    row.querySelector('.emsal-edit-btn')?.addEventListener('click', ev => {
      ev.stopPropagation(); openEmsalEditor(id);
    });
    row.querySelector('.emsal-del-btn')?.addEventListener('click', ev => {
      ev.stopPropagation(); deleteEmsal(id);
    });
  });
}

function deleteEmsal(id) {
  state.emsaller = state.emsaller.filter(e => e.id !== id);
  renderEmsalList();
  showToast('Emsal silindi', 'info');
}

function openEmsalEditor(id) {
  const emsal = state.emsaller.find(e => e.id === id) || emptyEmsal(id);

  showModal(`
    <div style="display:grid;gap:12px">
      <div class="input-row-2">
        <div class="input-group">
          <label class="input-label">Alan (m²)</label>
          <input type="number" id="editAlan" class="input-field" value="${emsal.alan || ''}">
        </div>
        <div class="input-group">
          <label class="input-label">Satış Fiyatı (₺)</label>
          <input type="number" id="editFiyat" class="input-field" value="${emsal.fiyat || ''}">
        </div>
      </div>
      <div class="input-row-2">
        <div class="input-group">
          <label class="input-label">Bina Yaşı</label>
          <input type="number" id="editYas" class="input-field" value="${emsal.yas ?? ''}">
        </div>
        <div class="input-group">
          <label class="input-label">Kat</label>
          <input type="number" id="editKat" class="input-field" value="${emsal.kat ?? ''}">
        </div>
      </div>
      <div class="input-row-2">
        <div class="input-group">
          <label class="input-label">İlan Süresi (Gün)</label>
          <input type="number" id="editIlanGun" class="input-field" value="${emsal.ilanGun || ''}">
        </div>
        <div class="input-group">
          <label class="input-label">Kaynak</label>
          <input type="text" id="editKaynak" class="input-field" value="${emsal.kaynak || ''}">
        </div>
      </div>
      <div class="input-group">
        <label class="input-label">Not (isteğe bağlı)</label>
        <input type="text" id="editNot" class="input-field" value="${emsal.not || ''}" placeholder="Açıklama">
      </div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-gold" id="saveEmsalBtn" style="flex:1">Kaydet</button>
        <button class="btn btn-outline" id="cancelEmsalBtn">İptal</button>
      </div>
    </div>
  `);

  document.getElementById('cancelEmsalBtn').onclick = hideModal;
  document.getElementById('saveEmsalBtn').onclick = () => {
    const alan = Number(document.getElementById('editAlan').value) || 0;
    const fiyat = Number(document.getElementById('editFiyat').value) || 0;
    const yas = document.getElementById('editYas').value !== '' ? Number(document.getElementById('editYas').value) : undefined;
    const kat = document.getElementById('editKat').value !== '' ? Number(document.getElementById('editKat').value) : undefined;
    const ilanGun = Number(document.getElementById('editIlanGun').value) || 0;
    const kaynak = document.getElementById('editKaynak').value || 'Manuel';
    const not = document.getElementById('editNot').value || '';
    const birimFiyat = alan > 0 ? Math.round(fiyat / alan) : 0;

    const idx = state.emsaller.findIndex(e => e.id === id);
    if (idx !== -1) {
      state.emsaller[idx] = { ...state.emsaller[idx], alan, fiyat, birimFiyat, yas, kat, ilanGun, kaynak, not };
    } else {
      state.emsaller.push({ ...emsal, alan, fiyat, birimFiyat, yas, kat, ilanGun, kaynak, not });
    }
    hideModal();
    renderEmsalList();
    showToast('Emsal kaydedildi', 'success');
  };
}

// ======================================================
//  EVENT BINDING
// ======================================================
function bindEvents() {
  // İl değişimi
  document.getElementById('ilSelect').addEventListener('change', e => {
    const code = e.target.value;
    state.selectedIl = code ? { code, name: getIlName(code) } : null;
    populateIlceSelect(code);
    if (state.selectedIl) {
      tryUpdateStreetView();
    }
  });

  // İlçe değişimi
  document.getElementById('ilceSelect').addEventListener('change', e => {
    state.selectedIlce = e.target.value ? { name: e.target.value } : null;
  });

  // TKGM toggle
  document.getElementById('tkgmToggle').addEventListener('change', e => {
    document.getElementById('tkgmPanel').style.display = e.target.checked ? 'block' : 'none';
    document.getElementById('tkgmBadge').style.display = e.target.checked ? 'inline-flex' : 'none';
  });

  // TKGM sorgula
  document.getElementById('tkgmQueryBtn').addEventListener('click', handleTKGMQuery);

  // Taşınmaz tipi → panel switcher
  document.getElementById('tipiSelect').addEventListener('change', e => {
    handleTipiChange(e.target.value);
  });

  // İmar toggle butonları
  document.querySelectorAll('.imar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.imar-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = btn.dataset.val;
      document.getElementById('imarDurumu').value = val;
      const isImarlı = val !== 'imarsiz';
      document.getElementById('imarliPanel').style.display = isImarlı ? 'block' : 'none';
      const isTicari = val.includes('ticari') || val.includes('karma');
      document.getElementById('ticariPanel').style.display = isTicari ? 'block' : 'none';
    });
  });

  // Köşe parsel badge
  document.getElementById('koseParsel').addEventListener('change', e => {
    document.getElementById('koseBadge').style.display = e.target.checked ? 'inline-flex' : 'none';
  });

  // TAKS/KAKS canlı hesaplama
  ['taksInput', 'kaksInput', 'alanInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calcTaksKaks);
  });

  // Mahalle güncelleme → street view
  document.getElementById('mahalleInput').addEventListener('change', tryUpdateStreetView);

  // Emsal çek
  document.getElementById('fetchEmsalBtn').addEventListener('click', handleFetchEmsaller);

  // Emsal ekle
  document.getElementById('addEmsalBtn').addEventListener('click', () => {
    const newEmsal = emptyEmsal();
    state.emsaller.push(newEmsal);
    renderEmsalList();
    openEmsalEditor(newEmsal.id);
  });

  // Analiz başlat
  document.getElementById('analyzeBtn').addEventListener('click', handleAnalyze);

  // PDF
  document.getElementById('pdfBtn').addEventListener('click', handlePDF);

  // E-posta
  document.getElementById('emailBtn').addEventListener('click', handleEmail);

  // Yeni analiz
  document.getElementById('newAnalysisBtn').addEventListener('click', resetToWelcome);

  // Modal kapat
  document.getElementById('modalClose').addEventListener('click', hideModal);
  document.getElementById('emsalModal').addEventListener('click', e => {
    if (e.target.id === 'emsalModal') hideModal();
  });
}

function tryUpdateStreetView() {
  if (!state.selectedIl) return;
  updateStreetView({
    il: state.selectedIl.name,
    ilce: state.selectedIlce?.name || '',
    mahalle: document.getElementById('mahalleInput').value,
    adres: document.getElementById('adresInput').value
  });
}

function resetToWelcome() {
  document.getElementById('welcomeState').style.display = 'flex';
  document.getElementById('resultsState').style.display = 'none';
  document.getElementById('loadingState').style.display = 'none';
  state.analysisResult = null;
  state.emsaller = [];
  state.reportHTML = null;
  renderEmsalList();
}

// ======================================================
//  TKGM SORGU
// ======================================================
async function handleTKGMQuery() {
  const ilCode = document.getElementById('ilSelect').value;
  const ilce = document.getElementById('ilceSelect').value;
  const ada = document.getElementById('adaNo').value.trim();
  const parsel = document.getElementById('parselNo').value.trim();

  if (!ilCode || !ada || !parsel) {
    showToast('İl, ada ve parsel numarası zorunludur', 'warning');
    return;
  }

  const btn = document.getElementById('tkgmQueryBtn');
  btn.disabled = true;
  btn.innerHTML = '⌛ Sorgulanıyor...';

  try {
    const data = await queryParcel(ilCode, ilce, ada, parsel);
    const resultEl = document.getElementById('tkgmResult');
    resultEl.style.display = 'block';
    resultEl.innerHTML = formatParcelResult(data);
    if (data?.alan) {
      document.getElementById('alanInput').value = data.alan;
      showToast(`TKGM: ${data.alan} m² parsel bulundu`, 'success');
    }
    if (data?.mahalle) {
      document.getElementById('mahalleInput').value = data.mahalle;
    }
  } catch (err) {
    showToast(`TKGM hatası: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">⊕</span> TKGM Sorgula';
  }
}

// ======================================================
//  EMSAL ÇEKME
// ======================================================
async function handleFetchEmsaller() {
  const il = state.selectedIl;
  const ilce = state.selectedIlce;
  const mahalle = document.getElementById('mahalleInput').value.trim();
  const tipi = document.getElementById('tipiSelect').value;
  const alan = Number(document.getElementById('alanInput').value);

  if (!il) { showToast('Lütfen önce il seçiniz', 'warning'); return; }
  if (!alan || alan <= 0) { showToast('Geçerli bir alan giriniz', 'warning'); return; }

  const btn = document.getElementById('fetchEmsalBtn');
  btn.disabled = true;

  const sourceTags = document.querySelectorAll('.source-tag');
  sourceTags.forEach(t => t.className = 'source-tag');
  let srcIdx = 0;

  try {
    const result = await fetchEmsaller({ il, ilce, mahalle, tipi, alan }, (msg, pct) => {
      btn.innerHTML = `<span>⌛</span> %${Math.round(pct)}`;
      if (pct > 15 * (srcIdx + 1) && srcIdx < sourceTags.length) {
        if (srcIdx > 0) sourceTags[srcIdx - 1].className = 'source-tag loaded';
        sourceTags[srcIdx].className = 'source-tag active';
        srcIdx++;
      }
    });

    sourceTags.forEach(t => t.className = 'source-tag loaded');

    if (!result.emsaller.length) {
      showToast('⚠ Yetersiz Veri — Bu bölge/tip için emsal bulunamadı', 'warning');
      return;
    }

    state.emsaller = result.emsaller;
    renderEmsalList();
    const label = result.source === 'real' ? 'Gerçek veri' : 'Piyasa tahmini';
    showToast(`${result.emsaller.length} emsal yüklendi (${label})`, 'success');

  } catch (err) {
    showToast(`Emsal çekme hatası: ${err.message}`, 'error');
    sourceTags.forEach(t => t.className = 'source-tag');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">⊞</span> Otomatik Çek';
  }
}

// ======================================================
//  ANA ANALİZ
// ======================================================
async function handleAnalyze() {
  const il = state.selectedIl;
  const ilce = state.selectedIlce;
  const mahalle = document.getElementById('mahalleInput').value.trim();
  const tipi = document.getElementById('tipiSelect').value;
  const alan = Number(document.getElementById('alanInput').value);
  const kat = document.getElementById('katInput').value !== '' ? Number(document.getElementById('katInput').value) : undefined;
  const yas = document.getElementById('yasiInput').value !== '' ? Number(document.getElementById('yasiInput').value) : undefined;
  const oda = document.getElementById('odaSelect').value;
  const adres = document.getElementById('adresInput').value.trim();
  const ada = document.getElementById('adaNo').value.trim();
  const parsel = document.getElementById('parselNo').value.trim();
  const talepFiyat = Number(document.getElementById('talepFiyatInput').value) || 0;
  const kira = Number(document.getElementById('kiraInput').value) || 0;
  const ozellikler = getSelectedOzellikler();
  const isArsa = tipi === 'arsa' || tipi === 'tarla';
  const arsaData = isArsa ? getArsaData() : null;

  if (!il) { showToast('Lütfen il seçiniz', 'warning'); return; }
  if (!alan || alan <= 0) { showToast('Alan bilgisi giriniz', 'warning'); return; }

  const validation = validateEmsaller(state.emsaller);
  if (!validation.valid) {
    showToast(validation.message, 'warning');
    if (state.emsaller.filter(e => e.fiyat > 0).length === 0) return;
  }

  // Loading
  document.getElementById('welcomeState').style.display = 'none';
  document.getElementById('resultsState').style.display = 'none';
  setLoading('Analiz başlatılıyor...', 10, 'Emsal verileri doğrulanıyor');

  try {
    await sleep(300);
    setLoading('Medyan hesaplanıyor...', 28, 'IQR yöntemi uygulanıyor');
    await sleep(400);

    const result = analyzeEmsaller(state.emsaller, alan, tipi);

    if (result.error) {
      setLoading(null);
      document.getElementById('welcomeState').style.display = 'flex';
      showToast(result.error, 'error');
      return;
    }

    setLoading('Değer görüşü oluşturuluyor...', 50, 'Risk matrisi hesaplanıyor');
    await sleep(350);

    const incomeData = kira > 0
      ? calcIncomeApproach(result.valueOpinions.median.totalValue, kira)
      : null;

    const riskData = generateRiskFactors({
      tipi, yas, kat, ozellikler,
      il: il.name, ilce: ilce?.name,
      talepFiyat: talepFiyat || undefined,
      medianValue: result.valueOpinions.median.totalValue
    });

    setLoading('Piyasa analizi yazılıyor...', 72, 'AI analizi hazırlanıyor');
    await sleep(300);

    const aiSummary = await getAISummary({
      il: il.name, ilce: ilce?.name, mahalle, tipi: TIPI_LABELS[tipi] || tipi,
      alan, adjustedMedian: result.adjustedMedian,
      valueOpinions: result.valueOpinions,
      confidenceScore: result.confidenceScore,
      iqr: result.iqr,
      riskData, incomeData, kira, talepFiyat
    });

    setLoading('Rapor tamamlanıyor...', 90, 'Son kontroller...');
    await sleep(200);

    const property = {
      il: il.name, ilce: ilce?.name || '', mahalle, adres, ada, parsel,
      tipi, tipiLabel: TIPI_LABELS[tipi] || tipi,
      alan, kat, yas, oda, ozellikler,
      talepFiyat: talepFiyat || undefined,
      kira: kira || undefined,
      arsaData
    };

    state.analysisResult = {
      property, emsaller: result.emsaller,
      iqr: result.iqr,
      cleanMedian: result.cleanMedian,
      adjustedMedian: result.adjustedMedian,
      adjustedMean: result.adjustedMean,
      valueOpinions: result.valueOpinions,
      confidenceScore: result.confidenceScore,
      incomeData, riskData, aiSummary,
      analysisDate: new Date()
    };

    state.reportHTML = generateReportHTML(state.analysisResult);

    setLoading(null);
    showResults();
    activateTab('ozet');
    renderAllTabs(state.analysisResult);
    showToast('Analiz tamamlandı ✓', 'success');

  } catch (err) {
    setLoading(null);
    document.getElementById('welcomeState').style.display = 'flex';
    console.error('Analiz hatası:', err);
    showToast(`Analiz hatası: ${err.message}`, 'error');
  }
}

// ======================================================
//  AI ANALİZ ÖZETİ (Claude API)
// ======================================================
async function getAISummary(params) {
  const {
    il, ilce, mahalle, tipi, alan, adjustedMedian,
    valueOpinions: vo, confidenceScore, iqr,
    riskData, incomeData, kira, talepFiyat
  } = params;

  const prompt = `Sen Türkiye'de kurumsal standartlarda çalışan bir gayrimenkul değerleme uzmanısın.
Aşağıdaki analiz sonuçlarını değerlendirerek kısa, profesyonel bir piyasa özeti yaz (3-4 paragraf, Türkçe).

Taşınmaz: ${tipi}, ${alan} m², ${[mahalle, ilce, il].filter(Boolean).join(', ')}
En Muhtemel Değer: ${fmtCurrency(vo.median.totalValue)}
Birim Fiyat: ${fmtCurrency(adjustedMedian)} /m²
Değer Aralığı: ${fmtCurrency(vo.conservative.totalValue)} — ${fmtCurrency(vo.optimistic.totalValue)}
Medyan Emsal ₺/m²: ${fmtCurrency(iqr.median)}
IQR: ${fmtCurrency(iqr.q1)} — ${fmtCurrency(iqr.q3)}
Varyasyon: %${iqr.cv?.toFixed(1)}
Aykırı Değer: ${iqr.outlierCount || 0} adet
Güven Skoru: ${confidenceScore}/10
${talepFiyat ? `Talep Fiyatı: ${fmtCurrency(talepFiyat)}` : ''}
${kira ? `Aylık Kira: ${fmtCurrency(kira)}, GKÇ: ${incomeData?.gkc} yıl, Kap.Oranı: %${incomeData?.kapOrani}` : ''}
Riskler: ${riskData.risks.slice(0,3).map(r => r.label).join(', ')}
Fırsatlar: ${riskData.opportunities.slice(0,3).map(o => o.label).join(', ')}

Kısa yönetici özeti yaz. SPK uyarısı ekleme (ayrıca yazılıyor). "AI" kelimesini kullanma.`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const response = await fetch('/api/analyze-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (response.ok) {
      const data = await response.json();
      const text = data.summary || data.text || null;
      if (text) return text;
    }
    // 503 = API key yok → yerel özete düş, hata gösterme
  } catch (e) {
    // timeout veya network hatası → yerel özete düş
    console.info('AI servisi kullanılamıyor, yerel özet kullanılıyor.');
  }

  // Fallback: Yerel özet
  return buildLocalSummary(params);
}

function buildLocalSummary(params) {
  const { il, ilce, mahalle, tipi, alan, adjustedMedian, valueOpinions: vo, confidenceScore, iqr, riskData } = params;
  const lokasyon = [mahalle, ilce, il].filter(Boolean).join(', ');
  const cvComment = iqr.cv < 20
    ? 'Emsal fiyatlarının homojen dağılımı analizin güvenilirliğini artırmaktadır.'
    : iqr.cv < 35
    ? 'Emsal fiyatlarında orta düzeyde dağılım gözlemlenmektedir.'
    : 'Emsal fiyatlarındaki yüksek varyasyon piyasanın heterojen yapısını yansıtmaktadır.';

  return `
    <p><strong>${lokasyon}</strong> bölgesindeki <strong>${tipi.toUpperCase()}</strong> segmentinde gerçekleştirilen emsal karşılaştırma analizi sonucunda taşınmazın en muhtemel piyasa değeri <strong>${fmtCurrency(vo.median.totalValue)}</strong> (${fmtCurrency(adjustedMedian)}/m²) olarak hesaplanmıştır. ${cvComment}</p>
    <p>IQR yöntemi ile ${iqr.outlierCount || 0} adet aykırı değer tespit edilerek analizden çıkarılmış; temizlenmiş emsal setinden türetilen medyan değer temel değerleme ölçütü olarak kullanılmıştır. Konservatif senaryo <strong>${fmtCurrency(vo.conservative.totalValue)}</strong>, iyimser senaryo ise <strong>${fmtCurrency(vo.optimistic.totalValue)}</strong> olarak belirlenmiştir.</p>
    <p>Öne çıkan risk faktörleri arasında ${riskData.risks.slice(0, 2).map(r => r.label.toLowerCase()).join(' ve ')} yer almaktadır. Fırsatlar açısından ise ${riskData.opportunities.slice(0, 2).map(o => o.label.toLowerCase()).join(' ve ')} değeri olumlu desteklemektedir. Genel değerleme güven skoru <strong>${confidenceScore}/10</strong> olarak hesaplanmış olup analiz %${(confidenceScore * 10)}güven aralığında değerlendirilebilir.</p>
  `;
}

// ======================================================
//  SEKME RENDER'LARI
// ======================================================
function renderAllTabs(data) {
  renderOzetTab(data);
  renderEmsalTab(data);
  renderDegerTab(data);
  renderRiskTab(data);
  renderRaporTab(data);
}

// --- ÖZET TAB ---
function renderOzetTab(data) {
  const { property, valueOpinions: vo, iqr, confidenceScore, incomeData, aiSummary } = data;
  const isArsa = property.tipi === 'arsa' || property.tipi === 'tarla';

  document.getElementById('ozetContent').innerHTML = `
    ${isArsa && property.arsaData ? buildArsaSummaryHTML(property.arsaData, property.alan) : ''}
    <div class="value-cards">
      <div class="value-card conservative">
        <div class="value-card-label">Konservatif (Alt)</div>
        <div class="value-card-price">${fmtCurrency(vo.conservative.totalValue)}</div>
        <div class="value-card-sub">${fmtCurrency(vo.conservative.unitPriceBrut)} / m²</div>
      </div>
      <div class="value-card median">
        <div class="value-card-label">En Muhtemel (Medyan)</div>
        <div class="value-card-price">${fmtCurrency(vo.median.totalValue)}</div>
        <div class="value-card-sub">${fmtCurrency(vo.median.unitPriceBrut)} / m²</div>
      </div>
      <div class="value-card optimistic">
        <div class="value-card-label">İyimser (Üst)</div>
        <div class="value-card-price">${fmtCurrency(vo.optimistic.totalValue)}</div>
        <div class="value-card-sub">${fmtCurrency(vo.optimistic.unitPriceBrut)} / m²</div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">Medyan ₺/m²</div>
        <div class="stat-value">${fmtNumber(iqr.median)}</div>
        <div class="stat-unit">Ham emsal</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">IQR Bandı</div>
        <div class="stat-value">${fmtNumber(iqr.q1)} – ${fmtNumber(iqr.q3)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Güven Skoru</div>
        <div class="stat-value" style="color:var(--gold)">${confidenceScore}<span class="stat-unit"> /10</span></div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Varyasyon Katsayısı</div>
        <div class="stat-value">%${fmtNumber(iqr.cv, 1)}</div>
      </div>
    </div>

    ${property.talepFiyat ? buildTalepKarsilastirma(property, vo) : ''}

    ${incomeData ? `
    <div class="card">
      <div class="card-header">
        <span class="card-title" style="font-size:14px">Gelir Yaklaşımı Özet</span>
        <span class="badge badge-gold">GKÇ: ${incomeData.gkc} yıl</span>
      </div>
      <div class="income-grid">
        <div class="income-item">
          <div class="income-label">Brüt Kira Çarpanı</div>
          <div class="income-value">${incomeData.gkc} yıl</div>
        </div>
        <div class="income-item">
          <div class="income-label">Kap. Oranı (Brüt)</div>
          <div class="income-value">%${incomeData.kapOrani}</div>
        </div>
        <div class="income-item">
          <div class="income-label">Kap. Oranı (Net)</div>
          <div class="income-value">%${incomeData.netKapOrani}</div>
        </div>
        <div class="income-item">
          <div class="income-label">Geri Ödeme</div>
          <div class="income-value">${incomeData.geriOdeme} yıl</div>
        </div>
      </div>
    </div>` : ''}

    ${aiSummary ? `
    <div class="ai-summary">
      <div class="ai-summary-header">
        <div class="ai-indicator"></div>
        Piyasa Değerlendirme Özeti
      </div>
      ${aiSummary}
    </div>` : ''}
  `;
}

function buildTalepKarsilastirma(property, vo) {
  const fark = ((property.talepFiyat / vo.median.totalValue) - 1) * 100;
  const isHigh = property.talepFiyat > vo.median.totalValue;
  return `
  <div class="card" style="border-left:3px solid ${isHigh ? 'var(--amber)' : 'var(--green)'}">
    <div class="card-header">
      <span class="card-title" style="font-size:14px">Talep Fiyatı Karşılaştırması</span>
      <span class="badge ${isHigh ? 'badge-warn' : 'badge-live'}">${isHigh ? 'Piyasa Üstü' : 'Uygun Fiyat'}</span>
    </div>
    <div class="stats-grid" style="grid-template-columns:1fr 1fr 1fr">
      <div class="stat-box">
        <div class="stat-label">Talep Fiyatı</div>
        <div class="stat-value">${fmtCurrency(property.talepFiyat, true)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Piyasa Değeri</div>
        <div class="stat-value">${fmtCurrency(vo.median.totalValue, true)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Fark</div>
        <div class="stat-value" style="color:${isHigh ? 'var(--red)' : 'var(--green)'}">
          ${fark > 0 ? '+' : ''}${fmtNumber(fark, 1)}%
        </div>
      </div>
    </div>
  </div>`;
}

// --- EMSAL TAB ---
function renderEmsalTab(data) {
  const { emsaller, iqr, cleanMedian, adjustedMedian } = data;

  document.getElementById('emsalContent').innerHTML = `
    <div class="boxplot-container">
      <div class="boxplot-title">₺/m² Dağılım — IQR Box Plot Analizi</div>
      <canvas id="boxplotCanvas"></canvas>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Emsal Karşılaştırma Tablosu</span>
        <span class="badge badge-gold">${emsaller.length} Emsal</span>
      </div>
      <div style="overflow-x:auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th><th>Kaynak</th><th>Alan</th><th>Fiyat</th>
              <th>₺/m² Ham</th><th>Düzeltme</th><th>₺/m² Düzeltilmiş</th>
              <th>İlan Süresi</th><th>Durum</th>
            </tr>
          </thead>
          <tbody>
            ${emsaller.map((e, i) => `
            <tr class="${e.isOutlier ? 'outlier-row' : ''}">
              <td>${i + 1}</td>
              <td style="font-size:11px">${e.kaynak || '—'}</td>
              <td class="mono">${e.alan} m²</td>
              <td class="mono">${fmtCurrency(e.fiyat)}</td>
              <td class="mono">${fmtCurrency(e.birimFiyat)}</td>
              <td class="mono" style="color:${e.adjustmentTotal < 0 ? 'var(--red)' : e.adjustmentTotal > 0 ? 'var(--green)' : 'var(--text-3)'}">
                ${e.adjustmentTotal > 0 ? '+' : ''}${e.adjustmentTotal || 0}%
              </td>
              <td class="mono highlight">${fmtCurrency(e.adjustedBirimFiyat || e.birimFiyat)}</td>
              <td class="mono">${e.ilanGun || '—'} gün</td>
              <td style="font-size:11px;color:${e.isOutlier ? 'var(--red)' : 'var(--green)'}">
                ${e.isOutlier ? '⚠ Aykırı' : '✓ Normal'}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">Ham Medyan ₺/m²</div>
        <div class="stat-value">${fmtNumber(cleanMedian)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Düzeltilmiş Medyan</div>
        <div class="stat-value" style="color:var(--gold)">${fmtNumber(adjustedMedian)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Alt Sınır (IQR)</div>
        <div class="stat-value">${fmtNumber(iqr.lowerFence)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Üst Sınır (IQR)</div>
        <div class="stat-value">${fmtNumber(iqr.upperFence)}</div>
      </div>
    </div>

    ${iqr.outlierCount > 0 ? `
    <div class="insufficient-data">
      <span class="insufficient-icon">⚠</span>
      <span class="insufficient-title">${iqr.outlierCount} Aykırı Değer Tespit Edildi</span>
      <span class="insufficient-sub">
        IQR sınırları dışındaki değerler (Alt: ${fmtCurrency(iqr.lowerFence)} — Üst: ${fmtCurrency(iqr.upperFence)} / m²)
        medyan hesabından çıkarıldı. Bu emsaller tabloda kırmızı ile gösterilmektedir.
      </span>
    </div>` : ''}
  `;

  // Canvas çizimi
  requestAnimationFrame(() => {
    const canvas = document.getElementById('boxplotCanvas');
    if (canvas) {
      drawBoxPlot(canvas, iqr, emsaller.map(e => e.birimFiyat).filter(v => v > 0));
    }
  });
}

// --- DEĞER TAB ---
function renderDegerTab(data) {
  const { valueOpinions: vo, property, incomeData, confidenceScore } = data;

  document.getElementById('degerContent').innerHTML = `
    <div class="section-divider">
      <span class="section-divider-icon">◈</span>
      <span class="section-divider-text">Üç Değer Görüşü</span>
      <div class="section-divider-line"></div>
    </div>

    <div class="value-cards">
      ${['conservative','median','optimistic'].map(k => `
      <div class="value-card ${k}">
        <div class="value-card-label">${vo[k].label}</div>
        <div class="value-card-price">${fmtCurrency(vo[k].totalValue)}</div>
        <div class="value-card-sub">${fmtCurrency(vo[k].unitPriceBrut)} / m² (brüt)</div>
        <div style="font-size:11px;color:var(--text-3);margin-top:8px;line-height:1.5;border-top:1px solid var(--border);padding-top:8px">
          ${vo[k].scenario}
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--text-2)">
          <strong>Tavsiye:</strong> ${vo[k].advice}
        </div>
      </div>`).join('')}
    </div>

    <div class="section-divider">
      <span class="section-divider-icon">◈</span>
      <span class="section-divider-text">Zaman Horizontu Tavsiyeleri</span>
      <div class="section-divider-line"></div>
    </div>

    <div style="overflow-x:auto">
      <table class="horizon-table">
        <thead>
          <tr>
            <th style="width:140px">Senaryo</th>
            <th>Kısa Vade (0–1 yıl)</th>
            <th>Orta Vade (1–3 yıl)</th>
            <th>Uzun Vade (3+ yıl)</th>
          </tr>
        </thead>
        <tbody>
          ${['conservative','median','optimistic'].map((k, i) => {
            const colors = ['var(--red)', 'var(--gold)', 'var(--green)'];
            return `
          <tr>
            <td>
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colors[i]};margin-right:6px"></span>
              ${vo[k].label.split(' ')[0]}
            </td>
            <td>${vo[k].horizon.short}</td>
            <td>${vo[k].horizon.mid}</td>
            <td>${vo[k].horizon.long}</td>
          </tr>`;}).join('')}
        </tbody>
      </table>
    </div>

    ${incomeData ? `
    <div class="section-divider">
      <span class="section-divider-icon">◈</span>
      <span class="section-divider-text">Gelir Yaklaşımı Detayı</span>
      <div class="section-divider-line"></div>
    </div>
    <div class="income-grid">
      <div class="income-item">
        <div class="income-label">Aylık Kira (Beyan)</div>
        <div class="income-value">${fmtCurrency(property.kira)}</div>
      </div>
      <div class="income-item">
        <div class="income-label">Yıllık Brüt Kira</div>
        <div class="income-value">${fmtCurrency(incomeData.yillikKira)}</div>
      </div>
      <div class="income-item">
        <div class="income-label">Brüt Kira Çarpanı</div>
        <div class="income-value">${incomeData.gkc} <span style="font-size:12px">yıl</span></div>
        <div class="income-sub">Değer ÷ Yıllık Kira</div>
      </div>
      <div class="income-item">
        <div class="income-label">Brüt Kap. Oranı</div>
        <div class="income-value">%${incomeData.kapOrani}</div>
        <div class="income-sub">Yıllık Kira ÷ Değer</div>
      </div>
      <div class="income-item">
        <div class="income-label">Net İşletme Geliri</div>
        <div class="income-value">${fmtCurrency(incomeData.nig)}</div>
        <div class="income-sub">%80 Net kabul</div>
      </div>
      <div class="income-item">
        <div class="income-label">Net Kap. Oranı</div>
        <div class="income-value">%${incomeData.netKapOrani}</div>
      </div>
      <div class="income-item">
        <div class="income-label">Geri Ödeme Süresi</div>
        <div class="income-value">${incomeData.geriOdeme} <span style="font-size:12px">yıl</span></div>
      </div>
    </div>` : ''}

    <div class="section-divider">
      <span class="section-divider-icon">◈</span>
      <span class="section-divider-text">Değerleme Güven Göstergesi</span>
      <div class="section-divider-line"></div>
    </div>
    <div class="score-row">
      <span class="score-label">Analiz Güven Skoru</span>
      <div class="score-bar-wrap">
        <div class="score-bar-fill" style="width:${confidenceScore * 10}%;transition:width 1s ease"></div>
      </div>
      <span class="score-num">${confidenceScore} / 10</span>
    </div>
    <div style="font-size:11px;color:var(--text-3);margin-top:6px;padding:0 4px">
      ${confidenceScore >= 8 ? 'Yüksek güven: Emsal verisi yeterli ve homojen.' :
        confidenceScore >= 6 ? 'Orta güven: Analiz makul; ek emsal ile doğrulanması önerilir.' :
        'Düşük güven: Emsal sayısı veya varyasyonu analizi zayıflatmaktadır. Ek veri gereklidir.'}
    </div>
  `;
}

// --- RİSK TAB ---
function renderRiskTab(data) {
  const { riskData, confidenceScore, valueOpinions: vo, property } = data;
  const isArsa = property?.tipi === 'arsa' || property?.tipi === 'tarla';
  const arsaData = property?.arsaData;

  // Arsa-specific risk injections
  const arsaRisks = [];
  const arsaOpps  = [];
  if (isArsa && arsaData) {
    if (arsaData.imarDurumu === 'imarsiz') {
      arsaRisks.push({ label: 'İmarsız Parsel', detail: 'Yapılaşma yasağı; değer potansiyeli imar izni beklentisine bağlıdır', severity: 'high' });
    }
    const altyapiSkor = Object.values(arsaData.altyapi).filter(Boolean).length;
    if (altyapiSkor < 3) {
      arsaRisks.push({ label: `Eksik Altyapı (${altyapiSkor}/6)`, detail: 'Yol/su/elektrik bağlantısı yoksa geliştirme maliyeti yükselir', severity: altyapiSkor < 2 ? 'high' : 'medium' });
    } else {
      arsaOpps.push({ label: `Altyapı Tamamlanmış (${altyapiSkor}/6)`, detail: 'Mevcut altyapı geliştirme süresini kısaltır ve maliyeti düşürür' });
    }
    if (arsaData.koseParsel) {
      arsaOpps.push({ label: 'Köşe Parsel Avantajı', detail: 'Çift cephe erişimi ticari değeri %5–10 artırmaktadır' });
    }
    if (arsaData.taks > 0 && arsaData.kaks > 0) {
      const insaatAlan = Math.round(property.alan * arsaData.kaks);
      arsaOpps.push({ label: `KAKS ${arsaData.kaks} → ${insaatAlan.toLocaleString('tr-TR')} m² İnşaat`, detail: 'Geliştirme kapasitesi belirlendi; proje bazlı değerleme yapılabilir' });
    }
    if (arsaData.katSayisi >= 6) {
      arsaOpps.push({ label: `Yüksek Kat Hakkı (${arsaData.katSayisi} kat)`, detail: 'Yüksek yoğunluklu geliştirme senaryosu ile değer artışı mümkün' });
    }
  }
  const allRisks = [...arsaRisks, ...riskData.risks].slice(0, 6);
  const allOpps  = [...arsaOpps, ...riskData.opportunities].slice(0, 5);

  document.getElementById('riskContent').innerHTML = `
    <div class="risk-grid">
      <div class="risk-card">
        <div class="risk-card-title">
          <span class="risk-icon" style="color:var(--red)">⚠</span>
          Risk Faktörleri
        </div>
        ${allRisks.map(r => `
        <div class="risk-item">
          <div class="risk-dot ${r.severity === 'high' ? 'neg' : r.severity === 'medium' ? 'warn' : 'neg'}" 
               style="${r.severity === 'medium' ? 'background:var(--amber)' : r.severity === 'low' ? 'background:var(--text-3)' : ''}"></div>
          <div>
            <div style="font-weight:500;margin-bottom:2px;font-size:13px">${r.label}</div>
            <div style="font-size:11px;color:var(--text-3)">${r.detail}</div>
          </div>
        </div>`).join('')}
      </div>

      <div class="risk-card">
        <div class="risk-card-title">
          <span class="risk-icon" style="color:var(--green)">▲</span>
          Fırsat Faktörleri
        </div>
        ${allOpps.map(o => `
        <div class="risk-item">
          <div class="risk-dot pos"></div>
          <div>
            <div style="font-weight:500;margin-bottom:2px;font-size:13px">${o.label}</div>
            <div style="font-size:11px;color:var(--text-3)">${o.detail}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">Tahmini Likidite</div>
        <div class="stat-value">${riskData.liquidityDays}<span class="stat-unit"> gün</span></div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Pazarlık Marjı</div>
        <div class="stat-value">%3<span class="stat-unit"> — %8</span></div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Risk Sayısı</div>
        <div class="stat-value" style="color:var(--amber)">${allRisks.length}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Fırsat Sayısı</div>
        <div class="stat-value" style="color:var(--green)">${allOpps.length}</div>
      </div>
    </div>

    <div class="score-row">
      <span class="score-label">Değerleme Güven Skoru</span>
      <div class="score-bar-wrap">
        <div class="score-bar-fill" style="width:${confidenceScore * 10}%"></div>
      </div>
      <span class="score-num">${confidenceScore} / 10</span>
    </div>

    <div class="card" style="margin-top:16px;border-left:3px solid var(--gold)">
      <div class="card-header">
        <span class="card-title" style="font-size:14px">Sonuç ve Tavsiye</span>
      </div>
      <div style="display:grid;gap:10px;font-size:13px;color:var(--text-2)">
        <div style="display:flex;gap:10px;align-items:flex-start">
          <span style="color:var(--gold);flex-shrink:0">◈</span>
          <span><strong>En Muhtemel Değer:</strong> ${fmtCurrency(vo.median.totalValue)} — Bu değer, mevcut piyasa koşullarını yansıtan medyan bazlı tahmindir.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start">
          <span style="color:var(--gold);flex-shrink:0">◈</span>
          <span><strong>Pazarlık Önerisi:</strong> Alım/satım sürecinde %3–8 pazarlık marjı gözetilmesi, piyasa normlarıyla uyumludur.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start">
          <span style="color:var(--gold);flex-shrink:0">◈</span>
          <span><strong>Likidite:</strong> Taşınmazın yaklaşık ${riskData.liquidityDays} günde satışa dönüşmesi beklenmektedir. Bu süre, lokasyon ve fiyat talep dengesiyle değişkenlik gösterebilir.</span>
        </div>
      </div>
    </div>
  `;
}

// --- RAPOR TAB ---
function renderRaporTab(data) {
  if (!state.reportHTML) return;
  document.getElementById('raporContent').innerHTML = state.reportHTML;
}

// ======================================================
//  PDF & E-POSTA
// ======================================================
async function handlePDF() {
  if (!state.reportHTML || !state.analysisResult) {
    showToast('Önce analiz çalıştırınız', 'warning');
    return;
  }
  const btn = document.getElementById('pdfBtn');
  btn.disabled = true;
  btn.innerHTML = '⌛ PDF Oluşturuluyor...';
  try {
    const { property } = state.analysisResult;
    const filename = `TuryapQueen_${property.tipiLabel}_${property.il}_${new Date().toISOString().slice(0,10)}.pdf`;
    await downloadPDF(state.reportHTML, filename);
    showToast('PDF indirildi', 'success');
  } catch (err) {
    showToast(`PDF hatası: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">⊞</span> PDF İndir';
  }
}

function handleEmail() {
  if (!state.analysisResult) {
    showToast('Önce analiz çalıştırınız', 'warning');
    return;
  }
  sendByEmail(state.analysisResult.property, state.analysisResult.valueOpinions);
}

// ======================================================
//  YARDIMCI
// ======================================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ======================================================
//  ARSA / TARLA PANELİ — TİP DEĞİŞİMİ
// ======================================================
function handleTipiChange(tipi) {
  const isArsa = tipi === 'arsa' || tipi === 'tarla';
  document.getElementById('arsaPanel').style.display = isArsa ? 'block' : 'none';
  document.getElementById('konutPanel').style.display = isArsa ? 'none' : 'block';
}


// ======================================================
//  TAKS / KAKS CANLI HESAPLAMA
// ======================================================
function calcTaksKaks() {
  const alan = Number(document.getElementById('alanInput').value) || 0;
  const taks = Number(document.getElementById('taksInput')?.value) || 0;
  const kaks = Number(document.getElementById('kaksInput')?.value) || 0;
  if (!alan) return;

  const tabanAlan  = alan * taks;
  const insaatAlan = alan * kaks;
  // Emsalsiz alanlar (bodrum, asma kat) dahil değil
  const katSayisi = document.getElementById('katSayisi');
  const katN = Number(katSayisi?.value) || 0;

  // TAKS hint: taban m²
  const th = document.getElementById('taksHint');
  if (th && taks > 0) th.textContent = Math.round(tabanAlan) + 'm²';

  // KAKS hint: inşaat m²
  const kh = document.getElementById('kaksHint');
  if (kh && kaks > 0) kh.textContent = Math.round(insaatAlan) + 'm²';

  const resultBar = document.getElementById('taksResult');
  if (!resultBar) return;

  if (taks > 0 || kaks > 0) {
    resultBar.style.display = 'grid';

    document.getElementById('tabanAlanVal').textContent =
      taks > 0 ? Math.round(tabanAlan).toLocaleString('tr-TR') + ' m²' : '—';

    document.getElementById('insaatAlanVal').textContent =
      kaks > 0 ? Math.round(insaatAlan).toLocaleString('tr-TR') + ' m²' : '—';

    // Emsalli toplam inşaat alanı (bodrum/asma hariç KAKS'a göre)
    document.getElementById('emsalliAlanVal').textContent =
      kaks > 0 ? Math.round(insaatAlan).toLocaleString('tr-TR') + ' m²' : '—';
  } else {
    resultBar.style.display = 'none';
  }
}

// ======================================================
//  ARSA VERİLERİNİ TOPLA
// ======================================================
function getArsaData() {
  return {
    imarDurumu    : document.getElementById('imarDurumu')?.value || 'imarsiz',
    koseParsel    : document.getElementById('koseParsel')?.checked || false,
    altyapi       : {
      yol          : document.getElementById('altYol')?.checked || false,
      su           : document.getElementById('altSu')?.checked || false,
      elektrik     : document.getElementById('altElektrik')?.checked || false,
      kanalizasyon : document.getElementById('altKanalizasyon')?.checked || false,
      dogalgaz     : document.getElementById('altDogalgaz')?.checked || false,
      fiber        : document.getElementById('altFiber')?.checked || false,
    },
    taks          : Number(document.getElementById('taksInput')?.value) || 0,
    kaks          : Number(document.getElementById('kaksInput')?.value) || 0,
    katSayisi     : Number(document.getElementById('katSayisi')?.value) || 0,
    cepheMesafe   : Number(document.getElementById('cepheMesafe')?.value) || 0,
    bodrumM2      : Number(document.getElementById('bodrumM2')?.value) || 0,
    asmaKatM2     : Number(document.getElementById('asmaKatM2')?.value) || 0,
    zeminM2       : Number(document.getElementById('zeminM2')?.value) || 0,
    normalKatM2   : Number(document.getElementById('normalKatM2')?.value) || 0,
    tavanYukseklik: Number(document.getElementById('tavanYukseklik')?.value) || 0,
    zeminCephe    : Number(document.getElementById('zeminCephe')?.value) || 0,
  };
}

// ======================================================
//  ARSA SONUÇ PANELİ — Özet sekmesine eklenir
// ======================================================
function buildArsaSummaryHTML(arsaData, alan) {
  if (!arsaData) return '';

  const { imarDurumu, koseParsel, altyapi, taks, kaks, katSayisi,
          cepheMesafe, bodrumM2, asmaKatM2, zeminM2, normalKatM2,
          tavanYukseklik, zeminCephe } = arsaData;

  const isImarlı = imarDurumu !== 'imarsiz';
  const tabanAlan  = taks  > 0 ? Math.round(alan * taks)  : null;
  const insaatAlan = kaks  > 0 ? Math.round(alan * kaks)  : null;

  // Toplam kat dağılımı m²
  const toplamKatM2 = bodrumM2 + asmaKatM2 + zeminM2 + (normalKatM2 * Math.max(0, katSayisi - 1));

  const imarBadgeClass = {
    'imarsiz': 'imarsiz', 'imarlı-konut': 'konut', 'imarlı-ticari': 'ticari', 'imarlı-karma': 'karma'
  }[imarDurumu] || 'imarsiz';

  const imarLabel = {
    'imarsiz': 'İmarsız', 'imarlı-konut': 'İmarlı — Konut', 'imarlı-ticari': 'İmarlı — Ticari', 'imarlı-karma': 'İmarlı — Karma'
  }[imarDurumu] || imarDurumu;

  // Altyapı listesi
  const altyapiItems = [
    { key: 'yol', label: '🛣 Yol' },
    { key: 'su', label: '💧 Su' },
    { key: 'elektrik', label: '⚡ Elektrik' },
    { key: 'kanalizasyon', label: '♻ Kanalizasyon' },
    { key: 'dogalgaz', label: '🔥 Doğalgaz' },
    { key: 'fiber', label: '📶 Fiber' },
  ];

  const altyapiScore = Object.values(altyapi).filter(Boolean).length;

  return `
  <div class="arsa-summary-card">
    <div class="card-header" style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border)">
      <span class="card-title" style="font-size:15px">Parsel Detayları</span>
      ${koseParsel ? '<span class="badge badge-gold">Köşe Parsel</span>' : ''}
    </div>

    <!-- İmar Durumu Badge -->
    <div class="imar-status-badge ${imarBadgeClass}">
      <span>${imarBadgeClass === 'imarsiz' ? '✕' : '✓'}</span>
      ${imarLabel}
    </div>

    <!-- Ana metrikler -->
    <div class="arsa-summary-grid">
      <div class="arsa-summary-item">
        <div class="arsa-summary-label">Parsel Alanı</div>
        <div class="arsa-summary-val">${alan.toLocaleString('tr-TR')} m²</div>
      </div>
      ${taks > 0 ? `
      <div class="arsa-summary-item">
        <div class="arsa-summary-label">TAKS</div>
        <div class="arsa-summary-val gold">${taks} → ${tabanAlan?.toLocaleString('tr-TR')} m²</div>
      </div>` : ''}
      ${kaks > 0 ? `
      <div class="arsa-summary-item">
        <div class="arsa-summary-label">KAKS (Emsal)</div>
        <div class="arsa-summary-val gold">${kaks} → ${insaatAlan?.toLocaleString('tr-TR')} m²</div>
      </div>` : ''}
      ${katSayisi > 0 ? `
      <div class="arsa-summary-item">
        <div class="arsa-summary-label">Kat Sayısı</div>
        <div class="arsa-summary-val">${katSayisi} kat</div>
      </div>` : ''}
      ${cepheMesafe > 0 ? `
      <div class="arsa-summary-item">
        <div class="arsa-summary-label">Cephe Mesafesi</div>
        <div class="arsa-summary-val">${cepheMesafe} m</div>
      </div>` : ''}
      ${koseParsel ? `
      <div class="arsa-summary-item">
        <div class="arsa-summary-label">Köşe Parsel</div>
        <div class="arsa-summary-val green">+%5–10 Prim</div>
      </div>` : ''}
    </div>

    <!-- Altyapı -->
    <div style="margin-bottom:10px">
      <div class="arsa-summary-label" style="margin-bottom:6px">Altyapı Durumu (${altyapiScore}/6)</div>
      <div class="altyapi-status-row">
        ${altyapiItems.map(a => `
        <span class="altyapi-status-chip ${altyapi[a.key] ? 'yes' : 'no'}">
          ${a.label}
        </span>`).join('')}
      </div>
    </div>

    <!-- İnşaat Potansiyeli Tablosu (imarlıysa) -->
    ${isImarlı && (taks > 0 || kaks > 0 || bodrumM2 > 0 || zeminM2 > 0) ? `
    <div class="subsection-header" style="margin-top:8px">İnşaat Potansiyeli</div>
    <table class="insaat-potential-table">
      <thead>
        <tr><th>Kat / Alan</th><th class="mono">m²</th><th>Açıklama</th></tr>
      </thead>
      <tbody>
        ${tabanAlan ? `<tr><td>Taban Alanı (TAKS)</td><td class="mono highlight">${tabanAlan.toLocaleString('tr-TR')} m²</td><td>İnşaat ayak izi</td></tr>` : ''}
        ${insaatAlan ? `<tr><td>Toplam İnşaat (KAKS)</td><td class="mono highlight">${insaatAlan.toLocaleString('tr-TR')} m²</td><td>Emsale dahil toplam</td></tr>` : ''}
        ${bodrumM2 > 0 ? `<tr><td>Bodrum Kat</td><td class="mono">${bodrumM2.toLocaleString('tr-TR')} m²</td><td>Genellikle emsale dahil değil</td></tr>` : ''}
        ${asmaKatM2 > 0 ? `<tr><td>Asma Kat</td><td class="mono">${asmaKatM2.toLocaleString('tr-TR')} m²</td><td>Bölgesel yönetmeliğe göre</td></tr>` : ''}
        ${zeminM2 > 0 ? `<tr><td>Zemin Kat</td><td class="mono">${zeminM2.toLocaleString('tr-TR')} m²</td><td>${tavanYukseklik > 0 ? 'Tavan: ' + tavanYukseklik + ' m' : ''}</td></tr>` : ''}
        ${normalKatM2 > 0 && katSayisi > 1 ? `<tr><td>Normal Katlar (${Math.max(0, katSayisi - 1)} kat)</td><td class="mono">${(normalKatM2 * Math.max(0, katSayisi - 1)).toLocaleString('tr-TR')} m²</td><td>${normalKatM2.toLocaleString('tr-TR')} m²/kat</td></tr>` : ''}
        ${toplamKatM2 > 0 ? `<tr style="background:var(--gold-dim)"><td><strong>Tahmini Toplam</strong></td><td class="mono highlight">${toplamKatM2.toLocaleString('tr-TR')} m²</td><td>Kat dağılımı toplamı</td></tr>` : ''}
        ${zeminCephe > 0 ? `<tr><td>Zemin Cephe</td><td class="mono">${zeminCephe} m</td><td>Ticari cephe uzunluğu</td></tr>` : ''}
      </tbody>
    </table>` : ''}
  </div>`;
}
