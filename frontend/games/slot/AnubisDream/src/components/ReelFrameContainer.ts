import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { Engine } from "game-engine";
import { Container } from "pixi.js";
import { gsap } from "gsap";
import { Slot } from "slot-game-engine";

export class ReelFrameContainer extends Container {
  private reelFrameOnScreen!: Spine;
  private reelFrameVariations = new Map<Slot.GameMode, Spine>();

  private normalspinReelFrame!: Spine;
  private freespinReelFrame!: Spine;

  constructor(mode: Slot.GameMode = "spin") {
    super();
    Engine.Utils.ApplyCommonProperties(this, {});
    this.create(mode);
  }

  private async create(mode: Slot.GameMode) {
    this.normalspinReelFrame = await this.game.make.spine({
      atlas: "reel.atlas",
      skeleton: "reel.json",
      x: 500,
      y: 320,
      autoUpdate: false, // Disable auto-updating initially
    });

    this.freespinReelFrame = await this.game.make.spine({
      atlas: "reel-freespin.atlas",
      skeleton: "reel-freespin.json",
      x: 500,
      y: 311,
      autoUpdate: false, // Disable auto-updating initially
    });
    this.freespinReelFrame.scale.y = 1.01;

    this.reelFrameVariations.set("spin", this.normalspinReelFrame);
    this.reelFrameVariations.set("freespin", this.freespinReelFrame);

    this.setReelFrameSpine(mode);
  }

  /**
   * Sets the Reel Frame spine based on the provided mode.
   *
   * This method hides and removes the current Reel Frame spine, if present,
   * then retrieves and displays the new Reel Frame spine corresponding to the given mode.
   *
   * @param mode - Can be either "spin" or "freespin".
   */
  public async setReelFrameSpine(
    mode: Slot.GameMode,
    transitionTime: number = 0.5
  ) {
    if (this.reelFrameOnScreen === this.reelFrameVariations.get(mode)) {
      return;
    }

    if (this.reelFrameOnScreen) {
      await gsap.to(this.reelFrameOnScreen, {
        alpha: 0,
        duration: transitionTime,
        onComplete: () => {
          this.reelFrameOnScreen.state.clearTracks();
          this.reelFrameOnScreen.autoUpdate = false; // Stop auto-updating the spine
          this.removeChild(this.reelFrameOnScreen);
        },
      });
    }

    this.reelFrameOnScreen = this.reelFrameVariations.get(mode)!;
    this.reelFrameOnScreen.autoUpdate = true; // Enable auto-updating the spine
    this.reelFrameOnScreen.alpha = 0;
    this.reelFrameOnScreen.visible = true;
    this.addChild(this.reelFrameOnScreen);

    this.playReelFrameIdleLoop();
    await gsap.to(this.reelFrameOnScreen, {
      alpha: 1,
      duration: transitionTime,
    });
  }

  public playReelFrameIdleLoop(): void {
    this.reelFrameOnScreen?.state.setAnimation(0, "Symbol_animation", true);
  }

  /** Resize the screen, fired whenever window size changes */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public resize(_width: number, _height: number) {}
}
