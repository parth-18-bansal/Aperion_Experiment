import { Engine } from "game-engine";
import { detectFullscreen, isPortrait } from "game-engine/src/utils";
import { Container, DestroyOptions, isMobile, TextStyle } from "pixi.js";

// A professional, component-driven header that uses GridPositionComponent and ResizeComponent
export class TopHeader extends Container {
  private leftGroup: Container;
  private clockText: InstanceType<typeof Engine.LocalizedText>;
  private gamePlayModeText: InstanceType<typeof Engine.LocalizedText>;
  private companyText: InstanceType<typeof Engine.LocalizedText>;
  private timeInterval: number | undefined;
  private language: string;

  constructor(screenWidth: number, _screenHeight: number, language: string) {
    super();
    this.language = language;

    // Base text style; actual sizing can be adjusted by ResizeComponent via scaling
    const style = new TextStyle({
      fontFamily: ["DIN Offc Pro", "Arial", "sans-serif"],
      fontSize: isMobile.tablet ? 32 : 16,
      fontWeight: "900",
      fill: "white",
      stroke: { color: "#ffffff", width: 0.2, join: "round" },
      align: "left",
      letterSpacing: 1,
    });

    // Left group (top-left): clock + gameplay mode
    this.leftGroup = new Container();
    Engine.Utils.ApplyCommonProperties(this.leftGroup, {
      components: [
        {
          // Slightly larger on portrait; demonstrates ResizeComponent usage
          type: Engine.Components.ResizeComponent,
          params: [
            {
              desktop: {
                landscape: { scale: 1, y: 90 },
              },
              mobile: {
                landscape: { scale: 1.7, y: 10 },
                portrait: { scale: 1.7, x: 10, y: 10 },
              },
              tablet: {
                landscape: { scale: 1, x: 10, y: -125 },
                portrait: { scale: 1.1, x: detectFullscreen() ? 0 : -300, y: 10 },
              },
            },
          ],
        },
      ],
    });

    this.clockText = new Engine.LocalizedText("", {}, style);
    this.clockText.anchor.set(0, 0);
    this.clockText.resolution
    this.leftGroup.addChild(this.clockText);

    this.gamePlayModeText = new Engine.LocalizedText("", {}, style.clone());
    this.gamePlayModeText.anchor.set(0, 0);
    this.gamePlayModeText.resolution = 2;
    this.leftGroup.addChild(this.gamePlayModeText);

    // Right (top-right): company label
    this.companyText = new Engine.LocalizedText(
      "ui.company-label",
      {},
      style.clone()
    );
    this.companyText.anchor.set(1, 0);
    this.companyText.resolution = 2;
    Engine.Utils.ApplyCommonProperties(this.companyText, {
      components: [
        {
          type: Engine.Components.ResizeComponent,
          params: [
            {
              desktop: {
                landscape: { scale: 1, y: 95, x: 1910 },
              },
              mobile: {
                landscape: { scale: 1.7, x: 1880, y: 10 },
                portrait: { scale: 1.7, x: 1042, y: 10 },
              },
              tablet: {
                landscape: { scale: 1, x: 1880, y: -166 },
                portrait: { scale: 1.1, x: 1370, y: 10 },
              },
            },
          ],
        },
      ],
    });

    // Add to header container
    this.addChild(this.leftGroup);
    this.addChild(this.companyText);

    // Initialize dynamic content and keep time updated
    this.updateTime();
    this.updateGamePlayMode();
    this.alignLeftGroupInline();
    this.timeInterval = window.setInterval(() => {
      this.updateTime();
      // Keep spacing between left texts consistent as time width may vary slightly
      this.alignLeftGroupInline();
    }, 1000);

    // Backward-compat: honor initial width/height for any external callers; no-op otherwise
    void screenWidth;
    void _screenHeight;
  }

  private updateTime() {
    const now = new Date();
    const currentLang = this.language;
    
    if (currentLang === 'tr') {
      // Turkish format: 24-hour format
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      this.clockText.updateText(`${hours}:${minutes}`);
    } else {
      // Non-Turkish format: 12-hour format with AM/PM
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? 'PM' : 'AM';
      
      // Convert to 12-hour format
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      const hoursStr = hours.toString().padStart(2, "0");
      
      this.clockText.updateText(`${hoursStr}:${minutes} ${ampm}`);
    }
  }

  private updateGamePlayMode(): void {
    let mode = Engine.getEngine()?.slot?.server?.provider?.gameplayMode;
    mode === "fun" && (mode = "DEMO GAME");
    const gamePlayMode = (mode ? String(mode) : "").toUpperCase();
    this.gamePlayModeText.updateText(`| ${gamePlayMode}`);
  }

  // Keep the left texts inline with a small gap
  private alignLeftGroupInline(): void {
    const gap = 8;
    this.clockText.x = 10;
    this.clockText.y = 0;
    this.gamePlayModeText.x = this.clockText.x + this.clockText.width + gap;
    this.gamePlayModeText.y = 0;
  }

  public destroy(options?: boolean | DestroyOptions | undefined): void {
    super.destroy(options);
    if (this.timeInterval) {
      window.clearInterval(this.timeInterval);
      this.timeInterval = undefined;
    }
  }

}
