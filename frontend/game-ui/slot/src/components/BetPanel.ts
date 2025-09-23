import {
  Assets,
  Container,
  Graphics,
  isMobile,
  Sprite,
  Text,
  TextStyle,
  Texture,
} from "pixi.js"; // Adjust import path if needed
import { BaseButton } from "./BaseButton";
import { Engine } from "game-engine";
import { isPortrait } from "game-engine/src/utils";
import { UI } from "../..";

export class BetPanel extends Container {
  private bg: Graphics;
  private blurOverlay: Graphics;
  private title: InstanceType<typeof Engine.LocalizedText>;
  private closeButton: BaseButton;
  private bottomPointer: Graphics;

  // Divider'ları saklamak için
  private dividers: Graphics[] = [];

  private betLevelLabel: InstanceType<typeof Engine.LocalizedText>;
  public betLevelDecButton: BaseButton;
  public betLevelIncButton: BaseButton;
  private betLevelText: InstanceType<typeof Engine.LocalizedText>;

  private coinLabel: InstanceType<typeof Engine.LocalizedText>;
  public coinDecButton: BaseButton;
  public coinIncButton: BaseButton;
  private coinText: InstanceType<typeof Engine.LocalizedText>;

  private totalLabel: InstanceType<typeof Engine.LocalizedText>;
  public totalDecButton: BaseButton;
  public totalIncButton: BaseButton;
  private totalText: InstanceType<typeof Engine.LocalizedText>;

  constructor() {
    super();
    this.eventMode = "static";
    this.bg = new Graphics();
    this.bg.fill({ color: 0x000000, alpha: 0.75 });
    this.bg.roundRect(0, 0, 260, 160, 24.5);
    this.bg.fill();
    this.addChild(this.bg);

    this.blurOverlay = new Graphics();
    this.blurOverlay.fill({ color: 0x000000, alpha: 0.1 });
    this.blurOverlay.roundRect(0, 0, 260, 160, 24.5);
    this.blurOverlay.fill();
    this.addChild(this.blurOverlay);

    this.title = new Engine.LocalizedText(
      "ui.bet-panel.header",
      { betLine: 20 },
      {
        fontFamily: "HeadingNowText",
        fontWeight: "bolder",
        fill: "#fd9700",
        fontSize: 30,
      }
    );
    this.title.anchor.set(0, 0);
    this.title.resolution = 2; // For high resolution
    this.addChild(this.title);

    const closeTexture = Assets.get<Texture>("xmark_thin.png");
    this.closeButton = new BaseButton(new Sprite(closeTexture));
    this.closeButton.onPress.connect(() => {this.visible = false; (this.parent.parent as UI).setVisibility("spinArea", true);});
    this.addChild(this.closeButton.view);

    // BET LEVEL ROW
    this.betLevelLabel = new Engine.LocalizedText(
      "ui.bet-panel.bet-levels",
      {},
      this.labelStyle()
    );
    this.betLevelLabel.resolution = 2; // For high resolution
    this.betLevelLabel.anchor.set(0, 0.5);
    const linesDecTexture = Assets.get<Texture>("input_desc.png");
    const linesIncTexture = Assets.get<Texture>("input_inc.png");
    this.betLevelDecButton = new BaseButton(new Sprite(linesDecTexture));
    this.betLevelIncButton = new BaseButton(new Sprite(linesIncTexture));
    this.betLevelText = this.makeValueText();

    // COIN ROW
    this.coinLabel = new Engine.LocalizedText(
      "ui.bet-panel.coin-values",
      {},
      this.labelStyle()
    );
    this.coinLabel.resolution = 2; // For high resolution
    this.coinLabel.anchor.set(0, 0.5);
    const coinDecTexture = Assets.get<Texture>("input_desc.png");
    const coinIncTexture = Assets.get<Texture>("input_inc.png");
    this.coinDecButton = new BaseButton(new Sprite(coinDecTexture));
    this.coinIncButton = new BaseButton(new Sprite(coinIncTexture));
    this.coinText = this.makeValueText();

    // TOTAL BET ROW
    this.totalLabel = new Engine.LocalizedText(
      "ui.bet-panel.total-bet",
      {},
      this.labelStyle()
    );
    this.totalLabel.resolution = 2; // For high resolution
    this.totalLabel.anchor.set(0, 0.5);
    const totalDecTexture = Assets.get<Texture>("input_desc.png");
    const totalIncTexture = Assets.get<Texture>("input_inc.png");
    this.totalDecButton = new BaseButton(new Sprite(totalDecTexture));
    this.totalIncButton = new BaseButton(new Sprite(totalIncTexture));
    this.totalText = this.makeValueText();

    // Add views
    this.addChild(
      this.betLevelLabel,
      this.betLevelDecButton.view,
      this.betLevelText,
      this.betLevelIncButton.view,
      this.coinLabel,
      this.coinDecButton.view,
      this.coinText,
      this.coinIncButton.view,
      this.totalLabel,
      this.totalDecButton.view,
      this.totalText,
      this.totalIncButton.view
    );

    // Bottom inverted triangle (black), centered at panel bottom
    this.bottomPointer = new Graphics();
    const triW = 19; // 18 * 1.5
    const triH = 10; // 12 * 1.5
    this.bottomPointer.fill({ color: 0x000000, alpha: 0.8 });
    this.bottomPointer.moveTo(0, 0);
    this.bottomPointer.lineTo(triW, 0);
    this.bottomPointer.lineTo(triW / 2, triH);
    this.bottomPointer.lineTo(0, 0);
    this.bottomPointer.fill();
    this.bottomPointer.x = this.width / 2 - this.bottomPointer.width / 2;
    this.bottomPointer.y = this.height - this.bottomPointer.height * 2 - 2;
    this.addChild(this.bottomPointer);
    this.resize(466, 269); // Keep original size, scaling happens inside resize method
  }
  private labelStyle() {
    return new TextStyle({
      fontFamily: "HeadingNowText",
      fontWeight: "bolder",
      fontSize: 18,
      fill: "white",
    });
  }

