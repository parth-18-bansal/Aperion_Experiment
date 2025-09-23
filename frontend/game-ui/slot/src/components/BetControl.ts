import { Assets, ColorMatrixFilter, Container, Sprite, Texture } from "pixi.js";
import { BaseButton } from "./BaseButton";
import { Engine } from "game-engine";

export interface IBetControlOptions {
  isSimple?: boolean;
  onBetChange?: (value: number) => void;
}

export class BetControl extends Container {
  public downButton: BaseButton;
  public upButton: BaseButton;
  private upSprite: Sprite;
  private downSprite: Sprite;
  public betText: InstanceType<typeof Engine.LocalizedText>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_options?: IBetControlOptions) {
    super();

    this.downSprite = new Sprite(this.getTexture("spin_bet_desc.png"));
    this.downSprite.anchor.set(0.5);
    this.downButton = new BaseButton(this.downSprite);
    this.addChild(this.downButton.view);
    this.downButton.onHover.connect(() => this.hover(this.downSprite));
    this.downButton.onOut.connect(() => this.out(this.downSprite));

    this.upSprite = new Sprite(this.getTexture("spin_bet_inc.png"));
    this.upSprite.anchor.set(0.5);
    this.upButton = new BaseButton(this.upSprite);
    this.addChild(this.upButton.view);
    this.upButton.onHover.connect(() => this.hover(this.upSprite));
    this.upButton.onOut.connect(() => this.out(this.upSprite));
    this.betText = new Engine.LocalizedText(
      "0",
      {},
      {
        fontFamily: "DIN Offc Pro",
        fontSize: 32,
        fill: "#fd9700",
        stroke: { color: "#fd9700", width: 1, join: "round" },
        fontWeight: "900",
        align: "center",
      }
    );
    this.betText.anchor.set(0.5);
    this.addChild(this.betText);
  }

  private getTexture(name: string): Texture {
    try {
      return Assets.get<Texture>(name);
    } catch {
      return Texture.WHITE;
    }
  }

  private out(item: Sprite) {
    if (!item) return;
    item.filters = [];
  }

  private hover(item: Sprite) {
    if (!item) return;
    const cm = new ColorMatrixFilter();
    cm.brightness(1.18, false);
    cm.resolution = 2;
    item.filters = [cm];
  }

  public resize(width: number, height: number) {
    const btnSize = height * 0.4;
    const textY = height / 2.5;
    const centerX = width / 2;
    const spacing = btnSize * 2.5;

    this.downButton.view.width = btnSize;
    this.downButton.view.height = btnSize;
    this.downButton.view.x = centerX - spacing;
    this.downButton.view.y = textY;

    this.upButton.view.width = btnSize;
    this.upButton.view.height = btnSize;
    this.upButton.view.x = centerX + spacing;
    this.upButton.view.y = textY;

    this.betText.x = centerX;
    this.betText.y = textY - 3;
    this.betText.style.fontSize = height * 0.3;
  }
}
