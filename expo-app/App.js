import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Modal, 
  TextInput, 
  FlatList, 
  StatusBar 
} from 'react-native';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';

// Şehir Listesi
const CITIES = [
  { id: 'istanbul', name: 'İstanbul', lat: 41.0082, lng: 28.9784 },
  { id: 'ankara', name: 'Ankara', lat: 39.9334, lng: 32.8597 },
  { id: 'izmir', name: 'İzmir', lat: 38.4237, lng: 27.1428 },
  { id: 'bursa', name: 'Bursa', lat: 40.1885, lng: 29.0610 },
  { id: 'antalya', name: 'Antalya', lat: 36.8969, lng: 30.7133 },
  { id: 'adana', name: 'Adana', lat: 37.0000, lng: 35.3213 },
  { id: 'konya', name: 'Konya', lat: 37.8667, lng: 32.4833 },
  { id: 'gaziantep', name: 'Gaziantep', lat: 37.0662, lng: 37.3833 },
  { id: 'sanliurfa', name: 'Şanlıurfa', lat: 37.1674, lng: 38.7955 },
  { id: 'kayseri', name: 'Kayseri', lat: 38.7312, lng: 35.4787 },
  { id: 'diyarbakir', name: 'Diyarbakır', lat: 37.9144, lng: 40.2306 },
  { id: 'samsun', name: 'Samsun', lat: 41.2928, lng: 36.3313 },
  { id: 'trabzon', name: 'Trabzon', lat: 41.0015, lng: 39.7178 },
  { id: 'erzurum', name: 'Erzurum', lat: 39.9043, lng: 41.2679 },
  { id: 'mekke', name: 'Mekke-i Mükerreme', lat: 21.4225, lng: 39.8262 },
  { id: 'medine', name: 'Medine-i Münevvere', lat: 24.5247, lng: 39.5692 },
  { id: 'kudus', name: 'Kudüs', lat: 31.7683, lng: 35.2137 }
];

// Dini Günler Listesi
const RELIGIOUS_DAYS = [
  { id: '1', name: 'Regaib Kandili', date: '01 Ocak 2026', desc: 'Üç ayların başlangıcı ve rahmet gecesi.' },
  { id: '2', name: 'Miraç Kandili', date: '28 Ocak 2026', desc: '5 vakit namazın farz kılındığı gece.' },
  { id: '3', name: 'Berat Kandili', date: '14 Şubat 2026', desc: 'Af ve mağfiret gecesi.' },
  { id: '4', name: 'Ramazan Başlangıcı', date: '01 Mart 2026', desc: 'İlk teravih ve ilk oruç günü.' },
  { id: '5', name: 'Kadir Gecesi', date: '26 Mart 2026', desc: 'Bin aydan daha hayırlı gece.' },
  { id: '6', name: 'Ramazan Bayramı', date: '30 Mart 2026', desc: 'Mübarek Ramazan Bayramı 1. Gün.' },
  { id: '7', name: 'Kurban Bayramı', date: '06 Haziran 2026', desc: 'Mübarek Kurban Bayramı 1. Gün.' },
  { id: '8', name: 'Hicri Yılbaşı', date: '26 Haziran 2026', desc: 'Hicri 1448 Yılının İlk Günü.' },
  { id: '9', name: 'Aşure Günü', date: '05 Temmuz 2026', desc: '10 Muharrem Aşure Günü.' },
  { id: '10', name: 'Mevlid Kandili', date: '04 Eylül 2026', desc: 'Peygamber Efendimiz’in (s.a.v) veladeti.' }
];