  private makeValueText(): InstanceType<typeof Engine.LocalizedText> {
    const txt = new Engine.LocalizedText(
      "",
      {},
      new TextStyle({
        fontFamily: "HeadingNowText",
        fontWeight: "bolder",
        fontSize: 20,
        fill: "#fd9700",
      })
    );
    txt.anchor.set(0.5);
    txt.resolution = 2; // For high resolution
    return txt;
  }

  private addDivider(x: number, width: number, y: number = 0) {
    const divider = new Graphics();
    divider.label = `divider_${y}`; // Divider'ları tanımlamak için label ekle
    divider.moveTo(x, y);
    divider.lineTo(x + width, y).stroke({ color: 0xffffff, alpha: 0.4 });
    this.addChild(divider);
    this.dividers.push(divider); // Divider'ı tracking array'ine ekle
    return divider;
  }


  private clearDividers() {
    this.dividers.forEach(divider => {
      if (divider.parent) {
        divider.parent.removeChild(divider);
      }
    });
    this.dividers = [];
  }

  public updateBetPanelTextValues(
    betLevel: string,
    coinValue: string,
    totalBet: string
  ) {
    this.betLevelText.updateText(betLevel);
    this.coinText.updateText(coinValue);
    this.totalText.updateText(totalBet);
  }

  public resize(width: number, height: number) {
    if (isPortrait() && isMobile.any) {
      this.applyMobilePortraitLayout(width, height);
    } else if (isMobile.any && !isPortrait()) {
      this.applyMobileLandscapeLayout(width);
    } else {
      this.applyDesktopLayout(width);
    }
  }

