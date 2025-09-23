import type { ExtensionMetadata } from "pixi.js";
import { ExtensionType } from "pixi.js";

import type { BaseGame } from "../core";

import { Navigation } from "./navigation";

/**
 * Middleware for Application's navigation functionality.
 * Manages screen navigation and provides a structured way to handle different application screens.
 *
 * Adds the following methods to Application:
 * * Application#navigation
 */
export class CreationNavigationPlugin {
  /** @ignore - Extension metadata for PixiJS */
  public static extension: ExtensionMetadata = ExtensionType.Application;

  /** Stores the resize handler function */
  private static _onResize: (() => void) | null;

  /**
   * Initialize the plugin with scope of application instance
   * Sets up the navigation system and connects it to the application's resize events
   */
  public static init(): void {
    const app = this as unknown as BaseGame;

    // Create navigation instance
    app.navigation = new Navigation();
    app.navigation.init(app);

    // Set up resize handler
    this._onResize = () =>
      app.navigation.resize(app.renderer.width, app.renderer.height);
    app.renderer.on("resize", this._onResize);

    // Initial resize
    app.resize();
  }

  /**
   * Clean up the navigation plugin, scoped to application
   * Removes all references to prevent memory leaks
   */
  public static destroy(): void {
    const app = this as unknown as BaseGame;
    app.navigation = null as unknown as Navigation;
  }
}
