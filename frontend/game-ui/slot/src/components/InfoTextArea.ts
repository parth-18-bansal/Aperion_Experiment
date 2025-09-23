import * as PIXI from "pixi.js";
import {
  Container,
  TextStyle,
  Sprite,
  Texture,
  isMobile,
  Graphics,
  // TextMetrics, // removed (not exported in current pixi build)
} from "pixi.js";
import { gsap } from "gsap";
import { Engine } from "game-engine";
import { GameSpeedMode } from "./GameSpeed";
import { Slot } from "slot-game-engine";
import { StateValue } from "xstate";
import { isPortrait } from "game-engine/src/utils";

interface WinDetailsData {
  type:
  | "pay-anywhere-single"
  | "pay-anywhere-multiple"
  | "ways-single"
  | "ways-merged"
  | "ways-multiple"
  | "pay-line-single"
  | "pay-line-merged"
  | "pay-line-multiple";
  symbolCount: number;
  symbolSprite: Sprite;
  earn: string;
  duration: number;
  waysCount?: number;
  lineCount?: number;
  linesCount?: number;
}
export class InfoTextArea extends Container {
  public overlay: Graphics;
  private text: Engine.LocalizedText<{}>;
  private infinityText: Engine.LocalizedText<{}>;
  private winLabelText: Engine.LocalizedText<{}>;
  private winAmountText: Engine.LocalizedText<{}>;
  private winDetailsText: Engine.LocalizedText<{}>;
  private winDetailsSprite: Sprite | null = null;
  private totalWin: number = 0;
  private freeSpinCount: number = 0;
  private _totalWinTween: gsap.core.Tween | null = null;
  // Per-character left shift tracking for amount text
  private baseAmountX: number = 0;
  private baseLabelX: number = 0;
  private lastAmountCharCount: number = 0;
  private charStepPx: number = 0;
  private winDetailsHideHandle?: number;

  constructor() {
    super();
    Engine.Utils.ApplyCommonProperties(this, {});
    this.overlay = new Graphics();
    this.overlay.position.set(-480, 210);
    this.overlay.rect(-500, 0, 3500, 150);
    this.overlay.fill({ color: 0x000000, alpha: 0.3 });
    this.addChild(this.overlay);
    const style = new TextStyle({
      fontFamily: "HeadingNowWide",
      fontWeight: "bold",
      fontSize: 35,
      fill: 0xffffff,
      align: "center",
    });

    const infinityTextStyle = new TextStyle({
      fontFamily: "HeadingNowWide",
      fontWeight: "bold",
      fontSize: 55,
      stroke: { color: "#ffffff", width: 3, join: "round" },
      fill: 0xffffff,
      align: "center",
    });
    const winLabelStyle = new TextStyle({
      fontFamily: "HeadingNowWide",
      fontWeight: "bold",
      fontSize: 35,
      fill: 0xfd9700,
      align: "center",
    });

    const winStyle = new TextStyle({
      fontFamily: "HeadingNowWide",
      fontWeight: "bold",
      fontSize: 35,
      fill: 0xffffff,
      align: "center",
    });

    this.text = new Engine.LocalizedText(
      "ui.info-area.place-your-bets",
      {},
      style
    );
    this.text.anchor.set(0.5, 0.5);
    this.text.resolution = 2; // Yüksek çözünürlük için
    this.addChild(this.text);

    this.infinityText = new Engine.LocalizedText(
      "∞",
      {},
      infinityTextStyle
    );
    this.infinityText.anchor.set(0.5, 0.5);
    this.infinityText.resolution = 2; // Yüksek çözünürlük için
    this.infinityText.position.set(this.text.x, this.text.y); // Örnek konum
    this.infinityText.visible = false;
    this.addChild(this.infinityText);

    this.winLabelText = new Engine.LocalizedText(
      "ui.info-area.win",
      {},
      winLabelStyle
    );
    this.winLabelText.anchor.set(1, 0.5);
    this.winLabelText.visible = false;
    this.winLabelText.resolution = 2; // Yüksek çözünürlük için
    this.addChild(this.winLabelText);

    this.winAmountText = new Engine.LocalizedText("", {}, winStyle);
    // Use left anchor to keep a fixed start position; avoids width-based jitter during count-up
    this.winAmountText.anchor.set(0, 0.5);
    this.winAmountText.visible = false;
    this.winAmountText.resolution = 2; // Yüksek çözünürlük için
    this.addChild(this.winAmountText);

    this.winDetailsText = new Engine.LocalizedText(
      "",
      {},
      new TextStyle({
        fontFamily: "HeadingNowWide",
        fontWeight: "bold",
        fontSize: 25,
        fill: 0xffffff,
        align: "center",
      })
    );
    this.winDetailsText.anchor.set(0.5, 0.5);
    this.winDetailsText.visible = false;
    this.winDetailsText.resolution = 2; // Yüksek çözünürlük için
    this.addChild(this.winDetailsText);

    // Win details sprite'ını bir kez oluştur
    this.winDetailsSprite = new Sprite(Texture.WHITE);
    this.winDetailsSprite.anchor.set(0.5, 0.5);
    this.winDetailsSprite.scale.set(0.12);
    this.winDetailsSprite.visible = false;

    this.addChild(this.winDetailsSprite);

    this.onSetTotalWin(0, true, 0, "none", 0);
  }

