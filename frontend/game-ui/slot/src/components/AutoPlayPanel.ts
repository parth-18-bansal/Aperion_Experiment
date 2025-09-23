/* eslint-disable @typescript-eslint/no-unused-vars */
import { Slider } from "@pixi/ui";
import { Assets, Container, Graphics, isMobile, Sprite, TextStyle } from "pixi.js";
import { GameSpeedMode } from "./GameSpeed";
import { BaseButton } from "./BaseButton";
import { Engine } from "game-engine";
import { isPortrait } from "game-engine/src/utils/isPortrait";
import { UI } from "../..";

export interface IAutoPlayPanelOptions {
  onClose: () => void;
  onStart: (settings: {
    fast: boolean;
    turbo: boolean;
    skip: boolean;
    count: number;
  }) => void;
  initialSpinCount?: number;
  initialSwitches?: [boolean, boolean, boolean];
}

export class AutoPlayPanel extends Container {
  private bg: Graphics;
  private blurOverlay: Graphics;
  private bottomPointer: Graphics;
  private title: InstanceType<typeof Engine.LocalizedText>;
  private spinLabel: InstanceType<typeof Engine.LocalizedText>;
  private closeButton: BaseButton;
  public quickSwitch: BaseButton;
  public turboSwitch: BaseButton;
  public skipSwitch: BaseButton;
  public slider: Slider;
  private spinCount: number;
  private spinCountText: InstanceType<typeof Engine.LocalizedText>;
  startButton: BaseButton;

  // Divider'ları saklamak için
  private dividers: Graphics[] = [];

  private readonly spinCountOptions: (number | string)[] = [
    0,
    10,
    20,
    30,
    40,
    50,
    60,
    70,
    80,
    90,
    100,
    500,
    1000,
    "∞",
  ];

