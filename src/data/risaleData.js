/**
 * e-Risale.com Resmi Külliyat Kitaplığı ve Veri Modeli
 * Kaynak: https://www.erisale.com/
 */

export const ERISALE_BOOKS = [
  {
    id: 'sozler',
    code: 1,
    name: 'Sözler',
    pageCount: 1041,
    icon: '📖',
    category: 'Ana Eserler',
    desc: 'İman hakikatleri, namazın hakikati, haşir ve kâinat tefsiri (33 Söz)',
    url: 'https://www.erisale.com/#content.tr.1.1',
    popularSections: [
      { name: 'Birinci Söz (Bismillah Risalesi)', page: 27, url: 'https://www.erisale.com/#content.tr.1.27' },
      { name: 'Dördüncü Söz (Günde Bir Saat Namaz)', page: 47, url: 'https://www.erisale.com/#content.tr.1.47' },
      { name: 'Dokuzuncu Söz (Namazın Beş Vakti)', page: 70, url: 'https://www.erisale.com/#content.tr.1.70' },
      { name: 'Onuncu Söz (Haşir ve Âhiret)', page: 82, url: 'https://www.erisale.com/#content.tr.1.82' },
      { name: 'Yirmi Üçüncü Söz (İnsanın Mahiyeti ve İman)', page: 477, url: 'https://www.erisale.com/#content.tr.1.477' },
      { name: 'Otuz Üçüncü Söz (Pencereler Risalesi)', page: 948, url: 'https://www.erisale.com/#content.tr.1.948' }
    ]
  },
  {
    id: 'mektubat',
    code: 2,
    name: 'Mektubat',
    pageCount: 712,
    icon: '✉️',
    category: 'Ana Eserler',
    desc: 'İslamî sual ve cevaplar, Peygamber Mucizeleri ve hakikat mektupları',
    url: 'https://www.erisale.com/#content.tr.2.1',
    popularSections: [
      { name: 'Birinci Mektup (Dört Mühim Sual)', page: 1, url: 'https://www.erisale.com/#content.tr.2.1' },
      { name: 'On Dokuzuncu Mektup (Mu\'cizât-ı Ahmediye)', page: 121, url: 'https://www.erisale.com/#content.tr.2.121' },
      { name: 'Yirminci Mektup (Tevhid Kelimesi Mertebeleri)', page: 289, url: 'https://www.erisale.com/#content.tr.2.289' },
      { name: 'Yirmi İkinci Mektup (Uhuvvet Risalesi)', page: 341, url: 'https://www.erisale.com/#content.tr.2.341' }
    ]
  },
  {
    id: 'lemalar',
    code: 3,
    name: 'Lem\'alar',
    pageCount: 663,
    icon: '✨',
    category: 'Ana Eserler',
    desc: 'İhlas, Uhuvvet, Hastalar, İktisat ve sünnet-i seniyye nurları (33 Lem\'a)',
    url: 'https://www.erisale.com/#content.tr.3.1',
    popularSections: [
      { name: 'On Birinci Lem\'a (Sünnet-i Seniyye)', page: 90, url: 'https://www.erisale.com/#content.tr.3.90' },
      { name: 'On İkinci Lem\'a (Kur\'an Hikmeti)', page: 104, url: 'https://www.erisale.com/#content.tr.3.104' },
      { name: 'On Dokuzuncu Lem\'a (İktisat Risalesi)', page: 201, url: 'https://www.erisale.com/#content.tr.3.201' },
      { name: 'Yirminci Lem\'a (İhlas Risalesi)', page: 215, url: 'https://www.erisale.com/#content.tr.3.215' },
      { name: 'Yirmi Beşinci Lem\'a (Hastalar Risalesi - 25 Deva)', page: 301, url: 'https://www.erisale.com/#content.tr.3.301' },
      { name: 'Yirmi Altıncı Lem\'a (İhtiyarlar Risalesi)', page: 337, url: 'https://www.erisale.com/#content.tr.3.337' }
    ]
  },
  {
    id: 'sualar',
    code: 4,
    name: 'Şuâlar',
    pageCount: 923,
    icon: '☀️',
    category: 'Ana Eserler',
    desc: 'Âyetü\'l-Kübrâ, Meyve Risalesi, Elhüccetü\'z-Zehra ve mahkeme müdafaaları',
    url: 'https://www.erisale.com/#content.tr.4.1',
    popularSections: [
      { name: 'Yedinci Şuâ (Âyetü\'l-Kübrâ)', page: 120, url: 'https://www.erisale.com/#content.tr.4.120' },
      { name: 'On Birinci Şuâ (Meyve Risalesi)', page: 247, url: 'https://www.erisale.com/#content.tr.4.247' },
      { name: 'On Beşinci Şuâ (Elhüccetü\'z-Zehra)', page: 693, url: 'https://www.erisale.com/#content.tr.4.693' }
    ]
  },
  {
    id: 'mesnevi',
    code: 5,
    name: 'Mesnevî-i Nuriye',
    pageCount: 337,
    icon: '🌟',
    category: 'Tefekkür ve Hakikat',
    desc: 'Risale-i Nur\'un fidanlığı ve Arapça tefekkür çekirdekleri',
    url: 'https://www.erisale.com/#content.tr.5.1',
    popularSections: [
      { name: 'Habbe', page: 97, url: 'https://www.erisale.com/#content.tr.5.97' },
      { name: 'Katre', page: 41, url: 'https://www.erisale.com/#content.tr.5.41' },
      { name: 'Zühre', page: 177, url: 'https://www.erisale.com/#content.tr.5.177' }
    ]
  },
  {
    id: 'isarat',
    code: 6,
    name: 'İşârâtü\'l-İ\'câz',
    pageCount: 384,
    icon: '📗',
    category: 'Kur\'an Tefsiri',
    desc: 'Fatiha ve Bakara Surelerinin harp meydanında yazılan harika tefsiri',
    url: 'https://www.erisale.com/#content.tr.6.1',
    popularSections: [
      { name: 'Fatiha Suresi Tefsiri', page: 23, url: 'https://www.erisale.com/#content.tr.6.23' },
      { name: 'Bakara Suresi Tefsiri', page: 43, url: 'https://www.erisale.com/#content.tr.6.43' }
    ]
  },
  {
    id: 'asayimusa',
    code: 7,
    name: 'Asâ-yı Mûsâ',
    pageCount: 343,
    icon: '🌿',
    category: 'İman ve Rehber',
    desc: 'Gençlik rehberi, kabir ve ahiret hakikatleri ile Hüccetullahi\'l-Bâliğa',
    url: 'https://www.erisale.com/#content.tr.7.1',
    popularSections: [
      { name: 'Meyve Risalesi (11 Mesele)', page: 17, url: 'https://www.erisale.com/#content.tr.7.17' },
      { name: 'Hüccetullahi\'l-Bâliğa', page: 181, url: 'https://www.erisale.com/#content.tr.7.181' }
    ]
  },
  {
    id: 'barla',
    code: 8,
    name: 'Barla Lahikası',
    pageCount: 527,
    icon: '🏔️',
    category: 'Hizmet ve Mektuplar',
    desc: 'Risale-i Nur\'un ilk telif mektupları ve saff-ı evvel talebelerin fıkraları',
    url: 'https://www.erisale.com/#content.tr.8.1',
    popularSections: [
      { name: 'Barla Hayatı ve İlk Mektuplar', page: 1, url: 'https://www.erisale.com/#content.tr.8.1' }
    ]
  },
  {
    id: 'kastamonu',
    code: 9,
    name: 'Kastamonu Lahikası',
    pageCount: 329,
    icon: '🌲',
    category: 'Hizmet ve Mektuplar',
    desc: 'Kastamonu dönemi mektupları, hizmet esasları ve istikamet dersleri',
    url: 'https://www.erisale.com/#content.tr.9.1',
    popularSections: [
      { name: 'Kastamonu Mektupları', page: 1, url: 'https://www.erisale.com/#content.tr.9.1' }
    ]
  },
  {
    id: 'emirdag',
    code: 10,
    name: 'Emirdağ Lahikası',
    pageCount: 638,
    icon: '🌾',
    category: 'Hizmet ve Mektuplar',
    desc: 'Emirdağ hayatı, cemiyet meseleleri, siyaset ve alem-i İslam mektupları',
    url: 'https://www.erisale.com/#content.tr.10.1',
    popularSections: [
      { name: 'Emirdağ Lahikası - I', page: 1, url: 'https://www.erisale.com/#content.tr.10.1' },
      { name: 'Emirdağ Lahikası - II', page: 341, url: 'https://www.erisale.com/#content.tr.10.341' }
    ]
  },
  {
    id: 'imanvekufr',
    code: 11,
    name: 'İman Ve Küfür Muvazeneleri',
    pageCount: 253,
    icon: '⚖️',
    category: 'Tefekkür ve Hakikat',
    desc: 'İman ile küfrün, hidayet ile dalaletin dünya ve ahiretteki mukayesesi',
    url: 'https://www.erisale.com/#content.tr.11.1',
    popularSections: [
      { name: 'Giriş ve Mukayeseler', page: 1, url: 'https://www.erisale.com/#content.tr.11.1' }
    ]
  },
  {
    id: 'sikke',
    code: 12,
    name: 'Sikke-i Tasdik-i Gaybî',
    pageCount: 364,
    icon: '🎖️',
    category: 'İşarat ve Müjdeler',
    desc: 'Kur\'an ayetleri ve hadis-i şeriflerin Risale-i Nur\'a gaybî işaretleri',
    url: 'https://www.erisale.com/#content.tr.12.1',
    popularSections: [
      { name: 'Birinci Şua (Ayetlerin İşaretleri)', page: 69, url: 'https://www.erisale.com/#content.tr.12.69' },
      { name: 'Sekizinci Şua', page: 191, url: 'https://www.erisale.com/#content.tr.12.191' }
    ]
  },
  {
    id: 'muhakemat',
    code: 13,
    name: 'Muhâkemat',
    pageCount: 184,
    icon: '📐',
    category: 'Metodoloji ve Usul',
    desc: 'Kur\'an tefsirinin usulü, akıl-nakil dengesi, fen ve din ilimlerinin izacı',
    url: 'https://www.erisale.com/#content.tr.13.1',
    popularSections: [
      { name: 'Unsuru\'l-Hakikat', page: 13, url: 'https://www.erisale.com/#content.tr.13.13' },
      { name: 'Unsuru\'l-Belagat', page: 79, url: 'https://www.erisale.com/#content.tr.13.79' },
      { name: 'Unsuru\'l-Akide', page: 133, url: 'https://www.erisale.com/#content.tr.13.133' }
    ]
  },
  {
    id: 'tarihce',
    code: 14,
    name: 'Tarihçe-i Hayat',
    pageCount: 918,
    icon: '📜',
    category: 'Biyografi ve Tarih',
    desc: 'Bediüzzaman Said Nursi\'nin ilk hayatı, Barla, Kastamonu, Emirdağ ve vefatı',
    url: 'https://www.erisale.com/#content.tr.14.1',
    popularSections: [
      { name: 'İlk Hayatı', page: 35, url: 'https://www.erisale.com/#content.tr.14.35' },
      { name: 'Barla Hayatı', page: 161, url: 'https://www.erisale.com/#content.tr.14.161' },
      { name: 'Eskişehir Hayatı', page: 235, url: 'https://www.erisale.com/#content.tr.14.235' },
      { name: 'Kastamonu Hayatı', page: 295, url: 'https://www.erisale.com/#content.tr.14.295' },
      { name: 'Denizli Hayatı', page: 407, url: 'https://www.erisale.com/#content.tr.14.407' },
      { name: 'Afyon Hayatı', page: 541, url: 'https://www.erisale.com/#content.tr.14.541' },
      { name: 'Isparta Hayatı ve Vefatı', page: 673, url: 'https://www.erisale.com/#content.tr.14.673' }
    ]
  },
  {
    id: 'ilklonem',
    code: 15,
    name: 'İlk Dönem Eserleri',
    pageCount: 625,
    icon: '🏛️',
    category: 'Eski Said Dönemi',
    desc: 'Nutuklar, Münazarat, Divan-ı Harb-i Örfi, Sünuhat ve Hutbe-i Şamiye',
    url: 'https://www.erisale.com/#content.tr.15.1',
    popularSections: [
      { name: 'Hutbe-i Şamiye', page: 529, url: 'https://www.erisale.com/#content.tr.15.529' },
      { name: 'Münazarat', page: 215, url: 'https://www.erisale.com/#content.tr.15.215' },
      { name: 'Sünuhat', page: 477, url: 'https://www.erisale.com/#content.tr.15.477' }
    ]
  }
];
