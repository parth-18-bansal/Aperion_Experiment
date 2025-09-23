import { Container, Sprite, Assets, ColorMatrixFilter } from "pixi.js";
import { BaseButton } from "./BaseButton";

export class HamburgerButton extends BaseButton {
  private buttonView = new Container();
  private buttonBg: Sprite;

  constructor() {
    super();
    this.buttonBg = new Sprite(Assets.get("hamburger_icon_new.png"));
    this.buttonBg.anchor.set(0.5);
    this.buttonView.addChild(this.buttonBg);
    this.view = this.buttonView;
    this.enabled = true;
  }

  override down() {}

  override up() {}

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
    console.log("Hamburger button clicked!");
  }

  public resize(desiredWidth: number, desiredHeight: number) {
    this.buttonBg.width = desiredWidth;
    this.buttonBg.height = desiredHeight;
    this.buttonBg.x = desiredWidth / 2;
    this.buttonBg.y = desiredHeight / 2;
    this.buttonView.width = desiredWidth;
    this.buttonView.height = desiredHeight;
  }
}
