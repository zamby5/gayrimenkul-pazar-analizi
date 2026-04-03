// ui.js — UI Yardımcı Fonksiyonlar

/**
 * Para formatı: 1.234.567 ₺
 */
export function fmtCurrency(v, short = false) {
  if (!v && v !== 0) return '—';
  const n = Number(v);
  if (isNaN(n)) return '—';
  if (short) {
    if (n >= 1_000_000) return (n / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' M₺';
    if (n >= 1_000) return (n / 1_000).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' K₺';
  }
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

/**
 * Sayı formatı
 */
export function fmtNumber(v, decimals = 0) {
  if (!v && v !== 0) return '—';
  return Number(v).toLocaleString('tr-TR', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

/**
 * Tarih formatı
 */
export function fmtDate(d) {
  return new Date(d).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
}

/**
 * Toast bildirimi
 */
export function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span class="toast-text">${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.2s ease reverse';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

/**
 * Loading state
 */
export function setLoading(text, progress, sub) {
  const loadingState = document.getElementById('loadingState');
  const welcomeState = document.getElementById('welcomeState');
  const resultsState = document.getElementById('resultsState');

  if (text !== null) {
    loadingState.style.display = 'flex';
    welcomeState.style.display = 'none';
    resultsState.style.display = 'none';
    document.getElementById('loadingText').textContent = text || 'Analiz hazırlanıyor...';
    if (progress !== undefined) {
      document.getElementById('loadingFill').style.width = progress + '%';
    }
    if (sub) document.getElementById('loadingSub').textContent = sub;
  } else {
    loadingState.style.display = 'none';
  }
}

/**
 * Results state göster
 */
export function showResults() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('welcomeState').style.display = 'none';
  document.getElementById('resultsState').style.display = 'flex';
}

/**
 * Tab sistemi
 */
export function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${tabId}`)?.classList.add('active');
    });
  });
}

/**
 * Aktif tab
 */
export function activateTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
  document.getElementById(`tab-${tabId}`)?.classList.add('active');
}

/**
 * Modal
 */
export function showModal(content) {
  document.getElementById('modalBody').innerHTML = content;
  document.getElementById('emsalModal').style.display = 'flex';
}

export function hideModal() {
  document.getElementById('emsalModal').style.display = 'none';
}

/**
 * Emsal satırı oluştur
 */
export function renderEmsalRow(emsal, index) {
  const isOutlier = emsal.isOutlier;
  return `
<div class="emsal-row ${isOutlier ? 'outlier' : ''}" data-id="${emsal.id}">
  <div class="emsal-row-header">
    <span class="emsal-num">${index + 1}</span>
    <span class="emsal-source-badge">${emsal.kaynak || 'Manuel'}</span>
    ${emsal.ilanGun ? `<span style="font-size:10px;color:var(--text-3);margin-left:auto">${emsal.ilanGun} gün</span>` : ''}
  </div>
  <div class="emsal-row-inputs">
    <div>
      <div class="emsal-mini-label">Alan</div>
      <div class="emsal-mini-val">${emsal.alan} m²</div>
    </div>
    <div>
      <div class="emsal-mini-label">Fiyat</div>
      <div class="emsal-mini-val">${fmtCurrency(emsal.fiyat, true)}</div>
    </div>
    <div>
      <div class="emsal-mini-label">₺/m²</div>
      <div class="emsal-mini-val" style="color:var(--gold)">${fmtCurrency(emsal.birimFiyat, true)}</div>
    </div>
  </div>
</div>`;
}

/**
 * Seçili özellikleri getir
 */
export function getSelectedOzellikler() {
  return [...document.querySelectorAll('#ozellikChips input:checked')]
    .map(cb => cb.value);
}

/**
 * Tarih başlığı güncelle
 */
export function updateHeaderDate() {
  const el = document.getElementById('headerDate');
  if (el) {
    el.textContent = new Date().toLocaleDateString('tr-TR', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  }
}

/**
 * Senaryo rengi
 */
export function scenarioColor(type) {
  return type === 'conservative' ? 'var(--red)' : type === 'optimistic' ? 'var(--green)' : 'var(--gold)';
}
