import {
  Assets,
  Container,
  isMobile,
  Sprite,
  TextStyle,
  Texture,
  Graphics,
} from "pixi.js";
import { BaseButton } from "./BaseButton";
import { Engine } from "game-engine";
import { isPortrait } from "game-engine/src/utils/isPortrait";

export interface IBetAreaOptions {
  texts?: { bet: string; balance: string };
  onOpenBetPanel?: () => void;
}

export class BetArea extends Container {
  private inner: Container;
  private betLabel: InstanceType<typeof Engine.LocalizedText>;
  private betValue: InstanceType<typeof Engine.LocalizedText>;
  public balanceLabel: InstanceType<typeof Engine.LocalizedText>;
  public balanceValue: InstanceType<typeof Engine.LocalizedText>;
  private incIcon: Sprite;
  public incButton: BaseButton;
  // Publicly exposed tap area for mobile portrait (debug visible alpha=1)
  public betTapArea: Graphics | undefined;

  constructor(options?: IBetAreaOptions) {
    super();
    this.inner = new Container();
    this.addChild(this.inner);
    const labelStyle = new TextStyle({
      fontFamily: "HeadingNowText",
      fontWeight: "bolder",
      fill: "white",
      fontSize: 45,
    });

    const valueStyle = new TextStyle({
      fontFamily: "HeadingNowText",
      fontWeight: "bolder",
      fill: "#fd9700",
      fontSize: 45,
      letterSpacing: 1.5,
    });

    this.betLabel = new Engine.LocalizedText("ui.bet-area.bet", {}, labelStyle);
    this.betLabel.anchor.set(0, 0); // Changed to left anchor for mobile
    this.inner.addChild(this.betLabel);

    this.betValue = new Engine.LocalizedText('1', {}, valueStyle);
    this.betValue.anchor.set(0, 0);
    this.betValue.resolution = 2; // For high resolution
    this.inner.addChild(this.betValue);

    this.balanceLabel = new Engine.LocalizedText(
      "ui.bet-area.credits",
      {},
      labelStyle,
    );
    this.balanceLabel.anchor.set(0, 0); // Changed to left anchor for mobile
    this.balanceLabel.resolution = 2; // For high resolution
    this.inner.addChild(this.balanceLabel);

    this.balanceValue = new Engine.LocalizedText('1', {}, valueStyle);
    this.balanceValue.anchor.set(0, 0);
    this.balanceValue.resolution = 2; // For high resolution
    this.inner.addChild(this.balanceValue);

    const iconTexture = this.safeGetTexture("spin_bet_inc.png");
    this.incIcon = new Sprite(iconTexture);
    this.incIcon.anchor.set(0.5, 0.5);
    this.incButton = new BaseButton(this.incIcon);
    this.inner.addChild(this.incButton.view);

    this.interactive = true;
    this.cursor = "pointer";
    this.updateBetValue("100");
    this.updateBalance("100000");
  }

  private safeGetTexture(name: string): Texture {
    try {
      return Assets.get<Texture>(name);
    } catch {
      const fallback = Texture.WHITE;
      return fallback;
    }
  }

  public updateBetValue(bet: string) {
    this.betValue.updateText(bet);
    // Only update inc button position if it's visible (not in mobile portrait)
    if (this.incButton.view.visible) {
      this.incButton.view.x = this.betValue.x + this.betValue.width + 16;
    }
  }

  public updateBalance(balance: string) {
    this.balanceValue.updateText(balance);
    // Only update inc button position if it's visible (not in mobile portrait)
    if (this.incButton.view.visible) {
      this.incButton.view.x = this.betValue.x + this.betValue.width + 16;
    }
  }

  public invertIncButton(): void {
    if (this.incButton?.view) {
      this.incButton.view.angle = this.incButton.view.angle === 0 ? 180 : 0;
    }
  }

  public resize(width: number, _height: number) {
    if (isMobile.any && isPortrait()) {
      this.applyMobilePortraitLayout(width, _height);
    } else if (isMobile.any && !isPortrait()) {
      this.applyDesktopLayout({ scale: 1, incVisible: true, position: { x: 0, y: 40 } });
    } else {
      this.applyDesktopLayout({ scale: 0.7, incVisible: true, position: { x: 75, y: 40 } });
    }
  }

