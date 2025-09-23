import { Container, isMobile } from "pixi.js";
import { AutoPlayButton } from "./AutoPlayButton";
import { BetControl } from "./BetControl";
import { GameSpeed } from "./GameSpeed";
import { SpinButton } from "./SpinButton";
import { ForceStopButton } from "./ForceStopButton";
import { isPortrait } from "game-engine/src/utils/isPortrait";
import { MobileSoundButton } from "./MobileSoundButton";
import { MobileMoneyIcon } from "./MobileMoneyIcon";

export class SpinArea extends Container {
  public gameSpeed: GameSpeed;
  public spinButton: SpinButton;
  public forceStopButton: ForceStopButton;
  public autoPlayButton: AutoPlayButton;
  public betControl: BetControl;
  public mobileSoundButton: MobileSoundButton;
  public mobileMoneyIcon: MobileMoneyIcon;
  public isReplayMode: boolean = false;
  private readonly constWidth: number = 600;
  constructor() {
    super();
    this.gameSpeed = new GameSpeed();
    this.addChild(this.gameSpeed.view);
    this.spinButton = new SpinButton();
    this.addChild(this.spinButton.view);
    this.spinButton.visible = true; // Initially hidden, can be shown when needed
    this.forceStopButton = new ForceStopButton();
    this.addChild(this.forceStopButton.view);
    this.forceStopButton.visible = false; // Initially hidden, can be shown when needed
    this.autoPlayButton = new AutoPlayButton();
    this.addChild(this.autoPlayButton.view);
    this.betControl = new BetControl();
    this.addChild(this.betControl);
    this.mobileSoundButton = new MobileSoundButton();
    this.addChild(this.mobileSoundButton.view);
    this.mobileMoneyIcon = new MobileMoneyIcon();
    this.addChild(this.mobileMoneyIcon.view);
  }

  public resize(size: number, width: number) {
    if (isMobile.any && isPortrait()) {
      this.applyMobilePortraitLayout(size);
    } else if (isMobile.phone && !isPortrait()) {
      this.applyMobileLandscapeLayout(size, width);
    } else {
      this.applyDesktopLayout(size);
    }

  }

  private applyMobilePortraitLayout(size: number) {
    this.betControl.visible = false;
    this.spinButton.resize(size * 1.5);
    this.spinButton.view.x = -194.5;
    this.spinButton.view.y = -76;
    this.gameSpeed.resize(size * 0.55);
    this.gameSpeed.view.x = this.spinButton.view.x + this.spinButton.view.width - 10;
    this.gameSpeed.view.y = -this.gameSpeed.view.height + 10;
    this.forceStopButton.resize(size * 1.5);
    this.forceStopButton.view.x = -194.5;
    this.forceStopButton.view.y = -76;
    this.autoPlayButton.resize(size * 0.55);
    this.autoPlayButton.view.x = this.spinButton.view.x - 320;
    this.autoPlayButton.view.y = this.autoPlayButton.view.height / 2 - 30;
    this.mobileSoundButton.resize(size * 0.55);
    this.mobileSoundButton.view.x = this.gameSpeed.view.x;
    this.mobileSoundButton.view.y = this.autoPlayButton.view.y;
    this.mobileMoneyIcon.resize(size * 0.55);
    this.mobileMoneyIcon.view.x = this.autoPlayButton.view.x;
    this.mobileMoneyIcon.view.y = this.gameSpeed.view.y;
    this.mobileSoundButton.view.visible = true;
    this.mobileMoneyIcon.view.visible = true;
  }

