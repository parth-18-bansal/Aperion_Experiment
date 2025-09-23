import { Assets, Circle, ColorMatrixFilter, Container, isMobile, Sprite, Texture } from "pixi.js";
import { BaseButton } from "./BaseButton";
import { isPortrait } from "game-engine/src/utils/isPortrait";

export interface IAutoPlayButtonOptions {
  onToggle?: (active: boolean) => void;
  initialActive?: boolean;
}

export class AutoPlayButton extends BaseButton {
  private buttonView = new Container();
  private buttonBg: Sprite;
  private isActive: boolean = false;
  btnState: "play" | "stop" = "play"; // Initial state
  private onToggleCallback?: (active: boolean) => void;

  constructor(options?: IAutoPlayButtonOptions) {
    super();
    this.isActive = options?.initialActive ?? false;
    this.onToggleCallback = options?.onToggle;
    this.buttonBg = new Sprite(this.getTexture(false));
    this.buttonBg.anchor.set(0.5);
    this.buttonView.addChild(this.buttonBg);
    this.view = this.buttonView;
    this.enabled = true;
  }

  private getTexture(inAutoplayState: boolean): Texture {
    return Assets.get<Texture>(
      inAutoplayState ? (isMobile.phone || (isMobile.tablet && isPortrait()) ? "mobile_replay_stop.png" : "spin_replay_stop.png") : ((isMobile.phone || (isMobile.tablet && isPortrait()) ? "mobile_replay_start.png" : "spin_replay.png"))
    );
  }

  public updateTexture(inAutoplayState: boolean): void {
    this.btnState = inAutoplayState ? "stop" : "play";
    this.buttonBg.texture = this.getTexture(inAutoplayState);
  }

  override down() { }

  override out() {
    if (this.buttonView) {
      this.buttonView.filters = [];
    }
  }

  override hover() {
    if (!this.buttonView) return;
    const cm = new ColorMatrixFilter();
    // Subtle brightness/contrast bump to get a clean shine like your sample
    cm.brightness(1.18, false);
    cm.resolution = 2;
    this.buttonView.filters = [cm];
  }



  override press() {
    this.isActive = !this.isActive;
    if (this.onToggleCallback) {
      this.onToggleCallback(this.isActive);
    }
  }

  public resize(size: number) {
    this.buttonBg.width = size / 1.7;
    this.buttonBg.height = size / 1.7;
    this.buttonBg.x = size / 2;
    this.buttonBg.y = size / 2;
    this.buttonView.width = size;
    this.buttonView.height = size;
    this.buttonBg.texture = (this.getTexture(this.btnState != "play"));
    // Circular hit area: center at (size/2, size/2), radius = size/2
    const radius = size / 4;
    const cx = size / 2;
    const cy = size / 2;
    this.buttonView.hitArea = new Circle(cx, cy, radius);
    // Ensure the Button's underlying view also respects hit area
    (this as any).view && ((this as any).view.hitArea = this.buttonView.hitArea);
  }
}
