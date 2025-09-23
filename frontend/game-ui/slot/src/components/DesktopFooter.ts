import { Container, Sprite, Texture } from "pixi.js";
import { AutoPlayPanel } from "./AutoPlayPanel";
import { BetArea } from "./BetArea";
import { BetPanel } from "./BetPanel";
import { HamburgerButton } from "./HamburgerButton";
import { HamburgerPanel } from "./HamburgerPanel";
import { InfoButton } from "./InfoButton";
import { InfoTextArea } from "./InfoTextArea";
import { SpinArea } from "./SpinArea";
import { Engine } from "game-engine";
import { measureBars } from "game-engine/src/utils";

export class DesktopFooter extends Container {
  public background: Sprite;
  public hamburgerButtonWrapper: Container;
  public hamburgerButton: HamburgerButton;
  public infoButtonWrapper: Container;
  public infoButton: InfoButton;
  public betArea: BetArea;
  public infoTextArea: InfoTextArea;
  public spinArea: SpinArea;
  public betPanel: BetPanel;
  public hamburgerPanel: HamburgerPanel;
  public autoPlayPanel: AutoPlayPanel;

  private readonly barHeightRatioVal = 0.15;
  private readonly iconSizeVal = 50;
  private readonly paddingVal = 5;
  private gradientTexture: Texture | null = null;
  constructor(screenWidth: number, screenHeight: number, actor?: any) {
    super();
    Engine.Utils.ApplyCommonProperties(this, {
      // zIndex: 1000, // TODO -> Asked Team Lead (Erdem & Mustafa)
      components: [
        {
          type: Engine.Components.GridPositionComponent,
          params: [
            {
              desktop: {
                landscape: {
                  columns: 2,
                  rows: 2,
                  position: { x: -1, y: 0.7 },
                },
              },
              mobile: {
                landscape: {
                  columns: 2,
                  rows: 2,
                  position: { x: -1, y: -1 },
                },
                portrait: { columns: 2, rows: 2, position: { x: -1, y: -1 } },
              },
            },
          ],
        },
      ],
    });

    this.background = new Sprite();
    this.addChild(this.background);

    this.hamburgerButtonWrapper = new Container();
    this.hamburgerButton = new HamburgerButton();
    this.hamburgerButtonWrapper.addChild(this.hamburgerButton.view);
    this.addChild(this.hamburgerButtonWrapper);

    this.infoButtonWrapper = new Container();
    this.infoButton = new InfoButton();
    this.infoButtonWrapper.addChild(this.infoButton.view);
    this.addChild(this.infoButtonWrapper);

    this.betArea = new BetArea();
    this.addChild(this.betArea);

    this.infoTextArea = new InfoTextArea();
    this.addChild(this.infoTextArea);

    this.spinArea = new SpinArea();
    this.addChild(this.spinArea);

    this.betPanel = new BetPanel();
    this.betPanel.visible = false;
    this.addChild(this.betPanel);

    this.hamburgerPanel = new HamburgerPanel();
    this.hamburgerPanel.visible = false;
    this.addChild(this.hamburgerPanel);

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

    this.betArea.on("toggleBetPanelVisibility", () => {
      let state = actor.getSnapshot();
      console.log("BetArea clicked, current state:", state);
      //if (!this.betArea.openAllowed) return;
      state.context.gameMode !== "freespin" && state.value === "idle" && this.betArea.emit("playButtonSound");
      if (this.betPanel.visible) {
        this.hideBetPanel();
      } else {
        if (state.value == "idle") {
          this.showBetPanel();
        }
      }
    });

    this.betPanel.on("close", () => {
      this.hideBetPanel();
    });

    this.hamburgerButton.onPress.connect(() => {
      this.closeAllPanelsExcept(this.hamburgerPanel);
      this.hamburgerPanel.visible = !this.hamburgerPanel.visible;
      if (this.hamburgerPanel.visible)
        this.setChildIndex(this.hamburgerPanel, this.children.length - 1);
    });
    this.hamburgerPanel.on("close", () => {
      this.hideHamburgerPanel();
      this.hamburgerPanel.emit("playButtonSound");
    });

    this.resize(screenWidth, screenHeight);
  }

