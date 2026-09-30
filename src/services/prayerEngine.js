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
 * İnternet varsa Aladhan Resmi Diyanet API'sinden güncel resmi vakitleri senkronize etmeyi dener
 */
export async function fetchOnlineDiyanetTimes(cityName) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(cityName)}&country=Turkey&method=13`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.data && json.data.timings) {
      const t = json.data.timings;
      return {
        fajr: t.Fajr,
        sunrise: t.Sunrise,
        dhuhr: t.Dhuhr,
        asr: t.Asr,
        maghrib: t.Maghrib,
        isha: t.Isha
      };
    }
    return null;
  } catch (e) {
    return null;
  }
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
