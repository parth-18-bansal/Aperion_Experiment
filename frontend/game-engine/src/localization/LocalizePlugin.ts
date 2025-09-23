import type { ApplicationOptions, ExtensionMetadata } from "pixi.js";
import { ExtensionType } from "pixi.js";
import type { BaseGame } from "../core/";
import { Localize } from "./Localize";

/**
 * Middleware for Application's Localization functionality.
 * Manages text Localization
 *
 * Adds the following methods to Application:
 * * Application#Locale
 */
export class LocalizePlugin {
  /** @ignore - Extension metadata for PixiJS */
  public static extension: ExtensionMetadata = ExtensionType.Application;

  /**
   * Initialize the plugin with scope of application instance
   * Sets up the Localization system
   */
  public static init(opts: Partial<ApplicationOptions>): void {
    const app = this as unknown as BaseGame;

    // Create Localization instance
    app.locale = new Localize();
    app.locale.init(opts.language || "en", opts.translation);
  }

  /**
   * Clean up the Localization plugin, scoped to application
   * Removes all references to prevent memory leaks
   */
  public static destroy(): void {
    const app = this as unknown as BaseGame;
    app.locale = null as unknown as Localize;
  }
}
