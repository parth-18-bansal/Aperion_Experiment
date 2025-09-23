import { Container, Graphics, TextStyle } from "pixi.js";
import { Engine } from "game-engine";

export interface FreeRoundTopBarData {
  remainingFreeRound: number;
  totalWin: number;
}

export class FreeRoundTopBar extends Container {
  private remainCount!: InstanceType<typeof Engine.LocalizedText>;
  private totalWin!: InstanceType<typeof Engine.LocalizedText>;

  constructor() {
    super();
    Engine.Utils.ApplyCommonProperties(this, {
      components: [
        {
          type: Engine.Components.ResizeComponent,
          params: [
            {
              desktop: {
                landscape: { scale: 1.5, x: 0, y: 90 },
              },
              mobile: {
                landscape: { scale: 1.5, x: 0, y: 50 },
                portrait: { scale: 1.65, x: -515, y: 100 },
              },
            },
          ],
        },
      ],
    });
    this.createVisuals();
  }

  private createVisuals() {
    // background
    const background = new Graphics();
    background.fill({ color: "#000000f7", alpha: 0.95 });
    background.roundRect(0, 0, 650, 80, 25);
    background.fill();
    background.pivot.set(650 / 2, 40); // Centered position
    background.position.set(640, -49);

    // Title
    const remainText: InstanceType<typeof Engine.LocalizedText> =
      new Engine.LocalizedText(
        "REMAIN FREE ROUNDS:",
        {},
        new TextStyle({
          fontFamily: "Montserrat, sans-serif",
          fontWeight: "700",
          fontSize: 14,
          fill: "#ffffff",
          align: "center",
        })
      );
    remainText.position.set(350, -30);
    remainText.resolution = 2;
    // Remain Free Rounds count
    this.remainCount = new Engine.LocalizedText(
      "0",
      {},
      new TextStyle({
        fontFamily: "Montserrat, sans-serif",
        fontWeight: "700",
        fontSize: 14,
        fill: "#ff5500",
        align: "center",
      })
    );
    this.remainCount.position.set(remainText.x + remainText.width + 5, -30);
    this.remainCount.resolution = 2;
    // Message
    const messageText: InstanceType<typeof Engine.LocalizedText> =
      new Engine.LocalizedText(
        "TOTAL WIN:",
        {},
        new TextStyle({
          fontFamily: "Montserrat, sans-serif",
          fontWeight: "700",
          fontSize: 14,
          fill: "#ffffff",
          align: "center",
        })
      );
    messageText.position.set(810, -30);
    messageText.resolution = 2;
    // Total Win count
    this.totalWin = new Engine.LocalizedText(
      "$0.00",
      {},
      new TextStyle({
        fontFamily: "Montserrat, sans-serif",
        fontWeight: "700",
        fontSize: 14,
        fill: "#ff5500",
        align: "center",
      })
    );
    this.totalWin.position.set(messageText.x + messageText.width + 5, -30);
    this.totalWin.resolution = 2;

    this.addChild(
      background,
      remainText,
      this.remainCount,
      messageText,
      this.totalWin
    );
    // Initial visibility
    this.visible = false;
  }

  public show(data: FreeRoundTopBarData): Promise<void> {
    return new Promise<void>((resolve) => {
      this.remainCount.updateText(`${data.remainingFreeRound}`);
      this.totalWin.updateText(`${data.totalWin}`);
      resolve();
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