  closeAllPanelsExcept(except: Container | null) {
    const panels = [
      this.betPanel,
      this.hamburgerPanel,
      this.autoPlayPanel,
      //BetHistory,
    ];
    panels.forEach((panel) => {
      if (panel !== except) {
        if (panel === this.betPanel && this.betPanel.visible != false) {
          this.betArea.invertIncButton();
        }
        panel.visible = false;
      }
    });
  }

  private showBetPanel() {
    this.closeAllPanelsExcept(this.betPanel);
    this.betPanel.visible = true;
    this.setChildIndex(this.betPanel, this.children.length - 1);
    this.betArea.invertIncButton();
  }

  private hideBetPanel() {
    this.betPanel.visible = false;
    this.betArea.invertIncButton();
  }

  private hideHamburgerPanel() {
    this.hamburgerPanel.visible = false;
  }

  public resize(screenWidth: number, screenHeight: number, game?: any) {
    const actualBarHeight = screenHeight * this.barHeightRatioVal;
    //this.y = screenHeight - actualBarHeight;
    // Gradient texture'ı yeniden oluştur (boyut değiştiğinde)
    if (this.gradientTexture) {
      this.gradientTexture.destroy();
    }

    // Gradient texture oluştur
    const canvas = document.createElement("canvas");
    canvas.width = screenWidth;
    canvas.height = actualBarHeight;
    const ctx = canvas.getContext("2d")!; // Dikey gradient oluştur (yukarıdan aşağıya)
    const gradient = ctx.createLinearGradient(0, 0, 0, actualBarHeight);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.2)"); // Üstte hafif transparan siyah
    gradient.addColorStop(0.6, "rgba(0, 0, 0, 0.6)"); // Ortada orta siyah
    gradient.addColorStop(1, "rgba(0, 0, 0, 1)"); // Altta koyu siyah

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, screenWidth, actualBarHeight);

    // Canvas'tan texture oluştur ve sprite'a uygula
    this.gradientTexture = Texture.from(canvas);
    this.background.texture = this.gradientTexture;
    this.background.width = screenWidth;
    this.background.height = actualBarHeight;

    this.hamburgerButton.resize(this.iconSizeVal, this.iconSizeVal);
    this.hamburgerButtonWrapper.x = this.paddingVal;
    this.hamburgerButtonWrapper.y = (actualBarHeight - this.iconSizeVal) / 2 - 10;

    this.infoButton.resize(this.iconSizeVal, this.iconSizeVal);
    this.infoButtonWrapper.x =
      this.hamburgerButtonWrapper.x + this.iconSizeVal + this.paddingVal + 10;
    this.infoButtonWrapper.y = (actualBarHeight - this.iconSizeVal) / 2 - 10;

    this.betArea.resize(actualBarHeight * 2.2, actualBarHeight * 1.3);

    const infoAreaWidth = screenWidth;
    const infoAreaHeight = actualBarHeight;
    this.infoTextArea.resize(infoAreaWidth, infoAreaHeight);
    this.infoTextArea.x = 0;
    this.infoTextArea.y = 0;

    this.spinArea.resize(actualBarHeight, screenWidth);
    this.spinArea.x = screenWidth - actualBarHeight;
    this.spinArea.y = (actualBarHeight - actualBarHeight) / 2 - 30;

    const panelWidth = 466;
    const panelHeight = 269;
    this.betPanel.resize(panelWidth, panelHeight);
    // Adjust positioning for scaled panel (55% of original size)
    const scaledPanelWidth = panelWidth * 0.55;
    const scaledPanelHeight = panelHeight * 0.55;
    this.betPanel.x =
      this.betArea.x + (this.betArea.width - scaledPanelWidth) / 2 + 82; // Adjusted for 55% scale
    this.betPanel.y = -scaledPanelHeight - 13; // Adjusted for 55% scale

    this.autoPlayPanel.resize(screenWidth, screenHeight);
    this.hamburgerPanel.resize(screenWidth, screenHeight);
    this.betPanel.resize(screenWidth, screenHeight);
  }
}