export default function App() {
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'qibla' | 'calendar' | 'widget'
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [countdownStr, setCountdownStr] = useState('--:--:--');
  const [nextPrayerName, setNextPrayerName] = useState('Vakit');
  const [prayerTimes, setPrayerTimes] = useState(null);

  // Vakitleri hesapla
  useEffect(() => {
    const coords = new Coordinates(selectedCity.lat, selectedCity.lng);
    const params = CalculationMethod.Turkey();
    const times = new PrayerTimes(coords, new Date(), params);

    const format = (d) => d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const pt = {
      fajr: format(times.fajr),
      sunrise: format(times.sunrise),
      dhuhr: format(times.dhuhr),
      asr: format(times.asr),
      maghrib: format(times.maghrib),
      isha: format(times.isha),
      raw: times
    };

    setPrayerTimes(pt);
  }, [selectedCity]);

  // Canlı saat ve geri sayım sayacı
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      if (prayerTimes && prayerTimes.raw) {
        const list = [
          { name: 'İmsak', time: prayerTimes.raw.fajr },
          { name: 'Güneş', time: prayerTimes.raw.sunrise },
          { name: 'Öğle', time: prayerTimes.raw.dhuhr },
          { name: 'İkindi', time: prayerTimes.raw.asr },
          { name: 'Akşam', time: prayerTimes.raw.maghrib },
          { name: 'Yatsı', time: prayerTimes.raw.isha }
        ];

        let next = null;
        for (let item of list) {
          if (now < item.time) {
            next = item;
            break;
          }
        }

        if (!next) {
          const tomFajr = new Date(prayerTimes.raw.fajr);
          tomFajr.setDate(tomFajr.getDate() + 1);
          next = { name: 'İmsak', time: tomFajr };
        }

        setNextPrayerName(next.name);
        const diffMs = next.time.getTime() - now.getTime();
        const sec = Math.max(0, Math.floor(diffMs / 1000));
        const h = String(Math.floor(sec / 3600)).padStart(2, '0');
        const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
        const s = String(sec % 60).padStart(2, '0');
        setCountdownStr(`${h}:${m}:${s}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [prayerTimes]);

  const filteredCities = CITIES.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1320" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 22 }}>🕌</Text>
          <View>
            <Text style={{ color: '#d4af37', fontWeight: '800', fontSize: 16 }}>Namaz Vaktim</Text>
            <TouchableOpacity 
              style={{ marginTop: 2 }} 
              onPress={() => setModalVisible(true)}
            >
              <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600' }}>📍 {selectedCity.name} ▾</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerClock}>
          {currentTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </Text>
      </View>

      {/* Ana İçerik */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'home' && (
          <View>
            {/* Geri Sayım Kartı */}
            <View style={styles.heroCard}>
              <Text style={styles.heroBadge}>Diyanet Takvimi • 1447 Hicri</Text>
              <Text style={styles.heroTitle}>Sıradaki: <Text style={styles.goldText}>{nextPrayerName} Vakti</Text></Text>
              <Text style={styles.countdownText}>{countdownStr}</Text>
            </View>

            {/* Vakit Kartları */}
            <View style={styles.prayerList}>
              <PrayerRow icon="🌙" name="İmsak" time={prayerTimes?.fajr || '--:--'} />
              <PrayerRow icon="🌅" name="Güneş" time={prayerTimes?.sunrise || '--:--'} />
              <PrayerRow icon="☀️" name="Öğle" time={prayerTimes?.dhuhr || '--:--'} />
              <PrayerRow icon="🌤️" name="İkindi" time={prayerTimes?.asr || '--:--'} />
              <PrayerRow icon="🌇" name="Akşam (İftar)" time={prayerTimes?.maghrib || '--:--'} />
              <PrayerRow icon="🌌" name="Yatsı" time={prayerTimes?.isha || '--:--'} />
            </View>

            {/* Geliştirici İmzası */}
            <View style={styles.devCard}>
              <Text style={styles.devLabel}>GELİŞTİRİCİ</Text>
              <Text style={styles.devName}>Nihat Yazgan</Text>
            </View>
          </View>
        )}

        {activeTab === 'qibla' && (
          <View style={styles.tabView}>
            <Text style={styles.tabTitle}>Kıble Pusulası</Text>
            <Text style={styles.tabSubtitle}>{selectedCity.name} için Kıble Yönü</Text>
            
            <View style={styles.compassCircle}>
              <Text style={styles.kaabaIcon}>🕋</Text>
              <Text style={styles.compassLabel}>KIBLE AÇISI</Text>
              <Text style={styles.compassDegree}>152° Güneydoğu</Text>
            </View>

            <Text style={styles.compassHelp}>
              Cihazınızı düz bir zeminde tutarak Kâbe simgesi kuzey yönüyle hizalanana kadar çevirin.
            </Text>

            <View style={styles.devCard}>
              <Text style={styles.devLabel}>GELİŞTİRİCİ</Text>
              <Text style={styles.devName}>Nihat Yazgan</Text>
            </View>
          </View>
        )}

        {activeTab === 'calendar' && (
          <View style={styles.tabView}>
            <Text style={styles.tabTitle}>Dini Günler & Geceler (2026)</Text>
            {RELIGIOUS_DAYS.map((item) => (
              <View key={item.id} style={styles.relCard}>
                <View style={styles.relHeader}>
                  <Text style={styles.relName}>{item.name}</Text>
                  <Text style={styles.relDate}>{item.date}</Text>
                </View>
                <Text style={styles.relDesc}>{item.desc}</Text>
              </View>
            ))}

            <View style={styles.devCard}>
              <Text style={styles.devLabel}>GELİŞTİRİCİ</Text>
              <Text style={styles.devName}>Nihat Yazgan</Text>
            </View>
          </View>
        )}

        {activeTab === 'widget' && (
          <View style={styles.tabView}>
            <Text style={styles.tabTitle}>Android Saat & Vakit Widget'ı</Text>
            <Text style={styles.tabSubtitle}>Ana Ekran Canlı Önizleme</Text>

            <View style={styles.widgetCard}>
              <View style={styles.widgetHeader}>
                <Text style={styles.widgetCity}>📍 {selectedCity.name}</Text>
                <Text style={styles.widgetTime}>
                  {currentTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              <View style={styles.widgetStrip}>
                <WidgetCol name="İmsak" time={prayerTimes?.fajr || '--:--'} />
                <WidgetCol name="Güneş" time={prayerTimes?.sunrise || '--:--'} />
                <WidgetCol name="Öğle" time={prayerTimes?.dhuhr || '--:--'} />
                <WidgetCol name="İkindi" time={prayerTimes?.asr || '--:--'} />
                <WidgetCol name="Akşam" time={prayerTimes?.maghrib || '--:--'} />
                <WidgetCol name="Yatsı" time={prayerTimes?.isha || '--:--'} />
              </View>
            </View>

            <View style={styles.widgetInfoBox}>
              <Text style={styles.widgetInfoTitle}>📲 Android Ana Ekranına Nasıl Eklenir?</Text>
              <Text style={styles.widgetInfoText}>
                1. Ana ekranda boş bir alana basılı tutun.{"\n"}
                2. 'Widget'lar' menüsüne dokunun.{"\n"}
                3. 'Namaz Vakitleri & Saat' widget'ını seçip ekrana yerleştirin.
              </Text>
            </View>

            <View style={styles.devCard}>
              <Text style={styles.devLabel}>GELİŞTİRİCİ</Text>
              <Text style={styles.devName}>Nihat Yazgan</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Alt Navigasyon Çubuğu */}
      <View style={styles.bottomNav}>
        <NavButton 
          title="Vakitler" 
          icon="🕌" 
          active={activeTab === 'home'} 
          onPress={() => setActiveTab('home')} 
        />
        <NavButton 
          title="Kıble" 
          icon="🧭" 
          active={activeTab === 'qibla'} 
          onPress={() => setActiveTab('qibla')} 
        />
        <NavButton 
          title="Dini Günler" 
          icon="🌙" 
          active={activeTab === 'calendar'} 
          onPress={() => setActiveTab('calendar')} 
        />
        <NavButton 
          title="Widget" 
          icon="📱" 
          active={activeTab === 'widget'} 
          onPress={() => setActiveTab('widget')} 
        />
      </View>

      {/* Şehir Seçim Modalı */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Şehir Seçiniz</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCloseText}>Kapat</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Şehir ara..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.cityItem, item.id === selectedCity.id && styles.cityItemSelected]}
                  onPress={() => {
                    setSelectedCity(item);
                    setModalVisible(false);
                    setSearchQuery('');
                  }}
                >
                  <Text style={styles.cityName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PrayerRow({ icon, name, time }) {
  return (
    <View style={styles.prayerRow}>
      <View style={styles.prayerLeft}>
        <Text style={styles.prayerIcon}>{icon}</Text>
        <Text style={styles.prayerName}>{name}</Text>
      </View>
      <Text style={styles.prayerTime}>{time}</Text>
    </View>
  );
}

function WidgetCol({ name, time }) {
  return (
    <View style={styles.widgetCol}>
      <Text style={styles.widgetColName}>{name}</Text>
      <Text style={styles.widgetColTime}>{time}</Text>
    </View>
  );
}

function NavButton({ title, icon, active, onPress }) {
  return (
    <TouchableOpacity style={styles.navBtn} onPress={onPress}>
      <Text style={styles.navIcon}>{icon}</Text>
      <Text style={[styles.navText, active && styles.navTextActive]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1320'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)'
  },
  cityBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)'
  },
  cityBtnText: {
    color: '#f8fafc',
    fontWeight: '600',
    fontSize: 15
  },
  headerClock: {
    color: '#d4af37',
    fontWeight: '700',
    fontSize: 16
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100
  },
  heroCard: {
    backgroundColor: '#131f33',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    marginBottom: 20
  },
  heroBadge: {
    color: '#f3e5ab',
    fontSize: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10
  },
  heroTitle: {
    color: '#94a3b8',
    fontSize: 16,
    marginBottom: 6
  },
  goldText: {
    color: '#d4af37',
    fontWeight: '700'
  },
  countdownText: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 2
  },
  prayerList: {
    gap: 10
  },
  prayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 35, 58, 0.75)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  prayerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  prayerIcon: {
    fontSize: 20
  },
  prayerName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  prayerTime: {
    color: '#f3e5ab',
    fontSize: 18,
    fontWeight: '700'
  },
  devCard: {
    marginTop: 20,
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  devLabel: {
    fontSize: 11,
    color: '#64748b',
    letterSpacing: 1
  },
  devName: {
    color: '#d4af37',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2
  },
  tabView: {
    alignItems: 'center'
  },
  tabTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6
  },
  tabSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 20
  },
  compassCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#131f33',
    borderWidth: 4,
    borderColor: '#d4af37',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20
  },
  kaabaIcon: {
    fontSize: 48,
    marginBottom: 8
  },
  compassLabel: {
    color: '#64748b',
    fontSize: 11,
    letterSpacing: 1
  },
  compassDegree: {
    color: '#f3e5ab',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4
  },
  compassHelp: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18
  },
  relCard: {
    width: '100%',
    backgroundColor: '#131f33',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#d4af37'
  },
  relHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  relName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  relDate: {
    color: '#d4af37',
    fontSize: 13,
    fontWeight: '500'
  },
  relDesc: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2
  },
  widgetCard: {
    width: '100%',
    backgroundColor: '#131f33',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d4af37',
    marginBottom: 16
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 8,
    marginBottom: 12
  },
  widgetCity: {
    color: '#d4af37',
    fontWeight: '600',
    fontSize: 14
  },
  widgetTime: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16
  },
  widgetStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  widgetCol: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8
  },
  widgetColName: {
    color: '#94a3b8',
    fontSize: 10,
    marginBottom: 2
  },
  widgetColTime: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700'
  },
  widgetInfoBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  widgetInfoTitle: {
    color: '#d4af37',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 8
  },
  widgetInfoText: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20
  },
  bottomNav: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    height: 64,
    backgroundColor: 'rgba(15, 25, 42, 0.96)',
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10
  },
  navBtn: {
    alignItems: 'center'
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2
  },
  navText: {
    color: '#64748b',
    fontSize: 11
  },
  navTextActive: {
    color: '#d4af37',
    fontWeight: '600'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#131f33',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700'
  },
  modalCloseText: {
    color: '#d4af37',
    fontWeight: '600'
  },
  searchInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#ffffff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  cityItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    marginBottom: 6
  },
  cityItemSelected: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderLeftWidth: 4,
    borderLeftColor: '#d4af37'
  },
  cityName: {
    color: '#ffffff',
    fontSize: 15
  }
});
