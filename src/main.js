import { CITIES } from './data/cities.js';
import { RELIGIOUS_DAYS } from './data/religiousDays.js';
import { ISLAMIC_RADIOS } from './data/radioData.js';
import { DAILY_CONTENT, DHIKR_LIST } from './data/diyanetContent.js';
import { radioService } from './services/radioService.js';
import L from 'leaflet';
import { 
  calculatePrayerTimes, 
  generateMonthlyPrayerTimes, 
  calculateQiblaDirection, 
  getNextPrayerCountdown,
  fetchOnlineDiyanetTimes 
} from './services/prayerEngine.js';
import { 
  saveMonthlyTimesToDb, 
  getMonthlyTimesFromDb, 
  saveSetting, 
  getSetting,
  saveCustomAudio,
  getCustomAudio,
  deleteCustomAudio
} from './services/storageService.js';
import { notificationService } from './services/notificationService.js';

// Uygulama Durumu (State)
const state = {
  currentCity: CITIES.find(c => c.id === 'istanbul' || c.id === 'istanbul-fatih') || CITIES[0],
  activeTab: 'home', // 'home' | 'qibla' | 'radio' | 'calendar' | 'notifications'
  homeSubView: 'vakitler', // 'vakitler' | 'imsakiye' | 'zikirmatik'
  dhikrIndex: 0,
  dhikrCount: 0,
  monthlyTimes: [],
  qiblaSubTab: 'compass', // 'compass' | 'map'
  radioCategory: 'all',
  radioSearchQuery: '',
  prayerData: null,
  countdown: null,
  qiblaAngle: 0,
  deviceHeading: 0,
  smoothedHeading: 0,
  isCityModalOpen: false,
  isDeskStandOpen: false,
  wakeLock: null,
  notificationEnabled: true,
  qiblaVibrationEnabled: false,
  lastAlertPrayer: null,
  lastPreAlertKey: null,
  customAudioMap: {}, // { default_custom: 'ezan.mp3', audio_fajr: 'sabah.mp3', ... }
  selectedPrayerForSetting: null,
  prayerAlertSettings: {
    fajr: { enabled: true, sound: 'ezan', preAlert: 15 },
    sunrise: { enabled: true, sound: 'kisa', preAlert: 0 },
    dhuhr: { enabled: true, sound: 'ezan', preAlert: 15 },
    asr: { enabled: true, sound: 'ezan', preAlert: 15 },
    maghrib: { enabled: true, sound: 'ezan', preAlert: 15 },
    isha: { enabled: true, sound: 'ezan', preAlert: 15 }
  }
};

