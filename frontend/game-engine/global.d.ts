import { AssetsManifest, FillInput, PointData, Ticker } from "pixi.js";
import { ComponentManager } from "./src/components";
import { BaseGame } from "./src/core";
import { GameObjectBuilder } from "./src/gameobject/GameObjectBuilder";
import { Localize } from "./src/localization/Localize";
import type { Navigation } from "./src/navigation/navigation";
import type {
  ResizePluginOptions,
  ResizeOptions,
  DeepRequired,
} from "./src/resize/ResizePlugin";
import { StorageWrapper } from "./src/storage/StorageWrapper";
import { SoundBus } from "./src/audio-pixi/SoundBus";

declare module "pixi.js" {
  interface Container {
    game: BaseGame;
    /**
     * Components of the game object
     */
    components: ComponentManager;
    updateComponents(ticker: Ticker): void;
    destroyComponents(): void;
  }
  interface ContainerOptions {
    components?: {
      type: string | { new (...args: any[]): any };
      params?: any[];
    }[];
    type?: string;
    children?: { [key: string]: ContainerOptions };
  }
  interface GraphicsOptions {
    points?: number[] | PointData[];
    style?: FillInput;
  }
  interface Application extends PixiApplication, ResizePluginOptions {
    options?: ApplicationOptions;
    registry: Map<string, unknown>;
    audio: {
      soundBus: SoundBus;
      // BGM
      muteBgm: () => void;
      unmuteBgm: () => void;

      // SFX
      muteSfx: () => void;
      unmuteSfx: () => void;

      // Playback Controls
      pauseAll: () => void;
      resumeAll: () => void;
    };
    navigation: Navigation;
    storage: StorageWrapper;
    make: GameObjectBuilder;
    locale: Localize;
  }
  interface ApplicationOptions extends PixiAppOptions, ResizePluginOptions {
    parentId?: string;
    cullable?: boolean;
    /** The HTML element or window to automatically resize the application to */
    resizeTo?: Window | HTMLElement | null;
    manifest?: string | AssetsManifest;
    basePath?: string;
    language?: string;
    languagePath?: string;
    translation?: Record<string, string | number>;
    debug: boolean | { console?: boolean; pixiExtension?: boolean };
  }
}

declare module "game-engine" {
  namespace Engine {
    export type ResizeOptions =
      import("./src/resize/ResizePlugin").ResizeOptions;
    export type GameConfig = import("./src/resize/ResizePlugin").GameConfig;

    interface BaseGame extends import("pixi.js").Application {
      options?: ApplicationOptions;
      registry: Map<string, unknown>;
      audio: {
        soundBus: SoundBus;
        // BGM
        muteBgm: () => void;
        unmuteBgm: () => void;

        // SFX
        muteSfx: () => void;
        unmuteSfx: () => void;

        // Playback Controls
        pauseAll: () => void;
        resumeAll: () => void;
      };
      navigation: Navigation;
      storage: StorageWrapper;
      make: GameObjectBuilder;
      locale: Localize;
    }
  }
}