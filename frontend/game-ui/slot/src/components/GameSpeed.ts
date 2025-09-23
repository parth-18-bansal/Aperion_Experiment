import { Assets, Container, isMobile, Sprite, Texture, ColorMatrixFilter, Circle, Graphics } from "pixi.js";
import { BaseButton } from "./BaseButton";
import { isPortrait } from "game-engine/src/utils/isPortrait";

export type GameSpeedMode = "normal" | "quick" | "turbo";

const SPEED_TEXTURES = {
  normal: "spin_quick_1.png",
  quick: "spin_quick_2_colored.png",
  turbo: "spin_quick_3_colored.png",
};

const SPEED_TEXTURES_MOBILE = {
  normal: "mobile_storm1.png",
  quick: "mobile_storm2.png",
  turbo: "mobile_storm3.png",
};

export interface IGameSpeedOptions {
  initialMode?: GameSpeedMode;
  onModeChange?: (mode: GameSpeedMode) => void;
}

export class GameSpeed extends BaseButton {
  private buttonView = new Container();
  private sprite: Sprite;
  private currentMode: GameSpeedMode = "normal";
  private onModeChangeCallback?: (mode: GameSpeedMode) => void;

  constructor(options?: IGameSpeedOptions) {
    super();
    this.onModeChangeCallback = options?.onModeChange;
    this.sprite = new Sprite(this.getTextureForMode(this.getMode()));
    this.sprite.anchor.set(0.5);
    this.buttonView.addChild(this.sprite);
    this.view = this.buttonView;
    this.enabled = true;
  }

  private getTextureForMode(mode: GameSpeedMode): Texture {
    let tex: Texture;
    try {
      tex = Assets.get<Texture>((isMobile.phone || (isMobile.tablet && isPortrait())) ? SPEED_TEXTURES_MOBILE[mode] : SPEED_TEXTURES[mode]);
    } catch {
      tex = Texture.WHITE;
    }
    return tex;
  }

  public updateSpeedTexture(mode: GameSpeedMode): void {
    this.sprite.texture = this.getTextureForMode(mode);
    this.currentMode = mode;
    this.onModeChangeCallback?.(mode);
  }

  override press() { }

  override out() {
    if (this.sprite) {
      this.sprite.filters = [];
    }
  }

  override hover() {
    if (!this.sprite) return;
    const cm = new ColorMatrixFilter();
    // Subtle brightness/contrast bump to get a clean shine like your sample
    cm.brightness(1.18, false);
    cm.resolution = 2;
    this.sprite.filters = [cm];
  }
  public getMode(): GameSpeedMode {
    // return current mode
    return this.currentMode;
  }

  public resize(size: number) {
    this.sprite.width = size * 0.6;
    this.sprite.height = size * 0.6;
    this.sprite.x = size / 2;
    this.sprite.y = size / 2;
    this.buttonView.width = size;
    this.buttonView.height = size;
    this.sprite.texture = this.getTextureForMode(this.getMode());
    // Circular hit area: center at (size/2, size/2), radius = size/2
    const radius = size / 3;
    const cx = size / 2;
    const cy = size / 2;
    this.buttonView.hitArea = new Circle(cx, cy, radius);

    // Ensure the Button's underlying view also respects hit area
    (this as any).view && ((this as any).view.hitArea = this.buttonView.hitArea);
  }
}
