import { getCustomAudio } from './storageService.js';

/**
 * Üstün Kalite Ezan, Vakit Bildirimleri ve Akustik Ses Sentezleme Motoru
 */
class NotificationService {
  constructor() {
    this.audioCtx = null;
    this.currentAudio = null;
    this.isPlaying = false;
    this.audioTimeout = null;
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  async requestPermission() {
    if ('Notification' in window) {
      try {
        if (Notification.permission === 'granted') return true;
        const perm = await Notification.requestPermission();
        return perm === 'granted';
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  /**
   * Zengin HTML5 / Mobil Push Bildirimi Gönderme
   */
  showNotification(title, body, icon = '🕌') {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/icon.png',
          badge: '/icon.png',
          tag: 'namaz-vakti-alert',
          renotify: true,
          vibrate: [300, 150, 300, 150, 600],
          silent: false
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {
        console.warn('Bildirim gösterilemedi:', e);
      }
    }

    // Mobil Titreşim Motoru
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([400, 200, 400, 200, 600]);
      } catch (e) {}
    }
  }

  /**
   * Çalan tüm sesleri ve sentezleyicileri anında durdurur
   */
  stopAudio() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
    if (this.audioTimeout) {
      clearTimeout(this.audioTimeout);
      this.audioTimeout = null;
    }
    if (this.audioCtx && this.audioCtx.state === 'running') {
      try {
        this.audioCtx.suspend().catch(() => {});
      } catch (e) {}
    }
    this.isPlaying = false;
  }

  /**
   * Kullanıcının telefonundan yüklediği özel ses/MP3 dosyasını çalar
   */
  async playCustomAudio(audioId = 'default_custom') {
    this.stopAudio();
    let custom = await getCustomAudio(audioId);
    if (!custom || !custom.dataUrl) {
      custom = await getCustomAudio('default_custom');
    }

    if (custom && custom.dataUrl) {
      try {
        const audio = new Audio(custom.dataUrl);
        audio.preload = 'auto';
        this.currentAudio = audio;
        this.isPlaying = true;
        audio.onended = () => { this.isPlaying = false; };
        audio.onerror = () => {
          console.warn('Özel ses çalma hatası, makam ezanına geçiliyor.');
          this.playMelodicAlert('Vakit');
        };
        await audio.play();
        return true;
      } catch (e) {
        console.warn('Özel ses çalınamadı, makam melodisi çalınıyor:', e);
        this.playMelodicAlert('Vakit');
        return false;
      }
    } else {
      this.playMelodicAlert('Vakit');
      return false;
    }
  }

