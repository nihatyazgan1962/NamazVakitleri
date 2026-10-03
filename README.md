# 🕌 Namaz Vakitleri — Ezan Vakti, Kıble & Kuran Radyo

Türkiye'deki tüm şehirler için namaz vakitlerini gösteren, kıble yönünü hesaplayan, canlı Kuran radyosu içeren kapsamlı bir Android uygulamasıdır.

## ✨ Özellikler

- 🕐 Tüm Türkiye şehirleri için namaz vakitleri (Adhan.js — dini hesaplama motoru)
- 🧭 Kıble yönü hesaplama (GPS tabanlı)
- 📡 Canlı Kuran radyo istasyonları (HLS.js)
- 📻 HLS akış desteği
- 🗺️ Leaflet harita entegrasyonu
- 🔔 Ezan vakti bildirimleri
- 💾 Şehir tercihi kaydetme (IndexedDB / idb)
- 📱 Android APK (Capacitor wrapper)

## 🛠️ Teknolojiler

| Katman | Teknoloji |
|--------|-----------|
| Frontend | HTML5, CSS3, JavaScript (ES Modules) |
| Namaz Hesaplama | Adhan.js (Diyanet metodolojisi) |
| Ses Akışı | HLS.js |
| Harita | Leaflet.js |
| İkonlar | Lucide |
| Yerel DB | idb (IndexedDB wrapper) |
| Mobil Wrapper | Capacitor 6.x |
| Platform | Android APK |

## 📋 Gereksinimler

- Node.js 18+
- Android Studio
- Java 17+
- Android SDK 21+

## 🚀 Kurulum

```bash
npm install
npx cap sync android
npx cap open android
```

### APK Derleme
```powershell
.\apk_yap.ps1
# veya
.\apk_yap.bat
```

> ⚠️ **Not:** `.jdk21/` ve `cmdline-tools/` klasörleri proje dışında tutulmuştur.  
> Android SDK'yı kendiniz kurmanız gerekir: [developer.android.com/studio](https://developer.android.com/studio)

## 📁 Proje Yapısı

```
├── src/              # JavaScript kaynak dosyaları
│   ├── main.js
│   ├── cities.js
│   ├── radioData.js
│   └── quranData.js
├── public/           # Statik varlıklar
├── dist/             # Derlenmiş çıktı
├── expo-app/         # Expo mobil sürümü (alternatif)
├── android/          # Android native proje
└── package.json
```

## 👨‍💻 Geliştirici

**Yazgan Bilişim**  
E-posta: yazganbilisim2026@gmail.com
GitHub: [@nihatyazgan1962](https://github.com/nihatyazgan1962)
