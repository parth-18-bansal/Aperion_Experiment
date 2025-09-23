import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { Engine } from "game-engine";
import { gsap } from "gsap";
import { Container, Ticker } from "pixi.js";
import { Slot } from "slot-game-engine";

export class BackgroundScreen extends Container {
  private paused = false;
  private backgroundOnScreen!: Spine;
  private backgrounds = new Map<Slot.GameMode, Spine>();

  private normalSpinBg!: Spine;
  private freeSpinBg!: Spine;

  async create() {
    this.normalSpinBg = this.game.make.spine({
      x: 960,
      y: 540,
      skeleton: "preload_high/background/background.json",
      atlas: "preload_high/background/background.atlas",
      skin: "default",
      autoUpdate: false, // Disable auto-updating initially
      scale: 1.06, // Adjusted scale for better fit
    });

    this.freeSpinBg = this.game.make.spine({
      x: 960,
      y: 540,
      skeleton: "preload_high/background-freespin/background-freespin.json",
      atlas: "preload_high/background-freespin/background-freespin.atlas",
      skin: "default",
      autoUpdate: false, // Disable auto-updating initially
      scale: 1.06, // Adjusted scale for better fit
    });
    this.backgrounds.set("spin", this.normalSpinBg);
    this.backgrounds.set("freespin", this.freeSpinBg);

    this.setBackgroundSpine("spin");
    this.sortableChildren = true;

    Engine.Utils.EventBus.on(
      "changeBackground",
      (mode: Slot.GameMode, transitionTime: number) => {
        this.setBackgroundSpine(mode, transitionTime);
      }
    );
  }

  /**
   * Sets the background Spine animation based on the provided mode.
   *
   * This method hides and removes the current background Spine, if present,
   * then retrieves and displays the new background Spine corresponding to the given mode.
   * It also centers the background Spine and starts its animation.
   *
   * @param mode - The mode of the background Spine to display. Can be either "normalspin" or "freespin".
   */
  public async setBackgroundSpine(
    mode: Slot.GameMode,
    transitionTime: number = 0.5
  ) {
    if (this.backgroundOnScreen === this.backgrounds.get(mode)) {
      return; //if already showing the requested background
    }

    if (this.backgroundOnScreen) {
      await gsap.to(this.backgroundOnScreen, {
        alpha: 0,
        duration: transitionTime,
        onComplete: () => {
          this.backgroundOnScreen.visible = false;
          this.removeChild(this.backgroundOnScreen);
          this.backgroundOnScreen.state.clearTracks();
          this.backgroundOnScreen.autoUpdate = false; // Stop auto-updating the spine
        },
      });
    }

    this.backgroundOnScreen = this.backgrounds.get(mode)!;
    this.backgroundOnScreen.autoUpdate = true; // Enable auto-updating the spine
    this.backgroundOnScreen.alpha = 0;
    this.backgroundOnScreen.visible = true;
    this.zIndex = -1;
    this.addChild(this.backgroundOnScreen);

    this.backgroundOnScreen.state.setAnimation(0, "Symbol_animation", true);
    await gsap.to(this.backgroundOnScreen, {
      alpha: 1,
      duration: transitionTime,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onLoad(progress: number) {}

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
  public blur() {}
}
