import type {
  ApplicationOptions,
  ExtensionMetadata,
  ResizePluginOptions as PixiResizePluginOptions,
} from "pixi.js";
import { ExtensionType } from "pixi.js";

import { BaseGame } from "../core";
import { resize } from "./resize";

// Custom utility type:
export type DeepRequired<T> = Required<{
  [K in keyof T]: DeepRequired<T[K]>;
}>;

export type GameConfig = {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
};

export type ResizeOptions = {
  forceOrientation?: "landscape" | "portrait" | "auto";
  gameConfig?: {
    landscape?: GameConfig;
    portrait?: GameConfig;
  };
  delay?: number;
  align?: number | { x?: number; y?: number };
  /**
   * Canvas ölçekleme modu
   * - contain: Siyah bantlı, ekran içine sığdır (mevcut davranış)
   * - cover: Siyah bant yok, ekranı tamamen kapla (kırpma olabilir)
   * - stretch: Aspect ratio korunmaz, ekranı esnet
   */
  scaleMode?: "contain" | "cover" | "stretch";
};
/**
 * Application options for the CreationResizePlugin.
 */
export interface ResizePluginOptions extends PixiResizePluginOptions {
  /** Options for controlling the resizing of the application */
  resizeOptions?: ResizeOptions;
}

/**
 * Middleware for Application's resize functionality.
 *
 * Adds the following methods to Application:
 * * Application#resizeTo
 * * Application#resize
 * * Application#queueResize
 * * Application#cancelResize
 * * Application#resizeOptions
 */
export class CreationResizePlugin {
  /** @ignore */
  public static extension: ExtensionMetadata = ExtensionType.Application;

  private static _resizeId: NodeJS.Timeout | null;
  private static _resizeTo: Window | HTMLElement | null;
  private static _cancelResize: (() => void) | null;

