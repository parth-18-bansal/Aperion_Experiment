import { Assets, Container, Graphics, Sprite, Text, TextStyle } from "pixi.js";
import { Button } from "@pixi/ui";
import { Engine } from "game-engine";

export interface FreeRoundOutroPopupData {
  winAmount: number;
  usedCount: number;
}

export class FreeRoundOutroPopup extends Container {
  private titleText!: InstanceType<typeof Engine.LocalizedText>;
  private usedRoundText!: InstanceType<typeof Engine.LocalizedText>;
  private usedRoundsText!: InstanceType<typeof Engine.LocalizedText>;
  private startButton!: Button;

  constructor() {
    super();
    Engine.Utils.ApplyCommonProperties(this, {
      components: [
        {
          type: Engine.Components.ResizeComponent,
          params: [
            {
              desktop: {
                landscape: { scale: 1 },
              },
              mobile: {
                landscape: { scale: 1.5 },
                portrait: { scale: 1.5 },
              },
              tablet: {
                landscape: { scale: 1.5 },
                portrait: { scale: 1.5 },
              },
            },
          ],
        },
        {
          type: Engine.Components.GridPositionComponent,
          params: [
            {
              desktop: {
                landscape: {
                  position: { x: -0.67, y: -0.7 },
                },
              },
              mobile: {
                landscape: {
                  position: { x: -1, y: -1 },
                },
                portrait: { 
                  position: { x: -1.78, y: -0.5 }
                },
              },
              tablet: {
                landscape: {
                  position: { x: -1, y: -1 },
                },
                portrait: {
                  position: { x: -1.78, y: -0.5 },
                },
              },
            },
          ],
        },
      ],
    });
    this.createVisuals();
  }

  private createVisuals() {
    const buttonTextStyle = new TextStyle({
      fontFamily: "Montserrat, sans-serif",
      fontWeight: "700",
      fontSize: 28,
      fill: "#ffffff",
      dropShadow: {
        alpha: 0.5,
        angle: Math.PI / 4,
        blur: 2,
        color: "#081200",
        distance: 2,
      },
    });
    // Overlay (background dimming)
    const overlay = new Graphics();
    overlay.fill({ color: "#000000bf", alpha: 0.8 });
    overlay.rect(
      0,
      0,
      this.game.renderer.screen.width + 4000,
      this.game.renderer.screen.height + 2000
    );
    overlay.fill();
    overlay.eventMode = "static"; // Prevent clicks through
    overlay.pivot.set(overlay.width / 2, overlay.height / 2);
    // popup sprite
    const popupBG = Sprite.from("freespin_bg.png");
    popupBG.anchor.set(0.5);
    popupBG.position.set(640, 360); // Center of screen
    // popup sprite
    const giftBG = Sprite.from("freespin_gift.png");
    giftBG.anchor.set(0.5);
    giftBG.position.set(640, 280); // Center of screen

    // Title
    this.titleText = new Engine.LocalizedText(
      "ui.free-round-popup.total-win",
      { totalWin: "0" },
      new TextStyle({
        fontFamily: "Montserrat, sans-serif",
        fontWeight: "900",
        fontSize: 36,
        fill: "#ffd156",
        align: "center",
      })
    );
    this.titleText.anchor.set(0.5);
    this.titleText.position.set(640, 450);
    this.titleText.resolution = 2;

    // Message
    this.usedRoundText = new Engine.LocalizedText(
      "ui.free-round-popup.used-round",
      { usedCount: "" },
      new TextStyle({
        fontFamily: "Montserrat, sans-serif",
        fontWeight: "500",
        fontSize: 24,
        fill: "#ffffff",
        align: "center",
        wordWrap: true,
        wordWrapWidth: 500,
      })
    );
    this.usedRoundText.anchor.set(0.5);
    this.usedRoundText.position.set(640, 490);
    this.usedRoundText.resolution = 2;
    this.usedRoundText.alpha = 0.75;
    this.usedRoundText.visible = false;

    this.usedRoundsText = new Engine.LocalizedText(
      "ui.free-round-popup.used-rounds",
      { usedCount: "" },
      new TextStyle({
        fontFamily: "Montserrat, sans-serif",
        fontWeight: "500",
        fontSize: 24,
        fill: "#ffffff",
        align: "center",
        wordWrap: true,
        wordWrapWidth: 500,
      })
    );
    this.usedRoundsText.anchor.set(0.5);
    this.usedRoundsText.position.set(640, 490);
    this.usedRoundsText.resolution = 2;
    this.usedRoundsText.alpha = 0.75;
    this.usedRoundsText.visible = false;

    // Start button
    this.startButton = new Button(new Sprite(Assets.get("freespin_start.png")));
    this.startButton.view.pivot.set(
      this.startButton.view.width / 2,
      this.startButton.view.height / 2
    );
    this.startButton.view.x = 640;
    this.startButton.view.y = 570;
    const startText: InstanceType<typeof Engine.LocalizedText> =
      new Engine.LocalizedText("ui.free-round-popup.ok", {}, buttonTextStyle);
    startText.anchor.set(0.5);
    startText.position.set(
      this.startButton.view.width / 2,
      this.startButton.view.height / 2
    );
    startText.resolution = 2;
    this.startButton.view.addChild(startText);

    const container = new Container();
    container.pivot.set(this.game.renderer.screen.width/2, this.game.renderer.screen.height/2);
    container.position.set(this.game.renderer.screen.width/2, this.game.renderer.screen.height/2);
    container.addChild(
      popupBG,
      giftBG,
      this.titleText,
      this.usedRoundText,
      this.usedRoundsText,
      this.startButton.view
    );

    this.addChild(overlay, container);
    // Initial visibility
    this.visible = false;
  }

  public show(data: FreeRoundOutroPopupData): Promise<void> {
    return new Promise<void>((resolve) => {
      this.titleText.setVars({
        totalWin: this.game.slot.currency.format(data.winAmount.toFixed(2)),
      });
      if (data.usedCount === 1) {
        this.usedRoundText.setVars({ usedCount: data.usedCount });
        this.usedRoundText.visible = true;
        this.usedRoundsText.visible = false;
      } else {
        this.usedRoundsText.setVars({ usedCount: data.usedCount });
        this.usedRoundText.visible = false;
        this.usedRoundsText.visible = true;
      }
      this.startButton.onPress.connect(() => {
        this.emit("close");
        resolve();
      });
      this.visible = true;
    });
  }

  public hide() {
    this.visible = false;
  }

  public destroy(): void {
    this.destroy();
  }
}
