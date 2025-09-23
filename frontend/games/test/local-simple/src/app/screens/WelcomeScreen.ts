import { gsap } from "gsap";
import { Container, Graphics, Sprite, Texture } from "pixi.js";

/** Düz bir progress bar (loading bar) */
class SimpleProgressBar extends Container {
  private background: Graphics;
  private fill: Graphics;
  private _progress: number = 0;
  private widthBar: number;
  private heightBar: number;
  private backgroundColor: number;
  private fillColor: number;
  private backgroundAlpha: number;
  private fillAlpha: number;

  constructor({
    width = 200,
    height = 20,
    backgroundColor = 0x6d28d9,
    fillColor = 0xff8800,
    backgroundAlpha = 0.5,
    fillAlpha = 0.8,
    radius = 10,
  } = {}) {
    super();



    this.widthBar = width;
    this.heightBar = height;
    this.backgroundColor = backgroundColor;
    this.fillColor = fillColor;
    this.backgroundAlpha = backgroundAlpha;
    this.fillAlpha = fillAlpha;

    this.background = new Graphics();
    this.fill = new Graphics();

    // Arka plan
    this.background.roundRect(0, 0, this.widthBar, this.heightBar, radius);
    this.background.fill({
      color: this.backgroundColor,
      alpha: this.backgroundAlpha,
    });
    this.addChild(this.background);

    // Dolgu
    this.fill.roundRect(0, 0, 0, this.heightBar, radius);
    this.fill.fill({ color: this.fillColor, alpha: this.fillAlpha });
    this.addChild(this.fill);
  }

  set progress(value: number) {
    this._progress = Math.max(0, Math.min(1, value));
    this.redraw();
  }

  get progress() {
    return this._progress;
  }

  private redraw() {
    this.fill.clear();
    this.fill.roundRect(
      0,
      0,
      this.widthBar * this._progress,
      this.heightBar,
      10
    );
    this.fill.fill({ color: this.fillColor, alpha: this.fillAlpha });
  }
}

/** Screen shown while loading assets */
export class WelcomeScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ["preload"];
  /** The PixiJS logo */
  private pixiLogo!: Sprite;
  /** Progress Bar */
  private progressBar!: SimpleProgressBar;

  async create() {
    this.progressBar = new SimpleProgressBar({
      width: 200,
      height: 20,
      backgroundColor: 0x6d28d9,
      fillColor: 0xff8800,
      backgroundAlpha: 0.5,
      fillAlpha: 0.8,
      radius: 10,
    });

    this.progressBar.x += this.progressBar.width / 2;
    this.progressBar.y += -this.progressBar.height / 2;

    this.addChild(this.progressBar);

    this.pixiLogo = new Sprite({
      texture: Texture.from("logo.png"),
      anchor: 0.5,
      scale: 0.2,
    });
    this.addChild(this.pixiLogo as any);
  }

  public onLoad(progress: number) {
    this.progressBar.progress = progress;
  }

  /** Resize the screen, fired whenever window size changes  */
  public resize(width: number, height: number) {
    this.pixiLogo.position.set(width * 0.5, height * 0.5);
    this.progressBar.position.set(width * 0.5 - 100, height * 0.5 + 80);
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
