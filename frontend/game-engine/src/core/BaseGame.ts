import type {
  ApplicationOptions,
  DestroyOptions,
  RendererDestroyOptions,
} from "pixi.js";
import {
  Application,
  Assets,
  //CullerPlugin,
  extensions,
  ResizePlugin,
} from "pixi.js";
import "pixi.js/app";

import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
// import { CreationAudioPlugin } from "../audio-pixi/AudioPlugin";
import { CreationAudioPlugin } from "../audio-howler/AudioPlugin";
import { CreationGameObjectPlugin } from "../gameobject/GameObjectPlugin";
import { LocalizePlugin } from "../localization/LocalizePlugin";
import { Logger } from "../logger/";
import { CreationNavigationPlugin } from "../navigation/NavigationPlugin";
import { CreationResizePlugin } from "../resize/ResizePlugin";
import { getResolution } from "../utils/GetResolution";

// register the PixiPlugin with GSAP
gsap.registerPlugin(PixiPlugin);

// Replace PixiJS default ResizePlugin with our custom implementation
extensions.remove(ResizePlugin);
extensions.add(CreationResizePlugin);
extensions.add(CreationAudioPlugin);
extensions.add(CreationNavigationPlugin);
extensions.add(CreationGameObjectPlugin);
extensions.add(LocalizePlugin);
//extensions.add(CullerPlugin);

/** Global instance of the game engine */
let instance: BaseGame | null = null;

/**
 * Get the main application engine
 * This is a simple way to access the engine instance from anywhere in the app
 * @returns The global Game instance
 */
export function getEngine(): BaseGame {
  return instance!;
}

/**
 * Set the global game engine instance
 * @param app The Game instance to set globally
 */
export function setEngine(app: BaseGame) {
  instance = app;
}

/**
 * The main creation engine class.
 *
 * This is a lightweight wrapper around the PixiJS Application class.
 * It provides a few additional features such as:
 * - Navigation manager
 * - Audio manager
 * - Resize handling
 * - Visibility change handling (pause/resume sounds)
 *
 * It also initializes the PixiJS application and loads any assets in the `preload` bundle.
 */
export class BaseGame extends Application {
  /**
   * Initialize the application
   * Sets up the game canvas, registers visibility events, and initializes core systems
   * @param opts Application configuration options
   * @returns Promise that resolves when initialization is complete
   */
  public async init(opts: Partial<ApplicationOptions>): Promise<void> {
    // Initialize registry for storing global game data
    this.registry = new Map<string, unknown>();

    // Set default options if not provided
    opts.resizeTo ??= window;
    opts.resolution ??= getResolution();

    await Assets.init({
      manifest: opts.manifest,
      basePath: opts.basePath || "assets",
    });

    try {
      // TODO -> Burada, en-US şeklinde kullanım olucaktır, bu kullanım olursa eğer json dosyaları -> en-US şeklinde yapılandırmalıdır, Çünkü kanada ingilizcesi, amerikan ingilizcesi gibi farklılıkları çözümlenmesi ve çözülmesi gerekir.
      const lang = opts.language || navigator.language.split("-")[0] || "en";
      opts.language = lang;

      const languageAssetAlias = `${opts.languagePath ?? ""}/${lang}.json`;
      await Assets.load(languageAssetAlias);

      opts.translation = Assets.cache.get(languageAssetAlias);
    } catch (e) {
      Logger.error(`Error loading language file for ${opts.language}`, e);

      try {
        const fallbackLang = "en";
        const fallbackAlias = `${fallbackLang}.json`;
        await Assets.load(fallbackAlias);
        opts.translation = Assets.cache.get(fallbackAlias);
        opts.language = fallbackLang;
        Logger.log(`Fallback to ${fallbackLang} language`);
      } catch (fallbackError) {
        Logger.error("Error loading fallback language", fallbackError);
      }
    }

    // Call parent initialization
    await super.init(opts);

     try {
      await Assets.loadBundle('sounds');
    } catch (error) {
      console.error("Varlık yükleme veya ses kaydı sırasında bir hata oluştu:", error);
    }

    //this.navigation.container.cullable = opts.cullable ?? false;
    this.options = opts as ApplicationOptions;

    // Append the application canvas to the document body or specified parent
    if (opts.parentId) {
      document.getElementById(opts.parentId)!.appendChild(this.canvas);
    } else {
      document.body.appendChild(this.canvas);
    }

    // Add a visibility listener, so the app can pause sounds and screens
    document.addEventListener("visibilitychange", this.visibilityChange);
  }

  /**
   * Clean up and destroy the application
   * Removes event listeners and cleans up resources
   * @param rendererDestroyOptions Options for renderer destruction
   * @param options General destruction options
   */
  public override destroy(
    rendererDestroyOptions: RendererDestroyOptions = false,
    options: DestroyOptions = false
  ): void {
    // Remove event listeners
    document.removeEventListener("visibilitychange", this.visibilityChange);

    // Call parent destroy
    super.destroy(rendererDestroyOptions, options);
  }

  /**
   * Handler for document visibility changes
   * Manages audio and screen focus when app loses or gains focus
   * @private
   */
  protected visibilityChange = () => {
    if (document.hidden) {
      // When tab is hidden, mute audio and notify screens
      this.navigation.blur();
    } else {
      // When tab becomes visible again, unmute audio and restore focus
      this.navigation.focus();
    }
  };

  /**
   * Registry for storing global game data
   */
  public registry!: Map<string, unknown>;
}
