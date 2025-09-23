import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ImagePreloadService {
  private loaded = false;
  private avatarCache: HTMLImageElement[] = [];
  private uiCache: HTMLImageElement[] = [];
  private iconCache: HTMLImageElement[] = [];
  private avatars: string[] = [];
  private uiImages: string[] = [
    'images/aperion-white.png',
    'images/company-logo.png',
    'images/guide-1.png',
    'images/guide-2.png',
    'images/guide-3.png',
    'images/logo_mobile.png',
    'images/logo.png',
    'images/prov-fair.png',
  ];
  private icons: string[] = [
    'assets/icons/animation.png',
    'assets/icons/arrow-left.png',
    'assets/icons/arrow-right.png',
    'assets/icons/autoplay_off.png',
    'assets/icons/autoplay_on.png',
    'assets/icons/autoplay_start.png',
    'assets/icons/autoplay_stop.png',
    'assets/icons/back.png',
    'assets/icons/bet_down.png',
    'assets/icons/bet_up.png',
    'assets/icons/chat.png',
    'assets/icons/clear-icon.png',
    'assets/icons/close.png',
    'assets/icons/copy.png',
    'assets/icons/del-icon.png',
    'assets/icons/edit.png',
    'assets/icons/faur.png',
    'assets/icons/guide.png',
    'assets/icons/help.png',
    'assets/icons/history.png',
    'assets/icons/home.png',
    'assets/icons/laptop.png',
    'assets/icons/lock.png',
    'assets/icons/menu.png',
    'assets/icons/music.png',
    'assets/icons/payouts.png',
    'assets/icons/radio-off.png',
    'assets/icons/radio-on.png',
    'assets/icons/reply.png',
    'assets/icons/send.png',
    'assets/icons/server-icon.png',
    'assets/icons/single_bet.png',
    'assets/icons/sound.png',
    'assets/icons/stat.png',
    'assets/icons/toggle_off.png',
    'assets/icons/toggle_on.png',
    'assets/icons/triangle-down.png',
    'assets/icons/undo.png',
  ];

  // TODO -> Burada network'e bak ve olmayan text'leri ekle !

  constructor() {
    // Pre-generate URLs
    this.avatars = Array.from({ length: 100 }, (_, i) => {
      const num = i.toString().padStart(2, '0'); // 00 → 99
      return `avatars/av-${num}.png`;
    });
  }

  /** Preload a single image and return Promise */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = (error) => {
        console.warn(`Failed to load image: ${url}`, error);
        // Hata durumunda bile resolve ediyoruz ki diğer resimler yüklenmeye devam etsin
        resolve(img);
      };
      
      img.src = url;
    });
  }

  /** Preload images into memory */
  async preload(): Promise<void> {
    if (this.loaded) return; // already done

    try {
      // Preload UI images
      this.uiCache = await Promise.all(
        this.uiImages.map(url => this.loadImage(url))
      );

      // Preload icons
      this.iconCache = await Promise.all(
        this.icons.map(url => this.loadImage(url))
      );

      // Preload avatars
      this.avatarCache = await Promise.all(
        this.avatars.map(url => this.loadImage(url))
      );

      this.loaded = true;
      
    } catch (error) {
      this.loaded = true; // Hata olsa bile devam etsin
    }
  }

  /** Returns avatar URLs for use in <img> */
  getAvatars(): string[] {
    return this.avatars;
  }

  /** Check if images are loaded */
  isLoaded(): boolean {
    return this.loaded;
  }
}