  /**
   * Initialize the plugin with scope of application instance
   * @param {object} [options] - See application options
   */
  public static init(options: ApplicationOptions): void {
    const app = this as unknown as BaseGame;

    Object.defineProperty(
      app,
      "resizeTo",
      /**
       * The HTML element or window to automatically resize the
       * renderer's view element to match width and height.
       */
      {
        configurable: true,
        set(dom: Window | HTMLElement) {
          globalThis.removeEventListener("resize", app.queueResize);
          this._resizeTo = dom;
          if (dom) {
            globalThis.addEventListener("resize", app.queueResize);
            app.resize();
          }
        },
        get() {
          return this._resizeTo;
        },
      }
    );

    /**
     * Resize is throttled, so it's safe to call this multiple times per frame and it'll
     * only be called once.
     */
    app.queueResize = (): void => {
      if (!this._resizeTo) {
        return;
      }
      this._cancelResize!();

      // Throttle resize events per raf
      this._resizeId = setTimeout(
        () => app.resize!(),
        app.resizeOptions?.delay || 100
      );
    };

    /**
     * Execute an immediate resize on the renderer, this is not
     * throttled and can be expensive to call many times in a row.
     * Will resize only if `resizeTo` property is set.
     */
    app.resize = (): void => {
      if (!this._resizeTo) {
        return;
      }

      // clear queue resize
      this._cancelResize!();

      let canvasWidth: number;
      let canvasHeight: number;

      // Resize to the window
      if (this._resizeTo === globalThis.window) {
        // TODO -> SLOT GAMES
        canvasWidth = globalThis.innerWidth;
        canvasHeight = globalThis.innerHeight;
      }
      // Resize to other HTML entities
      else {
        // TODO -> CRASH GAMES
        const { clientWidth, clientHeight } = this._resizeTo as HTMLElement;
        canvasWidth = clientWidth;
        canvasHeight = clientHeight;
      }

      const orientation =
        app.resizeOptions?.forceOrientation &&
        app.resizeOptions?.forceOrientation !== "auto"
          ? app.resizeOptions?.forceOrientation
          : canvasWidth >= canvasHeight
          ? "landscape"
          : "portrait";

      // Get the appropriate game config for current orientation
      const gameConfig = app.resizeOptions?.gameConfig?.[orientation];

      // Use config values or fallback to renderer dimensions
      const gameWidth   = gameConfig?.width || 1280;
      const gameHeight  = gameConfig?.height || 720;
      const minWidth    = gameConfig?.minWidth || gameWidth;
      const minHeight   = gameConfig?.minHeight || gameHeight;
      
      // Decide effective scale mode: cover normally, but if window smaller than
      // minimum safe area, fall back to contain so canvas shrinks with window.
      const desiredMode = app.resizeOptions?.scaleMode ?? "contain";
      const effectiveMode =
        desiredMode === "cover" &&
        (canvasWidth < minWidth || canvasHeight < minHeight)
          ? "contain"
          : desiredMode;

      const { x, y, width, height } = resize(
        canvasWidth,
        canvasHeight,
        gameWidth,
        gameHeight,
        minWidth,
        minHeight,
        app.resizeOptions?.align ?? 0.5,
        effectiveMode
      );

      const element = app.renderer.canvas;
      if (element) {
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
        element.style.margin = `${y}px ${x}px`;
      }

      window.scrollTo(0, 0);

      app.renderer.resize(gameWidth, gameHeight);

      // When canvas is stretched (non-uniform CSS scaling), fix visual distortion
      // by counter-scaling the stage so the final output is uniformly scaled.
      if (effectiveMode === "stretch") {
        const alignOpt = app.resizeOptions?.align ?? 0.5;
        const alignX =
          typeof alignOpt === "number" ? alignOpt : alignOpt.x ?? 0.5;
        const alignY =
          typeof alignOpt === "number" ? alignOpt : alignOpt.y ?? 0.5;

        const cssScaleX = width / gameWidth;
        const cssScaleY = height / gameHeight;
        const uniform = Math.min(cssScaleX, cssScaleY);

        // Choose stage scales so (stageScale * cssScale) is uniform in both axes
        const stageScaleX = uniform / cssScaleX;
        const stageScaleY = uniform / cssScaleY;
        app.stage.scale.set(stageScaleX, stageScaleY);

        // Center/align the stage inside the stretched canvas in CSS space,
        // then convert back to internal coordinates for stage.position
        const visibleCssW = gameWidth * uniform;
        const visibleCssH = gameHeight * uniform;
        const offsetCssX = (width - visibleCssW) * alignX;
        const offsetCssY = (height - visibleCssH) * alignY;
        const posX = offsetCssX / cssScaleX;
        const posY = offsetCssY / cssScaleY;
        app.stage.position.set(posX, posY);
      } else {
        // Reset stage transform for contain/cover
        app.stage.scale.set(1, 1);
        app.stage.position.set(0, 0);
      }
    };

    this._cancelResize = (): void => {
      if (this._resizeId) {
        clearTimeout(this._resizeId);
        this._resizeId = null;
      }
    };

    this._resizeId = null;
    this._resizeTo = null;

    // Default resize options with cleaner structure
    app.resizeOptions = {
      forceOrientation: "auto",
      gameConfig: {
        landscape: {
          width: app.renderer.width ?? 0,
          height: app.renderer.height ?? 0,
          minWidth: app.renderer.width ?? 0,
          minHeight: app.renderer.height ?? 0,
        },
        portrait: {
          width: app.renderer.height ?? 0,
          height: app.renderer.width ?? 0,
          minWidth: app.renderer.height ?? 0,
          minHeight: app.renderer.width ?? 0,
        },
      },
      delay: 100,
      scaleMode: "contain",
      ...options.resizeOptions,
    };
    app.resizeTo =
      options.resizeTo || (null as unknown as Window | HTMLElement);
  }

  /**
   * Clean up the ticker, scoped to application
   */
  public static destroy(): void {
    const app = this as unknown as BaseGame;

    globalThis.removeEventListener("resize", app.queueResize);
    this._cancelResize!();
    this._cancelResize = null;
    app.queueResize = null as unknown as () => void;
    app.resizeTo = null as unknown as Window | HTMLElement;
    app.resize = null as unknown as () => void;
  }
}