  /**
   * Akustik Ney, Rezonanslı Ud ve Ezan Makamı Sentezleyici
   * (Tamamen Offline, sıfır gecikme ve berrak akustik ses tonu)
   */
  playMelodicAlert(prayerName = 'Vakit') {
    this.stopAudio();
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    this.isPlaying = true;

    // Ana Master Gain (Sıcak dinamik kompresör & yumuşak çıkış)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.85, now);

    // Düşük geçiren filtre (Ney benzeri ipeksi sıcaklık)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.setValueAtTime(1.2, now);

    masterGain.connect(filter);
    filter.connect(ctx.destination);

    // Ezan Makam Motifleri & Frekans Tablosu (Rast & Hicaz Nüansları)
    const notes = [
      { f: 392.00, d: 0.85, t: 0.0, vol: 0.5 },   // Allâ-
      { f: 440.00, d: 0.75, t: 0.85, vol: 0.55 }, // -hu
      { f: 523.25, d: 1.4,  t: 1.6, vol: 0.65 },  // Ek-
      { f: 493.88, d: 1.0,  t: 3.0, vol: 0.55 },  // -ber
      
      { f: 392.00, d: 0.85, t: 4.2, vol: 0.5 },   // Allâ-
      { f: 440.00, d: 0.75, t: 5.05, vol: 0.55 }, // -hu
      { f: 523.25, d: 1.6,  t: 5.8, vol: 0.7 },   // Ek-ber
      
      { f: 440.00, d: 1.1,  t: 7.6, vol: 0.5 },   // Eşhedü
      { f: 392.00, d: 2.0,  t: 8.7, vol: 0.6 },   // en lâ ilâhe illallâh
      
      { f: 523.25, d: 1.1,  t: 11.0, vol: 0.6 },  // Hayya 'ale's-
      { f: 587.33, d: 1.6,  t: 12.1, vol: 0.65 }, // Salâh
      
      { f: 523.25, d: 1.2,  t: 14.0, vol: 0.55 }, // Hayya 'ale'l-
      { f: 440.00, d: 1.8,  t: 15.2, vol: 0.6 },  // Felâh
      
      { f: 392.00, d: 2.5,  t: 17.3, vol: 0.7 }   // Allâhu Ekber - Lâ ilâhe illallâh
    ];

    const totalDuration = 20.2;

    notes.forEach((note) => {
      const startTime = now + note.t;
      const stopTime = startTime + note.d;

      // 1. Ana Ney Rezonatörü (Sinüs Dalgası)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(note.f, startTime);

      // 2. Sıcak Armonik Gövde (Üçgen Dalga - 2. Harmonik)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(note.f * 2, startTime);

      // 3. İnce Nefes / Ud Tınısı (3. Harmonik hafif ton)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(note.f * 3, startTime);

      // Canlı Akustik Titreşim (Vibrato)
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(5.4, startTime); // 5.4 Hz doğal ney vibratosu
      lfoGain.gain.setValueAtTime(4.2, startTime);
      lfo.connect(osc1.frequency);
      lfo.connect(osc2.frequency);

      // Doğal ADSR Zarfı (Yumuşak akustik yükseliş ve tatlı sönüm)
      const attack = 0.16;
      const release = 0.28;

      gain1.gain.setValueAtTime(0.0001, startTime);
      gain1.gain.exponentialRampToValueAtTime(note.vol, startTime + attack);
      gain1.gain.exponentialRampToValueAtTime(note.vol * 0.75, stopTime - release);
      gain1.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      gain2.gain.setValueAtTime(0.0001, startTime);
      gain2.gain.exponentialRampToValueAtTime(note.vol * 0.28, startTime + attack);
      gain2.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      gain3.gain.setValueAtTime(0.0001, startTime);
      gain3.gain.exponentialRampToValueAtTime(note.vol * 0.08, startTime + attack);
      gain3.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      osc1.connect(gain1);
      gain1.connect(masterGain);

      osc2.connect(gain2);
      gain2.connect(masterGain);

      osc3.connect(gain3);
      gain3.connect(masterGain);

      osc1.start(startTime);
      osc2.start(startTime);
      osc3.start(startTime);
      lfo.start(startTime);

      osc1.stop(stopTime + 0.05);
      osc2.stop(stopTime + 0.05);
      osc3.stop(stopTime + 0.05);
      lfo.stop(stopTime + 0.05);
    });

    this.audioTimeout = setTimeout(() => {
      this.isPlaying = false;
    }, totalDuration * 1000);
  }

  /**
   * 2. Huzur Verici Akustik Ney Sentezleyici
   */
  playNeyMelody() {
    this.stopAudio();
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    this.isPlaying = true;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.8, now);
    masterGain.connect(ctx.destination);

    const neyNotes = [
      { f: 329.63, d: 1.2, t: 0.0, vol: 0.6 },  // E4
      { f: 369.99, d: 1.0, t: 1.2, vol: 0.65 }, // F#4
      { f: 392.00, d: 1.5, t: 2.2, vol: 0.7 },  // G4
      { f: 440.00, d: 1.8, t: 3.7, vol: 0.75 }, // A4
      { f: 392.00, d: 2.2, t: 5.5, vol: 0.7 }   // G4
    ];

    neyNotes.forEach(note => {
      const startTime = now + note.t;
      const stopTime = startTime + note.d;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.f, startTime);

      // Doğal hava nefesi hissi için ADSR
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(note.vol, startTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(note.vol * 0.7, stopTime - 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      // Vibrato
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(5.0, startTime);
      lfoGain.gain.setValueAtTime(3.5, startTime);
      lfo.connect(osc.frequency);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      lfo.start(startTime);
      osc.stop(stopTime + 0.05);
      lfo.stop(stopTime + 0.05);
    });

    this.audioTimeout = setTimeout(() => { this.isPlaying = false; }, 8000);
  }