  private applyMobileLandscapeLayout(size: number, width: number) {
    // positive always
    let screenDiff = Math.abs((this.constWidth - window.innerWidth) / 2);
    this.betControl.visible = false;
    this.gameSpeed.resize(size * 0.5);
    this.gameSpeed.view.x = -1025 - screenDiff;
    this.gameSpeed.view.y = -200;
    this.spinButton.resize(size * 1.1);
    this.spinButton.view.x = width - width / 2 - 370 - (screenDiff * -1);
    this.spinButton.view.y = -250;
    this.forceStopButton.resize(size * 1.1);
    this.forceStopButton.view.x = width - width / 2 - 370 - (screenDiff * -1);
    this.forceStopButton.view.y = -250;
    this.autoPlayButton.resize(size * 0.5);
    this.autoPlayButton.view.x = -1025 - screenDiff;
    this.autoPlayButton.view.y = 0;
    this.mobileMoneyIcon.resize(size * 0.5);
    this.mobileMoneyIcon.view.x = width - width / 2 - 270 - (screenDiff * -1);
    this.mobileMoneyIcon.view.y = this.autoPlayButton.view.y;
    this.mobileMoneyIcon.view.visible = true;
    this.mobileSoundButton.view.visible = this.isReplayMode;
    this.mobileSoundButton.resize(size * 0.5);
    this.mobileSoundButton.view.x = this.mobileMoneyIcon.view.x;
    this.mobileSoundButton.view.y = this.mobileMoneyIcon.view.y + 200;
  }

  private applyDesktopLayout(size: number) {
    this.mobileSoundButton.view.visible = false;
    this.mobileMoneyIcon.view.visible = false;
    this.gameSpeed.resize(size * 0.50);
    this.gameSpeed.view.x = size / 2 - this.gameSpeed.view.width / 2 - 345;
    this.gameSpeed.view.y = (isMobile.tablet && !isPortrait() ? 55 : 30);
    this.spinButton.resize(size * 1.15);
    this.spinButton.view.x = this.gameSpeed.view.x + this.gameSpeed.view.width + 50 + (isMobile.tablet && !isPortrait() ? 25 : 0);
    this.spinButton.view.y = -30;
    this.forceStopButton.resize(size * 1.15);
    this.forceStopButton.view.x =  this.gameSpeed.view.x + this.gameSpeed.view.width + 50 + (isMobile.tablet && !isPortrait() ? 25 : 0);
    this.forceStopButton.view.y = -30;
    this.autoPlayButton.resize(size * 0.5);
    this.autoPlayButton.view.x = this.spinButton.view.x + size - 20 - (isMobile.tablet && !isPortrait() ? 25 : 0);
    this.autoPlayButton.view.y = (isMobile.tablet && !isPortrait() ? 55 : 30);
    this.betControl.visible = true;
    const betControlWidth = size * 2.8;
    const betControlHeight = size * 0.6;
    this.betControl.resize(betControlWidth, betControlHeight);
    this.betControl.x = this.spinButton.view.x + size / 2 - betControlWidth / 2 - 10;
    this.betControl.y = this.spinButton.view.y + size - 15;
    this.mobileMoneyIcon.view.visible = false;
    this.mobileSoundButton.view.visible = this.isReplayMode;
    this.mobileSoundButton.resize(size * 0.5);
    this.mobileSoundButton.view.x = -1980;
    this.mobileSoundButton.view.y = 30;
    this.scale.set(0.9)
  }

  public setSoundButtonVisibility(val: boolean): void {
    this.mobileSoundButton.view.visible = val;
  }
  public getGameSpeed(): GameSpeed {
    return this.gameSpeed;
  }

  public getSpinButton(): SpinButton {
    return this.spinButton;
  }

  public getForceStopButton(): ForceStopButton {
    return this.forceStopButton;
  }

  public getAutoPlayButton(): AutoPlayButton {
    return this.autoPlayButton;
  }

  public getBetControl(): BetControl {
    return this.betControl;
  }
  public getMobileSoundButton(): MobileSoundButton {
    return this.mobileSoundButton;
  }
  public getMobileMoneyIcon(): MobileMoneyIcon {
    return this.mobileMoneyIcon;
  }
  public updateBetText(totalBet: string): void {
    this.betControl.betText.updateText(totalBet);
  }
}
