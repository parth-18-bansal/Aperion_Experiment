import { Engine } from "game-engine";
import type { Ticker } from "pixi.js";
import { Container } from "pixi.js";
// import { Spine } from "@esotericsoftware/spine-pixi-v8";

/** The screen that holds the app */
export class MainScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ["main"];

  private paused = false;

  async create() {

  }

  onLoad(progress: number) {
    console.log("MainScreen loaded with progress:", progress);
  }

  /** Prepare the screen just before showing */
  public prepare() {}

  /** Update the screen */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(_time: Ticker) {
    if (this.paused) return;
  }

  /** Pause gameplay - automatically fired when a popup is presented */
  public async pause() {
    this.interactiveChildren = false;
    this.paused = true;
  }

  /** Resume gameplay */
  public async resume() {
    this.interactiveChildren = true;
    this.paused = false;
  }

  /** Fully reset */
  public reset() {}

  /** Resize the screen, fired whenever window size changes */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public resize(_width: number, _height: number) {}

  /** Show screen with animations */
  public async show(): Promise<void> {}

  /** Hide screen with animations */
  public async hide() {}

  /** Auto pause the app when window go out of focus */
  public blur() {
    if (!Engine.getEngine().navigation.currentPopup) {
      console.log("blur", "paused Game");
    }
  }
}
