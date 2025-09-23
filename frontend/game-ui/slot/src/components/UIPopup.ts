import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { BaseButton } from "./BaseButton";
import { Engine } from "game-engine";

export interface UIPopupData {
  title: string;
  message: string;
  button?: boolean;
  buttonText?: string;
}

export class UIPopup extends Container {
  private titleText!: Text;
  private messageText!: Text;
  private okButton!: BaseButton;
  private popupContainer!: Container;
  private background!: Graphics;
  public offlinePopupFlag: boolean = false;

  constructor() {
    super();
    Engine.Utils.ApplyCommonProperties(this, {
      visible: false,
      components: [
        {
          type: Engine.Components.ResizeComponent,
          params: [
            {
              desktop: {
                landscape: { scale: 1 },
              },
              mobile: {
                landscape: { scale: 1, x: 0, y: 0 },
                portrait: { scale: 1, x: 0, y: 0 },
              },
              tablet: {
                landscape: { scale: 1 },
                portrait: { scale: 1 },
              },
            },
          ],
        },
         {
          type: Engine.Components.GridPositionComponent,
          params: [
            {
              desktop: {
                landscape: { position: { x: 0, y: 0} },
              },
              mobile: {
                landscape: { position: { x: 0, y: 0} },
                portrait: { position: { x: 0, y: 0} },
              },
              tablet: {
                landscape: { position: { x: 0, y: 0} },
                portrait: { position: { x: 0, y: 0} },
              }
              /* mobile: {
                landscape: { columns: 2, rows: 2, position: { x: -1.2, y: -1 } },
                portrait: { columns: 2, rows: 2, position: { x: -1.2, y: -1 } },
              } */
            },
          ],
        }
      ],
    });


    this.createVisuals();

    // 🔑 Keep popup centered on resize
    this.game.renderer.on("resize", this.centerPopup, this);
  }

  private createVisuals() {
    // Overlay
    const overlay = new Graphics();
    overlay.fill({ color: "#000000bf" });
    overlay.rect(-1000,-500, this.game.renderer.screen.width+2000, this.game.renderer.screen.height+2000);
    overlay.fill();
    overlay.eventMode = "static"; 
    this.addChild(overlay);

    // Popup container
    this.popupContainer = new Container();
    this.addChild(this.popupContainer);

    // Background
    this.background = new Graphics();
    this.background.fill({ color: "#000000f7" });
    this.background.roundRect(0, 0, 500, 350, 20);
    this.background.fill();
    this.popupContainer.addChild(this.background);
    this.popupContainer.scale.set(1.2);

    // Title
    this.titleText = new Text({
      anchor: 0.5,
      x: 250,
      y: 60,
      text: "SESSION EXPIRED",
      style: new TextStyle({
        fontFamily: "HeadingNowWide",
        fontWeight: "900",
        fontSize: 36,
        fill: "#fd9700",
        align: "center",
      }),
    });
    this.popupContainer.addChild(this.titleText);

    // Message
    this.messageText = new Text({
      anchor: 0.5,
      x: 250,
      y: 160,
      text: "Error message goes here.",
      style: new TextStyle({
        fontFamily: "DIN Offc Pro",
        fontWeight: "400",
        fontSize: 24,
        fill: "#ffffff",
        align: "center",
        wordWrap: true,
        wordWrapWidth: 400,
      }),
    });
    this.popupContainer.addChild(this.messageText);

    // Center popup initially
    this.centerPopup();
  }

  private centerPopup() {
    this.x = 0;
    this.y = 0;
    const screen = this.game.renderer.screen;
    
    console.log("SCALE SIZE ::   ", this.scale, this.popupContainer.scale);
     
    //this.popupContainer.pivot.set(this.popupContainer.width / 2, this.popupContainer.height / 2);
    this.popupContainer.position.set((screen.width - this.popupContainer.width) / 2, (screen.height - this.popupContainer.height) / 2); 
    /* if(window.innerWidth < screen.width/2){
      this.popupContainer.x = screen.width/4;
      this.popupContainer.y = screen.height/4;
    } else {
      this.popupContainer.position.set(screen.width / 2, screen.height / 2);  
    } */
    
  }

  public show(data: UIPopupData): Promise<void> {
    return new Promise<void>((resolve) => {
      this.titleText.text = data.title;
      this.messageText.text = data.message;

      if (data.button && data.buttonText) {
        this.addButton(resolve, data.buttonText);
      }

      this.visible = true;
      this.centerPopup(); // ensure correct position
    });
  }

  public hide() {
    this.visible = false;
  }

  private addButton(resolve: () => void, buttonText: string) {
    const okButtonBg = new Graphics();
    okButtonBg.fill({ color: "#fd9700" });
    okButtonBg.roundRect(0, 0, 120, 60, 8);
    okButtonBg.fill();

    const okText = new Text({
      anchor: 0.5,
      x: 60,
      y: 30,
      text: buttonText,
      style: new TextStyle({
        fontFamily: "HeadingNowWide",
        fontWeight: "700",
        fontSize: 22,
        fill: "#000000f7",
      }),
    });

    const okContainer = new Container();
    okContainer.addChild(okButtonBg, okText);

    this.okButton = new BaseButton(okContainer);
    this.okButton.onPress.connect(() => {
      this.hide();
      resolve();
      // Reload page if session expired as per old game behaviour
      if (this.titleText.text.toLowerCase().includes("session")) {
        window.location.reload();
      }
    });

    // Place button at bottom center of popup
    this.okButton.view.pivot.set(this.okButton.view.width / 2, 0);
    this.okButton.view.position.set(this.background.width / 2, this.background.height - 80);

    this.popupContainer.addChild(this.okButton.view);
  }
}