import { Assets, Container, Graphics, Sprite, TextStyle } from "pixi.js";
import { Button } from "@pixi/ui";
import { Engine } from "game-engine";

export interface FreeRoundIntroPopupData {
  bet: number;
  expiryDate: string;
  laterButton?: boolean;
  roundCount?: number;
}

export class FreeRoundIntroPopup extends Container {
  private startButton!: Button;
  private laterButton!: Button;
  private fixedBet!: InstanceType<typeof Engine.LocalizedText>;
  private expiryDateText!: InstanceType<typeof Engine.LocalizedText>;
  private titleText!: InstanceType<typeof Engine.LocalizedText>;
  private messageText!: InstanceType<typeof Engine.LocalizedText>;

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
    //overlay.rect(0, 0, 1920, 1080);
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
    // Fixed Bet text
    this.fixedBet = new Engine.LocalizedText(
      "$0.00",
      {},
      new TextStyle({
        fontFamily: "Montserrat, sans-serif",
        fontWeight: "700",
        fontSize: 16,
        fill: "#ffd156",
        align: "right",
        wordWrap: true,
        wordWrapWidth: 500,
      })
    );
    this.fixedBet.anchor.set(1, 0.5);
    this.fixedBet.position.set(955, 85);
    this.fixedBet.resolution = 2;
    // Title You Earn
    this.titleText = new Engine.LocalizedText(
      "ui.free-round-popup.title",
      { roundCount: "" },
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
    // Message Bonus Game
    this.messageText = new Engine.LocalizedText(
      "ui.free-round-popup.bonus-game",
      {},
      new TextStyle({
        fontFamily: "Montserrat, sans-serif",
        fontWeight: "900",
        fontSize: 30,
        fill: "#ffffff",
        align: "center",
        wordWrap: true,
        wordWrapWidth: 500,
      })
    );
    this.messageText.anchor.set(0.5);
    this.messageText.position.set(640, 490);
    this.messageText.resolution = 2;
    // Expiry date text
    this.expiryDateText = new Engine.LocalizedText(
      "ui.free-round-popup.expiry-date",
      { expiryTime: "" },
      new TextStyle({
        fontFamily: "Montserrat, sans-serif",
        fontWeight: "200",
        fontSize: 14,
        fill: "#ffffff",
        align: "center",
        wordWrap: true,
        wordWrapWidth: 500,
      })
    );
    this.expiryDateText.anchor.set(0.5);
    this.expiryDateText.position.set(640, 628);
    this.expiryDateText.resolution = 2;
    this.expiryDateText.alpha = 0.5;
    // Start button
    this.startButton = new Button(new Sprite(Assets.get("freespin_start.png")));
    this.startButton.view.pivot.set(
      this.startButton.view.width / 2,
      this.startButton.view.height / 2
    );
    this.startButton.view.x = 640;
    this.startButton.view.y = 570;
    const startText: InstanceType<typeof Engine.LocalizedText> =
      new Engine.LocalizedText(
        "ui.free-round-popup.start",
        {},
        buttonTextStyle
      );
    startText.anchor.set(0.5);
    startText.position.set(
      this.startButton.view.width / 2,
      this.startButton.view.height / 2
    );
    startText.resolution = 2;
    this.startButton.view.addChild(startText);
    // Later button
    this.laterButton = new Button(new Sprite(Assets.get("freespin_later.png")));
    this.laterButton.view.pivot.set(
      this.laterButton.view.width / 2,
      this.laterButton.view.height / 2
    );
    this.laterButton.view.x = 510;
    this.laterButton.view.y = 570;
    const laterText: InstanceType<typeof Engine.LocalizedText> =
      new Engine.LocalizedText(
        "ui.free-round-popup.later",
        {},
        buttonTextStyle
      );
    laterText.anchor.set(0.5);
    laterText.position.set(
      this.laterButton.view.width / 2,
      this.laterButton.view.height / 2
    );
    laterText.resolution = 2;
    this.laterButton.view.addChild(laterText);

    const container = new Container();
    //container.pivot.set(640, 360);
    //container.position.set(640, 360);
    container.addChild(
      popupBG,
      giftBG,
      this.fixedBet,
      this.titleText,
      this.messageText,
      this.startButton.view,
      this.expiryDateText
    );
    this.addChild(overlay, container);
    // Initial visibility
    this.visible = false;
  }

  public show(
    data: FreeRoundIntroPopupData
  ): Promise<{ action: "start" | "later" }> {
    return new Promise<{ action: "start" | "later" }>((resolve) => {
      if (data.laterButton) {
        this.titleText.setVars({ roundCount: data.roundCount });
        this.messageText.setKey("ui.free-round-popup.free-rounds");
      }
      this.expiryDateText.setVars({ expiryTime: new Date(data.expiryDate).toLocaleString() });
      this.fixedBet.updateText(
        `${this.game.slot.currency.format(data.bet.toFixed(2))}`
      );
      this.addLaterButton(data.laterButton || false);

      // Clear any existing listeners
      this.startButton.onPress.disconnectAll();
      if (data.laterButton) {
        this.laterButton.onPress.disconnectAll();
      }

      this.startButton.onPress.connect(() => {
        this.hide();
        resolve({ action: "start" });
      });

      if (data.laterButton) {
        this.laterButton.onPress.connect(() => {
          this.hide();
          resolve({ action: "later" });
        });
      }

      this.visible = true;
    });
  }

  public hide() {
    this.visible = false;
  }

  // Method to add an OK button
  protected addLaterButton(val: boolean): void {
    if (val) {
      this.addChild(this.laterButton.view);
      this.startButton.view.x = 770;
    } else {
      this.removeChild(this.laterButton.view);
      this.startButton.view.x = 640;
    }
  }

  public destroy(): void {
    this.destroy();
  }
}