  private applyMobilePortraitLayout(width: number, height: number) {
    const scaledWidth = width * (isMobile.tablet ? 1.25 : 0.75);
    const scale = isMobile.tablet ? 3.2 : 3.6;
    this.scale.set(scale);
    this.bg.clear();
    this.bg.fill({ color: 0x000000, alpha: 0.8 });
    this.bg.roundRect(-100, 0, width * (isMobile.tablet ? 1.25 : 1) + 500, (height / 2) + 80, 0);
    this.bg.fill();
    this.blurOverlay.clear();
    this.blurOverlay.fill({ color: 0x000000, alpha: 0.1 });
    this.blurOverlay.roundRect(-100, 0, width * (isMobile.tablet ? 1.25 : 1) + 500, (height / 2) + 80, 0);
    this.blurOverlay.fill();
    this.y = -height / 2 - (isMobile.tablet ? 585 : 700);
    this.x = isMobile.tablet ? -265 : 0;
    this.setTitleLayout(scaledWidth / 0.8);
    this.layoutRows(this.getRowPreset(isMobile.tablet ? "tabletportrait" : "portrait", scaledWidth / 1.1));
    const dividerX = 20;
    const dividerWidth = scaledWidth - 40;
    const rowHeight = 50;
    const startY = 55;
    this.clearDividers();
    this.title.x = 20;
    this.title.y = 20;
    this.closeButton.view.x = scaledWidth - this.closeButton.view.width - 20;
    this.closeButton.view.y = 20;
    this.addDivider(dividerX, dividerWidth, startY);
    this.addDivider(dividerX, dividerWidth, startY + rowHeight * 1);
    this.addDivider(dividerX, dividerWidth, startY + rowHeight * 2);
    this.addDivider(dividerX, dividerWidth, startY + rowHeight * 3);
  }

  private applyMobileLandscapeLayout(width: number) {
    this.clearDividers();
    this.scale.set(2);
    this.bg.clear();

    this.addDivider(20, 230, 42);
    this.bg.fill({ color: 0x000000, alpha: 0.75 });
    this.bg.roundRect(-2, -5, 267, 155, 24.5);
    this.bg.fill();
    this.blurOverlay.clear();
    this.blurOverlay.fill({ color: 0x000000, alpha: 0.1 });
    this.blurOverlay.roundRect(-2, -5, 267, 155, 24.5);
    this.blurOverlay.fill();
    this.x = 960;
    this.y = -400;
    const scaledWidth = width * 0.62;
    this.setTitleLayout(scaledWidth);
    this.layoutRows(this.getRowPreset("landscape", scaledWidth));
  }

  private applyDesktopLayout(width: number) {
    this.clearDividers();
    this.addDivider(20, 230, 42);

    this.scale.set(1.6);
    this.bg.clear();
    this.bg.fill({ color: 0x000000, alpha: 0.75 });
    this.bg.roundRect(-2, -5, 267, 155, 24.5);
    this.bg.fill();
    this.blurOverlay.clear();
    this.blurOverlay.fill({ color: 0x000000, alpha: 0.1 });
    this.blurOverlay.roundRect(-2, -5, 267, 155, 24.5);
    this.blurOverlay.fill();
    this.x = 200;
    this.y = -240;
    const scaledWidth = width * 0.55;
    this.setTitleLayout(scaledWidth);
    this.layoutRows(this.getRowPreset("desktop", scaledWidth));

  }

  private setTitleLayout(width: number) {
    this.title.x = 18; // 16 * 1.1 ≈ 18
    this.title.y = 11; // 10 * 1.1 ≈ 11
    this.title.style.fontSize = 17; // 15 * 1.1 ≈ 17
    this.closeButton.view.x = 240; // 22 * 1.1 ≈ 24
    this.closeButton.view.y = 15; // 10 * 1.1 ≈ 11
    this.closeButton.view.width = 11; // 16 * 1.1 ≈ 18
    this.closeButton.view.height = 11; // 16 * 1.1 ≈ 18
  }