// Yükleniyor ekranı
function showLoadingScreen() {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;min-height:100dvh;background:#0b1320;">
        <div style="font-size:3.8rem;margin-bottom:12px;animation:pulse 1.5s infinite;">🌹</div>
        <div style="color:#d4af37;font-size:1.3rem;font-weight:700;letter-spacing:1px;">Namaz Vaktim</div>
        <div style="color:#94a3b8;font-size:0.85rem;margin-top:6px;">Diyanet Vakitleri Yükleniyor...</div>
        <div style="width:50px;height:3px;background:rgba(212,175,55,0.3);border-radius:3px;margin-top:20px;overflow:hidden;">
          <div style="width:100%;height:100%;background:#d4af37;animation:slide 1.2s ease-in-out infinite alternate;transform-origin:left;"></div>
        </div>
      </div>
      <style>
        @keyframes slide{from{transform:scaleX(0.1)}to{transform:scaleX(1)}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
      </style>
    `;
  }
}

// Uygulamayı Başlat
async function initApp() {
  showLoadingScreen();
  
  try {
    // Kayıtlı şehri yükle
    const savedCityId = await getSetting('selectedCityId');
    if (savedCityId) {
      const found = CITIES.find(c => c.id === savedCityId);
      if (found) state.currentCity = found;
    }

    // Bildirim ve ses ayarlarını yükle
    const notifPref = await getSetting('notificationEnabled', true);
    state.notificationEnabled = notifPref !== undefined ? notifPref : true;

    const qiblaVibPref = await getSetting('qiblaVibrationEnabled', false);
    state.qiblaVibrationEnabled = qiblaVibPref !== undefined ? qiblaVibPref : false;

    const savedDhikrCount = await getSetting('dhikrCount', 0);
    state.dhikrCount = savedDhikrCount || 0;

    const savedDhikrIdx = await getSetting('dhikrIndex', 0);
    state.dhikrIndex = savedDhikrIdx || 0;

    const savedAlerts = await getSetting('prayerAlertSettings');
    if (savedAlerts) {
      state.prayerAlertSettings = { ...state.prayerAlertSettings, ...savedAlerts };
    }

    // Özel ses dosyalarını kontrol et
    await refreshCustomAudios();

    await updatePrayerTimes();
    renderApp();

    // Saniye başı geri sayım ve saat güncelleme
    setInterval(() => {
      if (state.prayerData) {
        try {
          state.countdown = getNextPrayerCountdown(state.prayerData.times.raw);
          updateCountdownUI();
          
          // Vakit Bildirimi ve Ezan Kontrolü (Tam Vaktinde)
          if (state.countdown && state.countdown.current) {
            const currentKey = state.countdown.current.key;
            if (state.lastAlertPrayer !== currentKey) {
              if (state.lastAlertPrayer !== null && state.notificationEnabled) {
                const setting = state.prayerAlertSettings[currentKey];
                if (setting && setting.enabled) {
                  notificationService.triggerPrayerAlert(state.countdown.current.name, setting.sound || 'ezan', currentKey);
                }
              }
              state.lastAlertPrayer = currentKey;
            }
          }

          // Vakit Öncesi Erken Hatırlatma Kontrolü (15 dk / 30 dk önce)
          if (state.countdown && state.countdown.next && state.notificationEnabled) {
            const nextKey = state.countdown.next.key;
            const setting = state.prayerAlertSettings[nextKey];
            if (setting && setting.enabled && setting.preAlert > 0) {
              const preAlertSeconds = setting.preAlert * 60;
              const preAlertId = `${nextKey}_${setting.preAlert}`;
              // Tam o dakikada (örneğin 15:00 veya 14:59 aralığında 1 kere tetikle)
              if (state.countdown.totalSeconds <= preAlertSeconds && state.countdown.totalSeconds > preAlertSeconds - 60) {
                if (state.lastPreAlertKey !== preAlertId) {
                  notificationService.triggerPreAlert(state.countdown.next.name, setting.preAlert);
                  state.lastPreAlertKey = preAlertId;
                }
              } else if (state.countdown.totalSeconds > preAlertSeconds) {
                if (state.lastPreAlertKey === preAlertId) {
                  state.lastPreAlertKey = null;
                }
              }
            }
          }
        } catch(e) { console.error('Sayaç hatası:', e); }
      }
    }, 1000);

    // Pusula sensör dinleyicisi
    setupCompassListener();

    // Radyo durum dinleyicisi
    radioService.onStateChange = () => {
      if (state.activeTab === 'radio') {
        renderApp();
      }
    };
    
  } catch(err) {
    console.error('Uygulama başlatma hatası:', err);
    state.prayerData = calculatePrayerTimes(state.currentCity.latitude, state.currentCity.longitude);
    state.countdown = getNextPrayerCountdown(state.prayerData.times.raw);
    renderApp();
  }
}

async function refreshCustomAudios() {
  const keys = ['default_custom', 'audio_fajr', 'audio_sunrise', 'audio_dhuhr', 'audio_asr', 'audio_maghrib', 'audio_isha'];
  for (const k of keys) {
    const aud = await getCustomAudio(k);
    if (aud) {
      state.customAudioMap[k] = aud.name;
    } else {
      delete state.customAudioMap[k];
    }
  }
}

/**
 * Vakitleri yerel veritabanından getir veya hesaplayıp senkronize et
 */
async function updatePrayerTimes() {
  const city = state.currentCity;
  state.qiblaAngle = calculateQiblaDirection(city.latitude, city.longitude);
  
  // Önce temel hesaplamayı hazırla
  state.prayerData = calculatePrayerTimes(city.latitude, city.longitude);
  state.countdown = getNextPrayerCountdown(state.prayerData.times.raw);
  state.monthlyTimes = generateMonthlyPrayerTimes(city.latitude, city.longitude);

  // Arka planda resmi Diyanet API'sinden kontrol et (varsa)
  fetchOnlineDiyanetTimes(city.cityName || city.name).then(onlineTimes => {
    if (onlineTimes && state.prayerData) {
      state.prayerData.times.fajr = onlineTimes.fajr || state.prayerData.times.fajr;
      state.prayerData.times.sunrise = onlineTimes.sunrise || state.prayerData.times.sunrise;
      state.prayerData.times.dhuhr = onlineTimes.dhuhr || state.prayerData.times.dhuhr;
      state.prayerData.times.asr = onlineTimes.asr || state.prayerData.times.asr;
      state.prayerData.times.maghrib = onlineTimes.maghrib || state.prayerData.times.maghrib;
      state.prayerData.times.isha = onlineTimes.isha || state.prayerData.times.isha;
      renderApp();
    }
  }).catch(() => {});
}

/**
 * Canlı Pusula Sensörü - Android (deviceorientationabsolute / alpha / AbsoluteOrientationSensor) & iOS (webkitCompassHeading) uyumlu
 */
let compassListenerAdded = false;

function setupCompassListener() {
  if (compassListenerAdded) return;

  let lastFiltered = state.smoothedHeading || 0;

  const processHeading = (rawHeading) => {
    if (rawHeading === null || isNaN(rawHeading)) return;
    
    // Açıyı 0-360 aralığına normalize et
    let normHeading = (rawHeading % 360 + 360) % 360;

    // Açısal en kısa fark ve dairesel yumuşatma (Low-pass filter)
    let diff = normHeading - lastFiltered;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    // Küçük mikro sensör gürültüsü ve titremesini (deadband < 0.6°) süz
    if (Math.abs(diff) < 0.6) return;

    // Yumuşak kadran geçişi (katsayı 0.15)
    lastFiltered = (lastFiltered + diff * 0.15 + 360) % 360;
    state.smoothedHeading = lastFiltered;
    state.deviceHeading = Math.round(lastFiltered * 10) / 10;
    updateCompassUI();
  };

  const handleOrientation = (event) => {
    let heading = null;

    // 1. iOS / Safari (0 = Manyetik Kuzey, saat yönü artar)
    if (typeof event.webkitCompassHeading !== 'undefined' && event.webkitCompassHeading !== null) {
      heading = event.webkitCompassHeading;
    }
    // 2. Android Chrome Absolute Orientation
    else if (event.absolute === true && event.alpha !== null) {
      heading = (360 - event.alpha) % 360;
    }
    // 3. Standart alpha değeri
    else if (event.alpha !== null) {
      heading = (360 - event.alpha) % 360;
    }

    if (heading !== null) {
      processHeading(heading);
    }
  };

  // Android'de çakışmayı önlemek için önce 'deviceorientationabsolute' dene, yoksa 'deviceorientation'
  if (window.DeviceOrientationEvent) {
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
    compassListenerAdded = true;
  }
}

/**
 * Ana Arayüzü Çizme
 */
function renderApp() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <!-- Header -->
    <header class="app-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 1.6rem; filter: drop-shadow(0 0 8px rgba(212,175,55,0.6));">🌹</span>
        <div>
          <div style="font-size: 1.05rem; font-weight: 700; color: var(--gold-light); line-height: 1.2;">Namaz Vaktim</div>
          <button class="city-selector-btn" id="open-city-modal" style="padding: 2px 8px; font-size: 0.78rem; margin-top: 1px;">
            📍 <span>${state.currentCity.name}</span> ▾
          </button>
        </div>
      </div>
      <div class="header-actions">
        <button class="icon-btn" id="toggle-sound-btn" title="Hızlı Ezan Testi">
          🔔
        </button>
      </div>
    </header>

    <!-- Ana İçerik -->
    <main id="main-content" style="flex: 1; display: flex; flex-direction: column;">
      ${renderTabContent()}
    </main>

    <!-- Şehir Seçim Modalı (Tüm İller ve İlçeler) -->
    <div class="modal-overlay ${state.isCityModalOpen ? 'open' : ''}" id="city-modal">
      <div class="modal-sheet">
        <div class="modal-header">
          <div>
            <h3 style="margin:0;font-size:1.15rem;color:#fff;">Şehir & İlçe Seçimi</h3>
            <div style="font-size:0.75rem;color:var(--gold-light);">81 İl ve Tüm İlçeler (1000+ Bölge)</div>
          </div>
          <button class="icon-btn" id="close-city-modal">✕</button>
        </div>
        <input type="text" class="search-input" id="city-search" placeholder="İl, ilçe veya plaka ara (Örn: Kadıköy, 34, Alanya)..." />
        <div class="city-list" id="city-list-container">
          ${renderCityList()}
        </div>
      </div>
    </div>

    <!-- Vakit Ezan & Bildirim Ayarı Modalı -->
    <div class="modal-overlay ${state.selectedPrayerForSetting ? 'open' : ''}" id="prayer-setting-modal">
      <div class="modal-sheet">
        ${renderPrayerSettingModalContent()}
      </div>
    </div>

    <!-- Tam Ekran Android Masaüstü / Stand Saati Modalı -->
    ${renderDeskStandModal()}

    <!-- Gizli Dosya Seçici Inputlar -->
    <input type="file" id="modal-audio-file-input" accept="audio/*" style="display: none;" />
    <input type="file" id="tab-audio-file-input" accept="audio/*" style="display: none;" />

    <!-- Alt Navigasyon Barı (5 Sekme: Vakitler, Kıble, Radyo, Dini Günler, Bildirimler) -->
    <nav class="bottom-nav">
      <button class="nav-item ${state.activeTab === 'home' ? 'active' : ''}" data-tab="home">
        <span>🕌</span>
        <span>Vakitler</span>
      </button>
      <button class="nav-item ${state.activeTab === 'qibla' ? 'active' : ''}" data-tab="qibla">
        <span>🧭</span>
        <span>Kıble</span>
      </button>
      <button class="nav-item ${state.activeTab === 'radio' ? 'active' : ''}" data-tab="radio">
        <span>📻</span>
        <span>Radyo</span>
      </button>
      <button class="nav-item ${state.activeTab === 'calendar' ? 'active' : ''}" data-tab="calendar">
        <span>🌙</span>
        <span>Dini Günler</span>
      </button>
      <button class="nav-item ${state.activeTab === 'notifications' ? 'active' : ''}" data-tab="notifications">
        <span>🔔</span>
        <span>Bildirimler</span>
      </button>
    </nav>
  `;

  attachEventListeners();
}

/**
 * Sekme İçeriğini Oluşturma
 */
function renderTabContent() {
  if (state.activeTab === 'home') {
    return renderHomeTab();
  } else if (state.activeTab === 'qibla') {
    return renderQiblaTab();
  } else if (state.activeTab === 'radio') {
    return renderRadioTab();
  } else if (state.activeTab === 'calendar') {
    return renderCalendarTab();
  } else if (state.activeTab === 'notifications') {
    return renderNotificationsTab();
  }
}

/**
 * 1. VAKİTLER SEKMESİ (İç Açıcı Masaüstü Saat Kadranı & Saat İçi Namaz Vakitleri)
 */
function renderHomeTab() {
  const times = state.prayerData ? state.prayerData.times : {};
  const currentKey = state.countdown?.current?.key;
  const nextName = state.countdown?.next?.name || 'Vakit';
  
  const now = new Date();
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const hourMin = timeStr.substring(0, 5);
  const sec = timeStr.substring(6, 8);
  const gregorianDateStr = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });

  const prayerRows = [
    { key: 'fajr',    icon: '🌙', name: 'İmsak',   time: times.fajr    },
    { key: 'sunrise', icon: '🌅', name: 'Güneş',   time: times.sunrise },
    { key: 'dhuhr',   icon: '☀️', name: 'Öğle',    time: times.dhuhr   },
    { key: 'asr',     icon: '🌤️', name: 'İkindi',  time: times.asr     },
    { key: 'maghrib', icon: '🌇', name: 'Akşam',   time: times.maghrib },
    { key: 'isha',    icon: '🌌', name: 'Yatsı',   time: times.isha    },
  ];

  return `
    <!-- İÇ AÇICI MASAÜSTÜ SAAT KADRANI & SAAT İÇİ NAMAZ VAKİTLERİ -->
    <div class="hero-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <div class="date-hijri-badge">
          <span class="gregorian-date-badge">📅 ${gregorianDateStr}</span>
          <span class="hijri-badge">1447 Hicri</span>
        </div>
        <button class="desk-mode-trigger-btn" id="open-desk-stand-btn" title="Tam Ekran Masa Saati Modu">
          <span>🖥️</span> Masa Saati
        </button>
      </div>

      <!-- Büyük Canlı Dijital Saat -->
      <div class="master-clock-display">
        <span class="master-clock-time" id="live-clock-hour-min">${hourMin}</span>
        <span class="master-clock-sec" id="live-clock-sec">:${sec}</span>
      </div>

      <!-- Sıradaki Vakit ve Geri Sayım Rozeti -->
      <div class="next-prayer-countdown-bar">
        <div class="next-prayer-title">Sıradaki: <span>${nextName} Vakti</span></div>
        <span style="color:rgba(255,255,255,0.3);">•</span>
        <div class="countdown-timer-mini" id="countdown-display">${state.countdown?.remainingFormatted || '--:--:--'}</div>
      </div>

      <!-- SAATİN İÇİNE ENTEGRE EDİLMİŞ 6'LI NAMAZ VAKİTLERİ KAPSÜLLERİ -->
      <div class="clock-prayer-capsules-wrap">
        ${prayerRows.map(p => {
          const isCurrent = currentKey === p.key;
          const s = state.prayerAlertSettings[p.key] || {};
          return `
          <div class="clock-prayer-capsule ${isCurrent ? 'active' : ''}" data-prayer-key="${p.key}" data-prayer-name="${p.name}" data-prayer-time="${p.time || '--:--'}" title="${p.name} Vakti - Dokunarak Ses Ayarla">
            <div class="capsule-top">
              <span class="capsule-icon">${p.icon}</span>
              <span>${p.name}</span>
            </div>
            <div class="capsule-time">${p.time || '--:--'}</div>
            <div class="capsule-badge">${isCurrent ? '● Şu Anki Vakit' : (s.enabled !== false ? '🔔 Açık' : '🔕 Kapalı')}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- DİYANET HIZLI ERİŞİM MENÜSÜ (Vakitler, Aylık İmsakiye, Zikirmatik, Günün Duası) -->
    <div class="diyanet-quick-tools">
      <button class="diyanet-quick-btn ${state.homeSubView === 'vakitler' ? 'active' : ''}" id="btn-subview-vakitler">
        <span>🕌</span>
        <span>Vakitler</span>
      </button>
      <button class="diyanet-quick-btn ${state.homeSubView === 'imsakiye' ? 'active' : ''}" id="btn-subview-imsakiye">
        <span>📅</span>
        <span>İmsakiye</span>
      </button>
      <button class="diyanet-quick-btn ${state.homeSubView === 'zikirmatik' ? 'active' : ''}" id="btn-subview-zikirmatik">
        <span>📿</span>
        <span>Zikirmatik</span>
      </button>
      <button class="diyanet-quick-btn" id="btn-quick-random-verse">
        <span>✨</span>
        <span>Günün Ayeti</span>
      </button>
    </div>

    ${state.homeSubView === 'vakitler' ? `
      <!-- Vakitler Detay Listesi (Üzerine dokunarak ezan ve ses ayarlanır) -->
      <div class="prayer-grid">
        ${prayerRows.map(p => {
          const s = state.prayerAlertSettings[p.key] || {};
          const customName = state.customAudioMap[`audio_${p.key}`] || state.customAudioMap['default_custom'];
          let soundLabel = 'Makam Ezan';
          if (s.sound === 'ney') soundLabel = 'Ney Dinletisi';
          else if (s.sound === 'kisa') soundLabel = 'Melodik Ton';
          else if (s.sound === 'nature') soundLabel = 'Çan & Doğa';
          else if (s.sound === 'beep') soundLabel = 'Kısa Bip';
          else if (s.sound === 'custom') soundLabel = customName ? `🎵 ${customName.substring(0, 12)}...` : '🎵 Özel Ses';
          
          const badge = s.enabled !== false
            ? `🔔 ${soundLabel}${s.preAlert > 0 ? ' • ' + s.preAlert + ' dk önce' : ''}`
            : '🔕 Kapalı';

          return `
          <div class="prayer-row ${currentKey === p.key ? 'active' : ''}" data-prayer-key="${p.key}" data-prayer-name="${p.name}" data-prayer-time="${p.time || '--:--'}">
            <div class="prayer-info">
              <div class="prayer-icon-wrap">${p.icon}</div>
              <div>
                <div class="prayer-name">${p.name}</div>
                <div class="prayer-badge">${badge}</div>
              </div>
            </div>
            <div class="prayer-time">${p.time || '--:--'}</div>
          </div>`;
        }).join('')}
      </div>

      <!-- DİYANET GÜNÜN AYETİ KARTI -->
      ${(() => {
        const todayDayIndex = (new Date().getDate() % DAILY_CONTENT.length);
        const daily = DAILY_CONTENT[todayDayIndex] || DAILY_CONTENT[0];
        return `
          <div class="diyanet-card">
            <div class="diyanet-card-header">
              <div class="diyanet-card-tag">
                <span>📖</span> Günün Ayet-i Kerimesi
              </div>
              <div class="diyanet-card-source">${daily.verse.source}</div>
            </div>
            <div class="diyanet-arabic-text">${daily.verse.arabic}</div>
            <div class="diyanet-meaning-text">"${daily.verse.turkish}"</div>
          </div>

          <!-- DİYANET GÜNÜN HADİS-İ ŞERİFİ KARTI -->
          <div class="diyanet-card">
            <div class="diyanet-card-header">
              <div class="diyanet-card-tag">
                <span>🌹</span> Günün Hadis-i Şerifi
              </div>
              <div class="diyanet-card-source">${daily.hadith.source}</div>
            </div>
            <div class="diyanet-meaning-text">"${daily.hadith.text}"</div>
          </div>

          <!-- DİYANET GÜNÜN DUASI KARTI -->
          <div class="diyanet-card" style="margin-bottom: 12px;">
            <div class="diyanet-card-header">
              <div class="diyanet-card-tag">
                <span>🤲</span> Günün Duası
              </div>
              <div class="diyanet-card-source">${daily.prayer.source}</div>
            </div>
            <div class="diyanet-meaning-text">"${daily.prayer.text}"</div>
          </div>
        `;
      })()}
    ` : state.homeSubView === 'imsakiye' ? renderImsakiyeView() : renderZikirmatikView()}

    <!-- Kompakt Alt İpucu & İsim -->
    <div style="margin: 10px 14px 2px; display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; color: var(--text-dim); padding: 4px 8px;">
      <span>💡 Diyanet İşleri Başkanlığı Vakit Usulü</span>
      <span style="color: var(--gold-light); font-weight: 600;">Nihat Yazgan</span>
    </div>
  `;
}

function renderImsakiyeView() {
  const city = state.currentCity;
  const list = state.monthlyTimes && state.monthlyTimes.length > 0 
    ? state.monthlyTimes 
    : generateMonthlyPrayerTimes(city.latitude, city.longitude);
  const todayStr = new Date().toISOString().split('T')[0];

  return `
    <div class="imsakiye-table-wrap">
      <div style="padding: 12px 14px 8px; display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--border-color);">
        <div>
          <div style="font-size:0.95rem; font-weight:700; color:#fff;">📅 ${city.name} Aylık İmsakiye</div>
          <div style="font-size:0.72rem; color:var(--gold-light);">Diyanet Takvimine Uygun 30 Günlük Vakitler</div>
        </div>
        <button class="city-selector-btn" id="btn-close-imsakiye" style="font-size:0.72rem; padding:4px 8px;">
          ← Vakitlere Dön
        </button>
      </div>

      <table class="imsakiye-table">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>İmsak</th>
            <th>Güneş</th>
            <th>Öğle</th>
            <th>İkindi</th>
            <th>Akşam</th>
            <th>Yatsı</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(day => {
            const isToday = day.date === todayStr;
            const dObj = new Date(day.date);
            const dateFmt = dObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
            const dayName = dObj.toLocaleDateString('tr-TR', { weekday: 'short' });
            return `
              <tr class="${isToday ? 'today-row' : ''}">
                <td>${dateFmt} ${dayName}${isToday ? ' ★' : ''}</td>
                <td>${day.times.fajr}</td>
                <td>${day.times.sunrise}</td>
                <td>${day.times.dhuhr}</td>
                <td>${day.times.asr}</td>
                <td>${day.times.maghrib}</td>
                <td>${day.times.isha}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderZikirmatikView() {
  const activeDhikr = DHIKR_LIST[state.dhikrIndex] || DHIKR_LIST[0];
  const target = activeDhikr.target || 33;
  const count = state.dhikrCount || 0;
  const progressPercent = Math.min(100, Math.round((count % target) / target * 100));

  return `
    <div class="dhikr-counter-container">
      <div style="width:100%; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div style="font-size:1.1rem; font-weight:700; color:#fff;">📿 Diyanet Zikirmatik</div>
        <button class="city-selector-btn" id="btn-close-dhikr" style="font-size:0.75rem; padding:4px 8px;">
          ← Vakitlere Dön
        </button>
      </div>

      <!-- Zikir Seçici Dropdown / Çipler -->
      <div style="display:flex; gap:6px; overflow-x:auto; width:100%; padding-bottom:8px; margin-bottom:10px; scrollbar-width:none;">
        ${DHIKR_LIST.map((d, idx) => `
          <button class="city-selector-btn dhikr-select-btn ${state.dhikrIndex === idx ? 'selected' : ''}" data-idx="${idx}" style="font-size:0.75rem; padding:6px 12px; white-space:nowrap; flex-shrink:0; ${state.dhikrIndex === idx ? 'border-color:var(--gold-primary); background:rgba(212,175,55,0.2); color:var(--gold-light); font-weight:700;' : ''}">
            ${d.title}
          </button>
        `).join('')}
      </div>

      <!-- Seçili Zikir Kartı -->
      <div style="text-align:center; margin-bottom:10px; background:var(--bg-card); padding:12px 16px; border-radius:var(--radius-md); border:1px solid var(--border-color); width:100%;">
        <div style="font-size:1.1rem; font-weight:700; color:var(--gold-light);">${activeDhikr.title}</div>
        <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">"${activeDhikr.meaning}"</div>
      </div>

      <!-- Büyük İnteraktif Zikir Butonu -->
      <div class="dhikr-ring-wrapper">
        <div class="dhikr-count-circle" id="dhikr-tap-circle">
          <div class="dhikr-count-number" id="dhikr-count-number">${count}</div>
          <div class="dhikr-count-target">Hedef: ${target} (${progressPercent}%)</div>
        </div>
      </div>

      <!-- Alt Butonlar (Sıfırla / Titreşim) -->
      <div style="display:flex; gap:10px; width:100%; max-width:320px; margin-top:10px;">
        <button class="city-selector-btn" id="dhikr-reset-btn" style="flex:1; justify-content:center; padding:10px; border-color:#ef4444; color:#ef4444;">
          🔄 Sıfırla
        </button>
        <button class="city-selector-btn" id="dhikr-add-btn" style="flex:2; justify-content:center; padding:10px; background:var(--gold-primary); color:#0b1320; font-weight:700;">
          ➕ Çek (Zikret)
        </button>
      </div>
    </div>
  `;
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

function generateSvgCompassTicks() {
  let ticks = '';
  for (let i = 0; i < 360; i += 5) {
    const rad = (i - 90) * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const cx = 150;
    const cy = 150;
    const rOuter = 142;

    if (i === 0) {
      // N pozisyonu çentiği (Kırmızı vurgulu)
      const rInner = 120;
      const x1 = (cx + rInner * cos).toFixed(1);
      const y1 = (cy + rInner * sin).toFixed(1);
      const x2 = (cx + rOuter * cos).toFixed(1);
      const y2 = (cy + rOuter * sin).toFixed(1);
      ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round" />`;
    } else if (i === 90 || i === 180 || i === 270) {
      // E, S, W için altın sarısı vurgu çizgileri
      const rInner = 122;
      const x1 = (cx + rInner * cos).toFixed(1);
      const y1 = (cy + rInner * sin).toFixed(1);
      const x2 = (cx + rOuter * cos).toFixed(1);
      const y2 = (cy + rOuter * sin).toFixed(1);
      ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d4af37" stroke-width="2.8" stroke-linecap="round" />`;
    } else if (i % 30 === 0) {
      // 30 derecelik ana çentikler
      const rInner = 125;
      const x1 = (cx + rInner * cos).toFixed(1);
      const y1 = (cy + rInner * sin).toFixed(1);
      const x2 = (cx + rOuter * cos).toFixed(1);
      const y2 = (cy + rOuter * sin).toFixed(1);
      ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f1f5f9" stroke-width="2" stroke-linecap="round" />`;
    } else if (i % 10 === 0) {
      // 10 derecelik orta çentikler
      const rInner = 130;
      const x1 = (cx + rInner * cos).toFixed(1);
      const y1 = (cy + rInner * sin).toFixed(1);
      const x2 = (cx + rOuter * cos).toFixed(1);
      const y2 = (cy + rOuter * sin).toFixed(1);
      ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="1.3" />`;
    } else {
      // 5 derecelik ince çentikler
      const rInner = 134;
      const x1 = (cx + rInner * cos).toFixed(1);
      const y1 = (cy + rInner * sin).toFixed(1);
      const x2 = (cx + rOuter * cos).toFixed(1);
      const y2 = (cy + rOuter * sin).toFixed(1);
      ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#475569" stroke-width="0.9" />`;
    }
  }
  return ticks;
}

