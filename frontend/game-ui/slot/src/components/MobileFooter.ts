import { Container, isMobile, Sprite, Texture } from "pixi.js";
import { HamburgerButton } from "./HamburgerButton";
import { InfoButton } from "./InfoButton";
import { BetArea } from "./BetArea";
import { InfoTextArea } from "./InfoTextArea";
import { HamburgerPanel } from "./HamburgerPanel";
import { AutoPlayPanel } from "./AutoPlayPanel";
import { SpinArea } from "./SpinArea";
import { BetPanel } from "./BetPanel";
import { detectFullscreen, isPortrait, measureBars } from "game-engine/src/utils";
import { UI } from "..";

export class MobileFooter extends Container {
  public background: Sprite;
  public hamburgerButtonWrapper: Container;
  public hamburgerButton: HamburgerButton;
  public infoButtonWrapper: Container;
  public infoButton: InfoButton;
  public betArea: BetArea;
  public spinArea: SpinArea;
  public infoTextArea: InfoTextArea;
  public betPanel: BetPanel;
  public hamburgerPanel: HamburgerPanel;
  public autoPlayPanel: AutoPlayPanel;

  private readonly barHeightRatioVal = 0.06; // Slightly smaller for mobile
  private readonly buttonSize = 70; // Larger buttons for mobile touch
  private readonly paddingVal = 15; // More padding for mobile
  private gradientTexture: Texture | null = null;
  private actor: any;

  constructor(screenWidth: number, screenHeight: number, actor: any) {
    super();
    // blurry bg graphics element
    this.actor = actor;
    // Create high-DPI background with gradient
    this.background = new Sprite();
    this.addChild(this.background);

    // Hamburger button (left side)
    this.hamburgerButtonWrapper = new Container();
    this.hamburgerButton = new HamburgerButton();
    this.hamburgerButtonWrapper.addChild(this.hamburgerButton.view);
    this.addChild(this.hamburgerButtonWrapper);

    // Info button (next to hamburger)
    this.infoButtonWrapper = new Container();
    this.infoButton = new InfoButton();
    this.infoButtonWrapper.addChild(this.infoButton.view);
    this.addChild(this.infoButtonWrapper);

    this.betArea = new BetArea();
    this.addChild(this.betArea);

    this.spinArea = new SpinArea();
    this.addChild(this.spinArea);
    // Panels
    this.hamburgerPanel = new HamburgerPanel();
    this.hamburgerPanel.visible = false;
    this.addChild(this.hamburgerPanel);

    this.infoTextArea = new InfoTextArea();
    this.addChild(this.infoTextArea);
    this.infoTextArea.visible = true;

    this.betPanel = new BetPanel();
    this.betPanel.visible = false;
    this.addChild(this.betPanel);

    this.autoPlayPanel = new AutoPlayPanel({
      onClose: () => {
        this.autoPlayPanel.visible = false;

      },
      onStart: (settings) => {
        console.log("AutoPlay started with settings:", settings);
      },
    });
    this.autoPlayPanel.visible = false;
    this.addChild(this.autoPlayPanel);

    // Set up button interactions
    this.setupButtonInteractions(actor);

    // Initial resize
    this.resize(screenWidth, screenHeight);

    // Set up background click to close panels
    this.eventMode = "static";
    this.on("pointerup", (event) => {
      if ((event.target && event.target === this) || (event.target && event.target === this.betArea)) {
        this.closeAllPanelsExcept(null);
      }
    });
  }

