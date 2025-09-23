// services/orientation.service.ts
import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OrientationService {
  private isLandscapeBlockedSubject = new BehaviorSubject<boolean>(false);
  readonly isLandscapeBlocked$ = this.isLandscapeBlockedSubject.asObservable();

  constructor(private ngZone: NgZone) {
    this.addListeners();
  }

/**
   * Explicit tablet detection (iPad, large Android, Surface with width >= 768).
   */
  public isTablet(): boolean {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const maxTouch = navigator.maxTouchPoints || 0;
    const width = window.innerWidth;

    const isIPad = /\b(iPad)\b/i.test(ua) || (platform === 'MacIntel' && maxTouch > 1);

    // Android tablets (Android but not Mobile, wider screens)
    const isAndroidTablet = /\bAndroid\b/i.test(ua) && !/\bMobile\b/i.test(ua);

    // Windows Surface (touch-enabled, width >= 768)
    const isWindowsSurface = /Windows/i.test(ua) && maxTouch > 0 && width >= 768;

    return isIPad || isAndroidTablet || isWindowsSurface;
  }

  /**
   * Phone detection (iPhone, Android Mobile, Pixel, small Surface < 768px).
   */
  public isMobile(): boolean {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const maxTouch = navigator.maxTouchPoints || 0;
    const width = window.innerWidth;

    const isIPad = /\b(iPad)\b/i.test(ua) || (platform === 'MacIntel' && maxTouch > 1);
    if (isIPad) return false;

    const isPhoneUA = /\b(iPhone|iPod|Pixel|Android|Mobile)\b/i.test(ua);

    // Fallback for small touch devices
    const isSmallTouch = 'ontouchstart' in window && maxTouch > 0 && width < 768;

    return isPhoneUA || isSmallTouch;
  }

  public isLandscape(): boolean {
    return window.matchMedia('(orientation: landscape)').matches;
  }

  private checkMobileLandscape = () => {
    const shouldBlock = this.isMobile() && this.isLandscape();
    this.ngZone.run(() => this.isLandscapeBlockedSubject.next(shouldBlock));
  };

  private addListeners() {
    window.addEventListener("load", this.checkMobileLandscape);
    window.addEventListener("resize", this.checkMobileLandscape);
    window.addEventListener("orientationchange", this.checkMobileLandscape);
  }
}