  private currencyFormat(n: number): string {
    const gameAny = (this as any).game;
    const formatter = gameAny?.slot?.currency?.format as
      | undefined
      | ((v: number) => string);
    if (formatter) return formatter(n);
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private getSymbolTexture(key: string): Sprite {
    const gameAny = (this as any).game;
    const map = gameAny?.slot?.ui?.visualOptions?.symbolTextures as
      | Record<string, Sprite | Texture>
      | undefined;
    const val = map?.[key];
    if (!val) return new Sprite(Texture.WHITE);
    if (val instanceof Sprite) return val;
    return new Sprite(val as Texture);
  }

  public resize(areaWidth: number, areaHeight: number) {
    // Calculate responsive font size based on area dimensions
    const baseFontSize = Math.max(20, Math.min(45, areaHeight * 0.4));
    const winDetailsFontSize = Math.max(16, Math.min(isMobile.any ? 45 : 25, areaHeight * 0.3));

    // Update font sizes
    this.text.style.fontSize = baseFontSize;
    this.winLabelText.style.fontSize = baseFontSize;
    this.winAmountText.style.fontSize = baseFontSize;
    this.winDetailsText.style.fontSize = winDetailsFontSize;

    // Update resolutions for crisp rendering
    const resolution = Math.max(1, Math.min(3, 2 * (baseFontSize / 35)));
    this.text.resolution = resolution;
    this.winLabelText.resolution = resolution;
    this.winAmountText.resolution = resolution;
    this.winDetailsText.resolution = resolution;

    // Center positions
    this.text.x = areaWidth / 2;
    this.text.y = areaHeight / 2 - 21;

    this.infinityText.x = this.text.x + this.text.width - 200;
    this.infinityText.y = this.text.y - 5;

    this.winLabelText.y = Math.round(areaHeight / 2 - 21);

    this.baseAmountX = Math.round(areaWidth / 2) + 50;
    this.winAmountText.x = this.baseAmountX;
    this.winAmountText.y = Math.round(areaHeight / 2 - 21);
    this.charStepPx = Math.max(9, Math.round((this.winAmountText.style.fontSize as number) * 0.25));
    this.lastAmountCharCount = 0;

    // Set label base to stay with a fixed gap to the left of the amount's left edge
    this.baseLabelX = this.baseAmountX - 20;
    this.winLabelText.x = this.baseLabelX;

    // Center win details precisely
    this.winDetailsText.x = Math.round(areaWidth / 2);
    this.winDetailsText.y = Math.round(areaHeight / 2 + baseFontSize * 0.8 - 12);
    this.updateWinAmountText();
  }

  public setMainText({
    context,
    state,
  }: {
    context: Slot.GameContext;
    state: StateValue;
  }) {
    if (state === "idle") {
      this.text.setKey("ui.info-area.place-your-bets");
      this.infinityText.visible = false;
      return;
    }

    // below will be called for every spin in normal spins
    if (context.gameMode === "spin") {
      if (context.isAutoplayActive) {
        this.text.setKeyAndVars("ui.info-area.autoplay-remains", {
          autoplayCount: context.autoplayCount == Infinity ? " " : context.autoplayCount,
        });
        if (context.autoplayCount == Infinity) {
          this.infinityText.visible = true;
          this.infinityText.x = this.text.x + this.text.getBounds().width - 180; // Adjust position next to main text
        }
      } else {
        this.infinityText.visible = false;
        this.text.setKey("ui.info-area.good-luck");
      }
    }
    // below will be called for every spin in freespins. Main text (this.text) is always invisible in freespins
    else if (context.gameMode === "freespin") {
      this.text.visible = false;
      this.infinityText.visible = false;
      this.onSetFreeSpinCount(context.freeSpins || 0);
    }
  }

  public setWinAmountText(newText: number) {
    this.onSetTotalWin(newText);
  }

  private killTotalWinTween() {
    if (this._totalWinTween) {
      this._totalWinTween.kill();
      this._totalWinTween = null;
    }
  }

  public onSetTotalWin(
    win: number,
    state: boolean | { add: boolean; reset: boolean } = false,
    duration: gsap.TweenValue = 0.75,
    ease: gsap.EaseString | gsap.EaseFunction = "none",
    delay: gsap.TweenValue = 0,
    gameMode: Slot.GameMode = "spin"
  ) {
    this.killTotalWinTween();
    if (typeof state === "boolean") {
      state = { add: state, reset: state };
    }
    const cloneWin = {
      value: state.reset ? 0 : this.totalWin,
      next: state.add ? this.totalWin + win : win,
    };
    if (parseFloat(duration.toString()) > 0) {
      this._totalWinTween = gsap.to(cloneWin, {
        value: cloneWin.next,
        ease,
        delay,
        duration,
        onUpdate: () => {
          this.totalWin = cloneWin.value;
          this.updateWinAmountText(gameMode);
        },
        onComplete: () => {
          this.totalWin = cloneWin.value;
          this.killTotalWinTween();
          this.updateWinAmountText(gameMode);
        },
      });
    } else {
      if (parseFloat(delay.toString()) > 0) {
        setTimeout(() => {
          this.totalWin = cloneWin.next;
          this.updateWinAmountText(gameMode);
        }, parseFloat(delay.toString()) * 1000);
      } else {
        this.totalWin = cloneWin.next;
        this.updateWinAmountText(gameMode);
      }
    }
  }

  public onSetFreeSpinCount(
    count: number,
    state: boolean | { add: boolean; reset: boolean } = false,
    delay: gsap.TweenValue = 0
  ) {
    if (typeof state === "boolean") {
      state = { add: state, reset: state };
    }
    const cloneWin = {
      value: state.reset ? 0 : this.freeSpinCount,
      next: state.add ? this.freeSpinCount + count : count,
    };
    if (parseFloat(delay.toString()) > 0) {
      setTimeout(() => {
        this.freeSpinCount = cloneWin.next;
        this.updateFreeSpinText();
      }, parseFloat(delay.toString()) * 1000);
    } else {
      this.freeSpinCount = cloneWin.next;
      this.updateFreeSpinText();
    }
  }

  private updateWinAmountText(gameMode: Slot.GameMode = "spin") {
    if (this.totalWin > 0) {
      const formatted = this.currencyFormat(this.totalWin);

      this.text.visible = false;
      this.infinityText.visible = false;
      this.winLabelText.visible = true;
      this.winAmountText.visible = true;

      // Update amount text and shift left per added character to keep visual balance
      const prevCount = this.lastAmountCharCount;
      this.winAmountText.updateText(formatted);
      const newCount = formatted.length;
      const delta = newCount - prevCount;
      if (delta !== 0) {
        // Shift amount and label together per added/removed character
        const nextAmountX = (prevCount === 0 ? this.baseAmountX : this.winAmountText.x) - delta * this.charStepPx;
        this.winAmountText.x = Math.round(nextAmountX);
        const nextLabelX = (prevCount === 0 ? this.baseLabelX : this.winLabelText.x) - delta * this.charStepPx;
        this.winLabelText.x = Math.round(nextLabelX);
        this.lastAmountCharCount = newCount;
      }

    } else {
      this.text.visible = true;
      this.winLabelText.visible = false;
      this.winAmountText.visible = false;

      this.text.setKey(gameMode === "freespin" ? "ui.info-area.good-luck"  : "ui.info-area.place-your-bets");
      this.text.style.fill = 0xffffff;
      // Reset amount position tracking
      this.winAmountText.x = this.baseAmountX;
      this.winLabelText.x = this.baseLabelX;
      this.lastAmountCharCount = 0;
    }
  }

  public updateFreeSpinText() {
    if (this.freeSpinCount >= 0) {
      this.winDetailsText.visible = true;
      this.winDetailsText.setKeyAndVars("ui.info-area.free-spin-left", {
        freeSpinCount: this.freeSpinCount,
      });
    }
  }

  public setWinLabelVisible(visible: boolean) {
    this.winLabelText.visible = visible;
  }

  public setWinValueVisible(visible: boolean) {
    this.winAmountText.visible = visible;
  }

  private setWinMessage(
    type: WinDetailsData["type"],
    data: WinDetailsData,
    formattedEarn: string
  ): void {
    switch (type) {
      case "pay-anywhere-single":
        this.winDetailsText.setKeyAndVars(`ui.win-msg.${type}`, {
          count: data.symbolCount,
          earn: formattedEarn,
        });
        break;

      case "pay-anywhere-multiple":
        this.winDetailsText.setKey(`ui.win-msg.${type}`);
        break;

      case "ways-single":
        this.winDetailsText.setKeyAndVars(`ui.win-msg.${type}`, {
          count: data.symbolCount,
          earn: formattedEarn,
        });
        break;

      case "ways-merged":
        this.winDetailsText.setKeyAndVars(`ui.win-msg.${type}`, {
          count: data.symbolCount,
          waysCount: data.waysCount,
          earn: formattedEarn,
        });
        break;

      case "ways-multiple":
        this.winDetailsText.setKey(`ui.win-msg.${type}`);
        break;

      case "pay-line-single":
        this.winDetailsText.setKeyAndVars(`ui.win-msg.${type}`, {
          count: data.symbolCount,
          lineCount: data.lineCount,
          earn: formattedEarn,
        });
        break;

      case "pay-line-merged":
        this.winDetailsText.setKeyAndVars(`ui.win-msg.${type}`, {
          count: data.symbolCount,
          linesCount: data.linesCount,
          earn: formattedEarn,
        });
        break;

      case "pay-line-multiple":
        this.winDetailsText.setKey(`ui.win-msg.${type}`);
        break;

      default:
        break;
    }

    this.winDetailsText.visible = true;
  }

  public resetWinDetails() {
    this.winDetailsText.visible = false;
    if (this.winDetailsSprite) {
      this.winDetailsSprite.visible = false;
    }
  }

  public processWinDetails(
    win: any,
    gameSpeed: GameSpeedMode,
    gameMode: Slot.GameMode
  ) {
    let temp: WinDetailsData["type"];
    const isTurbo = gameSpeed === "turbo";
    if (win.waysWins.length > 1) temp = "ways-multiple";
    else if (win.waysWins[0].ways > 1) temp = "ways-merged";
    else temp = "ways-single";

    for (let index = 0; index < win.winnerSymbols.length; index++) {
      let symSprite = this.getSymbolTexture(`${win.waysWins[index].symbol}`);

      const data: WinDetailsData = {
        type: temp,
        symbolSprite: symSprite,
        symbolCount: win.winnerSymbols[index][1].length,
        earn: this.currencyFormat(win.waysWins[index]?.amount),
        waysCount: win.waysWins[0].ways,
        duration:
          temp == "ways-multiple"
            ? isTurbo
              ? 300
              : 750
            : isTurbo
              ? 700
              : 1400,
      };
      this.setWinDetails(data, gameMode);
    }
  }

  public resetAll() {
    this.resetWinDetails();
    this.totalWin = 0;
    this.freeSpinCount = 0;
    this.killTotalWinTween();

    this.text.visible = true;
    this.winLabelText.visible = false;
    this.winAmountText.visible = false;

    this.text.setKey("ui.info-area.place-your-bets");
    this.infinityText.visible = false;
    this.text.style.fill = 0xffffff;
    // Reset amount shift tracking
    this.winAmountText.x = this.baseAmountX;
    this.winLabelText.x = this.baseLabelX;
    this.lastAmountCharCount = 0;
  }

  public setWinDetails(data: WinDetailsData, gameMode: Slot.GameMode) {
    // Clear any previous hide timer
    if (this.winDetailsHideHandle) {
      clearTimeout(this.winDetailsHideHandle);
      this.winDetailsHideHandle = undefined;
    }

    // Update main message first so width values are current
    this.setWinMessage(data.type, data, data.earn);

    // Sprite handling (hide for multi type)
    if (this.winDetailsSprite) {
      if (data.type === "ways-multiple") {
        this.winDetailsSprite.visible = false;
      } else {
        this.winDetailsSprite.texture = data.symbolSprite.texture;
        // Final scale only once based on device
        this.winDetailsSprite.scale.set(isMobile.any ? 0.21 : 0.15);
        this.winDetailsSprite.visible = true;

        // Precise positioning using measured prefix width (fallback to heuristic if TextMetrics unavailable)
        const prefix = `${data.symbolCount}×`;
        const style = this.winDetailsText.style as TextStyle;
        let prefixWidth: number;
        const anyPixi = (PIXI as any);
        if (anyPixi?.TextMetrics?.measureText) {
          prefixWidth = anyPixi.TextMetrics.measureText(prefix, style).width;
        } else {
          // Heuristic fallback
          prefixWidth = prefix.length * (Number(style.fontSize) * 0.6);
        }
        const leftEdge = this.winDetailsText.x - this.winDetailsText.width / 2;
        const gap = 6; // small gap after the prefix
        let profileOffset = isMobile.any ? 55 : 25; // desktop default

        this.winDetailsSprite.x = leftEdge + prefixWidth + gap + profileOffset;
        this.winDetailsSprite.y = this.winDetailsText.y + 2;

      }
    }

    // Schedule hide
    this.winDetailsHideHandle = window.setTimeout(() => {
      console.log("Hiding win details");
      this.winDetailsText.visible = false;
      if (gameMode === "freespin") this.updateFreeSpinText();
      if (this.winDetailsSprite) {
        this.winDetailsSprite.visible = false;
      }
      this.winDetailsHideHandle = undefined;
    }, data.duration);
  }

  get isWinMessageVisible(): boolean {
    return this.winAmountText.visible;
  }
}
