import { Slot } from "slot-game-engine";
import { MainScreen } from "./screens/MainScreen";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { ApplicationOptions, isMobile } from "pixi.js";
import { Engine, Logger } from "game-engine";

export const VERSION = "1.2.6";

// Create a new creation engine instance
(async () => {
  const baseOptions: Partial<ApplicationOptions> = {
    width: 1920,
    height: 1080,
    parentId: "game-canvas",
    manifest: "./manifest.json",
    // language: "tr",
    languagePath: "language",
    roundPixels: false,
    debug: {
      console: true,
      pixiExtension: true,
    },
    server: {
      protocol: "https",
      url: "storage.velorazed.com/api",
    },
    antialias: true,
    resolution: 2,
    //autoDensity: true,
    sharedTicker: true,
  };
  // Resize options with cleaner structure
  const resizeOptions: Engine.ResizeOptions = {
    forceOrientation: "landscape",
    delay: 250,
    gameConfig: {
      landscape: {
        width: 1920,
        height: 1080,

        minWidth: 1200,
        minHeight: 600,
      },
      portrait: null,
    },
    scaleMode: "cover",
  };
  console.log("isMobile:", isMobile);
  // Mobile-specific configurations
  if (isMobile.any) {
    resizeOptions.forceOrientation = "auto";
    resizeOptions.scaleMode = "stretch";

    const DESIGN_L = { w: 1920, h: 1080 };
    const DESIGN_P_W = 1080;
    const MIN_RATIO = 2.0;     // 18:9
    const MAX_RATIO = 2.17;    // 19.5:9

    // Cihaz oranını (ilk ölçüm) al
    const vh = window.visualViewport?.height ?? window.innerHeight;
    const vw = window.visualViewport?.width ?? window.innerWidth;
    const deviceRatio = vh / vw;
    const targetRatio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, deviceRatio));
    const portraitDesignH = Math.round(DESIGN_P_W * targetRatio);
    const portraitMinH = Math.round(DESIGN_P_W * MIN_RATIO); // 2160 yerine dinamik taban

    resizeOptions.delay = 100;

    resizeOptions.gameConfig = {
      landscape: {
        width: DESIGN_L.w,
        height: DESIGN_L.h,
        minWidth: 1500,
        minHeight: 900,
      },
      portrait: {
        width: DESIGN_P_W,
        height: portraitDesignH,
        minWidth: DESIGN_P_W,
        minHeight: portraitMinH,
      },
    };
  }
  baseOptions.resizeOptions = resizeOptions;
  await Slot.CreateSlotGame(baseOptions).then(async (game: any) => {
    await game.slot.server
      .init()
      .then(async () => {
        Logger.info("Game version:", VERSION);
        (globalThis as any).showSplash(false);
        await game.navigation.showScreen(WelcomeScreen);
        await game.navigation.showScreen(MainScreen);
      })
      .catch((error: Error) => {
        console.error("Error initializing slot server:", error);
      });
  });
})();
