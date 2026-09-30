/**
 * Canlı İslami ve Kültürel Radyolar Geniş Veri Modeli
 * Tüm Radyo Çeşitleri (Diyanet, Kur'an & Kâriler, Tasavvuf, Türk Musikisi & Sanat, Haber, Çocuk & Aile)
 */
export const ISLAMIC_RADIOS = [
  // 1. DİYANET & RESMİ İLİM RADYOLARI
  {
    id: 'diyanet_radyo',
    name: 'Diyanet Radyo',
    sub: 'Diyanet İşleri Başkanlığı Resmi Yayını',
    desc: 'İslam dini, tefsir, hadis, fıkıh, vaaz ve aile programları',
    icon: '🕌',
    category: 'Diyanet & İlim',
    url: 'https://eustr73.mediatriple.net/videoonlylive/mtikoimxnztxlive/broadcast_5e3c1171d7d2a.smil/playlist.m3u8'
  },
  {
    id: 'diyanet_kuran',
    name: 'Diyanet Kur\'an Radyo',
    sub: 'Kesintisiz 24 Saat Kur\'an-ı Kerim',
    desc: 'Dünyaca ünlü kârilerden aşr-ı şerifler, hatim ve mealler',
    icon: '📖',
    category: 'Kur\'an & Kâriler',
    url: 'https://eustr73.mediatriple.net/videoonlylive/mtikoimxnztxlive/broadcast_5e3c14192aa92.smil/playlist.m3u8'
  },
  {
    id: 'diyanet_risalet',
    name: 'Diyanet Risalet Radyo',
    sub: 'Sünnet-i Seniyye & Hadis-i Şerif',
    desc: 'Peygamber Efendimiz\'in (s.a.v.) mübarek hayatı ve ahlakı',
    icon: '📜',
    category: 'Diyanet & İlim',
    url: 'https://eustr73.mediatriple.net/videoonlylive/mtikoimxnztxlive/broadcast_5e3c1520b2626.smil/playlist.m3u8'
  },

  // 2. İSLAMİ SOHBET, TASAVVUF & VAAZ RADYOLARI
  {
    id: 'vav_radyo',
    name: 'Vav Radyo',
    sub: 'Kur\'an ve Sünnetin Işığında',
    desc: 'İslami sohbetler, musiki, aile ve dini kültür dersleri',
    icon: '✨',
    category: 'Tasavvuf & Sohbet',
    url: 'https://trkvz-radyolar.ercdn.net/radyovav/playlist.m3u8'
  },
  {
    id: 'akra_fm',
    name: 'Akra FM',
    sub: 'İlim, İrfan ve Tasavvuf',
    desc: 'M. Esad Coşan Hocaefendi sohbetleri, hadis dersleri ve tasavvuf',
    icon: '🌿',
    category: 'Tasavvuf & Sohbet',
    url: 'https://cdn2.akradyo.net/akracanli2/_definst_/livestream_aac/playlist.m3u8'
  },
  {
    id: 'semerkand_radyo',
    name: 'Semerkand Radyo',
    sub: 'Gönüller Sultanı',
    desc: 'Tasavvufi sohbetler, ilahiler, kasideler ve menkıbeler',
    icon: '🕊️',
    category: 'Tasavvuf & Sohbet',
    url: 'https://mtisvwurbfcyslive.mediatriple.net/mtisvwurbfcyslive/broadcast_58e23cb112296.smil/playlist.m3u8'
  },
  {
    id: 'dost_fm',
    name: 'Dost FM',
    sub: 'İyiliğin ve Kardeşliğin Sesi',
    desc: 'Samimi dini sohbetler, dualar, vaazlar ve İslami yayınlar',
    icon: '🤲',
    category: 'Tasavvuf & Sohbet',
    url: 'http://yayin.dostfm.com:8920/;'
  },
  {
    id: 'fatwa_radio',
    name: 'İslami İlimler & Fetva',
    sub: 'Fıkıh ve Dini Hükümler',
    desc: 'Sorularla İslamiyet, akide, ibadet ve muamelat dersleri',
    icon: '📚',
    category: 'Diyanet & İlim',
    url: 'https://qurango.net/radio/fatwa'
  },

  // 3. KUR'AN-I KERİM & DÜNYACA ÜNLÜ KÂRİLER
  {
    id: 'huzur_kuran',
    name: 'Huzur Kıraatleri (Sakeenah)',
    sub: 'Sakinleştirici Aşr-ı Şerifler',
    desc: 'Ruhu dinlendiren ve kalbe şifa veren özel Kur\'an tilavetleri',
    icon: '🌙',
    category: 'Kur\'an & Kâriler',
    url: 'https://qurango.net/radio/sakeenah'
  },
  {
    id: 'abdulbasit_mojawwad',
    name: 'Şeyh Abdüssamed (Mücevved)',
    sub: 'Tarihi Aşr-ı Şerif & Makam',
    desc: 'Abdulbasit Abdussamed\'in kalplere işleyen eşsiz aşr-ı şerifleri',
    icon: '🎙️',
    category: 'Kur\'an & Kâriler',
    url: 'https://qurango.net/radio/abdulbasit_abdulsamad_mojawwad'
  },
  {
    id: 'abdulbasit_murattal',
    name: 'Şeyh Abdüssamed (Hatim)',
    sub: 'Tam Hatm-i Şerif Tilaveti',
    desc: 'Abdulbasit Abdussamed\'in akıcı ve huşu dolu hatim tilaveti',
    icon: '📖',
    category: 'Kur\'an & Kâriler',
    url: 'https://qurango.net/radio/abdulbasit_abdulsamad'
  },
  {
    id: 'mishary_alafasi',
    name: 'Şeyh Mişari Raşid el-Afasi',
    sub: 'Kuveyt Mescid-i Kebir İmamı',
    desc: 'Mishary Alafasy\'nin tüm dünyada sevilen duygulu kıraatleri',
    icon: '🎙️',
    category: 'Kur\'an & Kâriler',
    url: 'https://qurango.net/radio/mishary_alafasi'
  },
  {
    id: 'maher_al_muaiqly',
    name: 'Şeyh Mahir el-Muaykili',
    sub: 'Kâbe-i Muazzama İmamı',
    desc: 'Mescid-i Haram Mekke imamından huşu dolu canlı tilavetler',
    icon: '🕋',
    category: 'Kur\'an & Kâriler',
    url: 'https://qurango.net/radio/maher_al_muaiqly'
  },
  {
    id: 'yasser_aldosari',
    name: 'Şeyh Yaser ed-Devseri',
    sub: 'Mescid-i Haram İmamı',
    desc: 'Yasser Al-Dosari\'nin tesirli ve coşkulu Kur\'an kıraati',
    icon: '🕋',
    category: 'Kur\'an & Kâriler',
    url: 'https://qurango.net/radio/yasser_aldosari'
  },
  {
    id: 'nasser_alqatami',
    name: 'Şeyh Nasır el-Katami',
    sub: 'Duygulu ve Teheccüd Kıraatleri',
    desc: 'Nasser Al-Qatami\'nin kalpleri titreten eşsiz Kur\'an tilavetleri',
    icon: '🎙️',
    category: 'Kur\'an & Kâriler',
    url: 'https://qurango.net/radio/nasser_alqatami'
  },
  {
    id: 'fares_abbad',
    name: 'Şeyh Fares Abbad',
    sub: 'Berrak ve Akıcı Kıraat',
    desc: 'Fares Abbad\'ın dinlendirici ve tesirli Kur\'an tilaveti',
    icon: '🎙️',
    category: 'Kur\'an & Kâriler',
    url: 'https://qurango.net/radio/fares_abbad'
  },
  {
    id: 'ali_jaber',
    name: 'Şeyh Ali Cabir',
    sub: 'Eski Kâbe-i Muazzama İmamı',
    desc: 'Unutulmaz Kâbe imamı Ali Jaber\'in gönüllere ferahlık veren sesi',
    icon: '🕋',
    category: 'Kur\'an & Kâriler',
    url: 'https://qurango.net/radio/ali_jaber'
  },
  {
    id: 'mustafa_ismail',
    name: 'Şeyh Mustafa İsmail',
    sub: 'Mısır Kur\'an Ekolü Üstadı',
    desc: 'Kur\'an tilavetinin büyük üstadı Mustafa İsmail tarihi kayıtları',
    icon: '🎙️',
    category: 'Kur\'an & Kâriler',
    url: 'https://qurango.net/radio/mustafa_ismail'
  },
  {
    id: 'roqiah_radio',
    name: 'Ruqyah Şer\'iyye (Şifa & Ayetler)',
    sub: 'Manevi Şifa ve Koruma Ayetleri',
    desc: 'Nazar, şifa, esenlik ve vesveseden korunma ayetleri yayını',
    icon: '🛡️',
    category: 'Kur\'an & Kâriler',
    url: 'https://qurango.net/radio/roqiah'
  },

  // 4. KÜLTÜR, TÜRK MUSİKİSİ & SANAT RADYOLARI
  {
    id: 'trt_radyo_1',
    name: 'TRT Radyo 1',
    sub: 'Kültür, Edebiyat, Bilim & Sanat',
    desc: 'Türkiye\'nin kültür hazinesi, tiyatro, edebiyat ve sohbet programları',
    icon: '📻',
    category: 'Kültür & Sanat',
    url: 'https://radyo.trt.net.tr/radyo1.m3u8'
  },
  {
    id: 'trt_nagme',
    name: 'TRT Nağme',
    sub: 'Klasik Türk & Tasavvuf Musikisi',
    desc: 'Ney taksimleri, ilahiler, peşrevler ve klasik Türk sanat musikisi',
    icon: '🎶',
    category: 'Kültür & Sanat',
    url: 'https://radyo.trt.net.tr/trtnagme.m3u8'
  },
  {
    id: 'trt_turku',
    name: 'TRT Türkü',
    sub: 'Anadolu İrfanı & Ezgiler',
    desc: 'Anadolu\'nun dört bir yanından türküler, bozlaklar ve ozanlar',
    icon: '🌾',
    category: 'Kültür & Sanat',
    url: 'https://radyo.trt.net.tr/trtturku.m3u8'
  },
  {
    id: 'trt_fm',
    name: 'TRT FM',
    sub: 'Hayata Dair Müzik & Sohbet',
    desc: 'Yol arkadaşınız; nezih müzikler, canlı yayınlar ve samimi sohbetler',
    icon: '🎼',
    category: 'Kültür & Sanat',
    url: 'https://radyo.trt.net.tr/trtfm.m3u8'
  },
  {
    id: 'trt_kurdi_radyo',
    name: 'TRT Kurdî Radyo',
    sub: 'Kültür, Müzik & Sohbet',
    desc: 'Bölgesel kültürel yayınlar, edebiyat, dini sohbetler ve ezgiler',
    icon: '🌍',
    category: 'Kültür & Sanat',
    url: 'https://radyo.trt.net.tr/kurdi.m3u8'
  },
  {
    id: 'trt_vot_world',
    name: 'TRT Türkiye\'nin Sesi (VOT)',
    sub: 'Voice of Turkey Uluslararası',
    desc: 'Türkiye\'den tüm dünyaya yayılan kültür, tarih ve kardeşlik sesi',
    icon: '🌐',
    category: 'Kültür & Sanat',
    url: 'https://radyo.trt.net.tr/trtvotworld.m3u8'
  },

  // 5. CANLI HABER & GÜNDEM RADYOLARI
  {
    id: 'trt_haber_radyo',
    name: 'TRT Haber Radyo',
    sub: '24 Saat Kesintisiz Canlı Haber',
    desc: 'Doğru ve tarafsız son dakika haberleri, analizler ve bültenler',
    icon: '📰',
    category: 'Haber & Gündem',
    url: 'https://radyo.trt.net.tr/trthaber.m3u8'
  },
  {
    id: 'a_haber_radyo',
    name: 'A Haber Radyo',
    sub: 'Gündem ve Son Dakika Yayını',
    desc: 'Türkiye ve dünya gündemi, sıcak gelişmeler ve canlı yayınlar',
    icon: '📢',
    category: 'Haber & Gündem',
    url: 'https://trkvz-radyolar.ercdn.net/ahaberradyo/playlist.m3u8'
  },
  {
    id: 'a_spor_radyo',
    name: 'A Spor Radyo',
    sub: 'Spor Dünyası ve Canlı Maçlar',
    desc: 'Süper Lig maç anlatımları, spor haberleri ve uzman yorumları',
    icon: '⚽',
    category: 'Haber & Gündem',
    url: 'https://trkvz-radyolar.ercdn.net/asporradyo/playlist.m3u8'
  },

  // 6. ÇOCUK & AİLE RADYOLARI
  {
    id: 'trt_diyanet_cocuk',
    name: 'TRT Diyanet Çocuk Radyo',
    sub: 'Minik Kalpler İçin Değerler Eğitimi',
    desc: 'Peygamberler tarihi, masallar, çocuk ilahileri ve eğitici hikayeler',
    icon: '🎈',
    category: 'Çocuk & Aile',
    url: 'https://radyo.trt.net.tr/diyanetcocuk.m3u8'
  }
];
