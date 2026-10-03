import { Coordinates, CalculationMethod, PrayerTimes, SunnahTimes, Qibla } from 'adhan';

/**
 * Türkiye Diyanet İşleri Başkanlığı resmi hesaplama parametreleri ve temkin kalibrasyonu
 */
function getDiyanetParameters() {
  const params = CalculationMethod.Turkey();
  // Diyanet Türkiye Standart Temkin ve Ufuk Düzeltmeleri:
  // Öğle: +5 dk (Zeval emniyeti), İkindi: +4 dk (Asr-ı evvel temkini), Akşam: +7 dk (Güneş diski batımı & temkin)
  params.adjustments.fajr = 0;
  params.adjustments.sunrise = -4; // Güneşin ufukta belirmesi
  params.adjustments.dhuhr = 5;
  params.adjustments.asr = 4;
  params.adjustments.maghrib = 7;
  params.adjustments.isha = 0;
  return params;
}

/**
 * Belirli bir koordinat ve tarih için Diyanet usulü namaz vakitlerini hesaplar.
 */
export function calculatePrayerTimes(latitude, longitude, date = new Date()) {
  const coordinates = new Coordinates(latitude, longitude);
  const params = getDiyanetParameters();
  
  const prayerTimes = new PrayerTimes(coordinates, date, params);
  const sunnahTimes = new SunnahTimes(prayerTimes);
  
  const formatTime = (d) => {
    if (!d) return '--:--';
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const times = {
    fajr: formatTime(prayerTimes.fajr),        // İmsak
    sunrise: formatTime(prayerTimes.sunrise),  // Güneş
    dhuhr: formatTime(prayerTimes.dhuhr),      // Öğle
    asr: formatTime(prayerTimes.asr),          // İkindi
    maghrib: formatTime(prayerTimes.maghrib),  // Akşam
    isha: formatTime(prayerTimes.isha),        // Yatsı
    raw: {
      fajr: prayerTimes.fajr,
      sunrise: prayerTimes.sunrise,
      dhuhr: prayerTimes.dhuhr,
      asr: prayerTimes.asr,
      maghrib: prayerTimes.maghrib,
      isha: prayerTimes.isha,
      middleOfTheNight: sunnahTimes.middleOfTheNight,
      lastThirdOfTheNight: sunnahTimes.lastThirdOfTheNight
    }
  };

  return {
    date: date.toISOString().split('T')[0],
    times,
    currentPrayer: prayerTimes.currentPrayer(),
    nextPrayer: prayerTimes.nextPrayer(),
    timeForPrayer: (prayer) => prayerTimes.timeForPrayer(prayer)
  };
}

/**
 * Bir aylık (35 günlük) tüm namaz vakitlerini peşin üretir / yerel veritabanı için hazırlar.
 */
export function generateMonthlyPrayerTimes(latitude, longitude, startDate = new Date()) {
  const monthlyData = [];
  const current = new Date(startDate);
  
  for (let i = 0; i < 35; i++) {
    const targetDate = new Date(current);
    targetDate.setDate(current.getDate() + i);
    const dayTimes = calculatePrayerTimes(latitude, longitude, targetDate);
    monthlyData.push(dayTimes);
  }
  
  return monthlyData;
}

/**
 * Diyanet.gov.tr resmi sayfasından dönen HTML içeriğini ayrıştırır.
 * (Örn: https://namazvakitleri.diyanet.gov.tr/tr-TR/9541/istanbul-icin-namaz-vakti)
 */
export function parseDiyanetHtml(html) {
  if (!html || typeof html !== 'string') return null;

  const getVal = (name) => {
    const idx = html.indexOf('data-vakit-name="' + name + '"');
    if (idx === -1) return null;
    const sub = html.substring(idx, idx + 250);
    const m = sub.match(/<div class="tpt-time"[^>]*>([^<]+)<\/div>/);
    return m ? m[1].trim() : null;
  };

  const fajr = getVal('imsak');
  const sunrise = getVal('gunes');
  const dhuhr = getVal('ogle');
  const asr = getVal('ikindi');
  const maghrib = getVal('aksam');
  const isha = getVal('yatsı') || getVal('yatsi');

  if (!fajr || !dhuhr || !maghrib) return null;

  const hicriMatch = html.match(/<div class="ti-hicri">([^<]+)<\/div>/i);
  const kibleAciMatch = html.match(/Kıble A&#231;ısı[\s\S]*?<div class="tpt-time">([^<]+)<\/div>/i);
  const kibleZamanMatch = html.match(/Kıble Zamanı[\s\S]*?<div class="tpt-time">([^<]+)<\/div>/i);

  // Aylık / Yıllık Tabloyu Ayrıştır
  const monthlyList = [];
  const tableMatches = html.match(/<table class="table vakit-table"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/gi);
  if (tableMatches) {
    tableMatches.forEach(tbl => {
      const trRegex = /<tr>([\s\S]*?)<\/tr>/gi;
      let trMatch;
      while ((trMatch = trRegex.exec(tbl)) !== null) {
        const tdRegex = /<td>([^<]*)<\/td>/gi;
        const tds = [];
        let tdMatch;
        while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
          tds.push(tdMatch[1].trim());
        }
        if (tds.length >= 8) {
          monthlyList.push({
            gregorianDate: tds[0],
            hijriDate: tds[1],
            fajr: tds[2],
            sunrise: tds[3],
            dhuhr: tds[4],
            asr: tds[5],
            maghrib: tds[6],
            isha: tds[7]
          });
        }
      }
    });
  }

  return {
    source: 'namazvakitleri.diyanet.gov.tr',
    fajr,
    sunrise,
    dhuhr,
    asr,
    maghrib,
    isha,
    hijri: hicriMatch ? hicriMatch[1].trim() : null,
    qiblaAngle: kibleAciMatch ? parseInt(kibleAciMatch[1].trim(), 10) : 147,
    qiblaTime: kibleZamanMatch ? kibleZamanMatch[1].trim() : null,
    monthlyList
  };
}

/**
 * Resmi Diyanet İşleri Başkanlığı Sitesinden (namazvakitleri.diyanet.gov.tr) Vakitleri Çeker
 */
export async function fetchOnlineDiyanetTimes(cityOrName) {
  let diyanetId = 9541; // Varsayılan İstanbul
  let slug = 'istanbul-icin-namaz-vakti';
  let cityName = 'İstanbul';

  if (typeof cityOrName === 'object' && cityOrName !== null) {
    cityName = cityOrName.cityName || cityOrName.name || 'İstanbul';
    if (cityOrName.diyanetId) diyanetId = cityOrName.diyanetId;
    if (cityOrName.diyanetSlug) slug = cityOrName.diyanetSlug;
  } else if (typeof cityOrName === 'string') {
    cityName = cityOrName;
  }

  const targetUrl = `https://namazvakitleri.diyanet.gov.tr/tr-TR/${diyanetId}/${slug}`;

  // 1. Doğrudan veya Proxy ile Diyanet Resmi Sitesini Çekme Denemeleri
  const fetchEndpoints = [
    targetUrl,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`
  ];

  for (const endpoint of fetchEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const text = await res.text();
        const parsed = parseDiyanetHtml(text);
        if (parsed) {
          return parsed;
        }
      }
    } catch (err) {
      // Bir sonraki alternatife geç
    }
  }

  // 2. Yedek Diyanet API'si (Aladhan Diyanet Turkey Method 13)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(cityName)}&country=Turkey&method=13`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const json = await res.json();
      if (json && json.data && json.data.timings) {
        const t = json.data.timings;
        return {
          source: 'aladhan-diyanet-method',
          fajr: t.Fajr,
          sunrise: t.Sunrise,
          dhuhr: t.Dhuhr,
          asr: t.Asr,
          maghrib: t.Maghrib,
          isha: t.Isha,
          hijri: json.data.date?.hijri ? `${json.data.date.hijri.day} ${json.data.date.hijri.month?.tr || json.data.date.hijri.month?.en} ${json.data.date.hijri.year}` : null,
          qiblaAngle: 147
        };
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Kıble açısını hesaplar (Kuzeyden saat yönünde derece).
 */
export function calculateQiblaDirection(latitude, longitude) {
  const coordinates = new Coordinates(latitude, longitude);
  return Math.round(Qibla(coordinates));
}

/**
 * Bir sonraki vakti ve kalan saniyeyi hesaplar.
 */
export function getNextPrayerCountdown(timesRaw) {
  const now = new Date();
  
  const prayerList = [
    { name: 'İmsak', key: 'fajr', time: timesRaw.fajr },
    { name: 'Güneş', key: 'sunrise', time: timesRaw.sunrise },
    { name: 'Öğle', key: 'dhuhr', time: timesRaw.dhuhr },
    { name: 'İkindi', key: 'asr', time: timesRaw.asr },
    { name: 'Akşam', key: 'maghrib', time: timesRaw.maghrib },
    { name: 'Yatsı', key: 'isha', time: timesRaw.isha }
  ];

  let next = null;
  let current = null;

  for (let i = 0; i < prayerList.length; i++) {
    if (now < prayerList[i].time) {
      next = prayerList[i];
      current = i === 0 ? prayerList[prayerList.length - 1] : prayerList[i - 1];
      break;
    }
  }

  // Eğer günün tüm vakitleri geçtiyse (Yatsı sonrası), sonraki vakit yarının İmsak'ıdır
  if (!next) {
    const tomorrowFajr = new Date(timesRaw.fajr);
    tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
    next = { name: 'İmsak', key: 'fajr', time: tomorrowFajr };
    current = prayerList[prayerList.length - 1];
  }

  const diffMs = next.time.getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    current,
    next,
    remainingFormatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    hours,
    minutes,
    seconds,
    totalSeconds
  };
}
