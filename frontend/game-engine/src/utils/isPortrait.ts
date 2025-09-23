import { getEngine } from "../core";

export function isPortrait(): boolean {
    return getEngine().screen.height > getEngine().screen.width;
}
export function measureBars(): { total: number; top: number; bottom: number; unit: 'lvh'|'dvh'|'vh' } {
  const vv = window.visualViewport;
  const visH = Math.round(vv?.height ?? document.documentElement.clientHeight ?? window.innerHeight);

  const supports = (unit: string) => !!(window.CSS && CSS.supports && CSS.supports('height', `100${unit}`));
  const probe = (value: string) => {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;z-index:-1;height:${value}`;
    document.body.appendChild(el);
    const h = Math.round(el.getBoundingClientRect().height);
    el.remove();
    return h;
  };

  const unit = supports('lvh') ? 'lvh' : (supports('dvh') ? 'dvh' : 'vh');
  const cssH = probe(`100${unit}`);
  const total = Math.max(0, cssH - visH);

  const measureEnv = (name: string) => {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;left:-9999px;top:-9999px;height:env(${name});width:0;visibility:hidden;pointer-events:none`;
    document.body.appendChild(el);
    const h = Math.round(el.getBoundingClientRect().height);
    el.remove();
    return h;
  };

  const bottomInset = measureEnv('safe-area-inset-bottom'); // iOS’ta >0, Android’de çoğunlukla 0
  const bottom = Math.min(total, bottomInset);
  const top = Math.max(0, total - bottom);

  return { total, top, bottom, unit: unit as 'lvh'|'dvh'|'vh' };
}

export function detectFullscreen(): boolean {
  // 1) Native Fullscreen API
  const nativeFs =
    !!(document.fullscreenElement ||
       (document as any).webkitFullscreenElement ||
       (document as any).mozFullScreenElement ||
       (document as any).msFullscreenElement);

  if (nativeFs) return true;

  // 2) display-mode (PWA / standalone)
  try {
    if (
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: standalone)').matches
    ) return true;
  } catch {}

  return false;
}