  private setupButtonInteractions(actor: any) {
    let gameMode = actor.getSnapshot().context.gameMode;
    // Hamburger button toggles hamburger panel
    this.hamburgerButton.onPress.connect(() => {
      this.closeAllPanelsExcept(this.hamburgerPanel);
      this.hamburgerPanel.visible = !this.hamburgerPanel.visible;
      if (this.hamburgerPanel.visible) {
        this.setChildIndex(this.hamburgerPanel, this.children.length - 1);
      }
      if (isMobile.any && isPortrait()) {
        (this.parent as UI).setVisibility("spinArea", gameMode != "freespin" ? !this.hamburgerPanel.visible : false);
      }
    });

    this.hamburgerPanel.on("close", () => {
      this.hamburgerPanel.visible = false;
      (this.parent as UI).setVisibility("spinArea", gameMode != "freespin" ? true : false);

    });

    // Info button - can be used for rules/paytable
    this.infoButton.onPress.connect(() => {
      this.closeAllPanelsExcept(null);
      if (isMobile.any && isPortrait()) {
        (this.parent as UI).setVisibility("spinArea", false);
      }

    });

    this.spinArea.mobileMoneyIcon.onPress.connect(() => {
      let state = actor.getSnapshot();

      //if (!this.betArea.openAllowed) return;
      this.betArea.emit("playButtonSound");

      if (state.value == "idle") {
        this.showBetPanel();
      }
    });

    // Bet tap area (mobile portrait) – same behavior as mobileMoneyIcon
    const bindBetTap = () => {
      const area = this.betArea.betTapArea;
      if (!area) return;
      if ((area as any)._bound) return; // prevent double binding
      (area as any)._bound = true;
      // Remove any existing pointertap handlers set inside BetArea
      area.removeAllListeners?.("pointertap");
      area.on("pointertap", () => {
        const state = actor.getSnapshot();
        this.betArea.emit("playButtonSound");
        if (state.value === "idle") {
          this.showBetPanel();
        }
      });
    };
    // Initial attempt (in case portrait & already created)
    bindBetTap();
    // Store for later use in resize
    (this as any)._bindBetTapArea = bindBetTap;

  }

  closeAllPanelsExcept(except: Container | null) {
    const panels = [this.hamburgerPanel, this.autoPlayPanel, this.betPanel];
    panels.forEach((panel) => {
      if (panel !== except) {
        if (isMobile.any && isPortrait() && panel.visible) {
          (this.parent as UI).setVisibility("spinArea", this.actor.getSnapshot().context.gameMode != "freespin" ? true : false);
        }
        panel.visible = false;
      }
    });
    if(this.infoButton.infoPanel?.style.display === 'block') {
      (this.parent as UI).setVisibility("spinArea", true)
    }
    this.infoButton.closeHandler();
  }