  constructor(options: IAutoPlayPanelOptions) {
    super();
    this.eventMode = "static";
    this.position.set(1580, -360); // Daha merkeze yakın pozisyon
    this.spinCount = options.initialSpinCount ?? 100;

    // Panel BG - CSS'e uygun (#000c = rgba(0,0,0,0.75), border-radius: 35px, padding: 2em)
    this.bg = new Graphics();
    this.bg.fill({ color: 0x000000, alpha: 0.75 });
    this.bg.roundRect(5, 0, 280, 336, 24.5);
    this.bg.fill();

    this.blurOverlay = new Graphics();
    this.blurOverlay.fill(0x000000, 0.5);
    this.blurOverlay.roundRect(5, 0, 280, 336, 24.5);
    this.blurOverlay.fill();

    this.addChild(this.bg);
    this.addChild(this.blurOverlay);


    // Bottom inverted triangle (black), centered at panel bottom
    this.bottomPointer = new Graphics();
    const triW = 25; // 18 * 1.5
    const triH = 12; // 12 * 1.5
    this.bottomPointer.fill({ color: 0x000000, alpha: 1 });
    this.bottomPointer.moveTo(0, 0);
    this.bottomPointer.lineTo(triW, 0);
    this.bottomPointer.lineTo(triW / 2, triH);
    this.bottomPointer.lineTo(0, 0);
    this.bottomPointer.fill();
    this.bottomPointer.x = 235;
    this.bottomPointer.y = 335;
    this.addChild(this.bottomPointer);
    // Title - CSS uyumlu (.desktop-popup .title)
    this.title = new Engine.LocalizedText(
      "ui.autoplay-panel.header",
      {},
      new TextStyle({
        fontFamily: "HeadingNowWide",
        fontWeight: "900",
        fontSize: 13,
        fill: "#fd9700",
        stroke: { color: "#fd9700", width: 0.5, join: "round" },
        letterSpacing: 1.05,
        dropShadow: {
          color: 0x000000,
          alpha: 0.25,
          blur: 2.1,
          distance: 2.1,
          angle: Math.PI / 2,
        },
      })
    );
    this.title.anchor.set(0, 0);
    this.title.x = 28;
    this.title.y = 27.5;
    this.addChild(this.title);

    // Close Button - Asset tabanlı (xmark_thin.png)
    try {
      const closeSprite = new Sprite(Assets.get("xmark_thin.png"));
      closeSprite.anchor.set(0.5);
      closeSprite.width = 15.8;
      closeSprite.height = 15.8;
      this.closeButton = new BaseButton(closeSprite);
      this.closeButton.view.x = 257.6;
      this.closeButton.view.y = 35.4;
      this.closeButton.onPress.connect(() => {
        options.onClose();
        if(isMobile.any)
          (this.parent.parent as UI).setVisibility("spinArea", true);
      });
      this.addChild(this.closeButton.view);
    } catch (error) {
      const closeSprite = new Engine.LocalizedText(
        "×",
        {},
        new TextStyle({
          fontFamily: "DIN Offc Pro",
          fontWeight: "bold",
          fontSize: 22.4,
          fill: "#fff",
        })
      );
      closeSprite.anchor.set(0.5);
      this.closeButton = new BaseButton(closeSprite);
      this.closeButton.view.x = 255.6;
      this.closeButton.view.y = 32.4;
      this.closeButton.onPress.connect(() => {
        options.onClose();
        if(isMobile.any)
          (this.parent.parent as UI).setVisibility("spinArea", true);
      });
      this.addChild(this.closeButton.view);
    }

    this.addDivider(60.5, this.width - 45, 25);

    const switchY = [70, 110, 150];
    const switchLabels = ["ui.autoplay-panel.quick-spin", "ui.autoplay-panel.turbo-spin", "ui.autoplay-panel.skip-screens"];
    const switches: BaseButton[] = [];
    for (let i = 0; i < 3; i++) {
      const btn = this.makeSwitch();
      btn.view.x = 230;
      btn.view.y = switchY[i];
      this.addChild(btn.view);
      switches.push(btn);
      const label = new Engine.LocalizedText(
        switchLabels[i],
        {},
        new TextStyle({
          fontFamily: "HeadingNowWide",
          fontWeight: "bold",
          fontSize: 12.6,
          fill: "#fff",
          stroke: { color: "#fff", width: 0.1 },
          letterSpacing: 0.7,
        })
      );
      label.x = 28;
      label.y = switchY[i] + 8.4;
      label.resolution = 2;
      this.addChild(label);
    }

    this.quickSwitch = switches[0];
    this.turboSwitch = switches[1];
    this.skipSwitch = switches[2];

    this.addDivider(198, this.width - 45, 25);

    this.spinLabel = new Engine.LocalizedText(
      "ui.autoplay-panel.sub-title",
      {},
      new TextStyle({
        fontFamily: "HeadingNowWide",
        fontWeight: "bold",
        fontSize: 12.7,
        fill: "#ffffff",
        stroke: { color: "#fff", width: 0.2 },
        letterSpacing: 0.7,
      })
    );
    this.spinLabel.x = 140;
    this.spinLabel.y = 215;
    this.spinLabel.resolution = 2;
    this.spinLabel.anchor.set(0.5, 0.5)
    this.addChild(this.spinLabel);

    const sliderTrack = new Sprite(Assets.get("slider.png"));
    sliderTrack.width = !isMobile.any ? 30 : isMobile.tablet ? 12 : 20; // Slider track genişliği
    sliderTrack.height = !isMobile.any ? 30 : 20; // Slider track yüksekliği

    const bg = new Graphics();
    bg.fill(0xffffff);
    bg.rect(0, 0, 112, 1);
    bg.fill();
    const transparentFill = new Graphics();
    transparentFill.fill(0x000000, 0);
    transparentFill.rect(0, 0, 14, 25.2);
    transparentFill.fill();
    this.slider = new Slider({
      min: 0,
      max: 130,
      value: this.mapSpinCountToSliderValue(this.spinCount),
      step: 10,
      bg: bg,
      slider: sliderTrack,
      fill: transparentFill,
    });
    this.slider.x = 28;
    this.slider.y = 259;
    this.slider.width = 140;
    this.slider.height = 45.5;

    this.addChild(this.slider);

    const initialDisplayValue =
      this.spinCount === Infinity ? "∞" : this.spinCount.toString();
    this.spinCountText = new Engine.LocalizedText(
      initialDisplayValue,
      {},
      new TextStyle({
        fontFamily: "HeadingNowWide",
        fontWeight: "bold",
        fontSize: 25.2,
        fill: "#fd9700",
        letterSpacing: 0.7,
      })
    );
    this.spinCountText.x = 203;
    this.spinCountText.y = 241.5;
    this.spinCountText.resolution = 2;
    this.addChild(this.spinCountText);

    this.startButton = new BaseButton(new Graphics());
    this.startButton.view.x = 28;
    this.startButton.view.y = 287;
    this.startButton.view.width = 224;
    this.startButton.view.height = 35;
    this.addChild(this.startButton.view);
    this.updateStartButton();
  }

  public reset() {
    const targetCount = 100;
    const sliderValue = this.mapSpinCountToSliderValue(targetCount);
    this.slider.value = sliderValue;
    this.updateSpinCountText(sliderValue);
  }

