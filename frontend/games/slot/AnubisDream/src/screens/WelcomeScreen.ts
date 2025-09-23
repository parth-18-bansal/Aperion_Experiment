import { gsap } from "gsap";
import { Container, isMobile, Sprite } from "pixi.js";

/** Screen shown while loading assets */
export class WelcomeScreen extends Container {
  /** Assets bundles required by this screen */
  public static deviceDependentBundles = isMobile.any
    ? ["preload_low"]
    : ["preload_high"];

  public static assetBundles = ["preload", ...this.deviceDependentBundles];

  private welcomeBg!: Sprite;
  private progressBar!: Sprite;

  private initialProgressBarWidth = 1;

  async create() {
    this.position.set(this.game.screen.width / 2, this.game.screen.height / 2);
    this.scale.set(0.8);

    this.welcomeBg = this.game.make.sprite(
      {
        texture: "preload/welcome_page/loader_back.png",
        x: 0,
        y: 0,
        anchor: 0.5,
      },
      this
    );

    this.progressBar = this.game.make.sprite(
      {
        texture: "preload/welcome_page/progress.png",
        x: -205,
        y: 178,
      },
      this
    );
    this.initialProgressBarWidth = this.progressBar.width;
    this.progressBar.width = 1;
  }

  public onLoad(progress: number) {
    const clampedProgress = Math.min(Math.max(progress, 0), 100);
    this.progressBar.width =
      this.initialProgressBarWidth * (clampedProgress / 100);
  }

  /** Resize the screen, fired whenever window size changes  */
  public resize(width: number, height: number) {
    this.position.set(width / 2, height / 2);
  }

  /** Show screen with animations */
  public async show() {
    this.alpha = 1;
  }

  /** Hide screen with animations */
  public async hide() {
    await new Promise<void>((resolve) => {
      gsap.to(this, {
        alpha: 0,
        duration: 0.3,
        ease: "linear",
        delay: 1,
        onComplete: () => resolve(),
      });
    });
  }
}