  private createHighDPICanvas(
    width: number,
    height: number
  ): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 3); // Cap at 3x for performance

    // Set actual canvas size
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;

    // Scale canvas back down using CSS
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    // Scale context to match device pixel ratio
    ctx.scale(devicePixelRatio, devicePixelRatio);

    return canvas;
  }

  private showBetPanel() {
    if(this.betPanel.visible){
      this.closeAllPanelsExcept(null);
      return;
    }
    this.closeAllPanelsExcept(this.betPanel);
    this.betPanel.visible = true;
    this.setChildIndex(this.betPanel, this.children.length - 1);
    if (isMobile.any && isPortrait())
      (this.parent as UI).setVisibility("spinArea", false);
  }

  public resize(screenWidth: number, screenHeight: number) {
    let actualBarHeight = screenHeight * this.barHeightRatioVal;
    let offsetY = 0;
    const screenDiff = isMobile.tablet && !isPortrait() ? 0 : Math.abs((667 - window.innerWidth) / 2);

    if (isMobile.any && !isPortrait()) {
      actualBarHeight *= 2.3;
      offsetY = 130;
      const infoAreaWidth = screenWidth;
      const infoAreaHeight = actualBarHeight;
      this.infoTextArea.resize(infoAreaWidth, infoAreaHeight);
      this.infoTextArea.x = 0;
      this.infoTextArea.y = 0;
    } else {
      const infoAreaWidth = screenWidth;
      const infoAreaHeight = actualBarHeight * 4;
      this.infoTextArea.resize(infoAreaWidth, infoAreaHeight);
      this.infoTextArea.x = 0;
      this.infoTextArea.y = -(screenHeight / 2 + (detectFullscreen() && isPortrait() && isMobile.phone ? 120 : 0)) + (isMobile.tablet ? 65 : 0);
    }
    this.y = screenHeight - (isMobile.tablet && !isPortrait()
      ? (- 30 + measureBars().total * 1.1) : actualBarHeight - (isMobile.phone && isPortrait() && detectFullscreen() ? 120 : 0));
    // Clean up old gradient texture
    if (this.gradientTexture) {
      this.gradientTexture.destroy();
    }

    // Create high-DPI gradient background
    const canvas = this.createHighDPICanvas(screenWidth, actualBarHeight);
    const ctx = canvas.getContext("2d")!;

    // Create vertical gradient (top to bottom)
    const gradient = ctx.createLinearGradient(0, 0, 0, actualBarHeight);
    if(isPortrait()){
      gradient.addColorStop(0, "rgba(0, 0, 0, 0.1)"); // Top: very light
      gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.5)"); // Middle: medium
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.9)"); // Bottom: dark
    }else{
      gradient.addColorStop(0, "rgba(0, 0, 0, 0.6)"); // Top: very light
      gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.6)"); // Middle: medium
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.9)"); // Bottom: dark
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, screenWidth, actualBarHeight);

    // Create texture from high-DPI canvas
    this.gradientTexture = Texture.from(canvas);
    this.background.texture = this.gradientTexture;
    this.background.position.x = screenWidth / 2;
    this.background.anchor.x = 0.5;
    this.background.width = screenWidth * 2;
    this.background.height = actualBarHeight;
    if(isPortrait()){
      this.background.scale.set(1);
      this.background.y = -281.5;
    }else{
      this.background.y = 0;
    }
    // Position hamburger button (left side)
    this.hamburgerButton.resize(this.buttonSize * 1.05, this.buttonSize);
    this.hamburgerButtonWrapper.x = this.paddingVal + 10 - (isPortrait() ? 0 : screenDiff);
    this.hamburgerButtonWrapper.y =
      (actualBarHeight - this.buttonSize - 10) / 1.5;

    // Position info button (right side of footer)
    this.infoButton.resize(this.buttonSize * 1.3, this.buttonSize * 1.3);
    let tabletPosX = this.hamburgerButtonWrapper.x + this.hamburgerButtonWrapper.width + this.paddingVal + 10
    this.infoButtonWrapper.x =
      isMobile.tablet && !isPortrait() ? tabletPosX :
        screenWidth - this.paddingVal - this.buttonSize * 1.3 - 22 + (isPortrait() ? 0 : screenDiff);
    this.infoButtonWrapper.y = (actualBarHeight - this.buttonSize * 1.3) / 1.5;

    this.betArea.resize(actualBarHeight, actualBarHeight);
    this.betArea.x =
      isMobile.any && !isPortrait()
        ? 0 - screenDiff + (isMobile.tablet ? this.infoButtonWrapper.x : 0)
        : (screenWidth - this.betArea.width) / 2;
    this.betArea.y =
      isMobile.any && !isPortrait()
        ? 40
        : (actualBarHeight - this.betArea.height) / 2;

    if ((this as any)._bindBetTapArea) {
      (this as any)._bindBetTapArea();
    }

    this.spinArea.resize(actualBarHeight * 1.75, screenWidth);
    this.spinArea.x = isMobile.tablet && !isPortrait() ? screenWidth - this.spinArea.width + 120 : screenWidth / 2 + 55;
    this.spinArea.y = isMobile.tablet && !isPortrait() ? -this.spinArea.height + 70 + offsetY : -this.spinArea.height + 100 + offsetY;

    // Position hamburger panel (above footer, full width)
    const panelWidth = Math.min(screenWidth - 40, 400); // Responsive width
    const panelHeight = 300;
    this.hamburgerPanel.x = (screenWidth - panelWidth) / 2;
    this.hamburgerPanel.y = -panelHeight - 20;
    this.hamburgerPanel.resize(screenWidth, screenHeight);

    // Position autoplay panel
    const autoPlayPanelWidth = Math.min(screenWidth - 40, 400);
    const autoPlayPanelHeight = 250;
    this.autoPlayPanel.x = (screenWidth - autoPlayPanelWidth) / 2;
    this.autoPlayPanel.y = -autoPlayPanelHeight - 20;
    this.autoPlayPanel.resize(screenWidth, screenHeight);

    this.betPanel.resize(panelWidth, panelHeight);

  }
}
