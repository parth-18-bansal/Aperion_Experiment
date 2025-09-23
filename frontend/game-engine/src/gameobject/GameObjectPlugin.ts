import type { ExtensionMetadata } from "pixi.js";
import { ExtensionType } from "pixi.js";
import { BaseGame } from "../core";
import { GameObjectBuilder } from "./GameObjectBuilder";

/**
 * Plugin that adds GameObject creation capabilities to the PixiJS Application
 */
export class CreationGameObjectPlugin {
  /** @ignore */
  public static extension: ExtensionMetadata = ExtensionType.Application;

  /**
   * Initialize the plugin with scope of application instance
   */
  public static init(): void {
    const app = this as unknown as BaseGame;
    app.make = new GameObjectBuilder();
  }

  /**
   * Clean up the plugin, scoped to application
   */
  public static destroy(): void {
    const app = this as unknown as BaseGame;
    app.make = null as unknown as BaseGame["make"];
  }
}

// // Use module augmentation instead of namespace
// declare module "pixi.js" {
//   interface Application {
//     /**
//      * GameObject factory for creating game objects
//      */
//     make: GameObjectBuilder;
//   }
// }