/**
 * 2. GELİŞMİŞ KIBLE PUSULASI SEKMESİ (Birebir Tasarım: Pusula / Harita)
 */
function renderQiblaTab() {
  return `
    <div class="qibla-tab-wrapper">
      <!-- Üst Koyu Başlık Çubuğu -->
      <div class="qibla-header-bar">
        <div class="qibla-header-nav">
          <button class="qibla-back-btn" id="qibla-back-to-home" title="Vakitlere Dön">
            ←
          </button>
          <div class="qibla-header-title">Kıble Pusulası</div>
        </div>
      </div>

      <!-- Sekme Değiştirici (Pusula | Harita) -->
      <div class="qibla-segmented-wrap">
        <div class="qibla-segmented-control">
          <button class="qibla-seg-btn ${state.qiblaSubTab === 'compass' ? 'active' : ''}" id="qibla-tab-compass-btn">
            <span>🧭</span>
            <span>Pusula</span>
          </button>
          <button class="qibla-seg-btn ${state.qiblaSubTab === 'map' ? 'active' : ''}" id="qibla-tab-map-btn">
            <span>🗺</span>
            <span>Harita</span>
          </button>
        </div>
      </div>

      <!-- Sekme İçeriği -->
      ${state.qiblaSubTab === 'compass' ? renderQiblaCompassView() : renderQiblaMapView()}
    </div>
  `;
}