  // --- Basit preset tabanlı satır yerleşimi ---
  private getRowPreset(mode: "portrait" | "landscape" | "desktop" | "tabletportrait", panelWidth: number) {
    // Ortak tip: değerler okunabilir anahtarlarla
    const common = { panelWidth, labelFontSize: 10, valueFontSize: 15, rows: 3 };
    if (mode === "portrait") {
      return { ...common, labelX: 20, valueBaseX: 155, startY: 70, rowHeight: 50, startYOffset: 10, valueOffsetX: 55, valueOffsetY: 10, minusOffsetX: 15, plusOffsetFromRight: 15 };
    }
    else if (mode === "tabletportrait") {
      return { ...common, labelX: 20, valueBaseX: 345, startY: 70, rowHeight: 50, startYOffset: 10, valueOffsetX: 60, valueOffsetY: 10, minusOffsetX: 15, plusOffsetFromRight: 0 };
    }
    else if (mode === "landscape") {
      return { ...common, labelX: 20, valueBaseX: 120, startY: 50, rowHeight: 30, startYOffset: 10, valueOffsetX: 60, valueOffsetY: 10, minusOffsetX: 15, plusOffsetFromRight: 15 };
    }
    else { // desktop
      return { ...common, labelX: 20, valueBaseX: 120, startY: 50, rowHeight: 30, startYOffset: 10, valueOffsetX: 60, valueOffsetY: 10, minusOffsetX: 15, plusOffsetFromRight: 825 };
    }
  }

  private layoutRows(preset: ReturnType<typeof this.getRowPreset>) {
    const {
      panelWidth,
      labelX,
      valueBaseX,
      startY,
      rowHeight,
      startYOffset,
      valueOffsetX,
      valueOffsetY,
      minusOffsetX,
      plusOffsetFromRight,
      labelFontSize,
      valueFontSize,
    } = preset;

    const plusX = panelWidth - plusOffsetFromRight;
    const minusX = valueBaseX - minusOffsetX;

    const rows: Array<{
      label: Text; dec: BaseButton; value: Text; inc: BaseButton; rowIndex: number;
    }> = [
        { label: this.betLevelLabel, dec: this.betLevelDecButton, value: this.betLevelText, inc: this.betLevelIncButton, rowIndex: 0 },
        { label: this.coinLabel, dec: this.coinDecButton, value: this.coinText, inc: this.coinIncButton, rowIndex: 1 },
        { label: this.totalLabel, dec: this.totalDecButton, value: this.totalText, inc: this.totalIncButton, rowIndex: 2 },
      ];

    rows.forEach(r => {
      const baseY = startY + r.rowIndex * rowHeight;
      this.setRow(
        r.label,
        r.dec,
        r.value,
        r.inc,
        labelX,
        baseY + startYOffset,
        minusX,
        baseY - 2,
        valueBaseX + valueOffsetX,
        baseY + valueOffsetY,
        plusX,
        baseY - 2,
        labelFontSize,
        valueFontSize
      );
    });
  }

  private setRow(
    label: Text,
    decButton: BaseButton,
    value: Text,
    incButton: BaseButton,
    labelX: number,
    labelY: number,
    decX: number,
    decY: number,
    valueX: number,
    valueY: number,
    incX: number,
    incY: number,
    labelFontSize: number,
    valueFontSize: number
  ) {
    label.x = labelX;
    label.y = labelY;
    label.style.fontSize = labelFontSize;
    label.resolution = 2; // For high resolution

    decButton.view.x = decX;
    decButton.view.y = decY;
    decButton.view.width = 24; // 22 * 1.1 ≈ 24
    decButton.view.height = 24; // 22 * 1.1 ≈ 24

    value.x = valueX;
    value.y = valueY;
    value.style.fontSize = valueFontSize;

    incButton.view.x = incX;
    incButton.view.y = incY;
    incButton.view.width = 24; // 22 * 1.1 ≈ 24
    incButton.view.height = 24; // 22 * 1.1 ≈ 24
  }
}
