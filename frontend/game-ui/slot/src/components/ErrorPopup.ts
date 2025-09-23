import { Container, Graphics, Text, TextStyle, Sprite } from "pixi.js";
import { BaseButton } from "./BaseButton";
import { Assets } from "pixi.js";

export interface ErrorPopupData {
  title: string;
  message: string;
  buttonText?: string;
}

export class ErrorPopup extends Container {
  private background!: Graphics;
  private overlay!: Graphics;
  private closeButton!: BaseButton;
  private titleText!: Text;
  private messageText!: Text;
  private okButton!: BaseButton;

  constructor() {
    super();
    this.createVisuals();
  }

  private createVisuals() {
    // Overlay (background dimming)
    this.overlay = new Graphics();
    this.overlay.fill({ color: 0x000000, alpha: 0.7 });
    this.overlay.rect(0, 0, 1920, 1080);
    this.overlay.fill();
    this.overlay.eventMode = "static"; // Prevent clicks through
    this.addChild(this.overlay);

    // Main popup background
    this.background = new Graphics();
    this.background.fill({ color: 0x1a1a1a, alpha: 0.95 });
    this.background.roundRect(0, 0, 400, 250, 20);
    this.background.fill();
    this.background.stroke({ color: 0xff6b6b, width: 2 });
    this.background.x = (1920 - 400) / 2;
    this.background.y = (1080 - 250) / 2;
    this.addChild(this.background);

    // Title
    this.titleText = new Text({
      text: "",
      style: new TextStyle({
        fontFamily: "HeadingNowWide",
        fontWeight: "900",
        fontSize: 24,
        fill: "#ff6b6b",
        align: "center",
      }),
    });
    this.titleText.anchor.set(0.5, 0);
    this.titleText.x = this.background.x + 200;
    this.titleText.y = this.background.y + 30;
    this.addChild(this.titleText);

    // Message
    this.messageText = new Text({
      text: "",
      style: new TextStyle({
        fontFamily: "DIN Offc Pro",
        fontWeight: "400",
        fontSize: 16,
        fill: "#ffffff",
        align: "center",
        wordWrap: true,
        wordWrapWidth: 350,
      }),
    });
    this.messageText.anchor.set(0.5, 0);
    this.messageText.x = this.background.x + 200;
    this.messageText.y = this.background.y + 80;
    this.addChild(this.messageText);

    // Close button (X)
    try {
      const closeSprite = new Sprite(Assets.get("xmark_thin.png"));
      closeSprite.anchor.set(0.5);
      closeSprite.width = 20;
      closeSprite.height = 20;
      this.closeButton = new BaseButton(closeSprite);
      this.closeButton.view.x = this.background.x + 380;
      this.closeButton.view.y = this.background.y + 20;
      this.closeButton.onPress.connect(() => this.emit("close"));
      this.addChild(this.closeButton.view);
    } catch (error) {
      console.warn(
        "Failed to load close button sprite, using text fallback.",
        error
      );
      // Fallback to text-based close button
      const closeText = new Text({
        text: "×",
        style: new TextStyle({
          fontFamily: "DIN Offc Pro",
          fontWeight: "bold",
          fontSize: 24,
          fill: "#ff6b6b",
        }),
      });
      closeText.anchor.set(0.5);
      this.closeButton = new BaseButton(closeText);
      this.closeButton.view.x = this.background.x + 380;
      this.closeButton.view.y = this.background.y + 20;
      this.closeButton.onPress.connect(() => this.emit("close"));
      this.addChild(this.closeButton.view);
    }

    // OK Button
    const okButtonBg = new Graphics();
    okButtonBg.fill({ color: 0xff6b6b });
    okButtonBg.roundRect(0, 0, 120, 40, 8);
    okButtonBg.fill();

    const okText = new Text({
      text: "TAMAM",
      style: new TextStyle({
        fontFamily: "HeadingNowWide",
        fontWeight: "700",
        fontSize: 14,
        fill: "#ffffff",
      }),
    });
    okText.anchor.set(0.5);
    okText.x = 60;
    okText.y = 20;

    const okContainer = new Container();
    okContainer.addChild(okButtonBg, okText);
    okContainer.x = this.background.x + 140;
    okContainer.y = this.background.y + 180;

    this.okButton = new BaseButton(okContainer);
    this.okButton.onPress.connect(() => this.emit("close"));
    this.addChild(this.okButton.view);
  }

  public show(data: ErrorPopupData) {
    this.titleText.text = data.title;
    this.messageText.text = data.message;

    if (data.buttonText) {
      const okText = this.okButton.view.children[1] as Text;
      okText.text = data.buttonText;
    }

    this.visible = true;
  }

  public hide() {
    this.visible = false;
  }

  public resize(width: number, height: number) {
    this.overlay.clear();
    this.overlay.fill({ color: 0x000000, alpha: 0.7 });
    this.overlay.rect(0, 0, width, height);
    this.overlay.fill();

    // Center popup
    this.background.x = (width - 400) / 2;
    this.background.y = (height - 250) / 2;

    this.titleText.x = this.background.x + 200;
    this.titleText.y = this.background.y + 30;

    this.messageText.x = this.background.x + 200;
    this.messageText.y = this.background.y + 80;

    this.closeButton.view.x = this.background.x + 380;
    this.closeButton.view.y = this.background.y + 20;

    this.okButton.view.x = this.background.x + 140;
    this.okButton.view.y = this.background.y + 180;
  }
}
