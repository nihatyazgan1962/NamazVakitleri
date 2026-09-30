/**
 * Kur'an-ı Kerim Veri Modeli ve Sure/Cüz Listesi
 * Kaynak: Diyanet İşleri Başkanlığı Kur'an Portalı (https://kuran.diyanet.gov.tr) & Quran.com
 */

export const QURAN_POPULAR_SURAHS = [
  { id: 1, name: 'Fâtiha Suresi', arabic: 'الفاتحة', verses: 7, page: 1, desc: 'Kur\'an\'ın açılışı ve Ümmü\'l-Kitap', diyanetUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-fatiha-suresi', quranComUrl: 'https://quran.com/tr/al-fatihah' },
  { id: 36, name: 'Yâsîn Suresi', arabic: 'يس', verses: 83, page: 440, desc: 'Kur\'an\'ın kalbi', diyanetUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-yasin-suresi', quranComUrl: 'https://quran.com/tr/ya-sin' },
  { id: 67, name: 'Mülk (Tebâreke) Suresi', arabic: 'الملك', verses: 30, page: 562, desc: 'Kabir azabından koruyucu sure', diyanetUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-mulk-suresi', quranComUrl: 'https://quran.com/tr/al-mulk' },
  { id: 78, name: 'Nebe (Amme) Suresi', arabic: 'النبإ', verses: 40, page: 582, desc: 'Büyük haber ve kıyamet', diyanetUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-nebe-suresi', quranComUrl: 'https://quran.com/tr/an-naba' },
  { id: 55, name: 'Rahmân Suresi', arabic: 'الرحمن', verses: 78, page: 531, desc: 'Kur\'an\'ın ziyneti ve nimetler', diyanetUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-rahman-suresi', quranComUrl: 'https://quran.com/tr/ar-rahman' },
  { id: 48, name: 'Fetih Suresi', arabic: 'الفتح', verses: 29, page: 511, desc: 'Apaçık zafer ve nusret', diyanetUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-fetih-suresi', quranComUrl: 'https://quran.com/tr/al-fath' },
  { id: 56, name: 'Vâkıa Suresi', arabic: 'الواقعة', verses: 96, page: 534, desc: 'Kıyamet ve rızık bereketi', diyanetUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-vakia-suresi', quranComUrl: 'https://quran.com/tr/al-waqiah' },
  { id: 18, name: 'Kehf Suresi', arabic: 'الكهف', verses: 110, page: 293, desc: 'Cuma günü nurları ve Ashab-ı Kehf', diyanetUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-kehf-suresi', quranComUrl: 'https://quran.com/tr/al-kahf' },
  { id: 112, name: 'İhlâs Suresi', arabic: 'الإخلاص', verses: 4, page: 604, desc: 'Tevhid ve Kur\'an\'ın üçte biri', diyanetUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-ihlas-suresi', quranComUrl: 'https://quran.com/tr/al-ikhlas' },
  { id: 113, name: 'Felak Suresi', arabic: 'الفلق', verses: 5, page: 604, desc: 'Sabah aydınlığı ve şerlerden sığınma', diyanetUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-felak-suresi', quranComUrl: 'https://quran.com/tr/al-falaq' },
  { id: 114, name: 'Nâs Suresi', arabic: 'الناس', verses: 6, page: 604, desc: 'Vesveselerden Allah\'a sığınma', diyanetUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-nas-suresi', quranComUrl: 'https://quran.com/tr/an-nas' },
  { id: 2, name: 'Bakara Suresi (Âyetü\'l-Kürsî)', arabic: 'البقرة', verses: 286, page: 2, desc: 'Kur\'an\'ın en uzun suresi ve en yüce ayeti', diyanetUrl: 'https://kuran.diyanet.gov.tr/mushaf/kuran-bakara-suresi', quranComUrl: 'https://quran.com/tr/al-baqarah' }
];

export const QURAN_JUZ_LIST = Array.from({ length: 30 }, (_, i) => {
  const juzNo = i + 1;
  const startPage = (juzNo - 1) * 20 + 1;
  return {
    juz: juzNo,
    title: `${juzNo}. Cüz`,
    startPage: startPage === 1 ? 1 : (juzNo === 1 ? 1 : (juzNo - 1) * 20 + 2),
    diyanetUrl: `https://kuran.diyanet.gov.tr/mushaf`,
    quranComUrl: `https://quran.com/tr/juz/${juzNo}`
  };
});

export const QURAN_SOURCES = [
  {
    id: 'diyanet-mushaf',
    title: 'Diyanet Mushaf-ı Şerif',
    desc: 'Diyanet İşleri Başkanlığı resmi hat ve sayfa düzeni ile Mushaf',
    icon: '🕋',
    url: 'https://kuran.diyanet.gov.tr/mushaf'
  },
  {
    id: 'quran-com',
    title: 'Kur\'an-ı Kerim & Sesli Tilavet',
    desc: 'Ayet ayet Türkçe meal, kelime meali ve dünyaca ünlü karilerden sesli tilavet',
    icon: '🎧',
    url: 'https://quran.com/tr'
  },
  {
    id: 'diyanet-kuran-portali',
    title: 'Diyanet Kur\'an Portalı',
    desc: 'Kur\'an Yolu Tefsiri, mealler ve tecvidli okuma',
    icon: '📖',
    url: 'https://kuran.diyanet.gov.tr'
  }
];
