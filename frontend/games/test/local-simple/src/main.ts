import { Engine } from "game-engine";
import { MainScreen } from "./app/screens/MainScreen";
import { WelcomeScreen } from "./app/screens/WelcomeScreen";
import { ApplicationOptions, isMobile } from "pixi.js";

// Create a new creation engine instance
const app = new Engine.BaseGame();
(globalThis as unknown as { __PIXI_APP__: Engine.BaseGame }).__PIXI_APP__ = app;
Engine.setEngine(app);

(async () => {  
  const baseOptions: Partial<ApplicationOptions> = {
    width: 1280,
    height: 720,
    parentId: "game-canvas",
    manifest: "./manifest.json",
    languagePath: "language",
    debug: {
      console: false,
      pixiExtension: true,
    },
    antialias: true,
    resolution: 1,
    sharedTicker: true,
  };

  const resizeOptions: Engine.ResizeOptions = {
    forceOrientation: "landscape",
    landscape: {},
    portrait: {},
    delay: 250,
  };

  if (isMobile.any) {
    resizeOptions.forceOrientation = "auto";
    resizeOptions.landscape = {
      width: 1280,
      height: 720,
      minWidth: 1280,
      minHeight: 720,
    };
    resizeOptions.portrait = {
      width: 720,
      height: 1280,
      minWidth: 720,
      minHeight: 800,
    };
  }
  baseOptions.resizeOptions = resizeOptions;

  await app.init(baseOptions).then(async () => {
    // Remove the splash screen
    const splash = document.querySelector(".LoadingContainer");
    if (splash) {
      splash.remove();
    }

    // Show welcome screen
    await app.navigation.showScreen(WelcomeScreen);

    // Show main screen
    await app.navigation.showScreen(MainScreen);

    console.log("Game initialized successfully!");
    console.log("Press Ctrl+U to show Angular UI");
    console.log("Press Ctrl+H to hide Angular UI");
  });
})();