function renderQiblaCompassView() {
  const angle = state.qiblaAngle || 152;
  const heading = state.deviceHeading || 0;
  const relAngle = (angle - heading + 360) % 360;
  const diffAngle = relAngle > 180 ? 360 - relAngle : relAngle;
  const isAligned = diffAngle < 5;

  return `
    <div class="qibla-compass-body">
      <!-- Kıble Açı Rozeti (Üst Hap Kutu) -->
      <div class="qibla-status-badge ${isAligned ? 'aligned' : ''}" id="qibla-status-badge">
        <div class="qibla-badge-icon-wrap">
          <span style="font-size: 1.35rem;">🕋</span>
        </div>
        <div class="qibla-badge-content">
          <span class="qibla-badge-title">Kıble Sapması</span>
          <span class="qibla-badge-degree" id="qibla-degree-val">${isAligned ? 'KIBLEDE' : diffAngle.toFixed(1) + '°'}</span>
        </div>
      </div>

      <!-- Lüks 3D Pusula Kadranı -->
      <div class="qibla-dial-card ${isAligned ? 'aligned' : ''}" id="qibla-dial-card">
        <!-- Üst Sabit Telefon Yön İbresi (Altın Ok) -->
        <div class="qibla-fixed-top-marker">
          <div class="qibla-fixed-arrow"></div>
        </div>

        <!-- Dönen Pusula Çarkı (Kadran) -->
        <div class="qibla-rotating-disk" id="qibla-rotating-disk" style="transform: rotate(${-heading}deg);">
          <!-- SVG Kadran Çizgileri ve Eksenler -->
          <svg class="qibla-axis-svg" viewBox="0 0 300 300">
            <!-- 360 Derece Çentikleri -->
            ${generateSvgCompassTicks()}
            
            <!-- Yatay ve Dikey Kılavuz Eksenleri -->
            <line x1="30" y1="150" x2="270" y2="150" stroke="rgba(212,175,55,0.25)" stroke-width="1.2" stroke-dasharray="3 3" />
            <line x1="150" y1="30" x2="150" y2="270" stroke="rgba(212,175,55,0.25)" stroke-width="1.2" stroke-dasharray="3 3" />
            <circle cx="150" cy="150" r="116" fill="none" stroke="rgba(212,175,55,0.15)" stroke-width="1" />
            <circle cx="150" cy="150" r="70" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
          </svg>

          <!-- Klasik Kuzey/Güney Manyetik İbre -->
          <div class="qibla-needle-north"></div>
          <div class="qibla-needle-south"></div>

          <!-- Yön Harfleri -->
          <div class="qibla-dir-text N">N</div>
          <div class="qibla-dir-text E">E</div>
          <div class="qibla-dir-text S">S</div>
          <div class="qibla-dir-text W">W</div>

          <!-- Kâbe Hedef İbresi (Kuzeyden qiblaAngle kadar dönük) -->
          <div class="qibla-needle-kaaba" style="transform: rotate(${angle}deg);">
            <div class="qibla-kaaba-pin-wrap">
              <div class="qibla-kaaba-icon-bubble">🕋</div>
              <div class="qibla-kaaba-beam-line"></div>
            </div>
          </div>

          <!-- Altın Merkez Göbeği -->
          <div class="qibla-center-gold-hub"></div>
        </div>
      </div>

      <!-- Alt Bilgilendirme Kartı -->
      <div class="qibla-info-footer-card">
        <div class="qibla-info-icon">i</div>
        <div class="qibla-info-text" id="qibla-info-instruction">
          ${isAligned ? '✨ Mükemmel! Tam Kıble yönündesiniz.' : `Kâbe ikonunu 🕋 üstteki sarı oka hizalayın (Kıble: ${angle}°)`}
        </div>
      </div>

      <!-- Hassas Test ve Sensör Kontrol Paneli -->
      <div class="qibla-tools-panel">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:var(--text-muted);margin-bottom:6px;">
          <span>Canlı Pusula Simülatörü:</span>
          <span style="font-weight:700;color:var(--gold-light);" id="qibla-test-heading-text">${heading}° (Kıble Hedefi: ${angle}°)</span>
        </div>
        <input type="range" id="qibla-slider-control" min="0" max="360" value="${heading}" style="width:100%;accent-color:var(--gold-primary);" />
        
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="city-selector-btn" id="qibla-sensor-toggle-btn" style="flex:1;padding:6px 8px;font-size:0.75rem;justify-content:center;">
            📡 Kalibre Et
          </button>
          <button class="city-selector-btn" id="qibla-auto-align-btn" style="flex:1;padding:6px 8px;font-size:0.75rem;justify-content:center;border-color:var(--emerald-accent);color:var(--emerald-accent);">
            🎯 Hizala
          </button>
          <button class="city-selector-btn" id="qibla-vibration-toggle-btn" style="flex:1;padding:6px 8px;font-size:0.75rem;justify-content:center;${state.qiblaVibrationEnabled ? 'border-color:var(--gold-primary);color:var(--gold-light);background:rgba(212,175,55,0.15);' : 'color:var(--text-dim);'}">
            📳 Titreşim: ${state.qiblaVibrationEnabled ? 'Açık' : 'Kapalı'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderQiblaMapView() {
  const city = state.currentCity;
  const qiblaAngle = state.qiblaAngle || 152;
  const kaabaLat = 21.4225;
  const kaabaLng = 39.8262;
  const distanceKm = calculateDistanceKm(city.latitude, city.longitude, kaabaLat, kaabaLng);

  return `
    <div class="qibla-map-container-view">
      <div id="qibla-leaflet-map" class="qibla-map-box"></div>
      
      <div class="qibla-map-details-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;">
          <span style="font-size:0.85rem;color:#64748b;">Konumunuz:</span>
          <strong style="color:#1e293b;font-size:0.95rem;">📍 ${city.name}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;">
          <span style="font-size:0.85rem;color:#64748b;">Hedef:</span>
          <strong style="color:#1e293b;font-size:0.95rem;">🕋 Kâbe-i Muazzama (Mekke)</strong>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;">
          <span style="font-size:0.85rem;color:#64748b;">Kıble Açısı:</span>
          <strong style="color:#dc2626;font-size:1.05rem;">${qiblaAngle}°</strong>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:0.85rem;color:#64748b;">Kâbe'ye Kuş Uçuşu Mesafe:</span>
          <strong style="color:#059669;font-size:1.05rem;">~${distanceKm.toLocaleString('tr-TR')} km</strong>
        </div>
      </div>
    </div>
  `;
}

/**
 * 3. DİNİ GÜNLER SEKMESİ
 */
function formatTurkishDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch(e) {
    return dateStr || '';
  }
}

function renderCalendarTab() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = RELIGIOUS_DAYS.filter(d => new Date(d.date2026) >= today);
  const past     = RELIGIOUS_DAYS.filter(d => new Date(d.date2026) < today);
  const sorted   = [...upcoming, ...past];

  return `
    <div style="padding-top: 10px;">
      <div style="padding: 10px 16px 12px; display: flex; justify-content: space-between; align-items: center;">
        <h2 style="font-size: 1.15rem; color:#fff;">🌙 Dini Günler ve Geceler</h2>
        <span style="font-size: 0.72rem; color: var(--gold-light); background: rgba(212,175,55,0.15); padding: 3px 8px; border-radius: 8px;">${upcoming.length} Yaklaşan</span>
      </div>
      <div style="display: flex; flex-direction: column;">
        ${sorted.map(day => {
          const isPast = new Date(day.date2026) < today;
          return `
          <div class="religious-card ${day.type}" style="${isPast ? 'opacity:0.55;' : ''}">
            <div class="rel-header">
              <span class="rel-name">${day.name}</span>
              <span class="rel-date">${formatTurkishDate(day.date2026)}</span>
            </div>
            <div class="rel-hijri">${day.hijriDate}</div>
            <div class="rel-desc">${day.description || ''}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * 4. BİLDİRİMLER & DOSYADAN SES YÜKLEME MERKEZİ
 */
function renderNotificationsTab() {
  const prayerNames = [
    { key: 'fajr',    icon: '🌙', name: 'İmsak' },
    { key: 'sunrise', icon: '🌅', name: 'Güneş' },
    { key: 'dhuhr',   icon: '☀️', name: 'Öğle' },
    { key: 'asr',     icon: '🌤️', name: 'İkindi' },
    { key: 'maghrib', icon: '🌇', name: 'Akşam' },
    { key: 'isha',    icon: '🌌', name: 'Yatsı' }
  ];

  return `
    <div style="padding: 12px 16px 30px;">
      <div style="margin-bottom: 12px;">
        <h2 style="font-size: 1.2rem; color: #fff;">🔔 Bildirim & Ezan Ayarları</h2>
        <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">Her vakit için telefonunuzdan özel ses veya makam ezanı belirleyebilirsiniz.</p>
      </div>

      <!-- Genel Bildirim Aç/Kapat -->
      <div style="background: var(--bg-card); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div>
          <div style="font-size: 0.92rem; font-weight: 700; color: #fff;">Genel Bildirimler</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Tüm vakit ses ve uyarılarını aç / kapat</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="global-notif-switch" ${state.notificationEnabled ? 'checked' : ''} />
          <span class="slider"></span>
        </label>
      </div>

      <!-- Genel Telefondan Ses / MP3 Çekme & Yükleme Bölümü -->
      <div style="background: linear-gradient(135deg, rgba(212,175,55,0.12) 0%, var(--bg-card) 100%); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-glow); margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span style="font-size: 1.4rem;">🎵</span>
          <div>
            <div style="font-size: 0.92rem; font-weight: 700; color: var(--gold-light);">Genel Özel Ses / Ezan Dosyası</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">Tüm vakitler için varsayılan MP3/ses dosyası</div>
          </div>
        </div>

        <div style="display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap;">
          <button class="city-selector-btn" id="btn-upload-audio" style="flex: 1; justify-content: center; background: var(--gold-primary); color: #0b1320; font-weight: 700; font-size: 0.8rem; padding: 8px;">
            📁 Dosyadan Seç & Yükle
          </button>
          ${state.customAudioMap['default_custom'] ? `
            <button class="city-selector-btn" id="btn-play-custom-audio" style="justify-content: center; font-size: 0.8rem; padding: 8px 12px; border-color: var(--emerald-accent); color: var(--emerald-accent);">
              ▶️ Dinle
            </button>
            <button class="city-selector-btn" id="btn-delete-custom-audio" style="justify-content: center; font-size: 0.8rem; padding: 8px 12px; border-color: #ef4444; color: #ef4444;">
              🗑️ Sil
            </button>
          ` : ''}
        </div>

        ${state.customAudioMap['default_custom'] ? `
          <div style="margin-top: 8px; font-size: 0.78rem; color: var(--emerald-accent); background: rgba(16,185,129,0.1); padding: 5px 8px; border-radius: 6px; display: flex; align-items: center; gap: 6px;">
            <span>✓</span> Yüklü: <strong>${state.customAudioMap['default_custom']}</strong>
          </div>
        ` : `
          <div style="margin-top: 6px; font-size: 0.72rem; color: var(--text-dim);">Dahili makam ezanı aktif. İsterseniz telefonunuzdan ezan yükleyebilirsiniz.</div>
        `}
      </div>

      <!-- Vakit Başına Ses ve Bildirim Ayarları -->
      <h3 style="font-size: 0.95rem; color: var(--gold-light); margin-bottom: 10px;">🕌 Vakit Bazlı Ayarlar & Dosya Yükleme</h3>
      
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${prayerNames.map(p => {
          const s = state.prayerAlertSettings[p.key] || { enabled: true, sound: 'ezan', preAlert: 15 };
          const prayerCustom = state.customAudioMap[`audio_${p.key}`];
          return `
          <div style="background: var(--bg-card); padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.15rem;">${p.icon}</span>
                <span style="font-weight: 700; color: #fff; font-size: 0.92rem;">${p.name}</span>
                ${prayerCustom ? `<span style="font-size:0.65rem; background:rgba(16,185,129,0.2); color:var(--emerald-accent); padding:2px 6px; border-radius:6px;">🎵 Özel Ses Yüklü</span>` : ''}
              </div>
              <label class="switch">
                <input type="checkbox" class="tab-prayer-switch" data-key="${p.key}" ${s.enabled ? 'checked' : ''} />
                <span class="slider"></span>
              </label>
            </div>

            <!-- 6 Bağımsız Ses Seçeneği (Makam Ezanı, Ney, Kısa Ton, Çan/Doğa, Bip, Özel Ses) -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-bottom: 8px;">
              <button class="city-selector-btn tab-sound-btn ${s.sound === 'ezan' ? 'selected' : ''}" data-key="${p.key}" data-sound="ezan" style="justify-content: center; font-size: 0.72rem; padding: 6px 3px; ${s.sound === 'ezan' ? 'border-color: var(--gold-primary); background: rgba(212,175,55,0.2); font-weight:700;' : ''}">
                🕌 Ezan
              </button>
              <button class="city-selector-btn tab-sound-btn ${s.sound === 'ney' ? 'selected' : ''}" data-key="${p.key}" data-sound="ney" style="justify-content: center; font-size: 0.72rem; padding: 6px 3px; ${s.sound === 'ney' ? 'border-color: var(--gold-primary); background: rgba(212,175,55,0.2); font-weight:700;' : ''}">
                🌿 Ney
              </button>
              <button class="city-selector-btn tab-sound-btn ${s.sound === 'kisa' ? 'selected' : ''}" data-key="${p.key}" data-sound="kisa" style="justify-content: center; font-size: 0.72rem; padding: 6px 3px; ${s.sound === 'kisa' ? 'border-color: var(--gold-primary); background: rgba(212,175,55,0.2); font-weight:700;' : ''}">
                🔔 Melodik
              </button>
              <button class="city-selector-btn tab-sound-btn ${s.sound === 'nature' ? 'selected' : ''}" data-key="${p.key}" data-sound="nature" style="justify-content: center; font-size: 0.72rem; padding: 6px 3px; ${s.sound === 'nature' ? 'border-color: var(--gold-primary); background: rgba(212,175,55,0.2); font-weight:700;' : ''}">
                ✨ Çan
              </button>
              <button class="city-selector-btn tab-sound-btn ${s.sound === 'beep' ? 'selected' : ''}" data-key="${p.key}" data-sound="beep" style="justify-content: center; font-size: 0.72rem; padding: 6px 3px; ${s.sound === 'beep' ? 'border-color: var(--gold-primary); background: rgba(212,175,55,0.2); font-weight:700;' : ''}">
                ⏱️ Bip
              </button>
              <button class="city-selector-btn tab-sound-btn ${s.sound === 'custom' ? 'selected' : ''}" data-key="${p.key}" data-sound="custom" style="justify-content: center; font-size: 0.72rem; padding: 6px 3px; ${s.sound === 'custom' ? 'border-color: var(--gold-primary); background: rgba(212,175,55,0.2); font-weight:700;' : ''}">
                🎵 MP3
              </button>
            </div>

            <!-- Dosyadan Seç & Test Et Butonları -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.05);">
              <button class="city-selector-btn tab-upload-prayer-btn" data-key="${p.key}" style="font-size: 0.72rem; padding: 4px 8px; border-color: var(--gold-primary); color: var(--gold-light);">
                📁 Dosyadan Seç
              </button>
              <button class="city-selector-btn tab-test-sound-btn" data-key="${p.key}" data-name="${p.name}" style="font-size: 0.72rem; padding: 4px 10px;">
                ▶️ Sesi Test Et
              </button>
            </div>
          </div>
          `;
        }).join('')}
      </div>

      <!-- Geliştirici İmzası -->
      <div style="text-align: center; margin: 20px auto 6px; padding: 10px; background: rgba(255, 255, 255, 0.02); border-radius: 12px; border: 1px solid var(--border-color);">
        <div style="font-size: 0.68rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px;">Geliştirici</div>
        <div style="font-size: 0.9rem; font-weight: 600; color: var(--gold-light); margin-top: 2px;">Nihat Yazgan</div>
      </div>
    </div>
  `;
}

/**
 * 3. CANLI İSLAMİ RADYOLAR SEKMESİ (Canlı Yayın, Dinle/Test Et, Durdur)
 */
function renderRadioTab() {
  const currentRadio = radioService.activeRadio;
  const isPlaying = radioService.isPlaying;
  const isLoading = radioService.isLoading;
  const query = (state.radioSearchQuery || '').toLowerCase().trim();
  const selectedCat = state.radioCategory || 'all';

  // Kategoriler - Tüm Radyo Çeşitleri
  const categories = [
    { id: 'all', name: 'Tümü (' + ISLAMIC_RADIOS.length + ')' },
    { id: 'Diyanet & İlim', name: '🕌 Diyanet & İlim' },
    { id: 'Kur\'an & Kâriler', name: '📖 Kur\'an & Kâriler' },
    { id: 'Tasavvuf & Sohbet', name: '🌿 Tasavvuf & Sohbet' },
    { id: 'Kültür & Sanat', name: '🎶 Kültür & Sanat Musikisi' },
    { id: 'Haber & Gündem', name: '📰 Haber & Gündem' },
    { id: 'Çocuk & Aile', name: '🎈 Çocuk & Aile' }
  ];

  // Filtreleme
  const filteredRadios = ISLAMIC_RADIOS.filter(r => {
    const matchCat = selectedCat === 'all' || r.category === selectedCat;
    const matchQuery = !query || r.name.toLowerCase().includes(query) || r.desc.toLowerCase().includes(query) || r.sub.toLowerCase().includes(query) || r.category.toLowerCase().includes(query);
    return matchCat && matchQuery;
  });

  return `
    <div class="radio-container">
      <!-- Üst Bilgi Kartı -->
      <div class="radio-header-card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.8rem;filter:drop-shadow(0 0 10px rgba(212,175,55,0.6));">📻</span>
            <div>
              <h2 style="font-size:1.15rem;margin:0;color:#fff;font-weight:700;">Canlı Radyolar</h2>
              <div style="font-size:0.75rem;color:var(--gold-light);margin-top:2px;">Diyanet, Kâriler, Tasavvuf, Türk Musikisi, Haber & Çocuk</div>
            </div>
          </div>
          <span style="font-size:0.72rem;background:rgba(212,175,55,0.18);color:var(--gold-light);padding:3px 8px;border-radius:10px;border:1px solid rgba(212,175,55,0.3);font-weight:600;">
            ${ISLAMIC_RADIOS.length} Canlı İstasyon
          </span>
        </div>
      </div>

      <!-- Çalan Radyo Barı (Eğer bir radyo çalıyorsa veya yükleniyorsa) -->
      ${currentRadio ? `
        <div class="active-radio-bar">
          <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
            <div style="font-size:1.6rem;animation:pulse 2s infinite;">${currentRadio.icon}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:6px;">
                <div style="font-size:0.95rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${currentRadio.name}
                </div>
                ${isPlaying ? `
                  <div class="sound-wave">
                    <div class="sound-wave-bar"></div>
                    <div class="sound-wave-bar"></div>
                    <div class="sound-wave-bar"></div>
                    <div class="sound-wave-bar"></div>
                  </div>
                ` : ''}
              </div>
              <div style="font-size:0.72rem;color:var(--emerald-accent);display:flex;align-items:center;gap:4px;margin-top:2px;">
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--emerald-accent);box-shadow:0 0 8px var(--emerald-accent);"></span>
                ${isLoading ? '⏳ Canlı yayına bağlanılıyor...' : '● Canlı Yayında'}
              </div>
            </div>
          </div>

          <button class="city-selector-btn radio-stop-btn" id="btn-stop-active-radio" style="padding:6px 14px;font-size:0.82rem;gap:4px;">
            ⏹️ Durdur
          </button>
        </div>
      ` : ''}

      <!-- Kategori Filtre Butonları -->
      <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;margin-bottom:8px;scrollbar-width:none;">
        ${categories.map(cat => `
          <button class="city-selector-btn radio-cat-chip ${selectedCat === cat.id ? 'selected' : ''}" data-cat="${cat.id}" style="font-size:0.75rem;padding:5px 10px;white-space:nowrap;flex-shrink:0;${selectedCat === cat.id ? 'border-color:var(--gold-primary);background:rgba(212,175,55,0.2);color:var(--gold-light);font-weight:700;' : ''}">
            ${cat.name}
          </button>
        `).join('')}
      </div>

      <!-- Radyo Arama Kutusu -->
      <div style="margin-bottom:10px;">
        <input type="text" class="search-input" id="radio-search-input" value="${state.radioSearchQuery || ''}" placeholder="🔍 Radyo veya yayın ara (Örn: Diyanet, Vav, Kur'an)..." style="margin-bottom:0;" />
      </div>

      <!-- Radyo İstasyonları Listesi -->
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${filteredRadios.length === 0 ? `
          <div style="text-align:center;padding:30px;color:var(--text-muted);background:var(--bg-card);border-radius:var(--radius-md);border:1px solid var(--border-color);">
            <div style="font-size:1.8rem;margin-bottom:6px;">🔍</div>
            <div>Aramanıza uygun radyo kanalı bulunamadı.</div>
          </div>
        ` : filteredRadios.map(radio => {
          const isThisPlaying = currentRadio && currentRadio.id === radio.id && isPlaying;
          const isThisLoading = currentRadio && currentRadio.id === radio.id && isLoading;

          return `
            <div class="radio-card ${isThisPlaying ? 'playing' : ''}">
              <div style="display:flex;align-items:flex-start;gap:10px;flex:1;min-width:0;">
                <div style="font-size:1.6rem;background:rgba(255,255,255,0.04);padding:8px;border-radius:12px;border:1px solid var(--border-color);flex-shrink:0;">
                  ${radio.icon}
                </div>
                <div style="flex:1;min-width:0;">
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <span style="font-size:0.95rem;font-weight:700;color:#fff;">${radio.name}</span>
                    <span class="radio-tag">${radio.category}</span>
                  </div>
                  <div style="font-size:0.75rem;color:var(--gold-light);margin-top:1px;font-weight:500;">${radio.sub}</div>
                  <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;line-height:1.35;">${radio.desc}</div>
                </div>
              </div>

              <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;margin-left:6px;">
                ${isThisPlaying ? `
                  <button class="city-selector-btn radio-stop-btn btn-stop-radio" data-radio-id="${radio.id}" style="padding:6px 12px;font-size:0.78rem;">
                    ⏹️ Durdur
                  </button>
                  <div style="display:flex;align-items:center;justify-content:center;gap:3px;font-size:0.68rem;color:var(--emerald-accent);font-weight:600;">
                    <span style="width:5px;height:5px;border-radius:50%;background:var(--emerald-accent);"></span>
                    Çalıyor
                  </div>
                ` : isThisLoading ? `
                  <button class="city-selector-btn" style="padding:6px 12px;font-size:0.78rem;border-color:var(--gold-primary);color:var(--gold-light);" disabled>
                    ⏳ Bağlanıyor
                  </button>
                ` : `
                  <button class="city-selector-btn radio-play-btn btn-play-radio" data-radio-id="${radio.id}" style="padding:6px 12px;font-size:0.78rem;">
                    ▶️ Dinle
                  </button>
                  <button class="city-selector-btn radio-stop-btn btn-stop-radio" data-radio-id="${radio.id}" style="padding:4px 8px;font-size:0.7rem;opacity:0.85;">
                    ⏹️ Durdur
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Geliştirici İmzası -->
      <div style="text-align: center; margin: 18px auto 6px; padding: 10px; background: rgba(255, 255, 255, 0.02); border-radius: 12px; border: 1px solid var(--border-color);">
        <div style="font-size: 0.68rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px;">Geliştirici</div>
        <div style="font-size: 0.9rem; font-weight: 600; color: var(--gold-light); margin-top: 2px;">Nihat Yazgan</div>
      </div>
    </div>
  `;
}

/**
 * Şehir & İlçe Listesi (Tüm 81 İl ve 1000+ İlçe Desteği)
 */
function renderCityList(filter = '') {
  const query = filter.toLowerCase().trim();
  const filtered = CITIES.filter(c => {
    if (!query) return true;
    const nameMatch = c.name.toLowerCase().includes(query);
    const cityMatch = c.cityName && c.cityName.toLowerCase().includes(query);
    const distMatch = c.districtName && c.districtName.toLowerCase().includes(query);
    const plateMatch = c.plate && c.plate.includes(query);
    return nameMatch || cityMatch || distMatch || plateMatch;
  });

  // Performans için arama boşken ilk 100 il/ilçe, arama doluyken tüm eşleşmeler (max 200)
  const displayList = query ? filtered.slice(0, 200) : filtered.slice(0, 100);

  if (displayList.length === 0) {
    return `
      <div style="text-align:center;padding:24px;color:var(--text-muted);">
        <div>🔍</div>
        <div style="margin-top:6px;font-size:0.9rem;">"${filter}" ile eşleşen il veya ilçe bulunamadı.</div>
      </div>
    `;
  }

  return displayList.map(c => `
    <div class="city-item ${c.id === state.currentCity.id ? 'selected' : ''}" data-city-id="${c.id}">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 0.75rem; font-weight: 700; background: rgba(212,175,55,0.18); color: var(--gold-light); padding: 2px 7px; border-radius: 6px; border: 1px solid rgba(212,175,55,0.3); min-width: 26px; text-align: center;">${c.plate || '•'}</span>
        <div>
          <span style="font-size: 0.92rem; font-weight: 600; color:#fff;">${c.name}</span>
          ${c.districtName && c.districtName !== 'Merkez' ? `<span style="font-size:0.72rem;color:var(--gold-light);margin-left:4px;opacity:0.85;">(${c.districtName})</span>` : ''}
        </div>
      </div>
      <span style="font-size: 0.75rem; color: var(--text-dim);">${c.country}</span>
    </div>
  `).join('');
}

/**
 * Vakit Tıklanınca Açılan Hızlı Ayar Modalı (Dosyadan Seç & Yükle ile)
 */
function renderPrayerSettingModalContent() {
  if (!state.selectedPrayerForSetting) return '';

  const { key, name, time } = state.selectedPrayerForSetting;
  const setting = state.prayerAlertSettings[key] || { enabled: true, sound: 'ezan', preAlert: 15 };
  const specificAudio = state.customAudioMap[`audio_${key}`] || state.customAudioMap['default_custom'];

  return `
    <div class="modal-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 1.4rem;">⚙️</span>
        <div>
          <h3 style="margin: 0; font-size: 1.1rem; color: #fff;">${name} Vakti Ayarları</h3>
          <span style="font-size: 0.78rem; color: var(--gold-light);">Bugünkü Vakit: ${time}</span>
        </div>
      </div>
      <button class="icon-btn" id="close-prayer-modal">✕</button>
    </div>

    <!-- Bildirim Aç/Kapat -->
    <div class="setting-option-card">
      <div class="setting-row">
        <div>
          <div class="setting-label">Vakit Bildirimi</div>
          <div class="setting-sublabel">${name} vaktinde sesli ve görsel bildirim gönder</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="prayer-enable-switch" ${setting.enabled ? 'checked' : ''} />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <!-- Ses Tipi Seçimi (Makam Ezanı, Ney Melodisi, Kısa Ton, Doğa/Çan, Bip, Özel Ses) -->
    <div class="setting-option-card">
      <div class="setting-label">Uyarı Sesi & Ezan Seçimi</div>
      <div class="setting-sublabel">Her vakit için dilediğiniz sesi bağımsız belirleyin</div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 8px;">
        <button class="city-selector-btn modal-sound-btn ${setting.sound === 'ezan' ? 'selected' : ''}" data-sound="ezan" style="justify-content: center; font-size: 0.76rem; padding: 7px 4px; ${setting.sound === 'ezan' ? 'border-color: var(--gold-primary); background: rgba(212,175,55,0.2); font-weight:700;' : ''}">
          🕌 Makam Ezan
        </button>
        <button class="city-selector-btn modal-sound-btn ${setting.sound === 'ney' ? 'selected' : ''}" data-sound="ney" style="justify-content: center; font-size: 0.76rem; padding: 7px 4px; ${setting.sound === 'ney' ? 'border-color: var(--gold-primary); background: rgba(212,175,55,0.2); font-weight:700;' : ''}">
          🌿 Ney Dinletisi
        </button>
        <button class="city-selector-btn modal-sound-btn ${setting.sound === 'kisa' ? 'selected' : ''}" data-sound="kisa" style="justify-content: center; font-size: 0.76rem; padding: 7px 4px; ${setting.sound === 'kisa' ? 'border-color: var(--gold-primary); background: rgba(212,175,55,0.2); font-weight:700;' : ''}">
          🔔 Melodik Ton
        </button>
        <button class="city-selector-btn modal-sound-btn ${setting.sound === 'nature' ? 'selected' : ''}" data-sound="nature" style="justify-content: center; font-size: 0.76rem; padding: 7px 4px; ${setting.sound === 'nature' ? 'border-color: var(--gold-primary); background: rgba(212,175,55,0.2); font-weight:700;' : ''}">
          ✨ Çan & Doğa
        </button>
        <button class="city-selector-btn modal-sound-btn ${setting.sound === 'beep' ? 'selected' : ''}" data-sound="beep" style="justify-content: center; font-size: 0.76rem; padding: 7px 4px; ${setting.sound === 'beep' ? 'border-color: var(--gold-primary); background: rgba(212,175,55,0.2); font-weight:700;' : ''}">
          ⏱️ Kısa Bip
        </button>
        <button class="city-selector-btn modal-sound-btn ${setting.sound === 'custom' ? 'selected' : ''}" data-sound="custom" style="justify-content: center; font-size: 0.76rem; padding: 7px 4px; ${setting.sound === 'custom' ? 'border-color: var(--gold-primary); background: rgba(212,175,55,0.2); font-weight:700;' : ''}">
          🎵 Dosyadan MP3
        </button>
      </div>

      <!-- Doğrudan Dosyadan Seç & Yükle Butonu -->
      <div style="margin-top: 10px; display: flex; gap: 6px;">
        <button class="city-selector-btn" id="modal-upload-audio-btn" style="flex: 1; justify-content: center; font-size: 0.78rem; padding: 8px; border-color: var(--gold-primary); background: rgba(212,175,55,0.12); color: var(--gold-light);">
          📁 Bu Vakte MP3 Seç & Ata
        </button>
        <button class="city-selector-btn" id="preview-sound-btn" style="justify-content: center; font-size: 0.78rem; padding: 8px 12px; border-color: var(--emerald-accent); color: var(--emerald-accent);">
          ▶️ Sesi Test Et
        </button>
      </div>

      ${specificAudio ? `
        <div style="margin-top: 6px; font-size: 0.72rem; color: var(--emerald-accent);">
          ✓ Yüklü Ses: <strong>${specificAudio}</strong>
        </div>
      ` : ''}
    </div>

    <!-- Erken Hatırlatma -->
    <div class="setting-option-card">
      <div class="setting-label">Erken Hatırlatıcı</div>
      <div class="setting-sublabel">Vakit girmeden önce hazırlık bildirimi al</div>
      <div style="display: flex; gap: 6px; margin-top: 8px;">
        <button class="city-selector-btn pre-alert-btn ${setting.preAlert === 0 ? 'selected' : ''}" data-mins="0" style="flex: 1; justify-content: center; font-size:0.78rem; padding:6px; ${setting.preAlert === 0 ? 'border-color: var(--gold-primary); background: rgba(212,175,55,0.2); font-weight:700;' : ''}">Vaktinde</button>
        <button class="city-selector-btn pre-alert-btn ${setting.preAlert === 15 ? 'selected' : ''}" data-mins="15" style="flex: 1; justify-content: center; font-size:0.78rem; padding:6px; ${setting.preAlert === 15 ? 'border-color: var(--gold-primary); background: rgba(212,175,55,0.2); font-weight:700;' : ''}">15 Dk</button>
        <button class="city-selector-btn pre-alert-btn ${setting.preAlert === 30 ? 'selected' : ''}" data-mins="30" style="flex: 1; justify-content: center; font-size:0.78rem; padding:6px; ${setting.preAlert === 30 ? 'border-color: var(--gold-primary); background: rgba(212,175,55,0.2); font-weight:700;' : ''}">30 Dk</button>
      </div>
    </div>

    <button class="city-selector-btn" id="save-prayer-setting-btn" style="width: 100%; padding: 12px; background: var(--gold-primary); color: #0b1320; font-weight: 700; justify-content: center; margin-top: 8px; font-size: 0.9rem;">
      ✓ Ayarları Kaydet
    </button>
  `;
}

/**
 * Tam Ekran Android Masaüstü / Masa Saati Modalı
 */
function renderDeskStandModal() {
  const times = state.prayerData ? state.prayerData.times : {};
  const currentKey = state.countdown?.current?.key;
  const nextName = state.countdown?.next?.name || 'Vakit';
  const now = new Date();
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const hourMin = timeStr.substring(0, 5);
  const sec = timeStr.substring(6, 8);
  const gregorianDateStr = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', year: 'numeric' });

  const prayerRows = [
    { key: 'fajr',    icon: '🌙', name: 'İmsak',   time: times.fajr    },
    { key: 'sunrise', icon: '🌅', name: 'Güneş',   time: times.sunrise },
    { key: 'dhuhr',   icon: '☀️', name: 'Öğle',    time: times.dhuhr   },
    { key: 'asr',     icon: '🌤️', name: 'İkindi',  time: times.asr     },
    { key: 'maghrib', icon: '🌇', name: 'Akşam',   time: times.maghrib },
    { key: 'isha',    icon: '🌌', name: 'Yatsı',   time: times.isha    },
  ];

  return `
    <div class="desk-stand-modal ${state.isDeskStandOpen ? 'open' : ''}" id="desk-stand-modal">
      <div class="desk-stand-bg-aura"></div>

      <!-- Masa Saati Üst Başlık -->
      <div class="desk-stand-header">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.4rem;">🕌</span>
          <div>
            <div style="font-size:1rem; font-weight:700; color:var(--gold-light);">${state.currentCity.name}</div>
            <div style="font-size:0.75rem; color:#a7f3d0;">${gregorianDateStr} • 1447 Hicri</div>
          </div>
        </div>
        <button class="icon-btn" id="close-desk-stand-btn" title="Masa Saati Modundan Çık" style="background:rgba(255,255,255,0.1); width:40px; height:40px; font-size:1.1rem;">
          ✕
        </button>
      </div>

      <!-- Masa Saati Merkez (Büyük Saat & Geri Sayım) -->
      <div class="desk-stand-center">
        <div class="desk-stand-clock-huge">
          <span id="desk-stand-clock-main">${hourMin}</span><span class="desk-stand-sec" id="desk-stand-sec">:${sec}</span>
        </div>

        <div class="desk-stand-countdown">
          <span>⏳ Sıradaki <strong>${nextName} Vakti</strong>: </span>
          <span id="desk-stand-countdown-text" style="color:#ffffff; font-variant-numeric:tabular-nums;">${state.countdown?.remainingFormatted || '--:--:--'}</span>
        </div>

        <!-- 6'lı Namaz Vakitleri Kutuları -->
        <div class="desk-stand-prayer-grid">
          ${prayerRows.map(p => {
            const isCurrent = currentKey === p.key;
            return `
            <div class="desk-stand-prayer-box ${isCurrent ? 'active' : ''}" data-prayer-key="${p.key}" data-prayer-name="${p.name}" data-prayer-time="${p.time || '--:--'}" style="cursor:pointer;">
              <div style="font-size:1.1rem; margin-bottom:2px;">${p.icon}</div>
              <div style="font-size:0.78rem; font-weight:600; color:${isCurrent ? '#fff' : 'var(--text-muted)'};">${p.name}</div>
              <div style="font-size:1.05rem; font-weight:800; color:${isCurrent ? '#a7f3d0' : '#fff'}; font-variant-numeric:tabular-nums; margin-top:2px;">${p.time || '--:--'}</div>
              <div style="font-size:0.6rem; color:var(--gold-light); margin-top:2px;">${isCurrent ? '● ŞU AN' : 'VAKİT'}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Masa Saati Alt Bilgi -->
      <div class="desk-stand-footer">
        <span>💡 Telefonunuzu masaya yan veya dik koyabilirsiniz • Ekran uyanık kalır</span>
      </div>
    </div>
  `;
}

// Wake Lock Helper (Ekranı açık tutma)
async function enableScreenWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      state.wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch (err) {
    console.log('Wake lock isteği yapılamadı:', err);
  }
}

function disableScreenWakeLock() {
  try {
    if (state.wakeLock) {
      state.wakeLock.release();
      state.wakeLock = null;
    }
  } catch (e) {}
}

/**
 * Dinamik Canlı Saat ve Sayaç Güncelleyiciler
 */
function updateCountdownUI() {
  const cdEl = document.getElementById('countdown-display');
  if (cdEl && state.countdown) {
    cdEl.textContent = state.countdown.remainingFormatted;
  }

  const deskCdEl = document.getElementById('desk-stand-countdown-text');
  if (deskCdEl && state.countdown) {
    deskCdEl.textContent = state.countdown.remainingFormatted;
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const hourMin = timeStr.substring(0, 5);
  const sec = timeStr.substring(6, 8);

  const hourMinEl = document.getElementById('live-clock-hour-min');
  if (hourMinEl) hourMinEl.textContent = hourMin;
  const secEl = document.getElementById('live-clock-sec');
  if (secEl) secEl.textContent = `:${sec}`;

  const deskClockMain = document.getElementById('desk-stand-clock-main');
  if (deskClockMain) deskClockMain.textContent = hourMin;
  const deskClockSec = document.getElementById('desk-stand-sec');
  if (deskClockSec) deskClockSec.textContent = `:${sec}`;

  const liveClock = document.getElementById('live-clock');
  if (liveClock) {
    liveClock.textContent = timeStr;
  }
}

let wasAlignedPreviously = false;
let leafletMapInstance = null;

function initQiblaMap() {
  const mapContainer = document.getElementById('qibla-leaflet-map');
  if (!mapContainer) return;

  if (leafletMapInstance) {
    try {
      leafletMapInstance.remove();
    } catch(e) {}
    leafletMapInstance = null;
  }

  const city = state.currentCity;
  const kaabaLat = 21.4225;
  const kaabaLng = 39.8262;

  setTimeout(() => {
    try {
      const map = L.map('qibla-leaflet-map', {
        zoomControl: true,
        attributionControl: false
      });
      leafletMapInstance = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);

      const cityIcon = L.divIcon({
        className: 'custom-map-pin',
        html: '<div style="background:#2563eb;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid #fff;">📍</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const kaabaIcon = L.divIcon({
        className: 'custom-map-kaaba',
        html: '<div style="background:#1e293b;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 10px rgba(0,0,0,0.4);border:2px solid #d4af37;">🕋</div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const cityMarker = L.marker([city.latitude, city.longitude], { icon: cityIcon }).addTo(map);
      cityMarker.bindPopup(`<b>${city.name}</b><br>Kıble Açısı: ${state.qiblaAngle}°`).openPopup();

      const kaabaMarker = L.marker([kaabaLat, kaabaLng], { icon: kaabaIcon }).addTo(map);
      kaabaMarker.bindPopup('<b>Kâbe-i Muazzama</b><br>Mekke-i Mükerreme');

      // Kıble Doğrultu Çizgisi
      const latlngs = [
        [city.latitude, city.longitude],
        [kaabaLat, kaabaLng]
      ];
      const polyline = L.polyline(latlngs, {
        color: '#dc2626',
        weight: 3.5,
        opacity: 0.9,
        dashArray: '6, 6'
      }).addTo(map);

      map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
    } catch (e) {
      console.error('Harita başlatma hatası:', e);
    }
  }, 100);
}

let lastCompassVibrateTime = 0;

function updateCompassUI() {
  const angle = state.qiblaAngle || 152;
  const heading = state.deviceHeading || 0;
  const relAngle = (angle - heading + 360) % 360;
  const diffAngle = relAngle > 180 ? 360 - relAngle : relAngle;
  
  // Histerezis (Titreşimi ve zıplamayı önlemek için: 3.5° altında hizalanır, 6.0° üstünde hizalama bozulur)
  const isAligned = wasAlignedPreviously ? diffAngle < 6.0 : diffAngle < 3.5;

  // Dönen Pusula Kadranı (Telefon döndükçe manyetik kuzeye göre ters yönde döner)
  const rotatingDisk = document.getElementById('qibla-rotating-disk');
  if (rotatingDisk) {
    rotatingDisk.style.transform = `rotate(${-heading}deg)`;
  }

  // Derece Değeri Rozeti
  const degEl = document.getElementById('qibla-degree-val');
  if (degEl) {
    degEl.textContent = isAligned ? 'KIBLEDE' : `${diffAngle.toFixed(1)}°`;
  }

  // Rozet Durumu (Yeşil / Kırmızı)
  const badgeEl = document.getElementById('qibla-status-badge');
  if (badgeEl) {
    if (isAligned) {
      badgeEl.classList.add('aligned');
    } else {
      badgeEl.classList.remove('aligned');
    }
  }

  // Kadran Kartı Glow Durumu
  const dialCard = document.getElementById('qibla-dial-card');
  if (dialCard) {
    if (isAligned) {
      dialCard.classList.add('aligned');
    } else {
      dialCard.classList.remove('aligned');
    }
  }

  // Alt Bilgilendirme Metni
  const infoText = document.getElementById('qibla-info-instruction');
  if (infoText) {
    infoText.textContent = isAligned 
      ? '✨ Mükemmel! Tam Kıble yönündesiniz.' 
      : `Kâbe ikonunu 🕋 üstteki sarı oka hizalayın (Kıble: ${angle}°)`;
  }

  // Simülasyon Test Metni & Slider
  const testText = document.getElementById('qibla-test-heading-text');
  if (testText) {
    testText.textContent = `${heading}° (Kıble Hedefi: ${angle}°)`;
  }
  const slider = document.getElementById('qibla-slider-control');
  if (slider && document.activeElement !== slider) {
    slider.value = heading;
  }

  // Hizalandığında SADECE kullanıcı açmışsa ve en az 5 saniye geçmişse nazikçe 1 kez titre
  if (isAligned && !wasAlignedPreviously) {
    const now = Date.now();
    if (state.qiblaVibrationEnabled && (now - lastCompassVibrateTime > 5000)) {
      lastCompassVibrateTime = now;
      try {
        if ('vibrate' in navigator) navigator.vibrate(40);
      } catch(e) {}
    }
  }
  wasAlignedPreviously = isAligned;
}

let activeUploadTargetKey = null;

/**
 * Event Dinleyicileri
 */
function attachEventListeners() {
  // Sekme değiştirme
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      state.activeTab = tab;
      renderApp();
    });
  });

  // Diyanet Alt Görünüm Butonları (Vakitler / İmsakiye / Zikirmatik)
  const btnSubVakitler = document.getElementById('btn-subview-vakitler');
  if (btnSubVakitler) {
    btnSubVakitler.addEventListener('click', () => {
      state.homeSubView = 'vakitler';
      renderApp();
    });
  }

  const btnSubImsakiye = document.getElementById('btn-subview-imsakiye');
  if (btnSubImsakiye) {
    btnSubImsakiye.addEventListener('click', () => {
      state.homeSubView = 'imsakiye';
      renderApp();
    });
  }

  const btnCloseImsakiye = document.getElementById('btn-close-imsakiye');
  if (btnCloseImsakiye) {
    btnCloseImsakiye.addEventListener('click', () => {
      state.homeSubView = 'vakitler';
      renderApp();
    });
  }

  const btnSubZikirmatik = document.getElementById('btn-subview-zikirmatik');
  if (btnSubZikirmatik) {
    btnSubZikirmatik.addEventListener('click', () => {
      state.homeSubView = 'zikirmatik';
      renderApp();
    });
  }

  const btnCloseDhikr = document.getElementById('btn-close-dhikr');
  if (btnCloseDhikr) {
    btnCloseDhikr.addEventListener('click', () => {
      state.homeSubView = 'vakitler';
      renderApp();
    });
  }

  const btnRandomVerse = document.getElementById('btn-quick-random-verse');
  if (btnRandomVerse) {
    btnRandomVerse.addEventListener('click', () => {
      state.homeSubView = 'vakitler';
      renderApp();
      window.scrollTo({ top: 400, behavior: 'smooth' });
    });
  }

  // Zikirmatik Seçim Çipleri
  document.querySelectorAll('.dhikr-select-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      state.dhikrIndex = idx;
      state.dhikrCount = 0;
      await saveSetting('dhikrIndex', state.dhikrIndex);
      await saveSetting('dhikrCount', state.dhikrCount);
      renderApp();
    });
  });

  // Zikir Sayma (Halka veya Buton)
  const dhikrAdd = async () => {
    state.dhikrCount = (state.dhikrCount || 0) + 1;
    const activeD = DHIKR_LIST[state.dhikrIndex] || DHIKR_LIST[0];
    const target = activeD.target || 33;
    
    // Hedefe ulaşıldığında nazik tek titreşim
    if (state.dhikrCount % target === 0) {
      try {
        if ('vibrate' in navigator) navigator.vibrate([60, 40, 60]);
      } catch(e) {}
    } else {
      try {
        if ('vibrate' in navigator) navigator.vibrate(15);
      } catch(e) {}
    }

    await saveSetting('dhikrCount', state.dhikrCount);
    const countEl = document.getElementById('dhikr-count-number');
    if (countEl) {
      countEl.textContent = state.dhikrCount;
      const progressPercent = Math.min(100, Math.round((state.dhikrCount % target) / target * 100));
      const targetEl = document.querySelector('.dhikr-count-target');
      if (targetEl) targetEl.textContent = `Hedef: ${target} (${progressPercent}%)`;
    } else {
      renderApp();
    }
  };

  const tapCircle = document.getElementById('dhikr-tap-circle');
  if (tapCircle) tapCircle.addEventListener('click', dhikrAdd);

  const addDhikrBtn = document.getElementById('dhikr-add-btn');
  if (addDhikrBtn) addDhikrBtn.addEventListener('click', dhikrAdd);

  const resetDhikrBtn = document.getElementById('dhikr-reset-btn');
  if (resetDhikrBtn) {
    resetDhikrBtn.addEventListener('click', async () => {
      if (confirm('Zikir sayacını sıfırlamak istiyor musunuz?')) {
        state.dhikrCount = 0;
        await saveSetting('dhikrCount', 0);
        renderApp();
      }
    });
  }

  // Masaüstü Stand Modu Aç / Kapat
  const openDeskBtn = document.getElementById('open-desk-stand-btn');
  if (openDeskBtn) {
    openDeskBtn.addEventListener('click', () => {
      state.isDeskStandOpen = true;
      renderApp();
      enableScreenWakeLock();
    });
  }

  const closeDeskBtn = document.getElementById('close-desk-stand-btn');
  if (closeDeskBtn) {
    closeDeskBtn.addEventListener('click', () => {
      state.isDeskStandOpen = false;
      disableScreenWakeLock();
      renderApp();
    });
  }

  // Şehir seçimi modal aç/kapa
  const openModalBtn = document.getElementById('open-city-modal');
  if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
      state.isCityModalOpen = true;
      renderApp();
    });
  }

  const closeModalBtn = document.getElementById('close-city-modal');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      state.isCityModalOpen = false;
      renderApp();
    });
  }

  // Şehir arama (Tüm 81 il ve ilçeler)
  const searchInput = document.getElementById('city-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      const listContainer = document.getElementById('city-list-container');
      if (listContainer) {
        listContainer.innerHTML = renderCityList(val);
        attachCityItemListeners();
      }
    });
  }

  attachCityItemListeners();

  // Vakit Satırlarına ve Saat İçi Kapsüllerine Tıklayınca Ayar Modalını Aç
  document.querySelectorAll('.prayer-row, .clock-prayer-capsule, .desk-stand-prayer-box').forEach(row => {
    row.addEventListener('click', () => {
      const key = row.getAttribute('data-prayer-key');
      const name = row.getAttribute('data-prayer-name');
      const time = row.getAttribute('data-prayer-time');
      if (key && name) {
        state.selectedPrayerForSetting = { key, name, time };
        renderApp();
      }
    });
  });

  // Vakit Ayar Modalını Kapat
  const closePrayerModalBtn = document.getElementById('close-prayer-modal');
  if (closePrayerModalBtn) {
    closePrayerModalBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.selectedPrayerForSetting = null;
      renderApp();
    });
  }

  // Modal Dışı Tıklama
  const pModalOverlay = document.getElementById('prayer-setting-modal');
  if (pModalOverlay) {
    pModalOverlay.addEventListener('click', (e) => {
      if (e.target === pModalOverlay) {
        state.selectedPrayerForSetting = null;
        renderApp();
      }
    });
  }

  // Modal Ses Tipi Seçimi
  document.querySelectorAll('.modal-sound-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sound = btn.getAttribute('data-sound');
      if (state.selectedPrayerForSetting) {
        const key = state.selectedPrayerForSetting.key;
        state.prayerAlertSettings[key].sound = sound;
        renderApp();
      }
    });
  });

  // Modal'dan Doğrudan Dosyadan Seç & Yükle Butonu
  const modalUploadBtn = document.getElementById('modal-upload-audio-btn');
  const modalFileInput = document.getElementById('modal-audio-file-input');
  if (modalUploadBtn && modalFileInput) {
    modalUploadBtn.addEventListener('click', () => {
      if (state.selectedPrayerForSetting) {
        activeUploadTargetKey = state.selectedPrayerForSetting.key;
        modalFileInput.click();
      }
    });

    modalFileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (file && activeUploadTargetKey) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const dataUrl = ev.target.result;
          await saveCustomAudio(`audio_${activeUploadTargetKey}`, file.name, dataUrl);
          await refreshCustomAudios();
          if (state.prayerAlertSettings[activeUploadTargetKey]) {
            state.prayerAlertSettings[activeUploadTargetKey].sound = 'custom';
            await saveSetting('prayerAlertSettings', state.prayerAlertSettings);
          }
          alert(`✅ "${file.name}" yüklendi ve bu vakit için seçildi.`);
          renderApp();
        };
        reader.readAsDataURL(file);
      }
    };
  }

  // Modal Önceden Hatırlatma Seçimi
  document.querySelectorAll('.pre-alert-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mins = parseInt(btn.getAttribute('data-mins'), 10);
      if (state.selectedPrayerForSetting) {
        const key = state.selectedPrayerForSetting.key;
        state.prayerAlertSettings[key].preAlert = mins;
        renderApp();
      }
    });
  });

  // Modal Sesi Dinle Test Butonu
  const previewSoundBtn = document.getElementById('preview-sound-btn');
  if (previewSoundBtn) {
    previewSoundBtn.addEventListener('click', async () => {
      await notificationService.requestPermission();
      if (state.selectedPrayerForSetting) {
        const key = state.selectedPrayerForSetting.key;
        const s = state.prayerAlertSettings[key];
        notificationService.playAlertBySetting(s.sound || 'ezan', state.selectedPrayerForSetting.name, key);
      }
    });
  }

  // Modal Ayarları Kaydet
  const saveSettingBtn = document.getElementById('save-prayer-setting-btn');
  if (saveSettingBtn) {
    saveSettingBtn.addEventListener('click', async () => {
      if (state.selectedPrayerForSetting) {
        const switchEl = document.getElementById('prayer-enable-switch');
        const key = state.selectedPrayerForSetting.key;
        state.prayerAlertSettings[key].enabled = switchEl ? switchEl.checked : true;
        await saveSetting('prayerAlertSettings', state.prayerAlertSettings);
        state.selectedPrayerForSetting = null;
        renderApp();
      }
    });
  }

  // --- BİLDİRİMLER SEKMESİ OLAYLARI ---
  // Genel Dosyadan Seç & Yükle Butonu
  const btnUploadAudio = document.getElementById('btn-upload-audio');
  const tabFileInput = document.getElementById('tab-audio-file-input');
  if (btnUploadAudio && tabFileInput) {
    btnUploadAudio.addEventListener('click', () => {
      activeUploadTargetKey = 'default_custom';
      tabFileInput.click();
    });

    tabFileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (file && activeUploadTargetKey) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const dataUrl = ev.target.result;
          const saveKey = activeUploadTargetKey === 'default_custom' ? 'default_custom' : `audio_${activeUploadTargetKey}`;
          await saveCustomAudio(saveKey, file.name, dataUrl);
          await refreshCustomAudios();
          if (activeUploadTargetKey !== 'default_custom' && state.prayerAlertSettings[activeUploadTargetKey]) {
            state.prayerAlertSettings[activeUploadTargetKey].sound = 'custom';
            await saveSetting('prayerAlertSettings', state.prayerAlertSettings);
          }
          alert(`✅ "${file.name}" başarıyla yüklendi!`);
          renderApp();
        };
        reader.readAsDataURL(file);
      }
    };
  }

  // Bildirimler Sekmesi - Vakit Başına Dosyadan Seç Butonları
  document.querySelectorAll('.tab-upload-prayer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-key');
      if (key && tabFileInput) {
        activeUploadTargetKey = key;
        tabFileInput.click();
      }
    });
  });

  // Özel Sesi Dinle Butonu
  const btnPlayCustom = document.getElementById('btn-play-custom-audio');
  if (btnPlayCustom) {
    btnPlayCustom.addEventListener('click', () => {
      if (notificationService.isPlaying) {
        notificationService.stopAudio();
        btnPlayCustom.textContent = '▶️ Dinle';
      } else {
        notificationService.playCustomAudio('default_custom');
        btnPlayCustom.textContent = '⏹️ Durdur';
      }
    });
  }

  // Özel Sesi Sil Butonu
  const btnDeleteCustom = document.getElementById('btn-delete-custom-audio');
  if (btnDeleteCustom) {
    btnDeleteCustom.addEventListener('click', async () => {
      if (confirm('Yüklenen özel ses dosyasını silmek istiyor musunuz?')) {
        await deleteCustomAudio('default_custom');
        await refreshCustomAudios();
        renderApp();
      }
    });
  }

  // Bildirimler Sekmesi - Vakit Switchleri
  document.querySelectorAll('.tab-prayer-switch').forEach(sw => {
    sw.addEventListener('change', async (e) => {
      const key = sw.getAttribute('data-key');
      if (key && state.prayerAlertSettings[key]) {
        state.prayerAlertSettings[key].enabled = e.target.checked;
        await saveSetting('prayerAlertSettings', state.prayerAlertSettings);
      }
    });
  });

  // Bildirimler Sekmesi - Ses Tipi Butonları
  document.querySelectorAll('.tab-sound-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.getAttribute('data-key');
      const sound = btn.getAttribute('data-sound');
      if (key && state.prayerAlertSettings[key]) {
        state.prayerAlertSettings[key].sound = sound;
        await saveSetting('prayerAlertSettings', state.prayerAlertSettings);
        renderApp();
      }
    });
  });

  // Bildirimler Sekmesi - Test Butonları
  document.querySelectorAll('.tab-test-sound-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.getAttribute('data-key');
      const name = btn.getAttribute('data-name');
      const s = state.prayerAlertSettings[key] || {};
      await notificationService.requestPermission();
      notificationService.playAlertBySetting(s.sound || 'ezan', name, key);
    });
  });

  // --- YENİ KIBLE PUSULASI & HARİTA OLAYLARI ---
  // Geri Butonu (Vakitlere Dön)
  const qiblaBackBtn = document.getElementById('qibla-back-to-home');
  if (qiblaBackBtn) {
    qiblaBackBtn.addEventListener('click', () => {
      state.activeTab = 'home';
      renderApp();
    });
  }

  // Sekme Değiştirici Butonlar (Pusula | Harita)
  const compassSubTabBtn = document.getElementById('qibla-tab-compass-btn');
  if (compassSubTabBtn) {
    compassSubTabBtn.addEventListener('click', () => {
      state.qiblaSubTab = 'compass';
      renderApp();
    });
  }

  const mapSubTabBtn = document.getElementById('qibla-tab-map-btn');
  if (mapSubTabBtn) {
    mapSubTabBtn.addEventListener('click', () => {
      state.qiblaSubTab = 'map';
      renderApp();
    });
  }

  // Harita Sekmesindeyse Haritayı Başlat
  if (state.activeTab === 'qibla' && state.qiblaSubTab === 'map') {
    initQiblaMap();
  }

  // Pusula Slider Simülatörü
  const qiblaSlider = document.getElementById('qibla-slider-control');
  if (qiblaSlider) {
    qiblaSlider.addEventListener('input', (e) => {
      state.deviceHeading = parseInt(e.target.value, 10);
      state.smoothedHeading = state.deviceHeading;
      updateCompassUI();
    });
  }

  // Kıbleye Otomatik Hizala Butonu
  const qiblaAlignBtn = document.getElementById('qibla-auto-align-btn');
  if (qiblaAlignBtn) {
    qiblaAlignBtn.addEventListener('click', () => {
      state.deviceHeading = state.qiblaAngle || 152;
      state.smoothedHeading = state.deviceHeading;
      updateCompassUI();
      const sliderEl = document.getElementById('qibla-slider-control');
      if (sliderEl) sliderEl.value = state.deviceHeading;
    });
  }

  // Sensör İzni & Kalibrasyon Butonu
  const qiblaSensorBtn = document.getElementById('qibla-sensor-toggle-btn');
  if (qiblaSensorBtn) {
    qiblaSensorBtn.addEventListener('click', async () => {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          const perm = await DeviceOrientationEvent.requestPermission();
          if (perm === 'granted') {
            setupCompassListener();
            alert('✅ Pusula sensör izni verildi.');
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setupCompassListener();
        alert('✅ Cihaz pusula sensörü aktif edildi. Telefonunuzu havada 8 çizerek kalibre edebilirsiniz.');
      }
    });
  }

  // Kıble Titreşim Aç / Kapa Butonu
  const qiblaVibBtn = document.getElementById('qibla-vibration-toggle-btn');
  if (qiblaVibBtn) {
    qiblaVibBtn.addEventListener('click', async () => {
      state.qiblaVibrationEnabled = !state.qiblaVibrationEnabled;
      await saveSetting('qiblaVibrationEnabled', state.qiblaVibrationEnabled);
      renderApp();
    });
  }

  // --- RADYO SEKMESİ OLAYLARI ---
  // Radyo Arama
  const radioSearchInput = document.getElementById('radio-search-input');
  if (radioSearchInput) {
    radioSearchInput.addEventListener('input', (e) => {
      state.radioSearchQuery = e.target.value;
      renderApp();
      // Arama kutusuna odaklanmayı ve imleç konumunu koru
      const inputAfter = document.getElementById('radio-search-input');
      if (inputAfter) {
        inputAfter.focus();
        inputAfter.setSelectionRange(inputAfter.value.length, inputAfter.value.length);
      }
    });
  }

  // Kategori Filtre Butonları
  document.querySelectorAll('.radio-cat-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      state.radioCategory = btn.getAttribute('data-cat');
      renderApp();
    });
  });

  // Radyo Oynat Butonları (Dinle / Test Et)
  document.querySelectorAll('.btn-play-radio').forEach(btn => {
    btn.addEventListener('click', async () => {
      const radioId = btn.getAttribute('data-radio-id');
      const radio = ISLAMIC_RADIOS.find(r => r.id === radioId);
      if (radio) {
        await radioService.playRadio(radio);
        renderApp();
      }
    });
  });

  // Radyo Durdur Butonları
  document.querySelectorAll('.btn-stop-radio').forEach(btn => {
    btn.addEventListener('click', () => {
      radioService.stopRadio();
      renderApp();
    });
  });

  const stopActiveBtn = document.getElementById('btn-stop-active-radio');
  if (stopActiveBtn) {
    stopActiveBtn.addEventListener('click', () => {
      radioService.stopRadio();
      renderApp();
    });
  }

  // Header Hızlı Ezan Testi
  const soundBtn = document.getElementById('toggle-sound-btn');
  if (soundBtn) {
    soundBtn.addEventListener('click', async () => {
      await notificationService.requestPermission();
      notificationService.playMelodicAlert(state.countdown?.next?.name || 'Vakit');
      notificationService.showNotification('🕌 Ezan Vakti', 'Namaz vakti girdi. Huzur vakti.');
    });
  }

  // Genel Bildirim Switch
  const globalNotifSwitch = document.getElementById('global-notif-switch');
  if (globalNotifSwitch) {
    globalNotifSwitch.addEventListener('change', async (e) => {
      state.notificationEnabled = e.target.checked;
      await saveSetting('notificationEnabled', state.notificationEnabled);
      if (state.notificationEnabled) {
        await notificationService.requestPermission();
      }
    });
  }
}

function attachCityItemListeners() {
  document.querySelectorAll('.city-item').forEach(item => {
    item.addEventListener('click', async () => {
      const cityId = item.getAttribute('data-city-id');
      const found = CITIES.find(c => c.id === cityId);
      if (found) {
        state.currentCity = found;
        await saveSetting('selectedCityId', found.id);
        state.isCityModalOpen = false;
        await updatePrayerTimes();
        renderApp();
      }
    });
  });
}

// Uygulamayı Başlat
initApp();
