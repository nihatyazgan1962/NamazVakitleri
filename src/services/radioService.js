import Hls from 'hls.js';

/**
 * Canlı Radyo Oynatma ve Yönetim Servisi
 */
class RadioService {
  constructor() {
    this.audio = new Audio();
    this.hls = null;
    this.activeRadio = null;
    this.isPlaying = false;
    this.isLoading = false;
    this.onStateChange = null;

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.isLoading = false;
      this.notifyState();
    });

    this.audio.addEventListener('playing', () => {
      this.isPlaying = true;
      this.isLoading = false;
      this.notifyState();
    });

    this.audio.addEventListener('waiting', () => {
      this.isLoading = true;
      this.notifyState();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.isLoading = false;
      this.notifyState();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Radyo oynatma hatası:', e);
      this.isLoading = false;
      this.isPlaying = false;
      this.notifyState();
    });
  }

  notifyState() {
    if (typeof this.onStateChange === 'function') {
      this.onStateChange({
        radio: this.activeRadio,
        isPlaying: this.isPlaying,
        isLoading: this.isLoading
      });
    }
  }

  /**
   * Radyoyu Başlat veya Durdur
   */
  async playRadio(radio, stateCallback = null) {
    if (stateCallback) {
      this.onStateChange = stateCallback;
    }

    // Eğer aynı radyo çalıyorsa durdur
    if (this.activeRadio && this.activeRadio.id === radio.id && this.isPlaying) {
      this.stopRadio();
      return;
    }

    this.stopRadio();
    this.activeRadio = radio;
    this.isLoading = true;
    this.notifyState();

    const isHls = radio.url.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      if (this.hls) {
        this.hls.destroy();
      }
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30
      });
      this.hls.loadSource(radio.url);
      this.hls.attachMedia(this.audio);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.audio.play().catch(e => {
          console.warn('Otomatik oynatma engellendi:', e);
          this.isLoading = false;
          this.notifyState();
        });
      });
      this.hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.warn('HLS Fatal Error:', data);
          this.stopRadio();
        }
      });
    } else {
      // Doğrudan HTML5 audio (mp3 veya yerel HLS destekli Safari / Android)
      this.audio.src = radio.url;
      this.audio.load();
      try {
        await this.audio.play();
      } catch (e) {
        console.warn('Ses oynatılamadı:', e);
        this.isLoading = false;
        this.notifyState();
      }
    }
  }

  /**
   * Çalan radyoyu durdurur
   */
  stopRadio() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    this.audio.pause();
    this.audio.src = '';
    this.activeRadio = null;
    this.isPlaying = false;
    this.isLoading = false;
    this.notifyState();
  }
}

export const radioService = new RadioService();