  public updateSpinCountText(spinValue: number) {
    const mappedValue = this.mapSliderValueToSpinCount(spinValue);
    if (typeof mappedValue === "string") {
      this.spinCount = Infinity;
      this.spinCountText.style = new TextStyle({
        fontFamily: "HeadingNowWide",
        fontWeight: "bold",
        fontSize: 25.2,
        fill: "#fd9700",
        stroke: { color: "#fd9700", width: 2, join: "round" },
        letterSpacing: 0.7,
      })
      this.spinCountText.updateText(mappedValue);
    } else {
      this.spinCount = mappedValue;
      this.spinCountText.style = new TextStyle({
        fontFamily: "HeadingNowWide",
        fontWeight: "bold",
        fontSize: 25.2,
        fill: "#fd9700",
        letterSpacing: 0.7,
      })
      this.spinCountText.updateText(this.spinCount.toString());
    }
    this.updateStartButton();
  }

  private mapSliderValueToSpinCount(sliderValue: number): number | string {
    const index = sliderValue / 10;
    return this.spinCountOptions[index] || 0;
  }

  private mapSpinCountToSliderValue(spinCount: number): number {
    const index = this.spinCountOptions.findIndex(
      (option) => option === spinCount
    );
    return index !== -1 ? index * 10 : 100;
  }

  private makeSwitch(selected: boolean = false): BaseButton {
    const textureName = selected
      ? "selected_checkbox.png"
      : "empty_checkbox.png";

    try {
      const sprite = new Sprite(Assets.get(textureName));
      sprite.width = 33.6;
      sprite.height = 33.6;
      const btn = new BaseButton(sprite);
      return btn;
    } catch (error) {
      const g = new Graphics();
      const btn = new BaseButton(g);
      this.updateSwitchVisual(btn, selected);
      return btn;
    }
  }

  public updateSwitchVisual(btn: BaseButton, selected: boolean) {
    const textureName = selected
      ? "selected_checkbox.png"
      : "empty_checkbox.png";
    if (btn.view instanceof Sprite) {
      const sprite = btn.view as Sprite;
      sprite.texture = Assets.get(textureName);
      sprite.width = 33.6;
      sprite.height = 33.6;
    }
  }

  public updateSpeedSwitches(mode: GameSpeedMode) {
    this.updateSwitchVisual(this.quickSwitch, mode === "quick");
    this.updateSwitchVisual(this.turboSwitch, mode === "turbo");
  }

  public updateSkipSwitch(enabled: boolean) {
    this.updateSwitchVisual(this.skipSwitch, enabled);
  }

  private updateStartButton() {
    const g = new Graphics();
    g.beginFill(0xfd9700, 1);
    g.drawRoundedRect(0, 0, 224, 35, 11.2);
    g.endFill();

    const displayValue =
      this.spinCount === Infinity ? "∞" : this.spinCount.toString();

    const t = new Engine.LocalizedText(
      `ui.autoplay-panel.start-btn`,
      { autoplayCount: this.spinCount === Infinity ? "" : displayValue },
      new TextStyle({
        fontFamily: "HeadingNowWide",
        fontWeight: "bolder",
        fontSize: 12.6,
        fill: 0x181818,
      })
    );

    const infinityText = new Engine.LocalizedText(
      `∞`,
      {},
      new TextStyle({
        fontFamily: "HeadingNowWide",
        fontWeight: "bolder",
        fontSize: 20.6,
        stroke: { color: 0x181818, width: 2, join: "round" },
        fill: 0x181818,
      })
    );
    t.anchor.set(0.5);
    t.x = 112;
    t.y = 17.5;
    t.resolution = 2;
    g.addChild(t);

    infinityText.anchor.set(0.5);
    infinityText.x = t.x + t.getBounds().width - 50;
    infinityText.y = 16;
    infinityText.resolution = 2;
    infinityText.visible = this.spinCount === Infinity;
    g.addChild(infinityText);
    this.startButton.view.removeChildren();
    this.startButton.view.addChild(g);

    this.startButton.view.interactive = this.spinCount == 0 ? false : true;
    this.startButton.view.alpha = this.spinCount == 0 ? 0.5 : 1;
  }
  private addDivider(y: number, width: number, x: number = 0) {
    const divider = new Graphics();
    divider.label = `divider_${y}`; // Divider'ları tanımlamak için label ekle
    divider.moveTo(x, y);
    divider.lineTo(x + width, y).stroke({ color: 0xffffff, alpha: 0.18 });
    this.addChild(divider);
    this.dividers.push(divider); // Divider'ı tracking array'ine ekle
    return divider;
  }

