import { detectFullscreen, isPortrait } from "game-engine/src/utils/isPortrait";
import { gsap } from "gsap";
import { Container, isMobile, Sprite, Texture, Ticker } from "pixi.js";
import { Slot } from "slot-game-engine";

type orientations = "landscape" | "portrait";

export class BackgroundMobileScreen extends Container {
  private paused = false;
  private backgroundOnScreen!: Sprite;
  private backgrounds = new Map<string, Sprite>();

  private normalSpinBgPortrait!: Sprite;
  private freeSpinBgPortrait!: Sprite;

  private normalSpinBgLandscape!: Sprite;
  private freeSpinBgLandscape!: Sprite;

  private currentOrientation?: orientations = isPortrait()
    ? "portrait"
    : "landscape";
  private currentMode: Slot.GameMode = "spin";

  async create() {
    this.normalSpinBgPortrait = this.game.make.sprite({
      texture: Texture.from(`preload_low/background/mobile-back-vertical.jpg`),
      anchor: { x: 0.5, y: 0.5 },
    });

    this.freeSpinBgPortrait = this.game.make.sprite({
      texture: Texture.from(`mobile-free-spin-back-vertical.jpg`),
      anchor: { x: 0.5, y: 0.5 },
    });

    this.normalSpinBgLandscape = this.game.make.sprite({
      texture: Texture.from(
        `preload_low/background/mobile-back-horizontal.jpg`
      ),
      anchor: { x: 0.5, y: 0.5 },
    });

    this.freeSpinBgLandscape = this.game.make.sprite({
      texture: Texture.from(`mobile-free-spin-back-horizontal.jpg`),
      anchor: { x: 0.5, y: 0.5 },
    });

    this.backgrounds.set("spin_portrait", this.normalSpinBgPortrait);
    this.backgrounds.set("freespin_portrait", this.freeSpinBgPortrait);

    this.backgrounds.set("spin_landscape", this.normalSpinBgLandscape);
    this.backgrounds.set("freespin_landscape", this.freeSpinBgLandscape);

    this.setBackgroundSpine(`spin`);
    this.sortableChildren = true;
    // Engine.Utils.EventBus.on("changeBackground", (mode: "spin" | "freespin") => {
    //   this.setBackgroundSpine(mode);
    // });
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
    this.currentMode = mode;
    const textureName = `${this.currentMode}_${this.currentOrientation}`;

    if (
      this.backgroundOnScreen &&
      this.backgroundOnScreen === this.backgrounds.get(textureName)
    ) {
      return; //if already showing the requested background
    }

    if (this.backgroundOnScreen) {
      if (transitionTime > 0) {
        await gsap.to(this.backgroundOnScreen, {
          alpha: 0,
          duration: transitionTime,
          onComplete: () => {
            this.backgroundOnScreen.visible = false;
            this.removeChild(this.backgroundOnScreen);
          },
        });
      } else {
        this.backgroundOnScreen.visible = false;
        this.removeChild(this.backgroundOnScreen);
      }
    }

    this.backgroundOnScreen = this.backgrounds.get(textureName)!;
    this.backgroundOnScreen.alpha = transitionTime > 0 ? 0 : 1; // if transition time is 0, set alpha to 1 immediately
    this.backgroundOnScreen.visible = true;
    this.zIndex = -1;
    this.addChild(this.backgroundOnScreen);
    this.centerBackgroundSpine(this.game.screen.width, this.game.screen.height);

    if (transitionTime > 0) {
      await gsap.to(this.backgroundOnScreen, {
        alpha: 1,
        duration: transitionTime,
      });
    }
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
  public resize(_width: number, _height: number, _orientation?: orientations) {
    if (this.currentOrientation === _orientation) {
      this.centerBackgroundSpine(_width, _height);
      return;
    }
    this.currentOrientation = _orientation;
    this.setBackgroundSpine(this.currentMode, 0);
  }

  /** Show screen with animations */
  public async show(): Promise<void> {}

  /** Hide screen with animations */
  public async hide() {}

  /** Auto pause the app when window go out of focus */
  public blur() {}

  /**
   * Centers and scales the background spine animation to fit within the given width and height.
   *
   * Calculates the appropriate scale factor to ensure the background spine fits entirely within
   * the specified dimensions while maintaining its aspect ratio. Then, positions the spine at
   * the center of the area.
   *
   * @param width - The width of the area to fit the background spine into.
   * @param height - The height of the area to fit the background spine into.
   */
  private centerBackgroundSpine(width: number, height: number) {
    const bounds = this.backgroundOnScreen.getLocalBounds();
    const scale = Math.min(width / bounds.width, height / bounds.height);
    this.backgroundOnScreen.scale.set(scale + (isMobile.tablet ? 0.8 : (detectFullscreen() && !isPortrait() && isMobile.android.phone) ? 0.3 : 0.6)); // slightly larger scale to cover edges
    this.backgroundOnScreen.position.set(width / 2, height / 2);
  }
}
