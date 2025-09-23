import type { ExtensionMetadata } from "pixi.js";
import { ExtensionType } from "pixi.js";
import { BaseGame } from "../core";
import { StorageWrapper } from "./StorageWrapper";
export class CreationStoragePlugin {
  /** @ignore */
  public static extension: ExtensionMetadata = ExtensionType.Application;

  public static init(): void {
    const app = this as unknown as BaseGame;
    app.storage = new StorageWrapper();
  }

  public static destroy(): void {
    const app = this as unknown as BaseGame;
    app.storage = null as unknown as StorageWrapper;
  }
}