  private applyDesktopLayout(opts: { scale: number; incVisible: boolean; position?: { x: number; y: number } }) {
    this.incButton.view.visible = opts.incVisible;
    this.scale.set(opts.scale, opts.scale);
    if (opts.position) this.position.set(opts.position.x, opts.position.y);
    this.betLabel.anchor.set(1, 0);
    this.balanceLabel.anchor.set(1, 0);
    const fontSize = 35;
    this.betLabel.style.fontSize = fontSize;
    this.betValue.style.fontSize = fontSize;
    this.balanceLabel.style.fontSize = fontSize;
    this.balanceValue.style.fontSize = fontSize;
    const labelX = 105;
    const valueX = labelX + 92;
    const rowY = 0;
    const rowSpacing = fontSize;
    this.betLabel.x = labelX + 155;
    this.betLabel.y = rowY;
    this.betValue.x = valueX + 70;
    this.betValue.y = rowY;
    this.incButton.view.x = this.betValue.x + this.betValue.width + 16;
    this.incButton.view.y = rowY + fontSize / 1.6;
    this.incButton.view.width = fontSize * 0.85;
    this.incButton.view.height = fontSize * 0.85;
    this.balanceLabel.x = labelX + 155;
    this.balanceLabel.y = rowY + rowSpacing;
    this.balanceValue.x = valueX + 70;
    this.balanceValue.y = rowY + rowSpacing;
    // Create/update bet tap area covering betLabel + betValue
    const minX = Math.min(this.betLabel.x, this.betValue.x);
    const maxRight = Math.max(this.betLabel.x + this.betLabel.width, this.betValue.x + this.betValue.width);
    const topY = this.betLabel.y;
    const bottomY = this.betValue.y + this.betValue.height;
    const areaWidth = maxRight - minX;
    const areaHeight = bottomY - topY;
    if (!this.betTapArea) {
      this.betTapArea = new Graphics();
      this.betTapArea.eventMode = "static";
      this.betTapArea.cursor = "pointer";
      this.betTapArea.on("pointertap", () => {
        // Forward to same logic as container
        this.emit("toggleBetPanelVisibility");
      });
      this.addChild(this.betTapArea);
    }
    this.betTapArea.clear();
    // Visible debug block (alpha =1 as requested)
    this.betTapArea.fill({ color: 0x00aaee, alpha: 0 });
    this.betTapArea.rect(minX - 100, topY - 10, areaWidth + 180, areaHeight + 50);
    this.betTapArea.fill();
    this.betTapArea.visible = true;
  }

  private applyMobilePortraitLayout(width: number, height: number) {
    this.scale.set(1, 1);
    const fontSizeLabel = 35;
    const fontSize = 45;
    this.betLabel.style.fontSize = fontSizeLabel;
    this.betValue.style.fontSize = fontSize;
    this.balanceLabel.style.fontSize = fontSizeLabel;
    this.balanceValue.style.fontSize = fontSize;
    const padding = -40;
    this.balanceLabel.x = padding;
    this.balanceValue.y = height - 95;
    this.balanceLabel.y = this.balanceValue.y - this.balanceLabel.height;
    this.balanceValue.x = this.balanceLabel.x;
    this.betLabel.x = width - padding + 180;
    this.betValue.y = height - 95;
    this.betLabel.y = this.betValue.y - this.betLabel.height;
    this.betValue.x = this.betLabel.x;
    this.betLabel.anchor.set(0, 0);
    this.balanceLabel.anchor.set(0, 0);
    this.incButton.view.visible = false;

    // Create/update bet tap area covering betLabel + betValue
    const minX = Math.min(this.betLabel.x, this.betValue.x);
    const maxRight = Math.max(this.betLabel.x + this.betLabel.width, this.betValue.x + this.betValue.width);
    const topY = this.betLabel.y;
    const bottomY = this.betValue.y + this.betValue.height;
    const areaWidth = maxRight - minX;
    const areaHeight = bottomY - topY;
    if (!this.betTapArea) {
      this.betTapArea = new Graphics();
      this.betTapArea.eventMode = "static";
      this.betTapArea.cursor = "pointer";
      this.betTapArea.on("pointertap", () => {
        // Forward to same logic as container
        this.emit("toggleBetPanelVisibility");
      });
      this.addChild(this.betTapArea);
    }
    this.betTapArea.clear();
    // Visible debug block (alpha =1 as requested)
    this.betTapArea.fill({ color: 0x00aaee, alpha: 0});
    this.betTapArea.rect(minX - 10, topY - 10, areaWidth + 80, areaHeight + 20);
    this.betTapArea.fill();
    this.betTapArea.visible = true;
  }
}
