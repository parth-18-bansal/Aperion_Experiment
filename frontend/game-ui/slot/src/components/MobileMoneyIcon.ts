import { Assets, Container, isMobile, Sprite, Texture } from "pixi.js";
import { BaseButton } from "./BaseButton";

export class MobileMoneyIcon extends BaseButton {
  buttonView = new Container();
  private sprite: Sprite;

  constructor() {
    super();
    this.sprite = new Sprite(Assets.get<Texture>("mobile_money_icon.png"));
    this.sprite.anchor.set(0.5);
    this.buttonView.addChild(this.sprite);
    this.view = this.buttonView;
    this.enabled = true;
  }

  public resize(size: number) {
    this.sprite.width = size * 0.6;
    this.sprite.height = size * 0.6;
    this.sprite.x = size / 2;
    this.sprite.y = size / 2;
    this.buttonView.width = size;
    this.buttonView.height = size;
  }
}
