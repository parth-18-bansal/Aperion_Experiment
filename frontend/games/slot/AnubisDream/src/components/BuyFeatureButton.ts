import { Engine } from "game-engine";
import { Container, Sprite, TextStyle } from "pixi.js";
import { Slot } from "slot-game-engine";

export class BuyFeatureButton implements Slot.IBuyFeatureButton {
  public container: Container;
  private priceLabel!: Engine.LocalizedBitmapText;
  private buyFeatureText!: InstanceType<typeof Engine.LocalizedText>;
  private isEnabled: boolean = true;
  private currentFeatureId: string = "freeSpins";
  public onButtonClick?: (featureId?: string) => void;
  private featureTextInitialY = 125;

  public constructor() {
    this.container = new Container();
    this.container.label = "BuyFeatureButton";
    Engine.Utils.ApplyCommonProperties(this.container, {
      components: [
        {
          type: Engine.Components.GridPositionComponent,
          params: [
            {
              portrait: {
                columns: 2,
                rows: 2,
                position: { x: -0.29, y: 0.09 },
              },
            },
          ],
        },
        {
          type: Engine.Components.ResizeComponent,
          params: [
            {
              desktop: {
                landscape: { scale: 0.85, x: 185, y: 115 },
              },
              mobile: {
                landscape: { scale: 1, x: 85, y: 70 },
                portrait: { scale: 1.3, x: 385, y: 1275 },
              },
              tablet: {
                landscape: { scale: 1, x: 85, y: 70 },
                portrait: { scale: 1.5, x: 350, y: 1330 },
              },
            },
          ],
        },
      ],
    });
    this.createBuyButton();
    this.setupEventListeners();
    this.container.visible = false;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.container.alpha = enabled ? 1 : 0.5;
    this.container.interactive = enabled;
    this.container.eventMode = enabled ? "static" : "none";
    this.container.cursor = enabled ? "pointer" : "not-allowed";
  }

  public setVisible(visible: boolean): void {
    this.container.visible = visible;
  }

  public setActiveText(bonusActivated: boolean): void {
    if (bonusActivated) {
      this.buyFeatureText.setKey("game.buy_freespin_active");
      this.priceLabel.visible = false;
      this.buyFeatureText.scale.set(1.4);
      this.buyFeatureText.y = this.featureTextInitialY + 30;
    } else {
      this.buyFeatureText.setKey("game.buy_freespin");
      this.priceLabel.visible = true;
      this.buyFeatureText.scale.set(1);
      this.buyFeatureText.y = this.featureTextInitialY;
    }
  }

  public updatePrice(price: string): void {
    if (this.priceLabel) {
      this.priceLabel.updateText(price);
      Engine.Utils.fitTextToWidth(this.priceLabel, 186, 34);
    }
  }

  public updateFeatureId(featureId: string): void {
    this.currentFeatureId = featureId;
  }

  private createBuyButton() {
    const textStyle = new TextStyle({
      fontFamily: ["adonais", "Arial", "sans-serif"],
      fill: "#edd245",
      align: "center",
      fontSize: 34,
      stroke: {
        color: "#000000",
        width: 3,
      },
      dropShadow: {
        alpha: 1,
        angle: Math.PI / 4,
        blur: 2,
        color: "#081200",
        distance: 1,
      },
    });

    const buyFeatureBg = Sprite.from("buy_freespin_back.png");
    this.container.addChild(buyFeatureBg);

    this.buyFeatureText = new Engine.LocalizedText(
      "game.buy_freespin",
      {},
      textStyle
    );
    this.buyFeatureText.anchor.set(0.5, 0.5);
    this.buyFeatureText.position.set(127, this.featureTextInitialY);
    this.buyFeatureText.resolution = 2;
    this.container.addChild(this.buyFeatureText);

    this.priceLabel = new Engine.LocalizedBitmapText(
      "",
      {},
      new TextStyle({
        fontFamily: ["DalekPinpointBold", "Arial", "sans-serif"],
        fill: "#f91362",
        align: "center",
        fontSize: 34,
        letterSpacing: 1,
        stroke: {
          color: "#000000",
          width: 3,
        },
        dropShadow: {
          alpha: 1,
          angle: Math.PI / 4,
          blur: 2,
          color: "#081200",
          distance: 1,
        },
      })
    );
    this.priceLabel.anchor.set(0.5);
    this.priceLabel.position.set(127, 199);
    this.priceLabel.resolution = 2;
    this.container.addChild(this.priceLabel);
  }

  private setupEventListeners() {
    this.container.on("pointertap", () => {
      if (this.isEnabled) {
        this.onButtonClick?.(this.currentFeatureId);
      }
    });
  }

  public destroy(): void {
    this.container.removeAllListeners();
    this.container.destroy();
  }
}