  /**
   * 3. Doğa & Su / Huzurlu Çan Zili (Chime)
   */
  playNatureChime() {
    this.stopAudio();
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    this.isPlaying = true;

    const chimeNotes = [
      { f: 587.33, t: 0.0, d: 1.8, vol: 0.5 }, // D5
      { f: 739.99, t: 0.25, d: 2.0, vol: 0.55 }, // F#5
      { f: 880.00, t: 0.5, d: 2.2, vol: 0.6 }, // A5
      { f: 1174.66, t: 0.75, d: 2.8, vol: 0.65 } // D6
    ];

    chimeNotes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f, now + n.t);

      gain.gain.setValueAtTime(0.001, now + n.t);
      gain.gain.exponentialRampToValueAtTime(n.vol, now + n.t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + n.t);
      osc.stop(now + n.t + n.d);
    });

    this.audioTimeout = setTimeout(() => { this.isPlaying = false; }, 3600);
  }

  /**
   * 4. Kısa Bip / Ding Bildirim Tonu
   */
  playBeepAlert() {
    this.stopAudio();
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    this.isPlaying = true;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.setValueAtTime(1320, now + 0.12);

    gain1.gain.setValueAtTime(0.5, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.45);

    this.audioTimeout = setTimeout(() => { this.isPlaying = false; }, 600);
  }

  /**
   * Kristal Berraklığında Çift Tonlu Huzurlu Bildirim Melodisi
   */
  playShortChime() {
    this.stopAudio();
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    this.isPlaying = true;

    const chimeNotes = [
      { f: 523.25, t: 0,    d: 0.9, vol: 0.5 }, // C5
      { f: 659.25, t: 0.22, d: 1.1, vol: 0.55 }, // E5
      { f: 783.99, t: 0.44, d: 1.6, vol: 0.6 }  // G5
    ];

    chimeNotes.forEach(n => {
      const osc = ctx.createOscillator();
      const oscHarmonic = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f, now + n.t);

      oscHarmonic.type = 'triangle';
      oscHarmonic.frequency.setValueAtTime(n.f * 2, now + n.t);

      gain.gain.setValueAtTime(0.001, now + n.t);
      gain.gain.exponentialRampToValueAtTime(n.vol, now + n.t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);

      osc.connect(gain);
      oscHarmonic.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + n.t);
      oscHarmonic.start(now + n.t);
      osc.stop(now + n.t + n.d);
      oscHarmonic.stop(now + n.t + n.d);
    });

    this.audioTimeout = setTimeout(() => { this.isPlaying = false; }, 2200);
  }

  /**
   * Vakit Ayarına göre ses çal (ezan, ney, kisa, nature, beep, custom)
   */
  async playAlertBySetting(soundType, prayerName, prayerKey = null) {
    if (soundType === 'custom') {
      const audioId = prayerKey ? `audio_${prayerKey}` : 'default_custom';
      await this.playCustomAudio(audioId);
    } else if (soundType === 'ney') {
      this.playNeyMelody();
    } else if (soundType === 'kisa') {
      this.playShortChime();
    } else if (soundType === 'nature') {
      this.playNatureChime();
    } else if (soundType === 'beep') {
      this.playBeepAlert();
    } else {
      // 'ezan'
      const prayerAudio = prayerKey ? await getCustomAudio(`audio_${prayerKey}`) : null;
      if (prayerAudio && prayerAudio.dataUrl) {
        await this.playCustomAudio(`audio_${prayerKey}`);
      } else {
        this.playMelodicAlert(prayerName);
      }
    }
  }

  /**
   * Ezan vakti girdiğinde otomatik tetiklenir
   */
  async triggerPrayerAlert(prayerName, soundType = 'ezan', prayerKey = null) {
    await this.playAlertBySetting(soundType, prayerName, prayerKey);
    this.showNotification(
      `🕌 ${prayerName} Vakti Girdi`,
      `Huzur ve bereket vakti. ${prayerName} namazınızı eda edebilirsiniz.`
    );
  }

  /**
   * Vakit öncesi hatırlatma bildirimi (15 dk veya 30 dk önce)
   */
  async triggerPreAlert(prayerName, minsRemaining = 15) {
    this.playShortChime();
    this.showNotification(
      `⏳ ${prayerName} Vaktine ${minsRemaining} Dakika Kaldı`,
      `${prayerName} vaktine hazırlık yapabilirsiniz.`
    );
  }
}

export const notificationService = new NotificationService();