  private updateDividers(width: number, x: number) {
    // Divider Y pozisyonları - orijinal değerler
    const dividerYPositions = [60, 195];

    this.dividers.forEach((divider, index) => {
      if (divider && index < dividerYPositions.length) {
        divider.clear();
        const y = dividerYPositions[index];
        divider.moveTo(x, y);
        divider.lineTo(x + width, y).stroke({ color: 0xffffff, alpha: 0.4 });
      }
    });
  }

  get count(): number {
    return this.spinCount;
  }

  resize(width: number, height: number) {
    if (isMobile.any && isPortrait()) {
      this.applyMobilePortraitLayout(width, height);
    } else if (isMobile.any && !isPortrait()) {
      this.applyBaseLayout(1.75,  isMobile.tablet ? 1350 : 240, isMobile.tablet ? -675 : -600, width);
    } else {
      this.applyBaseLayout(1.3, 1455, -440, width);
    }
  }

  private applyBaseLayout(scale: number, posX: number, posY: number, width: number) {
    this.scale.set(scale);
    this.position.set(posX, posY);
    this.bg.clear();
    this.bg.fill({ color: 0x000000, alpha: 0.75 });
    this.bg.roundRect(0, 0, 280, 336, 24.5);
    this.bg.fill();
    this.blurOverlay.clear();
    this.blurOverlay.fill(0x000000, 0.5);
    this.blurOverlay.roundRect(0, 0, 280, 336, 24.5);
    this.blurOverlay.fill();
    this.title.anchor.set(0, 0);
    this.title.scale.set(1);
    this.title.x = 28;
    this.title.y = 27.5;
    this.closeButton.view.x = 257.6;
    this.closeButton.view.y = 35.4;
    this.slider.x = 28;
    this.slider.y = 259;
    this.slider.width = 200;
    this.slider.height = 45.5;
    this.slider.scale.set(1.3);
    this.spinCountText.x = 203;
    this.spinCountText.y = 241.5;
    this.spinCountText.anchor.set(0, 0);
    this.quickSwitch.view.x = 224;
    this.turboSwitch.view.x = 224;
    this.skipSwitch.view.x = 224;
    // Reset elements mutated in portrait layout
    if (this.spinLabel) {
      this.spinLabel.anchor.set(0.5, 0.5);
      this.spinLabel.scale.set(1);
      this.spinLabel.x = 140; // design center
      this.spinLabel.y = 215;
    }
    if (this.startButton) {
      this.startButton.view.x = 28;
      this.startButton.view.y = 287;
    }
    
    // Update dividers for non-portrait layouts
    this.updateDividers(235, 28);

  }

  private applyMobilePortraitLayout(width: number, height: number) {
    width *= isMobile.tablet ? 1.5 : 1;
    const scale = 3;
    this.scale.set(scale);
    this.bg.clear();
    this.bg.fill({ color: 0x000000, alpha: 0.8 });
    this.bg.roundRect(-500, 0, width / scale + 2000, (height / 2) * scale, 0);
    this.bg.fill();
    this.blurOverlay.clear();
    this.blurOverlay.fill({ color: 0x000000, alpha: 0.1 });
    this.blurOverlay.roundRect(-500, 0, width / scale + 2000, (height / 2) * scale, 0);
    this.blurOverlay.fill();
    this.y = -height / 2 - 25;
    this.x = isMobile.tablet ? -270 : 0;
    this.title.anchor.set(0, 0);
    this.title.scale.set(1.2);
    this.title.x = 30;
    this.closeButton.view.x = width / scale - 35;
    this.closeButton.view.y = this.title.y + 10;
    this.skipSwitch.view.x = this.closeButton.view.x - 25;
    this.quickSwitch.view.x = this.closeButton.view.x - 25;
    this.turboSwitch.view.x = this.closeButton.view.x - 25;
    this.slider.scale.set(2.1);
    this.slider.width *= isMobile.tablet ? 1.80 : 1;
    this.spinCountText.x = this.closeButton.view.x + 10;
    this.spinCountText.anchor.set(1, 0);
    this.spinLabel.anchor.set(0.5, 0.5);
    this.spinLabel.x = width / scale / 2;
    this.startButton.view.x = this.spinLabel.x - 105;
    this.startButton.view.y = this.slider.y + 60;
    this.updateDividers(width / scale - 60, 30);
  }
}
