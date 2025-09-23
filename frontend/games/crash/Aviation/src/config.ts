import { Engine } from "game-engine";
import { ApplicationOptions, isMobile } from "pixi.js";

// Oyun script'inin (build.min.iife.js) yüklendiği host'tan assets kökünü üret
function resolveAssetBase(): string {
  // 1) Global override (Angular veya host sayfa set edebilir)
  const winBase = (globalThis as any).ASSET_BASE as string | undefined;
  if (winBase) return winBase.endsWith("/") ? winBase : `${winBase}/`;

  // 2) Vite env override
  const envBase = (import.meta as any)?.env?.VITE_ASSET_BASE as string | undefined;
  if (envBase) return envBase.endsWith("/") ? envBase : `${envBase}/`;

  // 3) Mevcut script'ten türet
  const current =
    (document.currentScript as HTMLScriptElement | null)?.src ||
    Array.from(document.getElementsByTagName("script"))
      .map(s => s.src)
      .find(src => /build\.min.*\.iife\.js$/i.test(src)) ||
    window.location.href;

  const base = new URL(".", current).toString();
  return new URL("./assets/", base).toString();
}

export function getConfig(): Partial<ApplicationOptions> {
  const assetBase = resolveAssetBase();
  
  const conf: Partial<ApplicationOptions> = {
    width           : 1600,
    height          : 900,
    // parentId: "game-canvas",
    manifest        : "manifest.json",
    basePath        : assetBase,
    languagePath    : "main/language",
    roundPixels     : false,
    debug: {
      console       : true,
      pixiExtension : true,
    },
    antialias       : true,
    resolution      : 1,
    sharedTicker    : true,
    resizeTo        : null // TODO -> Check metod refactors
  };

  // Resize options with cleaner structure
  const resizeOptions: Engine.ResizeOptions = {
    forceOrientation    : "landscape",
    delay               : 0,
    align               : {x:0.5, y:0.5},     // Top left alignment
    scaleMode           : "stretch",          // Fit the game to the screen
    gameConfig          : {
      landscape         : {
        width           : 1600,
        height          : 900,
        minWidth        : 800,
        minHeight       : 450,
      },
      portrait          : null,
    },
  };

  // Mobile-specific configurations
  if (isMobile.any) {
    resizeOptions.forceOrientation = "auto";
    resizeOptions.gameConfig = {
      landscape: {
        // --- Tasarım Çözünürlüğü (Endüstri standardı: 16:9) ---
        width     : 1600,
        height    : 900,

        // --- Güvenli Alan (UI için minimum boyutlar, oran: 3:2) ---
        minWidth  : 800, // Genişlik = 1080 * (3 / 2)
        minHeight : 450, // Yükseklik, tuval yüksekliği ile aynı
      },
      portrait: {
        // --- Tasarım Çözünürlüğü (Modern telefon oranı: 19.5:9) ---
        width     : 900,
        height    : 1600,

        // --- Güvenli Alan (UI için minimum boyutlar, oran: 18:9) ---
        minWidth  : 450, // Genişlik, tuval genişliği ile aynı
        minHeight : 800, // Yükseklik = 1080 * (18 / 9)
      },
    };
  }

  conf.resizeOptions = resizeOptions;
  return conf;
}