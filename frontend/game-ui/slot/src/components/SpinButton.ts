import { AnimatedSprite, Assets, Container, Sprite, Texture, Circle, ColorMatrixFilter } from "pixi.js";
import { BaseButton } from "./BaseButton";

export class SpinButton extends BaseButton {
  private buttonView = new Container();
  private bg: Sprite;
  private animated: AnimatedSprite;
  constructor() {
    const buttonView = new Container(); // create first

    super(buttonView); // pass to Button constructor!

    this.buttonView = buttonView;

    this.bg = new Sprite(this.getBgTexture());
    this.bg.anchor.set(0.5);
    this.buttonView.addChild(this.bg);

    this.animated = new AnimatedSprite(this.getButtonTextures());
    this.animated.anchor.set(0.5);
    this.animated.loop = false;
    this.animated.gotoAndStop(0);
    this.buttonView.addChild(this.animated);
    this.visible = false;
  }
  private getBgTexture(): Texture {
    try {
      return Assets.get<Texture>("spin_button_bg_new.png");
    } catch {
      return Texture.WHITE;
    }
  }

  private getButtonTextures(): Texture[] {
    const frames: Texture[] = [];
    for (let i = 0; i <= 13; i++) {
      const frame = `spin-Stop_2_${i.toString().padStart(2, "0")}.png`;
      frames.push(this.safeGetTexture(frame));
    }
    return frames;
  }

  private safeGetTexture(name: string): Texture {
    try {
      return Assets.get<Texture>(name);
    } catch {
      return Texture.WHITE;
    }
  }
  override out() {
    if (this.bg) {
      this.bg.filters = [];
    }
  }

  override hover() {
    if (!this.bg) return;
    const cm = new ColorMatrixFilter();
    // Subtle brightness/contrast bump to get a clean shine like your sample
    cm.brightness(1.18, false);
    cm.resolution = 2;
    this.bg.filters = [cm];
  }
  public resize(size: number) {
    this.bg.width = size * 1.3;
    this.bg.height = size * 1.3;
    this.bg.x = size / 2;
    this.bg.y = size / 2;

    this.animated.width = size * 0.8;
    this.animated.height = size * 0.8;
    this.animated.x = size / 2;
    this.animated.y = size / 2;

    this.buttonView.width = size;
    this.buttonView.height = size;

    // Circular hit area: center at (size/2, size/2), radius = size/2
    const radius = size / 1.7;
    const cx = size / 2;
    const cy = size / 2;
    this.buttonView.hitArea = new Circle(cx, cy, radius);
    // Ensure the Button's underlying view also respects hit area
    (this as any).view && ((this as any).view.hitArea = this.buttonView.hitArea);
  }

  set visible(value: boolean) {
    if (value && !this.buttonView.visible && !this.animated.playing) {
      this.animated.gotoAndPlay(0);
    }
    this.buttonView.visible = value;
  }
  get visible(): boolean {
    return this.buttonView.visible;
  }
}
